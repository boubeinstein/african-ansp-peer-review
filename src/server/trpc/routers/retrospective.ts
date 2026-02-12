/**
 * Review Retrospective tRPC Router
 *
 * Handles post-review reflection and continuous improvement tracking
 * Aligned with ICAO Annex 19 Section 3.3 and CANSO SoE SA8.1/SA10.1
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { LessonType, RetrospectiveStatus, ReviewPhase } from "@prisma/client";
import { logStatusChange, logSubmission } from "@/server/services/audit";
import {
  sendNotification,
  getRecipientsByRole,
} from "@/server/services/notification-service";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const upsertRetrospectiveSchema = z.object({
  reviewId: z.string(),
  processRating: z.number().min(1).max(5),
  preparationEffective: z.boolean().optional(),
  onSiteEffective: z.boolean().optional(),
  reportingEffective: z.boolean().optional(),
  whatWentWell: z.string().min(10),
  areasForImprovement: z.string().min(10),
  keyLearnings: z.string().min(10),
  programmeSuggestions: z.string().optional(),
  reviewDurationDays: z.number().optional(),
  teamSizeAdequate: z.boolean().optional(),
  resourcesAdequate: z.boolean().optional(),
  communicationEffective: z.boolean().optional(),
});

const tagFindingSchema = z.object({
  retrospectiveId: z.string(),
  findingId: z.string(),
  lessonType: z.nativeEnum(LessonType),
  notableReason: z.string().optional(),
});

const programmeInsightsSchema = z.object({
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});

// =============================================================================
// ROUTER
// =============================================================================

export const retrospectiveRouter = router({
  /**
   * Get retrospective for a review (or null if not created)
   */
  getByReview: protectedProcedure
    .input(z.object({ reviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.reviewRetrospective.findUnique({
        where: { reviewId: input.reviewId },
        include: {
          submittedBy: { select: { id: true, firstName: true, lastName: true } },
          taggedFindings: {
            include: {
              finding: { select: { id: true, titleEn: true, titleFr: true, severity: true } },
            },
          },
          _count: { select: { lessons: true } },
        },
      });
    }),

  /**
   * Get team member contributions / participation status for a review's retrospective
   */
  getContributions: protectedProcedure
    .input(z.object({ reviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        include: {
          teamMembers: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Get the retrospective if it exists
      const retrospective = await ctx.db.reviewRetrospective.findUnique({
        where: { reviewId: input.reviewId },
        select: {
          id: true,
          submittedById: true,
          status: true,
          taggedFindings: {
            select: {
              id: true,
              findingId: true,
              lessonType: true,
            },
          },
          lessons: {
            select: {
              id: true,
              authorId: true,
              status: true,
            },
          },
        },
      });

      // Map team members to contribution status
      const contributions = review.teamMembers.map((member) => {
        const lessonsAuthored =
          retrospective?.lessons.filter((l) => l.authorId === member.user.id) ?? [];
        const isSubmitter = retrospective?.submittedById === member.user.id;

        return {
          userId: member.user.id,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          email: member.user.email,
          role: member.role,
          isSubmitter,
          lessonsCount: lessonsAuthored.length,
          hasContributed: isSubmitter || lessonsAuthored.length > 0,
        };
      });

      return {
        reviewId: input.reviewId,
        retrospectiveId: retrospective?.id ?? null,
        retrospectiveStatus: retrospective?.status ?? null,
        taggedFindingsCount: retrospective?.taggedFindings.length ?? 0,
        lessonsCount: retrospective?.lessons.length ?? 0,
        contributions,
      };
    }),

  /**
   * Create or update retrospective (draft)
   * Only team members or admins can create/edit
   */
  upsert: protectedProcedure
    .input(upsertRetrospectiveSchema)
    .mutation(async ({ ctx, input }) => {
      const { reviewId, ...data } = input;

      // Verify user has permission (team member or admin)
      const review = await ctx.db.review.findUnique({
        where: { id: reviewId },
        include: { teamMembers: true },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Validate review phase — retrospectives only allowed in late phases
      const allowedPhases: ReviewPhase[] = [
        ReviewPhase.REPORTING,
        ReviewPhase.FOLLOW_UP,
        ReviewPhase.CLOSED,
      ];
      if (!allowedPhases.includes(review.phase)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Retrospectives can only be created during REPORTING, FOLLOW_UP, or CLOSED phases",
        });
      }

      const isTeamMember = review.teamMembers.some(
        (m) => m.userId === ctx.session.user.id
      );
      const isAdmin = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(
        ctx.session.user.role
      );

      if (!isTeamMember && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be a team member or admin to create a retrospective",
        });
      }

      return ctx.db.reviewRetrospective.upsert({
        where: { reviewId },
        create: {
          reviewId,
          submittedById: ctx.session.user.id,
          ...data,
        },
        update: data,
      });
    }),

  /**
   * Submit retrospective (change status from DRAFT to SUBMITTED)
   * Only the original submitter can submit
   */
  submit: protectedProcedure
    .input(z.object({ retrospectiveId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const retrospective = await ctx.db.reviewRetrospective.findUnique({
        where: { id: input.retrospectiveId },
      });

      if (!retrospective) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Retrospective not found",
        });
      }

      if (retrospective.submittedById !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the original submitter can submit the retrospective",
        });
      }

      if (retrospective.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Retrospective has already been submitted",
        });
      }

      const updated = await ctx.db.reviewRetrospective.update({
        where: { id: input.retrospectiveId },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
        include: {
          review: {
            select: { id: true, referenceNumber: true },
          },
        },
      });

      // Audit logging
      await logStatusChange({
        userId: ctx.session.user.id,
        entityType: "RETROSPECTIVE",
        entityId: input.retrospectiveId,
        previousStatus: "DRAFT",
        newStatus: "SUBMITTED",
        metadata: { reviewId: retrospective.reviewId },
      });

      await logSubmission({
        userId: ctx.session.user.id,
        entityType: "RETROSPECTIVE",
        entityId: input.retrospectiveId,
        metadata: { reviewId: retrospective.reviewId },
      });

      // Notify Programme Coordinators
      const coordinators = await getRecipientsByRole(["PROGRAMME_COORDINATOR"]);
      if (coordinators.length > 0) {
        const refNumber = updated.review.referenceNumber ?? updated.review.id;
        await sendNotification(coordinators, {
          type: "RETROSPECTIVE_SUBMITTED",
          titleEn: "Retrospective Submitted",
          titleFr: "Rétrospective soumise",
          messageEn: `A retrospective for review ${refNumber} has been submitted and is awaiting publication approval.`,
          messageFr: `Une rétrospective pour la revue ${refNumber} a été soumise et attend l'approbation de publication.`,
          entityType: "RETROSPECTIVE",
          entityId: input.retrospectiveId,
          actionUrl: `/reviews/${retrospective.reviewId}`,
        });
      }

      return updated;
    }),

  /**
   * Publish retrospective (admin only - change from SUBMITTED to PUBLISHED)
   */
  publish: protectedProcedure
    .input(z.object({ retrospectiveId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(
        ctx.session.user.role
      );

      if (!isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can publish retrospectives",
        });
      }

      const retrospective = await ctx.db.reviewRetrospective.findUnique({
        where: { id: input.retrospectiveId },
      });

      if (!retrospective) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Retrospective not found",
        });
      }

      if (retrospective.status !== "SUBMITTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Retrospective must be submitted before publishing",
        });
      }

      const updated = await ctx.db.reviewRetrospective.update({
        where: { id: input.retrospectiveId },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
        include: {
          review: {
            select: { id: true, referenceNumber: true },
          },
        },
      });

      // Audit logging
      await logStatusChange({
        userId: ctx.session.user.id,
        entityType: "RETROSPECTIVE",
        entityId: input.retrospectiveId,
        previousStatus: "SUBMITTED",
        newStatus: "PUBLISHED",
        metadata: { reviewId: retrospective.reviewId },
      });

      return updated;
    }),

  /**
   * Tag a finding as notable lesson
   */
  tagFinding: protectedProcedure
    .input(tagFindingSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify retrospective exists and user has access
      const retrospective = await ctx.db.reviewRetrospective.findUnique({
        where: { id: input.retrospectiveId },
        include: { review: { include: { teamMembers: true } } },
      });

      if (!retrospective) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Retrospective not found",
        });
      }

      const isTeamMember = retrospective.review.teamMembers.some(
        (m) => m.userId === ctx.session.user.id
      );
      const isAdmin = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(
        ctx.session.user.role
      );

      if (!isTeamMember && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be a team member to tag findings",
        });
      }

      // Verify finding exists and belongs to the same review
      const finding = await ctx.db.finding.findUnique({
        where: { id: input.findingId },
      });

      if (!finding) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Finding not found",
        });
      }

      if (finding.reviewId !== retrospective.reviewId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Finding must belong to the same review",
        });
      }

      return ctx.db.retrospectiveFinding.create({
        data: {
          retrospectiveId: input.retrospectiveId,
          findingId: input.findingId,
          lessonType: input.lessonType,
          notableReason: input.notableReason,
        },
      });
    }),

  /**
   * Remove a tagged finding
   */
  untagFinding: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const taggedFinding = await ctx.db.retrospectiveFinding.findUnique({
        where: { id: input.id },
        include: {
          retrospective: {
            include: { review: { include: { teamMembers: true } } },
          },
        },
      });

      if (!taggedFinding) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tagged finding not found",
        });
      }

      const isTeamMember = taggedFinding.retrospective.review.teamMembers.some(
        (m) => m.userId === ctx.session.user.id
      );
      const isAdmin = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(
        ctx.session.user.role
      );

      if (!isTeamMember && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be a team member to remove tagged findings",
        });
      }

      return ctx.db.retrospectiveFinding.delete({
        where: { id: input.id },
      });
    }),

  /**
   * Get aggregated insights across all retrospectives (for programme improvement)
   * Only admins and steering committee can access
   */
  getProgrammeInsights: protectedProcedure
    .input(programmeInsightsSchema)
    .query(async ({ ctx, input }) => {
      const canViewInsights = [
        "SUPER_ADMIN",
        "SYSTEM_ADMIN",
        "PROGRAMME_COORDINATOR",
        "STEERING_COMMITTEE",
      ].includes(ctx.session.user.role);

      if (!canViewInsights) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view programme insights",
        });
      }

      const where = {
        status: "PUBLISHED" as RetrospectiveStatus,
        ...(input.dateFrom || input.dateTo
          ? {
              submittedAt: {
                ...(input.dateFrom ? { gte: input.dateFrom } : {}),
                ...(input.dateTo ? { lte: input.dateTo } : {}),
              },
            }
          : {}),
      };

      const retrospectives = await ctx.db.reviewRetrospective.findMany({
        where,
        include: {
          review: { select: { id: true, referenceNumber: true } },
          submittedBy: { select: { id: true, firstName: true, lastName: true } },
          taggedFindings: {
            include: {
              finding: { select: { id: true, titleEn: true, titleFr: true, severity: true } },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      });

      // Calculate aggregates
      const avgProcessRating =
        retrospectives.length > 0
          ? retrospectives.reduce((sum, r) => sum + r.processRating, 0) /
            retrospectives.length
          : 0;

      // Count effectiveness metrics
      const effectivenessMetrics = {
        preparationEffective: retrospectives.filter((r) => r.preparationEffective === true).length,
        preparationIneffective: retrospectives.filter((r) => r.preparationEffective === false).length,
        onSiteEffective: retrospectives.filter((r) => r.onSiteEffective === true).length,
        onSiteIneffective: retrospectives.filter((r) => r.onSiteEffective === false).length,
        reportingEffective: retrospectives.filter((r) => r.reportingEffective === true).length,
        reportingIneffective: retrospectives.filter((r) => r.reportingEffective === false).length,
        teamSizeAdequate: retrospectives.filter((r) => r.teamSizeAdequate === true).length,
        teamSizeInadequate: retrospectives.filter((r) => r.teamSizeAdequate === false).length,
        resourcesAdequate: retrospectives.filter((r) => r.resourcesAdequate === true).length,
        resourcesInadequate: retrospectives.filter((r) => r.resourcesAdequate === false).length,
        communicationEffective: retrospectives.filter((r) => r.communicationEffective === true).length,
        communicationIneffective: retrospectives.filter((r) => r.communicationEffective === false).length,
      };

      // Group lessons by type
      const lessonsByType = retrospectives
        .flatMap((r) => r.taggedFindings)
        .reduce(
          (acc, tf) => {
            acc[tf.lessonType] = (acc[tf.lessonType] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

      // Calculate average duration
      const durationsProvided = retrospectives.filter((r) => r.reviewDurationDays != null);
      const avgDurationDays =
        durationsProvided.length > 0
          ? durationsProvided.reduce((sum, r) => sum + (r.reviewDurationDays || 0), 0) /
            durationsProvided.length
          : null;

      return {
        totalRetrospectives: retrospectives.length,
        avgProcessRating: Math.round(avgProcessRating * 10) / 10,
        avgDurationDays: avgDurationDays ? Math.round(avgDurationDays) : null,
        effectivenessMetrics,
        lessonsByType,
        recentRetrospectives: retrospectives.slice(0, 10),
      };
    }),

  /**
   * List all retrospectives (for admins)
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(RetrospectiveStatus).optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const canViewAll = [
        "SUPER_ADMIN",
        "SYSTEM_ADMIN",
        "PROGRAMME_COORDINATOR",
        "STEERING_COMMITTEE",
      ].includes(ctx.session.user.role);

      if (!canViewAll) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to list all retrospectives",
        });
      }

      const retrospectives = await ctx.db.reviewRetrospective.findMany({
        where: input.status ? { status: input.status } : undefined,
        include: {
          review: {
            select: {
              id: true,
              referenceNumber: true,
              hostOrganization: { select: { nameEn: true, nameFr: true } },
            },
          },
          submittedBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { taggedFindings: true, lessons: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | undefined;
      if (retrospectives.length > input.limit) {
        const nextItem = retrospectives.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: retrospectives,
        nextCursor,
      };
    }),
});
