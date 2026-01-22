/**
 * CAP Evidence Router
 *
 * Manages evidence uploads and verification workflow for Corrective Action Plans.
 *
 * Workflow:
 * 1. Host organization uploads evidence
 * 2. Lead Reviewer receives notification
 * 3. Reviewer reviews evidence
 * 4. Accept (mark milestone complete) or Request More Info
 * 5. All evidence verified → CAP can be closed
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  roleProcedure,
} from "../trpc";
import { EvidenceCategory, EvidenceStatus, UserRole, MilestoneStatus, AuditAction } from "@prisma/client";

// =============================================================================
// ROLE DEFINITIONS
// =============================================================================

/**
 * Roles that can upload evidence (organization members)
 */
const EVIDENCE_UPLOAD_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "ANSP_ADMIN",
  "SAFETY_MANAGER",
  "QUALITY_MANAGER",
];

/**
 * Roles that can review evidence (reviewers and management)
 */
const EVIDENCE_REVIEW_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "STEERING_COMMITTEE",
  "LEAD_REVIEWER",
];

/**
 * Roles that can view all evidence
 */
const EVIDENCE_VIEW_ALL_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "STEERING_COMMITTEE",
  "LEAD_REVIEWER",
  "PEER_REVIEWER",
];

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const createEvidenceSchema = z.object({
  capId: z.string().cuid(),
  milestoneId: z.string().cuid().optional(),
  category: z.nativeEnum(EvidenceCategory),
  titleEn: z.string().min(3, "Title must be at least 3 characters"),
  titleFr: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionFr: z.string().optional(),
  evidenceDate: z.coerce.date(),
  fileUrl: z.string().url(),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().positive(),
});

const reviewEvidenceSchema = z.object({
  evidenceId: z.string().cuid(),
  status: z.enum(["ACCEPTED", "REJECTED", "MORE_INFO_REQUIRED"]),
  reviewerCommentEn: z.string().optional(),
  reviewerCommentFr: z.string().optional(),
  rejectionReason: z.string().optional(),
});

const listEvidenceSchema = z.object({
  capId: z.string().cuid().optional(),
  milestoneId: z.string().cuid().optional(),
  status: z.nativeEnum(EvidenceStatus).optional(),
  category: z.nativeEnum(EvidenceCategory).optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
});

// =============================================================================
// ROUTER
// =============================================================================

export const capEvidenceRouter = router({
  /**
   * Upload new evidence for a CAP
   */
  create: protectedProcedure
    .input(createEvidenceSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      // Get CAP with organization info
      const cap = await ctx.db.correctiveActionPlan.findUnique({
        where: { id: input.capId },
        include: {
          finding: {
            select: {
              organizationId: true,
              review: {
                select: {
                  teamMembers: {
                    where: { role: "LEAD_REVIEWER" },
                    select: { userId: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!cap) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CAP not found",
        });
      }

      // Check if user can upload (organization member or admin)
      const isOrgMember = user.organizationId === cap.finding.organizationId;
      const isAdmin = EVIDENCE_UPLOAD_ROLES.includes(user.role);

      if (!isOrgMember && user.role !== "SUPER_ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only upload evidence for your organization's CAPs",
        });
      }

      // Validate milestone if provided
      if (input.milestoneId) {
        const milestone = await ctx.db.cAPMilestone.findUnique({
          where: { id: input.milestoneId },
        });

        if (!milestone || milestone.capId !== input.capId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid milestone for this CAP",
          });
        }
      }

      // Create evidence
      const evidence = await ctx.db.cAPEvidence.create({
        data: {
          capId: input.capId,
          milestoneId: input.milestoneId,
          category: input.category,
          titleEn: input.titleEn,
          titleFr: input.titleFr,
          descriptionEn: input.descriptionEn,
          descriptionFr: input.descriptionFr,
          evidenceDate: input.evidenceDate,
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: input.fileSize,
          status: "PENDING",
          uploadedById: user.id,
        },
        include: {
          uploadedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          milestone: true,
        },
      });

      // Create notification for Lead Reviewer
      const leadReviewers = cap.finding.review.teamMembers;
      for (const lr of leadReviewers) {
        await ctx.db.notification.create({
          data: {
            userId: lr.userId,
            type: "CAP_SUBMITTED", // Reusing existing type for evidence notification
            titleEn: "New CAP Evidence Uploaded",
            titleFr: "Nouvelle preuve de PAC téléchargée",
            messageEn: `New evidence "${input.titleEn}" has been uploaded and requires your review.`,
            messageFr: `Une nouvelle preuve "${input.titleEn}" a été téléchargée et nécessite votre révision.`,
            entityType: "CAPEvidence",
            entityId: evidence.id,
            actionUrl: `/caps/${input.capId}`,
            priority: "NORMAL",
          },
        });
      }

      // Log the upload
      await ctx.db.auditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.CREATE,
          entityType: "CAPEvidence",
          entityId: evidence.id,
          newState: JSON.parse(JSON.stringify(evidence)),
        },
      });

      return evidence;
    }),

  /**
   * Get evidence by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const evidence = await ctx.db.cAPEvidence.findUnique({
        where: { id: input.id },
        include: {
          cap: {
            include: {
              finding: {
                select: {
                  organizationId: true,
                  review: {
                    select: {
                      teamMembers: {
                        select: { userId: true },
                      },
                    },
                  },
                },
              },
            },
          },
          uploadedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          reviewedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          milestone: true,
        },
      });

      if (!evidence) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evidence not found",
        });
      }

      // Check access
      const canViewAll = EVIDENCE_VIEW_ALL_ROLES.includes(user.role);
      const isOrgMember = user.organizationId === evidence.cap.finding.organizationId;
      const isTeamMember = evidence.cap.finding.review.teamMembers.some(
        (tm) => tm.userId === user.id
      );

      if (!canViewAll && !isOrgMember && !isTeamMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this evidence",
        });
      }

      return evidence;
    }),

  /**
   * List evidence for a CAP
   */
  list: protectedProcedure
    .input(listEvidenceSchema)
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const { capId, milestoneId, status, category, page, pageSize } = input;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {};

      if (capId) where.capId = capId;
      if (milestoneId) where.milestoneId = milestoneId;
      if (status) where.status = status;
      if (category) where.category = category;

      // Role-based filtering
      if (!EVIDENCE_VIEW_ALL_ROLES.includes(user.role)) {
        where.cap = {
          finding: {
            organizationId: user.organizationId,
          },
        };
      }

      const [evidence, total] = await Promise.all([
        ctx.db.cAPEvidence.findMany({
          where,
          include: {
            uploadedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
            reviewedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
            milestone: true,
          },
          orderBy: { uploadedAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.db.cAPEvidence.count({ where }),
      ]);

      return {
        evidence,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  /**
   * Get evidence for a CAP (simplified query)
   */
  getByCAP: protectedProcedure
    .input(z.object({ capId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const evidence = await ctx.db.cAPEvidence.findMany({
        where: { capId: input.capId },
        include: {
          uploadedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          reviewedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          milestone: true,
        },
        orderBy: { uploadedAt: "desc" },
      });

      return evidence;
    }),

  /**
   * Review evidence (accept/reject/request more info)
   */
  review: roleProcedure(...EVIDENCE_REVIEW_ROLES)
    .input(reviewEvidenceSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const evidence = await ctx.db.cAPEvidence.findUnique({
        where: { id: input.evidenceId },
        include: {
          cap: {
            include: {
              finding: {
                select: {
                  organizationId: true,
                },
              },
            },
          },
          milestone: true,
        },
      });

      if (!evidence) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evidence not found",
        });
      }

      // Cannot review already accepted evidence
      if (evidence.status === "ACCEPTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This evidence has already been accepted",
        });
      }

      // Require rejection reason if rejecting
      if (input.status === "REJECTED" && !input.rejectionReason) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Rejection reason is required when rejecting evidence",
        });
      }

      // Update evidence
      const updated = await ctx.db.cAPEvidence.update({
        where: { id: input.evidenceId },
        data: {
          status: input.status,
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewerCommentEn: input.reviewerCommentEn,
          reviewerCommentFr: input.reviewerCommentFr,
          rejectionReason: input.status === "REJECTED" ? input.rejectionReason : null,
        },
        include: {
          uploadedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          reviewedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          milestone: true,
        },
      });

      // If accepted and linked to a milestone, check if milestone should be completed
      if (input.status === "ACCEPTED" && evidence.milestoneId) {
        // Check if all evidence for this milestone is accepted
        const milestoneEvidence = await ctx.db.cAPEvidence.findMany({
          where: { milestoneId: evidence.milestoneId },
        });

        const allAccepted = milestoneEvidence.every((e) => e.status === "ACCEPTED");

        if (allAccepted && milestoneEvidence.length > 0) {
          // Mark milestone as completed
          await ctx.db.cAPMilestone.update({
            where: { id: evidence.milestoneId },
            data: {
              status: MilestoneStatus.COMPLETED,
              completedDate: new Date(),
            },
          });
        }
      }

      // Create notification for uploader
      const notificationTitle =
        input.status === "ACCEPTED"
          ? { en: "Evidence Accepted", fr: "Preuve acceptée" }
          : input.status === "REJECTED"
            ? { en: "Evidence Rejected", fr: "Preuve rejetée" }
            : { en: "More Information Required", fr: "Plus d'informations requises" };

      const notificationMessage =
        input.status === "ACCEPTED"
          ? {
              en: `Your evidence "${evidence.titleEn}" has been accepted.`,
              fr: `Votre preuve "${evidence.titleEn}" a été acceptée.`,
            }
          : input.status === "REJECTED"
            ? {
                en: `Your evidence "${evidence.titleEn}" has been rejected. Reason: ${input.rejectionReason}`,
                fr: `Votre preuve "${evidence.titleEn}" a été rejetée. Raison: ${input.rejectionReason}`,
              }
            : {
                en: `Additional information has been requested for your evidence "${evidence.titleEn}".`,
                fr: `Des informations supplémentaires ont été demandées pour votre preuve "${evidence.titleEn}".`,
              };

      await ctx.db.notification.create({
        data: {
          userId: evidence.uploadedById,
          type: input.status === "ACCEPTED" ? "CAP_ACCEPTED" : "CAP_REJECTED",
          titleEn: notificationTitle.en,
          titleFr: notificationTitle.fr,
          messageEn: notificationMessage.en,
          messageFr: notificationMessage.fr,
          entityType: "CAPEvidence",
          entityId: evidence.id,
          actionUrl: `/caps/${evidence.capId}`,
          priority: input.status === "REJECTED" ? "HIGH" : "NORMAL",
        },
      });

      // Log the review
      await ctx.db.auditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.VERIFICATION,
          entityType: "CAPEvidence",
          entityId: input.evidenceId,
          previousState: { status: evidence.status },
          newState: {
            status: input.status,
            reviewerCommentEn: input.reviewerCommentEn,
            rejectionReason: input.rejectionReason,
          },
        },
      });

      return updated;
    }),

  /**
   * Delete evidence (only uploader or admin, only pending evidence)
   */
  delete: protectedProcedure
    .input(z.object({ evidenceId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const evidence = await ctx.db.cAPEvidence.findUnique({
        where: { id: input.evidenceId },
      });

      if (!evidence) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evidence not found",
        });
      }

      // Can only delete pending evidence
      if (evidence.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending evidence can be deleted",
        });
      }

      // Check permission
      const isUploader = evidence.uploadedById === user.id;
      const isAdmin = user.role === "SUPER_ADMIN" || user.role === "SYSTEM_ADMIN";

      if (!isUploader && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own evidence",
        });
      }

      await ctx.db.cAPEvidence.delete({
        where: { id: input.evidenceId },
      });

      // Log the deletion
      await ctx.db.auditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.DELETE,
          entityType: "CAPEvidence",
          entityId: input.evidenceId,
          previousState: JSON.parse(JSON.stringify(evidence)),
        },
      });

      return { success: true };
    }),

  /**
   * Get evidence statistics for a CAP
   */
  getStats: protectedProcedure
    .input(z.object({ capId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const [total, byStatus, byCategory] = await Promise.all([
        ctx.db.cAPEvidence.count({
          where: { capId: input.capId },
        }),
        ctx.db.cAPEvidence.groupBy({
          by: ["status"],
          where: { capId: input.capId },
          _count: true,
        }),
        ctx.db.cAPEvidence.groupBy({
          by: ["category"],
          where: { capId: input.capId },
          _count: true,
        }),
      ]);

      const statusCounts = byStatus.reduce(
        (acc, item) => ({
          ...acc,
          [item.status]: item._count,
        }),
        {} as Record<EvidenceStatus, number>
      );

      const categoryCounts = byCategory.reduce(
        (acc, item) => ({
          ...acc,
          [item.category]: item._count,
        }),
        {} as Record<EvidenceCategory, number>
      );

      return {
        total,
        byStatus: statusCounts,
        byCategory: categoryCounts,
        pending: statusCounts.PENDING || 0,
        underReview: statusCounts.UNDER_REVIEW || 0,
        accepted: statusCounts.ACCEPTED || 0,
        rejected: statusCounts.REJECTED || 0,
        moreInfoRequired: statusCounts.MORE_INFO_REQUIRED || 0,
      };
    }),

  /**
   * Check if all evidence for a CAP is verified (for closing CAP)
   */
  checkAllVerified: protectedProcedure
    .input(z.object({ capId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const evidence = await ctx.db.cAPEvidence.findMany({
        where: { capId: input.capId },
      });

      if (evidence.length === 0) {
        return {
          hasEvidence: false,
          allAccepted: false,
          pendingCount: 0,
          rejectedCount: 0,
        };
      }

      const pendingCount = evidence.filter(
        (e) => e.status === "PENDING" || e.status === "UNDER_REVIEW" || e.status === "MORE_INFO_REQUIRED"
      ).length;
      const rejectedCount = evidence.filter((e) => e.status === "REJECTED").length;
      const allAccepted = evidence.every((e) => e.status === "ACCEPTED");

      return {
        hasEvidence: true,
        allAccepted,
        pendingCount,
        rejectedCount,
        totalCount: evidence.length,
        acceptedCount: evidence.filter((e) => e.status === "ACCEPTED").length,
      };
    }),
});
