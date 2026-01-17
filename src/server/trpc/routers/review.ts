/**
 * Review Router - Peer Review Module API
 *
 * Provides comprehensive CRUD operations for peer reviews, team management,
 * findings, and corrective action plans.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  adminProcedure,
} from "../trpc";
import {
  ReviewStatus,
  ReviewType,
  ReviewPhase,
  TeamRole,
  FindingType,
  FindingSeverity,
  FindingStatus,
  CAPStatus,
  UserRole,
  ReviewLocationType,
  LanguagePreference,
  Prisma,
} from "@prisma/client";

// =============================================================================
// CONSTANTS & HELPERS
// =============================================================================

/**
 * Roles that can manage reviews (create, update, assign team)
 */
const REVIEW_MANAGER_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "STEERING_COMMITTEE",
];

/**
 * Roles that can request reviews on behalf of their organization
 */
const REVIEW_REQUESTER_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "STEERING_COMMITTEE",
  "ANSP_ADMIN",
  "SAFETY_MANAGER",
];

/**
 * Generate a review reference number
 */
function generateReviewNumber(year: number, sequence: number): string {
  return `AAPRP-${year}-${String(sequence).padStart(3, "0")}`;
}

/**
 * Generate a finding reference number
 */
function generateFindingNumber(
  reviewRef: string,
  sequence: number
): string {
  return `${reviewRef}-F${String(sequence).padStart(2, "0")}`;
}

/**
 * Authenticated context with user
 */
interface AuthenticatedContext {
  session: {
    user: {
      id: string;
      role: UserRole;
      organizationId: string | null;
    };
  };
}

/**
 * Check if user can access a review
 */
function canAccessReview(
  ctx: AuthenticatedContext,
  review: {
    hostOrganizationId: string;
    teamMembers?: { userId: string }[];
  }
): boolean {
  const userRole = ctx.session.user.role;
  const userId = ctx.session.user.id;
  const userOrgId = ctx.session.user.organizationId;

  // Admins and coordinators can access all
  if (REVIEW_MANAGER_ROLES.includes(userRole)) {
    return true;
  }

  // Host organization members can access their reviews
  if (review.hostOrganizationId === userOrgId) {
    return true;
  }

  // Team members can access reviews they're assigned to
  const isTeamMember = review.teamMembers?.some(
    (tm) => tm.userId === userId
  );
  if (isTeamMember) {
    return true;
  }

  return false;
}

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const reviewRequestSchema = z.object({
  hostOrganizationId: z.string(),
  assessmentIds: z.array(z.string()).min(1, "At least one assessment must be selected"),
  reviewType: z.nativeEnum(ReviewType),
  focusAreas: z.array(z.string()).optional(),
  requestedStartDate: z.date().or(z.string().transform((s) => new Date(s))).optional(),
  requestedEndDate: z.date().or(z.string().transform((s) => new Date(s))).optional(),
  locationType: z.nativeEnum(ReviewLocationType).default("ON_SITE"),
  accommodationProvided: z.boolean().default(false),
  transportationProvided: z.boolean().default(false),
  languagePreference: z.nativeEnum(LanguagePreference).default("BOTH"),
  primaryContactName: z.string().min(1, "Primary contact name is required"),
  primaryContactEmail: z.string().email("Invalid email address"),
  primaryContactPhone: z.string().optional(),
  specialRequirements: z.string().optional(),
});

const reviewUpdateSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(ReviewStatus).optional(),
  phase: z.nativeEnum(ReviewPhase).optional(),
  locationType: z.nativeEnum(ReviewLocationType).optional(),
  plannedStartDate: z.date().or(z.string().transform((s) => new Date(s))).optional().nullable(),
  plannedEndDate: z.date().or(z.string().transform((s) => new Date(s))).optional().nullable(),
  actualStartDate: z.date().or(z.string().transform((s) => new Date(s))).optional().nullable(),
  actualEndDate: z.date().or(z.string().transform((s) => new Date(s))).optional().nullable(),
  objectives: z.string().optional().nullable(),
  specialRequirements: z.string().optional().nullable(),
  areasInScope: z.array(z.string()).optional(),
  questionnairesInScope: z.array(z.string()).optional(),
});

const teamMemberAssignmentSchema = z.object({
  reviewId: z.string(),
  userId: z.string(),
  reviewerProfileId: z.string().optional(),
  role: z.nativeEnum(TeamRole),
  assignedAreas: z.array(z.string()).optional(),
});

const teamMemberResponseSchema = z.object({
  reviewId: z.string(),
  confirmed: z.boolean(),
  declineReason: z.string().optional(),
});

const findingCreateSchema = z.object({
  reviewId: z.string(),
  organizationId: z.string(),
  questionId: z.string().optional(),
  findingType: z.nativeEnum(FindingType),
  severity: z.nativeEnum(FindingSeverity).optional(),
  titleEn: z.string().min(1).max(255),
  titleFr: z.string().min(1).max(255),
  descriptionEn: z.string().min(1),
  descriptionFr: z.string().min(1),
  evidenceEn: z.string().optional(),
  evidenceFr: z.string().optional(),
  icaoReference: z.string().optional(),
  capRequired: z.boolean().default(true),
  targetCloseDate: z.date().or(z.string().transform((s) => new Date(s))).optional(),
});

const findingUpdateSchema = z.object({
  id: z.string(),
  findingType: z.nativeEnum(FindingType).optional(),
  severity: z.nativeEnum(FindingSeverity).optional(),
  status: z.nativeEnum(FindingStatus).optional(),
  titleEn: z.string().min(1).max(255).optional(),
  titleFr: z.string().min(1).max(255).optional(),
  descriptionEn: z.string().min(1).optional(),
  descriptionFr: z.string().min(1).optional(),
  evidenceEn: z.string().optional().nullable(),
  evidenceFr: z.string().optional().nullable(),
  icaoReference: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  capRequired: z.boolean().optional(),
  targetCloseDate: z.date().or(z.string().transform((s) => new Date(s))).optional().nullable(),
});

const capCreateSchema = z.object({
  findingId: z.string(),
  rootCauseEn: z.string().min(1),
  rootCauseFr: z.string().min(1),
  correctiveActionEn: z.string().min(1),
  correctiveActionFr: z.string().min(1),
  preventiveActionEn: z.string().optional(),
  preventiveActionFr: z.string().optional(),
  assignedToId: z.string().optional(),
  dueDate: z.date().or(z.string().transform((s) => new Date(s))),
  verificationMethod: z.string().optional(),
});

const capUpdateSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(CAPStatus).optional(),
  rootCauseEn: z.string().optional(),
  rootCauseFr: z.string().optional(),
  correctiveActionEn: z.string().optional(),
  correctiveActionFr: z.string().optional(),
  preventiveActionEn: z.string().optional().nullable(),
  preventiveActionFr: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  dueDate: z.date().or(z.string().transform((s) => new Date(s))).optional(),
  verificationMethod: z.string().optional().nullable(),
  verificationNotes: z.string().optional().nullable(),
});

// =============================================================================
// ROUTER
// =============================================================================

export const reviewRouter = router({
  // ==========================================================================
  // QUERIES
  // ==========================================================================

  /**
   * List reviews with filtering and pagination
   */
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.nativeEnum(ReviewStatus).optional(),
          hostOrganizationId: z.string().optional(),
          reviewType: z.nativeEnum(ReviewType).optional(),
          year: z.number().optional(),
          page: z.number().default(1),
          pageSize: z.number().min(1).max(100).default(25),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const {
        status,
        hostOrganizationId,
        reviewType,
        year,
        page = 1,
        pageSize = 25,
      } = input || {};

      const where: Prisma.ReviewWhereInput = {};

      if (status) where.status = status;
      if (hostOrganizationId) where.hostOrganizationId = hostOrganizationId;
      if (reviewType) where.reviewType = reviewType;
      if (year) {
        where.requestedDate = {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        };
      }

      // Role-based filtering
      const userRole = ctx.session.user.role;
      const userOrgId = ctx.session.user.organizationId;

      // ANSP users can only see their own organization's reviews
      if (
        ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER", "STAFF"].includes(
          userRole
        )
      ) {
        where.hostOrganizationId = userOrgId ?? undefined;
      }

      // Reviewers can see reviews they're assigned to or their org's reviews
      if (userRole === "PEER_REVIEWER" || userRole === "LEAD_REVIEWER") {
        where.OR = [
          { hostOrganizationId: userOrgId ?? undefined },
          { teamMembers: { some: { userId: ctx.session.user.id } } },
        ];
      }

      const [reviews, total] = await Promise.all([
        ctx.db.review.findMany({
          where,
          include: {
            hostOrganization: {
              select: {
                id: true,
                nameEn: true,
                nameFr: true,
                icaoCode: true,
                country: true,
              },
            },
            teamMembers: {
              select: { id: true, role: true },
            },
            findings: {
              select: { id: true, status: true },
            },
          },
          orderBy: { requestedDate: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.db.review.count({ where }),
      ]);

      return {
        items: reviews.map((r) => ({
          ...r,
          teamMemberCount: r.teamMembers.length,
          findingCount: r.findings.length,
          openFindingsCount: r.findings.filter((f) => f.status === "OPEN")
            .length,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  /**
   * Get single review by ID with full details
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const review = await ctx.db.review.findUnique({
        where: { id: input.id },
        include: {
          hostOrganization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
              icaoCode: true,
              country: true,
              region: true,
            },
          },
          teamMembers: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              reviewerProfile: {
                select: {
                  id: true,
                  isLeadQualified: true,
                  expertiseAreas: true,
                  homeOrganization: {
                    select: {
                      id: true,
                      nameEn: true,
                      icaoCode: true,
                    },
                  },
                },
              },
            },
          },
          findings: {
            include: {
              correctiveActionPlan: true,
              assignedTo: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          assessments: {
            select: {
              id: true,
              title: true,
              type: true,
              status: true,
            },
          },
          report: true,
        },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Check access permission
      const canAccess = canAccessReview(ctx, review);
      if (!canAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this review",
        });
      }

      return review;
    }),

  /**
   * Get review statistics
   */
  getStats: protectedProcedure
    .input(
      z
        .object({
          organizationId: z.string().optional(),
          year: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.ReviewWhereInput = {};

      if (input?.organizationId) {
        where.hostOrganizationId = input.organizationId;
      }

      if (input?.year) {
        where.requestedDate = {
          gte: new Date(input.year, 0, 1),
          lt: new Date(input.year + 1, 0, 1),
        };
      }

      const [total, requested, scheduled, inProgress, completed, cancelled] =
        await Promise.all([
          ctx.db.review.count({ where }),
          ctx.db.review.count({ where: { ...where, status: "REQUESTED" } }),
          ctx.db.review.count({ where: { ...where, status: "SCHEDULED" } }),
          ctx.db.review.count({ where: { ...where, status: "IN_PROGRESS" } }),
          ctx.db.review.count({ where: { ...where, status: "COMPLETED" } }),
          ctx.db.review.count({ where: { ...where, status: "CANCELLED" } }),
        ]);

      return {
        total,
        requested,
        scheduled,
        inProgress,
        completed,
        cancelled,
      };
    }),

  /**
   * Check prerequisites for requesting a review
   */
  checkPrerequisites: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const reasons: string[] = [];

      // Check 1: User has required role
      const hasRequiredRole = REVIEW_REQUESTER_ROLES.includes(
        ctx.session.user.role
      );
      if (!hasRequiredRole) {
        reasons.push("You do not have permission to request a peer review");
      }

      // Check 2: Organization has submitted assessments
      const submittedAssessments = await ctx.db.assessment.findMany({
        where: {
          organizationId: input.organizationId,
          status: "SUBMITTED",
        },
        select: {
          id: true,
          submittedAt: true,
          overallScore: true,
          questionnaire: {
            select: {
              type: true,
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      });

      const hasSubmittedAssessment = submittedAssessments.length > 0;
      if (!hasSubmittedAssessment) {
        reasons.push(
          "Your organization must complete and submit at least one self-assessment before requesting a peer review"
        );
      }

      // Check 3: No active review in progress
      const activeReview = await ctx.db.review.findFirst({
        where: {
          hostOrganizationId: input.organizationId,
          status: {
            in: ["REQUESTED", "APPROVED", "SCHEDULED", "IN_PROGRESS"],
          },
        },
      });

      const hasActiveReview = !!activeReview;
      if (hasActiveReview) {
        reasons.push(
          "Your organization already has an active peer review in progress"
        );
      }

      return {
        canRequestReview: reasons.length === 0,
        reasons,
        hasSubmittedAssessment,
        hasActiveReview,
        hasRequiredRole,
        submittedAssessments: submittedAssessments.map((a) => ({
          id: a.id,
          type: a.questionnaire.type,
          submittedAt: a.submittedAt,
          overallScore: a.overallScore,
        })),
      };
    }),

  // ==========================================================================
  // MUTATIONS - REVIEW MANAGEMENT
  // ==========================================================================

  /**
   * Create a new review request
   */
  create: protectedProcedure
    .input(reviewRequestSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user can request reviews
      if (!REVIEW_REQUESTER_ROLES.includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to request reviews",
        });
      }

      // Check for active reviews
      const activeReview = await ctx.db.review.findFirst({
        where: {
          hostOrganizationId: input.hostOrganizationId,
          status: {
            in: ["REQUESTED", "APPROVED", "SCHEDULED", "IN_PROGRESS"],
          },
        },
      });

      if (activeReview) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Organization already has an active review",
        });
      }

      // Generate reference number
      const year = new Date().getFullYear();
      const lastReview = await ctx.db.review.findFirst({
        where: {
          referenceNumber: {
            startsWith: `AAPRP-${year}-`,
          },
        },
        orderBy: { referenceNumber: "desc" },
      });

      let sequence = 1;
      if (lastReview) {
        const lastSequence = parseInt(
          lastReview.referenceNumber.split("-")[2],
          10
        );
        sequence = lastSequence + 1;
      }

      // Verify assessments belong to the organization and are submitted
      const assessments = await ctx.db.assessment.findMany({
        where: {
          id: { in: input.assessmentIds },
          organizationId: input.hostOrganizationId,
          status: "SUBMITTED",
        },
        select: { id: true },
      });

      if (assessments.length !== input.assessmentIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Some assessments are invalid, not submitted, or do not belong to the organization",
        });
      }

      // Create the review with connected assessments
      const review = await ctx.db.review.create({
        data: {
          referenceNumber: generateReviewNumber(year, sequence),
          hostOrganizationId: input.hostOrganizationId,
          reviewType: input.reviewType,
          locationType: input.locationType,
          status: "REQUESTED",
          phase: "PLANNING",
          requestedDate: new Date(),
          requestedStartDate: input.requestedStartDate,
          requestedEndDate: input.requestedEndDate,
          areasInScope: input.focusAreas ?? [],
          accommodationProvided: input.accommodationProvided,
          transportationProvided: input.transportationProvided,
          languagePreference: input.languagePreference,
          primaryContactName: input.primaryContactName,
          primaryContactEmail: input.primaryContactEmail,
          primaryContactPhone: input.primaryContactPhone,
          specialRequirements: input.specialRequirements,
          // Connect the selected assessments
          assessments: {
            connect: input.assessmentIds.map((id) => ({ id })),
          },
        },
        include: {
          hostOrganization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
              icaoCode: true,
            },
          },
          assessments: {
            select: {
              id: true,
              title: true,
              type: true,
              status: true,
            },
          },
        },
      });

      // TODO: Send notification to Programme Coordinator

      return review;
    }),

  /**
   * Update review status and details
   */
  update: protectedProcedure
    .input(reviewUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, status, ...data } = input;

      const review = await ctx.db.review.findUnique({
        where: { id },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Only managers can update reviews
      if (!REVIEW_MANAGER_ROLES.includes(ctx.session.user.role)) {
        // Allow host org to update certain fields in specific statuses
        const isHostOrg =
          review.hostOrganizationId === ctx.session.user.organizationId;
        if (!isHostOrg) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to update this review",
          });
        }
      }

      // Validate status transitions
      if (status && status !== review.status) {
        const validTransitions: Record<ReviewStatus, ReviewStatus[]> = {
          REQUESTED: ["APPROVED", "CANCELLED"],
          APPROVED: ["PLANNING", "SCHEDULED", "CANCELLED"],
          PLANNING: ["SCHEDULED", "CANCELLED"],
          SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
          IN_PROGRESS: ["REPORT_DRAFTING", "CANCELLED"],
          REPORT_DRAFTING: ["REPORT_REVIEW"],
          REPORT_REVIEW: ["COMPLETED", "REPORT_DRAFTING"],
          COMPLETED: [],
          CANCELLED: [],
        };

        if (!validTransitions[review.status]?.includes(status)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot transition from ${review.status} to ${status}`,
          });
        }
      }

      const updateData: Prisma.ReviewUpdateInput = { ...data };

      // Set status and related timestamps
      if (status) {
        updateData.status = status;

        if (status === "CANCELLED") {
          // Could add cancelledBy/cancelledAt fields if they exist
        }
        if (status === "COMPLETED") {
          updateData.actualEndDate = new Date();
        }
        if (status === "IN_PROGRESS" && !review.actualStartDate) {
          updateData.actualStartDate = new Date();
        }
      }

      return ctx.db.review.update({
        where: { id },
        data: updateData,
        include: {
          hostOrganization: {
            select: {
              id: true,
              nameEn: true,
              icaoCode: true,
            },
          },
        },
      });
    }),

  /**
   * Cancel a review
   */
  cancel: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().min(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const review = await ctx.db.review.findUnique({
        where: { id: input.id },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      if (review.status === "COMPLETED" || review.status === "CANCELLED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot cancel a completed or already cancelled review",
        });
      }

      return ctx.db.review.update({
        where: { id: input.id },
        data: {
          status: "CANCELLED",
          specialRequirements: review.specialRequirements
            ? `${review.specialRequirements}\n\nCancellation reason: ${input.reason}`
            : `Cancellation reason: ${input.reason}`,
        },
      });
    }),

  // ==========================================================================
  // MUTATIONS - TEAM MANAGEMENT
  // ==========================================================================

  /**
   * Assign team member to review
   */
  assignTeamMember: adminProcedure
    .input(teamMemberAssignmentSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if already assigned
      const existing = await ctx.db.reviewTeamMember.findFirst({
        where: {
          reviewId: input.reviewId,
          userId: input.userId,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already assigned to this review",
        });
      }

      // Get review and check for COI
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        select: { hostOrganizationId: true },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Check user's organization for COI
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { organizationId: true },
      });

      if (user?.organizationId === review.hostOrganizationId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Reviewer cannot review their own organization",
        });
      }

      // If assigning as LEAD, verify qualification
      if (input.role === "LEAD_REVIEWER" && input.reviewerProfileId) {
        const profile = await ctx.db.reviewerProfile.findUnique({
          where: { id: input.reviewerProfileId },
          select: { isLeadQualified: true },
        });

        if (!profile?.isLeadQualified) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Reviewer is not qualified to be a Lead Reviewer",
          });
        }
      }

      return ctx.db.reviewTeamMember.create({
        data: {
          reviewId: input.reviewId,
          userId: input.userId,
          reviewerProfileId: input.reviewerProfileId,
          role: input.role,
          assignedAreas: input.assignedAreas ?? [],
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          reviewerProfile: {
            select: {
              id: true,
              isLeadQualified: true,
              expertiseAreas: true,
            },
          },
        },
      });
    }),

  /**
   * Remove team member from review
   */
  removeTeamMember: adminProcedure
    .input(
      z.object({
        reviewId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.reviewTeamMember.deleteMany({
        where: {
          reviewId: input.reviewId,
          userId: input.userId,
        },
      });

      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team member not found",
        });
      }

      return { success: true };
    }),

  /**
   * Team member responds to invitation
   */
  respondToInvitation: protectedProcedure
    .input(teamMemberResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const teamMember = await ctx.db.reviewTeamMember.findFirst({
        where: {
          reviewId: input.reviewId,
          userId: userId,
        },
      });

      if (!teamMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You are not assigned to this review",
        });
      }

      return ctx.db.reviewTeamMember.update({
        where: { id: teamMember.id },
        data: {
          confirmedAt: input.confirmed ? new Date() : null,
          declinedAt: input.confirmed ? null : new Date(),
          declineReason: input.confirmed ? null : input.declineReason,
        },
      });
    }),

  /**
   * Update team member role or areas
   */
  updateTeamMember: adminProcedure
    .input(
      z.object({
        id: z.string(),
        role: z.nativeEnum(TeamRole).optional(),
        assignedAreas: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      return ctx.db.reviewTeamMember.update({
        where: { id },
        data,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    }),

  // ==========================================================================
  // MUTATIONS - FINDINGS
  // ==========================================================================

  /**
   * Create a finding
   */
  createFinding: protectedProcedure
    .input(findingCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify user is on the review team
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        include: {
          teamMembers: {
            select: { userId: true },
          },
        },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      const isTeamMember = review.teamMembers.some(
        (tm) => tm.userId === ctx.session.user.id
      );
      const isAdmin = REVIEW_MANAGER_ROLES.includes(ctx.session.user.role);

      if (!isTeamMember && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only team members can create findings",
        });
      }

      // Get next finding number
      const lastFinding = await ctx.db.finding.findFirst({
        where: { reviewId: input.reviewId },
        orderBy: { referenceNumber: "desc" },
      });

      let sequence = 1;
      if (lastFinding) {
        const match = lastFinding.referenceNumber.match(/-F(\d+)$/);
        if (match) {
          sequence = parseInt(match[1], 10) + 1;
        }
      }

      return ctx.db.finding.create({
        data: {
          ...input,
          referenceNumber: generateFindingNumber(
            review.referenceNumber,
            sequence
          ),
          status: "OPEN",
        },
        include: {
          review: {
            select: {
              id: true,
              referenceNumber: true,
            },
          },
        },
      });
    }),

  /**
   * Update a finding
   */
  updateFinding: protectedProcedure
    .input(findingUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const finding = await ctx.db.finding.findUnique({
        where: { id },
        include: {
          review: {
            include: {
              teamMembers: {
                select: { userId: true },
              },
            },
          },
        },
      });

      if (!finding) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Finding not found",
        });
      }

      // Check permissions
      const isTeamMember = finding.review.teamMembers.some(
        (tm) => tm.userId === ctx.session.user.id
      );
      const isAdmin = REVIEW_MANAGER_ROLES.includes(ctx.session.user.role);
      const isHostOrg =
        finding.organizationId === ctx.session.user.organizationId;

      if (!isTeamMember && !isAdmin && !isHostOrg) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this finding",
        });
      }

      const updateData: Prisma.FindingUpdateInput = { ...data };

      // Set closed timestamp if closing
      if (data.status === "CLOSED") {
        updateData.closedAt = new Date();
      }

      return ctx.db.finding.update({
        where: { id },
        data: updateData,
        include: {
          correctiveActionPlan: true,
        },
      });
    }),

  /**
   * Delete a finding
   */
  deleteFinding: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if finding has a CAP
      const finding = await ctx.db.finding.findUnique({
        where: { id: input.id },
        include: { correctiveActionPlan: true },
      });

      if (!finding) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Finding not found",
        });
      }

      if (finding.correctiveActionPlan) {
        // Delete CAP first
        await ctx.db.correctiveActionPlan.delete({
          where: { id: finding.correctiveActionPlan.id },
        });
      }

      return ctx.db.finding.delete({
        where: { id: input.id },
      });
    }),

  // ==========================================================================
  // MUTATIONS - CORRECTIVE ACTION PLANS
  // ==========================================================================

  /**
   * Create CAP for a finding
   */
  createCAP: protectedProcedure
    .input(capCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify finding exists and requires CAP
      const finding = await ctx.db.finding.findUnique({
        where: { id: input.findingId },
        select: {
          capRequired: true,
          correctiveActionPlan: true,
          organizationId: true,
        },
      });

      if (!finding) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Finding not found",
        });
      }

      if (!finding.capRequired) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This finding does not require a CAP",
        });
      }

      if (finding.correctiveActionPlan) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A CAP already exists for this finding",
        });
      }

      // Only host organization can create CAP
      const isHostOrg =
        finding.organizationId === ctx.session.user.organizationId;
      const isAdmin = REVIEW_MANAGER_ROLES.includes(ctx.session.user.role);

      if (!isHostOrg && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the host organization can create a CAP",
        });
      }

      return ctx.db.correctiveActionPlan.create({
        data: {
          findingId: input.findingId,
          status: "DRAFT",
          rootCauseEn: input.rootCauseEn,
          rootCauseFr: input.rootCauseFr,
          correctiveActionEn: input.correctiveActionEn,
          correctiveActionFr: input.correctiveActionFr,
          preventiveActionEn: input.preventiveActionEn,
          preventiveActionFr: input.preventiveActionFr,
          assignedToId: input.assignedToId,
          dueDate: input.dueDate,
          verificationMethod: input.verificationMethod,
        },
        include: {
          finding: {
            select: {
              id: true,
              referenceNumber: true,
              titleEn: true,
            },
          },
        },
      });
    }),

  /**
   * Update CAP
   */
  updateCAP: protectedProcedure
    .input(capUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, status, ...data } = input;

      const cap = await ctx.db.correctiveActionPlan.findUnique({
        where: { id },
        include: {
          finding: {
            select: { organizationId: true },
          },
        },
      });

      if (!cap) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CAP not found",
        });
      }

      // Check permissions
      const isHostOrg =
        cap.finding.organizationId === ctx.session.user.organizationId;
      const isAdmin = REVIEW_MANAGER_ROLES.includes(ctx.session.user.role);

      if (!isHostOrg && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this CAP",
        });
      }

      const updateData: Prisma.CorrectiveActionPlanUpdateInput = { ...data };

      // Handle status transitions
      if (status && status !== cap.status) {
        // Validate transition
        const validTransitions: Record<CAPStatus, CAPStatus[]> = {
          DRAFT: ["SUBMITTED"],
          SUBMITTED: ["UNDER_REVIEW", "DRAFT"],
          UNDER_REVIEW: ["ACCEPTED", "REJECTED"],
          ACCEPTED: ["IN_PROGRESS"],
          REJECTED: ["DRAFT"],
          IN_PROGRESS: ["COMPLETED"],
          COMPLETED: ["VERIFIED"],
          VERIFIED: ["CLOSED"],
          CLOSED: [],
        };

        if (!validTransitions[cap.status]?.includes(status)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot transition CAP from ${cap.status} to ${status}`,
          });
        }

        updateData.status = status;

        // Set timestamps based on status
        if (status === "SUBMITTED") {
          updateData.submittedAt = new Date();
        }
        if (status === "ACCEPTED") {
          updateData.acceptedAt = new Date();
        }
        if (status === "COMPLETED") {
          updateData.completedAt = new Date();
        }
        if (status === "VERIFIED") {
          updateData.verifiedAt = new Date();
          updateData.verifiedById = ctx.session.user.id;
        }
      }

      return ctx.db.correctiveActionPlan.update({
        where: { id },
        data: updateData,
        include: {
          finding: {
            select: {
              id: true,
              referenceNumber: true,
              titleEn: true,
            },
          },
        },
      });
    }),

  /**
   * Get overdue CAPs
   */
  getOverdueCAPs: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();

    return ctx.db.correctiveActionPlan.findMany({
      where: {
        status: {
          notIn: ["CLOSED", "VERIFIED", "COMPLETED"],
        },
        dueDate: {
          lt: today,
        },
      },
      include: {
        finding: {
          include: {
            review: {
              include: {
                hostOrganization: {
                  select: {
                    id: true,
                    nameEn: true,
                    icaoCode: true,
                  },
                },
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });
  }),

  /**
   * Get CAP statistics
   */
  getCAPStats: protectedProcedure
    .input(
      z
        .object({
          organizationId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.CorrectiveActionPlanWhereInput = {};

      if (input?.organizationId) {
        where.finding = {
          organizationId: input.organizationId,
        };
      }

      const today = new Date();

      const [total, draft, submitted, inProgress, completed, overdue] =
        await Promise.all([
          ctx.db.correctiveActionPlan.count({ where }),
          ctx.db.correctiveActionPlan.count({
            where: { ...where, status: "DRAFT" },
          }),
          ctx.db.correctiveActionPlan.count({
            where: { ...where, status: "SUBMITTED" },
          }),
          ctx.db.correctiveActionPlan.count({
            where: { ...where, status: "IN_PROGRESS" },
          }),
          ctx.db.correctiveActionPlan.count({
            where: {
              ...where,
              status: { in: ["COMPLETED", "VERIFIED", "CLOSED"] },
            },
          }),
          ctx.db.correctiveActionPlan.count({
            where: {
              ...where,
              status: { notIn: ["CLOSED", "VERIFIED", "COMPLETED"] },
              dueDate: { lt: today },
            },
          }),
        ]);

      return {
        total,
        draft,
        submitted,
        inProgress,
        completed,
        overdue,
      };
    }),
});
