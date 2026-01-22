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
  ApprovalStatus,
  InvitationStatus,
  Prisma,
} from "@prisma/client";

// Notification service imports
import {
  notifyReviewRequested,
  notifyReviewApproved,
  notifyTeamAssigned,
  notifyReviewScheduled,
  notifyReviewStarted,
  notifyReviewCompleted,
} from "@/server/services/notification-service";

// Team eligibility service
import {
  validateReviewerAssignment,
  validateLeadReviewerAssignment,
  getLeadQualificationStatus,
} from "@/server/services/reviewer-eligibility";

// Status state machine
import {
  canTransition,
  executeTransition,
  getAvailableTransitions,
  getStatusFlow,
} from "@/server/services/review-state-machine";

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
  requestedStartDate: z.date().or(z.string().transform((s) => new Date(s))).optional().nullable(),
  requestedEndDate: z.date().or(z.string().transform((s) => new Date(s))).optional().nullable(),
  plannedStartDate: z.date().or(z.string().transform((s) => new Date(s))).optional().nullable(),
  plannedEndDate: z.date().or(z.string().transform((s) => new Date(s))).optional().nullable(),
  actualStartDate: z.date().or(z.string().transform((s) => new Date(s))).optional().nullable(),
  actualEndDate: z.date().or(z.string().transform((s) => new Date(s))).optional().nullable(),
  objectives: z.string().optional().nullable(),
  specialRequirements: z.string().optional().nullable(),
  areasInScope: z.array(z.string()).optional(),
  questionnairesInScope: z.array(z.string()).optional(),
  // Logistics fields
  accommodationProvided: z.boolean().optional(),
  transportationProvided: z.boolean().optional(),
  languagePreference: z.nativeEnum(LanguagePreference).optional(),
  // Contact fields
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().email().optional(),
  primaryContactPhone: z.string().optional().nullable(),
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
          approvals: {
            select: {
              id: true,
              status: true,
              approvedAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
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

      // Send notifications to stakeholders
      try {
        await notifyReviewRequested({
          id: review.id,
          referenceNumber: review.referenceNumber,
          hostOrganization: {
            id: review.hostOrganization.id,
            nameEn: review.hostOrganization.nameEn,
            nameFr: review.hostOrganization.nameFr,
          },
        });
      } catch (error) {
        console.error("[Review Create] Failed to send notifications:", error);
        // Don't fail the request if notifications fail
      }

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
  // STATUS TRANSITIONS (State Machine)
  // ==========================================================================

  /**
   * Get available status transitions for a review
   */
  getAvailableTransitions: protectedProcedure
    .input(z.object({ reviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userRole = ctx.session.user.role as UserRole;
      return getAvailableTransitions(input.reviewId, userRole);
    }),

  /**
   * Check if a specific transition is valid
   */
  canTransitionTo: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        targetStatus: z.nativeEnum(ReviewStatus),
      })
    )
    .query(async ({ ctx, input }) => {
      const userRole = ctx.session.user.role as UserRole;
      return canTransition(input.reviewId, input.targetStatus, userRole);
    }),

  /**
   * Execute a status transition with validation
   */
  transitionStatus: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        targetStatus: z.nativeEnum(ReviewStatus),
        reason: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userRole = ctx.session.user.role as UserRole;
      const userId = ctx.session.user.id;

      const result = await executeTransition(
        input.reviewId,
        input.targetStatus,
        userId,
        userRole,
        { reason: input.reason, notes: input.notes }
      );

      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition to ${input.targetStatus}: ${result.errors?.join(", ")}`,
        });
      }

      // Fetch review with relations needed for notifications
      const reviewForNotification = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        include: {
          hostOrganization: {
            select: { id: true, nameEn: true, nameFr: true },
          },
        },
      });

      // Send notifications based on new status
      if (reviewForNotification) {
        try {
          switch (input.targetStatus) {
            case "APPROVED":
              await notifyReviewApproved(reviewForNotification);
              break;
            case "SCHEDULED":
              await notifyReviewScheduled(reviewForNotification);
              break;
            case "IN_PROGRESS":
              await notifyReviewStarted(reviewForNotification);
              break;
            case "COMPLETED":
              await notifyReviewCompleted(reviewForNotification);
              break;
          }
        } catch (notifyError) {
          // Log but don't fail the transition if notification fails
          console.error("Notification failed:", notifyError);
        }
      }

      return result.review;
    }),

  /**
   * Get the status flow documentation
   */
  getStatusFlow: protectedProcedure.query(() => {
    return getStatusFlow();
  }),

  // ==========================================================================
  // REVIEW APPROVALS
  // ==========================================================================

  /**
   * Get pending review approvals for Steering Committee / Coordinators
   */
  getPendingApprovals: protectedProcedure.query(async ({ ctx }) => {
    // Only SC and Coordinators can view pending approvals
    const allowedRoles: UserRole[] = [
      "SUPER_ADMIN",
      "SYSTEM_ADMIN",
      "STEERING_COMMITTEE",
      "PROGRAMME_COORDINATOR",
    ];

    if (!allowedRoles.includes(ctx.session.user.role as UserRole)) {
      return [];
    }

    const pendingReviews = await ctx.db.review.findMany({
      where: {
        status: "REQUESTED",
        approvals: {
          none: {
            status: { in: ["APPROVED", "REJECTED"] },
          },
        },
      },
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
        approvals: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { requestedDate: "asc" },
    });

    return pendingReviews;
  }),

  /**
   * Get approval history for a review
   */
  getApprovalHistory: protectedProcedure
    .input(z.object({ reviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.reviewApproval.findMany({
        where: { reviewId: input.reviewId },
        include: {
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  /**
   * Submit approval decision
   */
  submitApprovalDecision: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        decision: z.nativeEnum(ApprovalStatus),
        commentsEn: z.string().optional(),
        commentsFr: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only SC and Coordinators can approve
      const allowedRoles: UserRole[] = [
        "SUPER_ADMIN",
        "SYSTEM_ADMIN",
        "STEERING_COMMITTEE",
        "PROGRAMME_COORDINATOR",
      ];

      if (!allowedRoles.includes(ctx.session.user.role as UserRole)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to approve review requests",
        });
      }

      // Validate review exists and is in REQUESTED status
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        include: {
          hostOrganization: {
            select: { id: true, nameEn: true, nameFr: true },
          },
        },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      if (review.status !== "REQUESTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Review is not in REQUESTED status",
        });
      }

      // Require comments for rejection or deferral
      if (
        (input.decision === "REJECTED" || input.decision === "DEFERRED") &&
        !input.commentsEn &&
        !input.commentsFr
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Comments are required when rejecting or deferring a request",
        });
      }

      // Create approval record
      const approval = await ctx.db.reviewApproval.upsert({
        where: { reviewId: input.reviewId },
        create: {
          reviewId: input.reviewId,
          status: input.decision,
          approvedById: ctx.session.user.id,
          approvedAt: new Date(),
          commentsEn: input.commentsEn,
          commentsFr: input.commentsFr,
        },
        update: {
          status: input.decision,
          approvedById: ctx.session.user.id,
          approvedAt: new Date(),
          commentsEn: input.commentsEn,
          commentsFr: input.commentsFr,
        },
      });

      // Update review status based on decision
      let newStatus: ReviewStatus = review.status;
      if (input.decision === "APPROVED") {
        newStatus = "APPROVED";
      } else if (input.decision === "REJECTED") {
        newStatus = "CANCELLED";
      }
      // DEFERRED keeps status as REQUESTED

      if (newStatus !== review.status) {
        await ctx.db.review.update({
          where: { id: input.reviewId },
          data: { status: newStatus },
        });

        // Send notification
        if (input.decision === "APPROVED") {
          try {
            await notifyReviewApproved({
              id: review.id,
              referenceNumber: review.referenceNumber,
              hostOrganization: {
                id: review.hostOrganization.id,
                nameEn: review.hostOrganization.nameEn,
                nameFr: review.hostOrganization.nameFr ?? review.hostOrganization.nameEn,
              },
              plannedStartDate: review.plannedStartDate,
              plannedEndDate: review.plannedEndDate,
            });
          } catch (error) {
            console.error("Failed to send approval notification:", error);
          }
        }
      }

      return {
        approval,
        newStatus,
      };
    }),

  /**
   * Get approval statistics
   */
  getApprovalStats: protectedProcedure.query(async ({ ctx }) => {
    const [pending, approved, rejected, deferred] = await Promise.all([
      ctx.db.review.count({
        where: {
          status: "REQUESTED",
          approvals: {
            none: { status: { in: ["APPROVED", "REJECTED"] } },
          },
        },
      }),
      ctx.db.reviewApproval.count({
        where: { status: "APPROVED" },
      }),
      ctx.db.reviewApproval.count({
        where: { status: "REJECTED" },
      }),
      ctx.db.reviewApproval.count({
        where: { status: "DEFERRED" },
      }),
    ]);

    // Recent decisions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentDecisions = await ctx.db.reviewApproval.findMany({
      where: {
        approvedAt: { gte: thirtyDaysAgo },
        status: { in: ["APPROVED", "REJECTED"] },
      },
      include: {
        review: {
          select: {
            referenceNumber: true,
            hostOrganization: {
              select: { nameEn: true, nameFr: true },
            },
          },
        },
        approvedBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { approvedAt: "desc" },
      take: 10,
    });

    return {
      pending,
      approved,
      rejected,
      deferred,
      recentDecisions,
    };
  }),

  // ==========================================================================
  // FIELDWORK CHECKLIST
  // ==========================================================================

  /**
   * Get fieldwork checklist for a review
   */
  getFieldworkChecklist: protectedProcedure
    .input(z.object({ reviewId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const checklist = await ctx.db.fieldworkChecklist.findUnique({
        where: { reviewId: input.reviewId },
        include: {
          completedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return checklist;
    }),

  /**
   * Create or initialize fieldwork checklist
   */
  initializeFieldworkChecklist: protectedProcedure
    .input(z.object({ reviewId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user has access (must be team member or admin)
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        include: {
          teamMembers: {
            select: { userId: true, role: true },
          },
        },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Check if user is team member or admin
      const isTeamMember = review.teamMembers.some(
        (m) => m.userId === ctx.session.user.id
      );
      const isAdmin = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(
        ctx.session.user.role as string
      );

      if (!isTeamMember && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage this checklist",
        });
      }

      // Check if checklist already exists
      const existing = await ctx.db.fieldworkChecklist.findUnique({
        where: { reviewId: input.reviewId },
      });

      if (existing) {
        return existing;
      }

      // Create new checklist
      return ctx.db.fieldworkChecklist.create({
        data: {
          reviewId: input.reviewId,
        },
      });
    }),

  /**
   * Update fieldwork checklist item
   */
  updateFieldworkChecklistItem: protectedProcedure
    .input(
      z.object({
        reviewId: z.string().cuid(),
        field: z.enum([
          "documentRequestSent",
          "documentsReceived",
          "preVisitMeetingHeld",
          "reviewPlanApproved",
          "openingMeetingHeld",
          "interviewsCompleted",
          "facilitiesInspected",
          "documentReviewComplete",
          "findingsDiscussed",
          "closingMeetingHeld",
          "findingsEntered",
          "evidenceUploaded",
          "draftReportPrepared",
          "hostFeedbackReceived",
        ]),
        value: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user has access
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        include: {
          teamMembers: {
            select: { userId: true, role: true },
          },
          fieldworkChecklist: true,
        },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Check if user is team member or admin
      const teamMember = review.teamMembers.find(
        (m) => m.userId === ctx.session.user.id
      );
      const isAdmin = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(
        ctx.session.user.role as string
      );

      if (!teamMember && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this checklist",
        });
      }

      // Create checklist if it doesn't exist
      if (!review.fieldworkChecklist) {
        await ctx.db.fieldworkChecklist.create({
          data: {
            reviewId: input.reviewId,
          },
        });
      }

      // Update the specific field
      return ctx.db.fieldworkChecklist.update({
        where: { reviewId: input.reviewId },
        data: {
          [input.field]: input.value,
        },
      });
    }),

  /**
   * Mark fieldwork as complete
   */
  completeFieldwork: protectedProcedure
    .input(z.object({ reviewId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user has access and is lead reviewer
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        include: {
          teamMembers: {
            select: { userId: true, role: true },
          },
          fieldworkChecklist: true,
        },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Check if user is lead reviewer or admin
      const isLeadReviewer = review.teamMembers.some(
        (m) => m.userId === ctx.session.user.id && m.role === "LEAD_REVIEWER"
      );
      const isAdmin = ["SUPER_ADMIN", "SYSTEM_ADMIN"].includes(
        ctx.session.user.role as string
      );

      if (!isLeadReviewer && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the Lead Reviewer can mark fieldwork as complete",
        });
      }

      if (!review.fieldworkChecklist) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Fieldwork checklist not initialized",
        });
      }

      // Verify all items are checked
      const checklist = review.fieldworkChecklist;
      const allChecked =
        checklist.documentRequestSent &&
        checklist.documentsReceived &&
        checklist.preVisitMeetingHeld &&
        checklist.reviewPlanApproved &&
        checklist.openingMeetingHeld &&
        checklist.interviewsCompleted &&
        checklist.facilitiesInspected &&
        checklist.documentReviewComplete &&
        checklist.findingsDiscussed &&
        checklist.closingMeetingHeld &&
        checklist.findingsEntered &&
        checklist.evidenceUploaded &&
        checklist.draftReportPrepared &&
        checklist.hostFeedbackReceived;

      if (!allChecked) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "All checklist items must be completed before marking fieldwork as complete",
        });
      }

      // Mark as complete
      return ctx.db.fieldworkChecklist.update({
        where: { reviewId: input.reviewId },
        data: {
          completedAt: new Date(),
          completedById: ctx.session.user.id,
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
   * Team member responds to invitation (accept or decline).
   * Updates invitation status and timestamps.
   */
  respondToInvitation: protectedProcedure
    .input(
      z.object({
        membershipId: z.string(),
        accept: z.boolean(),
        declineReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the membership
      const membership = await ctx.db.reviewTeamMember.findUnique({
        where: { id: input.membershipId },
        include: {
          review: true,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Verify the current user is the invited member
      if (membership.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only respond to your own invitations",
        });
      }

      // Verify the invitation is in INVITED status
      if (membership.invitationStatus !== "INVITED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot respond to invitation in ${membership.invitationStatus} status`,
        });
      }

      // Validate decline reason if declining
      if (!input.accept && (!input.declineReason || input.declineReason.trim().length < 10)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please provide a reason for declining (at least 10 characters)",
        });
      }

      const now = new Date();

      // Update the membership
      const updated = await ctx.db.reviewTeamMember.update({
        where: { id: input.membershipId },
        data: {
          invitationStatus: input.accept ? "CONFIRMED" : "DECLINED",
          respondedAt: now,
          confirmedAt: input.accept ? now : null,
          declinedAt: input.accept ? null : now,
          declineReason: input.accept ? null : input.declineReason,
        },
        include: {
          review: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return {
        success: true,
        status: updated.invitationStatus,
        reviewReference: updated.review.referenceNumber,
      };
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

  /**
   * Assign multiple team members to a review in a single transaction.
   * Used by the Team Assignment Wizard for bulk team creation.
   */
  assignTeamBulk: adminProcedure
    .input(
      z.object({
        reviewId: z.string().cuid(),
        assignments: z.array(
          z.object({
            userId: z.string().cuid(),
            reviewerProfileId: z.string().cuid(),
            role: z.nativeEnum(TeamRole),
            assignedAreas: z.array(z.string()).optional(),
          })
        ).min(1, "At least one team member is required"),
        replaceExisting: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { reviewId, assignments, replaceExisting } = input;

      // 1. Validate review exists and is in appropriate status
      const review = await ctx.db.review.findUnique({
        where: { id: reviewId },
        select: {
          id: true,
          status: true,
          hostOrganizationId: true,
          teamMembers: {
            select: { id: true, userId: true },
          },
        },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Only allow team assignment in certain statuses
      const allowedStatuses: ReviewStatus[] = ["APPROVED", "PLANNING", "SCHEDULED"];
      if (!allowedStatuses.includes(review.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot assign team when review is in ${review.status} status`,
        });
      }

      // 2. Validate no duplicate users in assignments
      const userIds = assignments.map((a) => a.userId);
      const uniqueUserIds = new Set(userIds);
      if (uniqueUserIds.size !== userIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Duplicate users in team assignments",
        });
      }

      // 3. Validate exactly one LEAD_REVIEWER
      const leadCount = assignments.filter((a) => a.role === "LEAD_REVIEWER").length;
      if (leadCount === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team must have exactly one Lead Reviewer",
        });
      }
      if (leadCount > 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team can only have one Lead Reviewer",
        });
      }

      // 4. Get reviewer profiles to validate COI and lead qualification
      const reviewerProfiles = await ctx.db.reviewerProfile.findMany({
        where: {
          id: { in: assignments.map((a) => a.reviewerProfileId) },
        },
        select: {
          id: true,
          userId: true,
          homeOrganizationId: true,
          isLeadQualified: true,
          conflictsOfInterest: {
            where: {
              organizationId: review.hostOrganizationId,
              endDate: null, // Active COIs only
            },
            select: {
              id: true,
              coiType: true,
            },
          },
        },
      });

      // Create lookup for validation
      const profileMap = new Map(reviewerProfiles.map((p) => [p.id, p]));

      // 5. Validate each assignment
      for (const assignment of assignments) {
        const profile = profileMap.get(assignment.reviewerProfileId);

        if (!profile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Reviewer profile not found: ${assignment.reviewerProfileId}`,
          });
        }

        // Check user matches profile
        if (profile.userId !== assignment.userId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User ID does not match reviewer profile",
          });
        }

        // Check COI - home organization
        if (profile.homeOrganizationId === review.hostOrganizationId) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Reviewer cannot review their own organization`,
          });
        }

        // Check COI - declared conflicts (hard conflicts only)
        const hardConflict = profile.conflictsOfInterest.find(
          (coi) => coi.coiType === "HOME_ORGANIZATION" || coi.coiType === "FAMILY_RELATIONSHIP"
        );
        if (hardConflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Reviewer has a conflict of interest with the host organization`,
          });
        }

        // Check lead qualification if assigning as LEAD_REVIEWER
        if (assignment.role === "LEAD_REVIEWER") {
          const leadValidation = await validateLeadReviewerAssignment(
            assignment.reviewerProfileId,
            reviewId,
            { skipExistingLeadCheck: true } // We already validated exactly one lead above
          );

          if (!leadValidation.valid) {
            // Check if user can approve exceptions
            const canApproveException =
              leadValidation.canOverride &&
              ["PROGRAMME_COORDINATOR", "SUPER_ADMIN"].includes(ctx.session.user.role);

            if (!canApproveException) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Lead Reviewer requirements not met: ${leadValidation.errors.join("; ")}`,
              });
            }
            // Coordinator can override qualification/experience requirements
          }
        }
      }

      // 6. Execute transaction: optionally remove existing, then add new
      const result = await ctx.db.$transaction(async (tx) => {
        // Remove existing team members if requested
        if (replaceExisting && review.teamMembers.length > 0) {
          await tx.reviewTeamMember.deleteMany({
            where: { reviewId },
          });
        }

        // Create all new team members
        const createdMembers = await Promise.all(
          assignments.map((assignment) =>
            tx.reviewTeamMember.create({
              data: {
                reviewId,
                userId: assignment.userId,
                reviewerProfileId: assignment.reviewerProfileId,
                role: assignment.role,
                assignedAreas: assignment.assignedAreas ?? [],
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
            })
          )
        );

        // Update review status to PLANNING if it was APPROVED
        if (review.status === "APPROVED") {
          await tx.review.update({
            where: { id: reviewId },
            data: { status: "PLANNING" },
          });
        }

        return createdMembers;
      });

      // Fetch review with host org for notifications
      const reviewForNotification = await ctx.db.review.findUnique({
        where: { id: reviewId },
        include: {
          hostOrganization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
            },
          },
        },
      });

      // Send team assignment notifications
      if (reviewForNotification) {
        try {
          await notifyTeamAssigned(
            {
              id: reviewForNotification.id,
              referenceNumber: reviewForNotification.referenceNumber,
              hostOrganization: {
                id: reviewForNotification.hostOrganization.id,
                nameEn: reviewForNotification.hostOrganization.nameEn,
                nameFr: reviewForNotification.hostOrganization.nameFr ?? reviewForNotification.hostOrganization.nameEn,
              },
              plannedStartDate: reviewForNotification.plannedStartDate,
              plannedEndDate: reviewForNotification.plannedEndDate,
            },
            assignments.map((a) => ({
              userId: a.userId,
              role: a.role,
            }))
          );
        } catch (error) {
          console.error("[Review Team Bulk] Failed to send notifications:", error);
          // Don't fail the request if notifications fail
        }
      }

      return {
        success: true,
        teamMembers: result,
        count: result.length,
      };
    }),

  /**
   * Assign team members to a review.
   *
   * Authorization: Only Programme Management (SUPER_ADMIN, SYSTEM_ADMIN,
   * STEERING_COMMITTEE, PROGRAMME_COORDINATOR) can assign teams.
   *
   * Validates:
   * - COI: Assigning user cannot be from the host organization (except SUPER_ADMIN)
   * - Review must be in assignable status (REQUESTED, APPROVED, PLANNING, SCHEDULED)
   * - Team must have exactly one Lead Reviewer
   * - Team must have at least 2 members
   * - No assigned reviewer can be from the host organization
   */
  assignTeam: adminProcedure
    .input(
      z.object({
        reviewId: z.string(),
        members: z.array(
          z.object({
            userId: z.string(),
            reviewerProfileId: z.string().optional(),
            role: z.nativeEnum(TeamRole),
            assignedAreas: z.array(z.string()).default([]),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      // Get the review
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        include: { hostOrganization: true },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // COI check: User cannot assign teams to their own organization's reviews
      // (except SUPER_ADMIN who may need to override in exceptional cases)
      if (
        user.role !== "SUPER_ADMIN" &&
        user.organizationId === review.hostOrganizationId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Conflict of interest: You cannot assign reviewers to your own organization's peer review.",
        });
      }

      // Validate review status - can only assign to reviews not yet in progress
      const assignableStatuses = ["REQUESTED", "APPROVED", "PLANNING", "SCHEDULED"];
      if (!assignableStatuses.includes(review.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot modify team for reviews that are already in progress or completed.",
        });
      }

      // Validate: Must have at least 2 members
      if (input.members.length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Review team must have at least 2 members.",
        });
      }

      // Validate: Must have exactly one lead reviewer
      const leadCount = input.members.filter((m) => m.role === "LEAD_REVIEWER").length;
      if (leadCount !== 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Review team must have exactly one Lead Reviewer.",
        });
      }

      // Validate: Check COI for all assigned members
      const userIds = input.members.map((m) => m.userId);
      const users = await ctx.db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, organizationId: true, firstName: true, lastName: true },
      });

      const coiViolations = users.filter(
        (u) => u.organizationId === review.hostOrganizationId
      );

      if (coiViolations.length > 0) {
        const names = coiViolations.map((u) => `${u.firstName} ${u.lastName}`).join(", ");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Conflict of interest: ${names} cannot review their own organization.`,
        });
      }

      // Perform assignment in a transaction
      const result = await ctx.db.$transaction(async (tx) => {
        // Clear existing team members
        await tx.reviewTeamMember.deleteMany({
          where: { reviewId: input.reviewId },
        });

        // Create new team members
        const teamMembers = await tx.reviewTeamMember.createMany({
          data: input.members.map((member) => ({
            reviewId: input.reviewId,
            userId: member.userId,
            reviewerProfileId: member.reviewerProfileId,
            role: member.role,
            assignedAreas: member.assignedAreas,
          })),
        });

        // Update review status if it was REQUESTED or APPROVED
        if (review.status === "REQUESTED" || review.status === "APPROVED") {
          await tx.review.update({
            where: { id: input.reviewId },
            data: { status: "PLANNING" },
          });
        }

        return teamMembers;
      });

      console.log("[Review Team] Assigned:", {
        reviewId: input.reviewId,
        assignedBy: user.id,
        memberCount: input.members.length,
        lead: input.members.find((m) => m.role === "LEAD_REVIEWER")?.userId,
      });

      // Send team assignment notifications
      try {
        await notifyTeamAssigned(
          {
            id: review.id,
            referenceNumber: review.referenceNumber,
            hostOrganization: {
              id: review.hostOrganization.id,
              nameEn: review.hostOrganization.nameEn,
              nameFr: review.hostOrganization.nameFr ?? review.hostOrganization.nameEn,
            },
            plannedStartDate: review.plannedStartDate,
            plannedEndDate: review.plannedEndDate,
          },
          input.members.map((m) => ({
            userId: m.userId,
            role: m.role,
          }))
        );
      } catch (error) {
        console.error("[Review Team] Failed to send notifications:", error);
        // Don't fail the request if notifications fail
      }

      return { success: true, memberCount: result.count };
    }),

  /**
   * Get current team for a review with full details.
   */
  getTeam: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const teamMembers = await ctx.db.reviewTeamMember.findMany({
        where: { reviewId: input.reviewId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              organizationId: true,
            },
          },
          reviewerProfile: {
            include: {
              homeOrganization: {
                select: {
                  id: true,
                  nameEn: true,
                  nameFr: true,
                  icaoCode: true,
                },
              },
              languages: true,
              certifications: {
                where: {
                  OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
                },
              },
            },
          },
        },
        orderBy: [
          { role: "asc" }, // LEAD_REVIEWER first
          { createdAt: "asc" },
        ],
      });

      return teamMembers;
    }),

  /**
   * Add single member to team with eligibility validation.
   *
   * Enforces team-based rules:
   * - Rule 1: Same team as host ANSP (unless cross-team approved)
   * - Rule 2: No self-review (cannot review own organization)
   * - Rule 3: Cross-team requires justification + coordinator approval
   */
  addTeamMember: adminProcedure
    .input(
      z.object({
        reviewId: z.string(),
        userId: z.string(),
        reviewerProfileId: z.string().optional(),
        role: z.nativeEnum(TeamRole).default("REVIEWER"),
        assignedAreas: z.array(z.string()).default([]),
        crossTeamJustification: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get review for validation
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Validate eligibility using team-based rules
      if (input.reviewerProfileId) {
        const approverId = ["PROGRAMME_COORDINATOR", "SUPER_ADMIN"].includes(
          ctx.session.user.role
        )
          ? ctx.session.user.id
          : undefined;

        const validation = await validateReviewerAssignment(
          input.reviewId,
          input.reviewerProfileId,
          input.crossTeamJustification,
          approverId
        );

        if (!validation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: validation.error ?? "Reviewer not eligible for this review",
          });
        }

        // Check if already a member
        const existing = await ctx.db.reviewTeamMember.findFirst({
          where: {
            reviewId: input.reviewId,
            userId: input.userId,
          },
        });

        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User is already a team member",
          });
        }

        // If adding as lead, validate lead reviewer requirements
        if (input.role === "LEAD_REVIEWER") {
          const leadValidation = await validateLeadReviewerAssignment(
            input.reviewerProfileId,
            input.reviewId
          );

          if (!leadValidation.valid) {
            // Check if user can approve exceptions
            const canApproveException =
              leadValidation.canOverride &&
              ["PROGRAMME_COORDINATOR", "SUPER_ADMIN"].includes(ctx.session.user.role);

            if (!canApproveException) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Lead Reviewer requirements not met: ${leadValidation.errors.join("; ")}`,
              });
            }
            // If coordinator can override, allow with warning logged
          }
        }

        // Create team member with cross-team tracking
        const member = await ctx.db.reviewTeamMember.create({
          data: {
            reviewId: input.reviewId,
            userId: input.userId,
            reviewerProfileId: input.reviewerProfileId,
            role: input.role,
            assignedAreas: input.assignedAreas,
            // Cross-team tracking (Rule 3)
            isCrossTeamAssignment: validation.isCrossTeam,
            crossTeamJustification: validation.isCrossTeam
              ? input.crossTeamJustification
              : null,
            crossTeamApprovedById: validation.isCrossTeam ? approverId : null,
            crossTeamApprovedAt: validation.isCrossTeam ? new Date() : null,
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

        return member;
      }

      // Fallback for non-reviewer-profile assignments (legacy support)
      // Still enforce basic COI check
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { organizationId: true, firstName: true, lastName: true },
      });

      if (user?.organizationId === review.hostOrganizationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${user.firstName} ${user.lastName} cannot review their own organization`,
        });
      }

      // Check if already a member
      const existing = await ctx.db.reviewTeamMember.findFirst({
        where: {
          reviewId: input.reviewId,
          userId: input.userId,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is already a team member",
        });
      }

      // If adding as lead, check no other lead exists
      if (input.role === "LEAD_REVIEWER") {
        const existingLead = await ctx.db.reviewTeamMember.findFirst({
          where: {
            reviewId: input.reviewId,
            role: "LEAD_REVIEWER",
          },
        });

        if (existingLead) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Review already has a Lead Reviewer",
          });
        }
      }

      const member = await ctx.db.reviewTeamMember.create({
        data: {
          reviewId: input.reviewId,
          userId: input.userId,
          reviewerProfileId: input.reviewerProfileId,
          role: input.role,
          assignedAreas: input.assignedAreas,
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

      return member;
    }),

  /**
   * Update member role with auto-demotion of existing lead.
   */
  updateTeamMemberRole: adminProcedure
    .input(
      z.object({
        reviewId: z.string(),
        userId: z.string(),
        role: z.nativeEnum(TeamRole),
        assignedAreas: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find the team member
      const teamMember = await ctx.db.reviewTeamMember.findFirst({
        where: {
          reviewId: input.reviewId,
          userId: input.userId,
        },
      });

      if (!teamMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team member not found",
        });
      }

      // If changing to lead, ensure no other lead (auto-demote existing)
      if (input.role === "LEAD_REVIEWER") {
        const existingLead = await ctx.db.reviewTeamMember.findFirst({
          where: {
            reviewId: input.reviewId,
            role: "LEAD_REVIEWER",
            userId: { not: input.userId },
          },
        });

        if (existingLead) {
          // Demote existing lead to reviewer
          await ctx.db.reviewTeamMember.update({
            where: { id: existingLead.id },
            data: { role: "REVIEWER" },
          });
        }
      }

      const member = await ctx.db.reviewTeamMember.update({
        where: { id: teamMember.id },
        data: {
          role: input.role,
          ...(input.assignedAreas && { assignedAreas: input.assignedAreas }),
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

      return member;
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

  // ==========================================================================
  // STATUS TRANSITIONS & WORKFLOW
  // ==========================================================================

  /**
   * Get available next actions for a review based on its current state.
   * Used by the UI to display the smart action button and next actions panel.
   */
  getNextActions: protectedProcedure
    .input(z.object({ reviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        include: {
          teamMembers: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
          findings: {
            select: { id: true, status: true },
          },
          report: {
            select: { id: true, status: true },
          },
          hostOrganization: {
            select: { id: true, nameEn: true },
          },
        },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      const userRole = ctx.session.user.role;
      const userId = ctx.session.user.id;
      const isAdmin = REVIEW_MANAGER_ROLES.includes(userRole);
      const isTeamMember = review.teamMembers.some((tm) => tm.userId === userId);
      const isLeadReviewer = review.teamMembers.some(
        (tm) => tm.userId === userId && tm.role === "LEAD_REVIEWER"
      );
      const isHostOrg = review.hostOrganization.id === ctx.session.user.organizationId;

      // Determine checklist items based on status
      type ChecklistItem = {
        key: string;
        completed: boolean;
        current: boolean;
        actionable: boolean;
      };

      const checklist: ChecklistItem[] = [];

      // Always show these steps
      checklist.push({
        key: "requestApproved",
        completed: review.status !== "REQUESTED",
        current: review.status === "REQUESTED",
        actionable: review.status === "REQUESTED" && isAdmin,
      });

      checklist.push({
        key: "teamAssigned",
        completed: review.teamMembers.length > 0,
        current: (review.status === "APPROVED" || review.status === "PLANNING") && review.teamMembers.length === 0,
        actionable: (review.status === "APPROVED" || review.status === "PLANNING") && isAdmin,
      });

      checklist.push({
        key: "datesConfirmed",
        completed: !!review.plannedStartDate && !!review.plannedEndDate,
        current: review.status === "PLANNING" && review.teamMembers.length > 0 && !review.plannedStartDate,
        actionable: review.status === "PLANNING" && isAdmin,
      });

      checklist.push({
        key: "reviewScheduled",
        completed: ["SCHEDULED", "IN_PROGRESS", "REPORT_DRAFTING", "REPORT_REVIEW", "COMPLETED"].includes(review.status),
        current: review.status === "PLANNING" && !!review.plannedStartDate,
        actionable: review.status === "PLANNING" && isAdmin,
      });

      checklist.push({
        key: "reviewStarted",
        completed: ["IN_PROGRESS", "REPORT_DRAFTING", "REPORT_REVIEW", "COMPLETED"].includes(review.status),
        current: review.status === "SCHEDULED",
        actionable: review.status === "SCHEDULED" && isAdmin,
      });

      checklist.push({
        key: "reviewCompleted",
        completed: ["REPORT_DRAFTING", "REPORT_REVIEW", "COMPLETED"].includes(review.status),
        current: review.status === "IN_PROGRESS",
        actionable: review.status === "IN_PROGRESS" && (isAdmin || isLeadReviewer),
      });

      checklist.push({
        key: "reportDrafted",
        completed: ["REPORT_REVIEW", "COMPLETED"].includes(review.status),
        current: review.status === "REPORT_DRAFTING",
        actionable: review.status === "REPORT_DRAFTING" && (isAdmin || isLeadReviewer),
      });

      checklist.push({
        key: "reportFinalized",
        completed: review.status === "COMPLETED",
        current: review.status === "REPORT_REVIEW",
        actionable: review.status === "REPORT_REVIEW" && isAdmin,
      });

      // Determine primary action based on status
      type NextAction = {
        action: string;
        targetStatus: string | null;
        canPerform: boolean;
        requiresConfirmation: boolean;
        variant: "default" | "outline" | "secondary" | "destructive";
      } | null;

      let primaryAction: NextAction = null;
      const secondaryActions: NextAction[] = [];

      switch (review.status) {
        case "REQUESTED":
          primaryAction = {
            action: "approveRequest",
            targetStatus: "APPROVED",
            canPerform: isAdmin,
            requiresConfirmation: true,
            variant: "default",
          };
          secondaryActions.push({
            action: "cancelRequest",
            targetStatus: "CANCELLED",
            canPerform: isAdmin || isHostOrg,
            requiresConfirmation: true,
            variant: "destructive",
          });
          break;

        case "APPROVED":
          if (review.teamMembers.length === 0) {
            primaryAction = {
              action: "assignTeam",
              targetStatus: null,
              canPerform: isAdmin,
              requiresConfirmation: false,
              variant: "default",
            };
          } else {
            primaryAction = {
              action: "startPlanning",
              targetStatus: "PLANNING",
              canPerform: isAdmin,
              requiresConfirmation: false,
              variant: "default",
            };
          }
          break;

        case "PLANNING":
          if (review.teamMembers.length === 0) {
            primaryAction = {
              action: "assignTeam",
              targetStatus: null,
              canPerform: isAdmin,
              requiresConfirmation: false,
              variant: "default",
            };
          } else if (!review.plannedStartDate || !review.plannedEndDate) {
            primaryAction = {
              action: "setDates",
              targetStatus: null,
              canPerform: isAdmin,
              requiresConfirmation: false,
              variant: "default",
            };
          } else {
            primaryAction = {
              action: "scheduleReview",
              targetStatus: "SCHEDULED",
              canPerform: isAdmin,
              requiresConfirmation: true,
              variant: "default",
            };
          }
          break;

        case "SCHEDULED":
          primaryAction = {
            action: "startReview",
            targetStatus: "IN_PROGRESS",
            canPerform: isAdmin,
            requiresConfirmation: true,
            variant: "default",
          };
          break;

        case "IN_PROGRESS":
          primaryAction = {
            action: "completeFieldwork",
            targetStatus: "REPORT_DRAFTING",
            canPerform: isAdmin || isLeadReviewer,
            requiresConfirmation: true,
            variant: "default",
          };
          break;

        case "REPORT_DRAFTING":
          primaryAction = {
            action: "submitForReview",
            targetStatus: "REPORT_REVIEW",
            canPerform: isAdmin || isLeadReviewer,
            requiresConfirmation: true,
            variant: "default",
          };
          break;

        case "REPORT_REVIEW":
          primaryAction = {
            action: "finalizeReport",
            targetStatus: "COMPLETED",
            canPerform: isAdmin,
            requiresConfirmation: true,
            variant: "default",
          };
          secondaryActions.push({
            action: "requestRevisions",
            targetStatus: "REPORT_DRAFTING",
            canPerform: isAdmin,
            requiresConfirmation: true,
            variant: "outline",
          });
          break;

        case "COMPLETED":
          // No actions for completed reviews
          break;

        case "CANCELLED":
          // No actions for cancelled reviews
          break;
      }

      return {
        review: {
          id: review.id,
          status: review.status,
          referenceNumber: review.referenceNumber,
          hasTeam: review.teamMembers.length > 0,
          teamSize: review.teamMembers.length,
          hasLeadReviewer: review.teamMembers.some((tm) => tm.role === "LEAD_REVIEWER"),
          hasDates: !!review.plannedStartDate && !!review.plannedEndDate,
          findingsCount: review.findings.length,
          openFindingsCount: review.findings.filter((f) => f.status === "OPEN").length,
          hasReport: !!review.report,
          reportStatus: review.report?.status ?? null,
        },
        checklist,
        primaryAction,
        secondaryActions: secondaryActions.filter((a) => a !== null && a.canPerform),
        userContext: {
          isAdmin,
          isTeamMember,
          isLeadReviewer,
          isHostOrg,
        },
      };
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

  // =============================================================================
  // INVITATION MANAGEMENT
  // =============================================================================

  /**
   * Send invitations to team members.
   * Updates status from PENDING to INVITED for specified members.
   */
  sendInvitations: adminProcedure
    .input(
      z.object({
        reviewId: z.string(),
        memberIds: z.array(z.string()).optional(), // If not provided, sends to all PENDING
      })
    )
    .mutation(async ({ ctx, input }) => {
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        include: {
          hostOrganization: true,
        },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Build where clause for members to invite
      const whereClause: Prisma.ReviewTeamMemberWhereInput = {
        reviewId: input.reviewId,
        invitationStatus: "PENDING",
      };

      if (input.memberIds && input.memberIds.length > 0) {
        whereClause.id = { in: input.memberIds };
      }

      // Update all matching members to INVITED
      const result = await ctx.db.reviewTeamMember.updateMany({
        where: whereClause,
        data: {
          invitationStatus: "INVITED",
          invitedAt: new Date(),
        },
      });

      // TODO: Send notification emails to invited members
      // This would integrate with the notification service

      return {
        success: true,
        invitedCount: result.count,
      };
    }),

  /**
   * Resend invitation to a team member.
   */
  resendInvitation: adminProcedure
    .input(
      z.object({
        membershipId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.reviewTeamMember.findUnique({
        where: { id: input.membershipId },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team member not found",
        });
      }

      // Can only resend if status is INVITED or PENDING
      if (!["INVITED", "PENDING"].includes(membership.invitationStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot resend invitation in ${membership.invitationStatus} status`,
        });
      }

      // Update invitation timestamp
      const updated = await ctx.db.reviewTeamMember.update({
        where: { id: input.membershipId },
        data: {
          invitationStatus: "INVITED",
          invitedAt: new Date(),
        },
      });

      // TODO: Resend notification email

      return {
        success: true,
        invitedAt: updated.invitedAt,
      };
    }),

  /**
   * Withdraw an invitation (coordinator cancels before response).
   */
  withdrawInvitation: adminProcedure
    .input(
      z.object({
        membershipId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.reviewTeamMember.findUnique({
        where: { id: input.membershipId },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team member not found",
        });
      }

      // Can only withdraw if status is INVITED or PENDING
      if (!["INVITED", "PENDING"].includes(membership.invitationStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot withdraw invitation in ${membership.invitationStatus} status`,
        });
      }

      // Update to WITHDRAWN status
      await ctx.db.reviewTeamMember.update({
        where: { id: input.membershipId },
        data: {
          invitationStatus: "WITHDRAWN",
        },
      });

      // TODO: Notify the member that their invitation was withdrawn

      return { success: true };
    }),

  /**
   * Remove and replace a declined team member.
   */
  replaceDeclinedMember: adminProcedure
    .input(
      z.object({
        membershipId: z.string(),
        replacementUserId: z.string(),
        replacementReviewerProfileId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.reviewTeamMember.findUnique({
        where: { id: input.membershipId },
        include: {
          review: true,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team member not found",
        });
      }

      // Can only replace if status is DECLINED
      if (membership.invitationStatus !== "DECLINED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only replace declined members",
        });
      }

      // Delete the old membership and create a new one in a transaction
      const [, newMember] = await ctx.db.$transaction([
        ctx.db.reviewTeamMember.delete({
          where: { id: input.membershipId },
        }),
        ctx.db.reviewTeamMember.create({
          data: {
            reviewId: membership.reviewId,
            userId: input.replacementUserId,
            reviewerProfileId: input.replacementReviewerProfileId,
            role: membership.role,
            assignedAreas: membership.assignedAreas,
            invitationStatus: "PENDING",
          },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
      ]);

      return {
        success: true,
        newMember: {
          id: newMember.id,
          name: `${newMember.user.firstName} ${newMember.user.lastName}`,
        },
      };
    }),

  /**
   * Get pending invitations for current user (reviewer view).
   */
  getMyInvitations: protectedProcedure.query(async ({ ctx }) => {
    const invitations = await ctx.db.reviewTeamMember.findMany({
      where: {
        userId: ctx.session.user.id,
        invitationStatus: "INVITED",
      },
      include: {
        review: {
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
          },
        },
      },
      orderBy: {
        invitedAt: "desc",
      },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      role: inv.role,
      invitedAt: inv.invitedAt,
      review: {
        id: inv.review.id,
        referenceNumber: inv.review.referenceNumber,
        reviewType: inv.review.reviewType,
        plannedStartDate: inv.review.plannedStartDate,
        plannedEndDate: inv.review.plannedEndDate,
        hostOrganization: inv.review.hostOrganization,
        areasInScope: inv.review.areasInScope,
      },
    }));
  }),

  /**
   * Get invitation statistics for a review (coordinator view).
   */
  getInvitationStats: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const members = await ctx.db.reviewTeamMember.findMany({
        where: { reviewId: input.reviewId },
        select: {
          invitationStatus: true,
        },
      });

      const stats = {
        total: members.length,
        pending: members.filter((m) => m.invitationStatus === "PENDING").length,
        invited: members.filter((m) => m.invitationStatus === "INVITED").length,
        confirmed: members.filter((m) => m.invitationStatus === "CONFIRMED").length,
        declined: members.filter((m) => m.invitationStatus === "DECLINED").length,
        withdrawn: members.filter((m) => m.invitationStatus === "WITHDRAWN").length,
      };

      return {
        ...stats,
        isTeamReady: stats.confirmed >= 2 && stats.pending === 0 && stats.invited === 0,
        hasLead: false, // Will need to check role as well
      };
    }),

  /**
   * Get team with full invitation details (coordinator view).
   */
  getTeamWithInvitations: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const members = await ctx.db.reviewTeamMember.findMany({
        where: { reviewId: input.reviewId },
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
            include: {
              homeOrganization: {
                select: {
                  id: true,
                  nameEn: true,
                  nameFr: true,
                  icaoCode: true,
                },
              },
            },
          },
        },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      });

      // Calculate stats
      const stats = {
        total: members.length,
        pending: members.filter((m) => m.invitationStatus === "PENDING").length,
        invited: members.filter((m) => m.invitationStatus === "INVITED").length,
        confirmed: members.filter((m) => m.invitationStatus === "CONFIRMED").length,
        declined: members.filter((m) => m.invitationStatus === "DECLINED").length,
        withdrawn: members.filter((m) => m.invitationStatus === "WITHDRAWN").length,
      };

      const hasConfirmedLead = members.some(
        (m) => m.role === "LEAD_REVIEWER" && m.invitationStatus === "CONFIRMED"
      );

      return {
        members,
        stats,
        isTeamReady:
          stats.confirmed >= 2 &&
          stats.pending === 0 &&
          stats.invited === 0 &&
          hasConfirmedLead,
        hasConfirmedLead,
      };
    }),

  // =============================================================================
  // LEAD REVIEWER VALIDATION
  // =============================================================================

  /**
   * Validate if a reviewer can be assigned as Lead Reviewer.
   * Returns detailed validation results with requirements breakdown.
   */
  validateLeadReviewer: protectedProcedure
    .input(
      z.object({
        reviewerProfileId: z.string(),
        reviewId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const validation = await validateLeadReviewerAssignment(
        input.reviewerProfileId,
        input.reviewId
      );

      // Check if current user can approve exceptions
      const canApprove = ["PROGRAMME_COORDINATOR", "SUPER_ADMIN"].includes(
        ctx.session.user.role
      );

      return {
        ...validation,
        canUserApproveException: canApprove && validation.canOverride,
      };
    }),

  /**
   * Get lead qualification status for a reviewer.
   * Returns requirements checklist with current status.
   */
  getLeadQualificationStatus: protectedProcedure
    .input(
      z.object({
        reviewerProfileId: z.string(),
      })
    )
    .query(async ({ input }) => {
      return getLeadQualificationStatus(input.reviewerProfileId);
    }),
});
