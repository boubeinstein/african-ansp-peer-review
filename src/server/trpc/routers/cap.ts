/**
 * CAP (Corrective Action Plan) Router
 *
 * Provides full CRUD and workflow operations for managing corrective action plans
 * associated with peer review findings. Implements the AFI Programme workflow:
 *
 * Status Flow:
 * DRAFT → SUBMITTED → UNDER_REVIEW → ACCEPTED → IN_PROGRESS → COMPLETED → VERIFIED → CLOSED
 *                                  ↘ REJECTED → DRAFT (revision cycle)
 *
 * NOTE: Overdue CAP notifications (notifyCAPOverdue) should be triggered by a
 * scheduled job (cron) rather than user actions. See src/server/jobs/ for
 * scheduled notification jobs.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  roleProcedure,
} from "../trpc";
import { CAPStatus, UserRole } from "@prisma/client";
import {
  logCreate,
  logUpdate,
  logDelete,
  logSubmission,
  logApproval,
  logRejection,
  logVerification,
  logStatusChange,
} from "@/server/services/audit";

// =============================================================================
// ROLE DEFINITIONS
// =============================================================================

/**
 * Roles that can create CAPs (organization members)
 */
const CAP_CREATE_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "ANSP_ADMIN",
  "SAFETY_MANAGER",
  "QUALITY_MANAGER",
];

/**
 * Roles that can review/accept/reject CAPs (programme management & reviewers)
 */
const CAP_REVIEW_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "STEERING_COMMITTEE",
  "LEAD_REVIEWER",
];

/**
 * Roles that can verify CAP implementation
 */
const CAP_VERIFY_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "STEERING_COMMITTEE",
  "LEAD_REVIEWER",
  "PEER_REVIEWER",
];

/**
 * Roles that can view all CAPs across organizations
 */
const CAP_VIEW_ALL_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "STEERING_COMMITTEE",
];

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const createCAPSchema = z.object({
  findingId: z.string().cuid(),
  rootCauseEn: z
    .string()
    .min(10, "Root cause analysis must be at least 10 characters"),
  rootCauseFr: z
    .string()
    .min(10, "L'analyse des causes profondes doit comporter au moins 10 caractères"),
  correctiveActionEn: z
    .string()
    .min(10, "Corrective action must be at least 10 characters"),
  correctiveActionFr: z
    .string()
    .min(10, "L'action corrective doit comporter au moins 10 caractères"),
  preventiveActionEn: z.string().optional(),
  preventiveActionFr: z.string().optional(),
  assignedToId: z.string().cuid().optional(),
  dueDate: z.coerce.date(),
});

const updateCAPSchema = z.object({
  id: z.string().cuid(),
  rootCauseEn: z
    .string()
    .min(10, "Root cause analysis must be at least 10 characters")
    .optional(),
  rootCauseFr: z
    .string()
    .min(10, "L'analyse des causes profondes doit comporter au moins 10 caractères")
    .optional(),
  correctiveActionEn: z
    .string()
    .min(10, "Corrective action must be at least 10 characters")
    .optional(),
  correctiveActionFr: z
    .string()
    .min(10, "L'action corrective doit comporter au moins 10 caractères")
    .optional(),
  preventiveActionEn: z.string().optional().nullable(),
  preventiveActionFr: z.string().optional().nullable(),
  assignedToId: z.string().cuid().optional().nullable(),
  dueDate: z.coerce.date().optional(),
});

const listCAPSchema = z.object({
  findingId: z.string().cuid().optional(),
  organizationId: z.string().cuid().optional(),
  reviewId: z.string().cuid().optional(),
  status: z.nativeEnum(CAPStatus).optional(),
  overdue: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  sortBy: z
    .enum(["dueDate", "createdAt", "status"])
    .default("dueDate"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

const statusTransitionSchema = z.object({
  id: z.string().cuid(),
  notes: z.string().optional(),
});

const rejectSchema = z.object({
  id: z.string().cuid(),
  reason: z.string().min(10, "Rejection reason must be at least 10 characters"),
});

const verifySchema = z.object({
  id: z.string().cuid(),
  verificationMethod: z.string().min(5, "Verification method is required"),
  verificationNotes: z.string().optional(),
});

const failVerificationSchema = z.object({
  id: z.string().cuid(),
  verificationMethod: z.string().min(5, "Verification method is required"),
  failureReason: z.string().min(10, "Failure reason must be at least 10 characters"),
  verificationNotes: z.string().optional(),
});

// =============================================================================
// STATUS TRANSITION RULES
// =============================================================================

/**
 * Valid status transitions following the AFI Programme workflow
 */
const VALID_STATUS_TRANSITIONS: Record<CAPStatus, CAPStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["IN_PROGRESS"],
  REJECTED: ["DRAFT"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: ["VERIFIED", "IN_PROGRESS"], // IN_PROGRESS for failed verification
  VERIFIED: ["CLOSED"],
  CLOSED: [],
};

/**
 * Check if a status transition is valid
 */
function isValidTransition(
  currentStatus: CAPStatus,
  newStatus: CAPStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

// =============================================================================
// ROUTER
// =============================================================================

export const capRouter = router({
  /**
   * Create a new CAP for a finding
   */
  create: roleProcedure(...CAP_CREATE_ROLES)
    .input(createCAPSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      // Get the finding with organization info
      const finding = await ctx.db.finding.findUnique({
        where: { id: input.findingId },
        include: {
          review: {
            select: { id: true, referenceNumber: true },
          },
          organization: {
            select: { id: true, nameEn: true, nameFr: true },
          },
          correctiveActionPlan: {
            select: { id: true },
          },
        },
      });

      if (!finding) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Finding not found",
        });
      }

      // Check if CAP already exists for this finding
      if (finding.correctiveActionPlan) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A CAP already exists for this finding",
        });
      }

      // Check if finding requires CAP
      if (!finding.capRequired) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This finding does not require a CAP",
        });
      }

      // Verify user belongs to the organization (except super admin)
      if (
        user.role !== "SUPER_ADMIN" &&
        user.organizationId !== finding.organizationId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only create CAPs for your organization's findings",
        });
      }

      // Create the CAP
      const cap = await ctx.db.correctiveActionPlan.create({
        data: {
          findingId: input.findingId,
          rootCauseEn: input.rootCauseEn,
          rootCauseFr: input.rootCauseFr,
          correctiveActionEn: input.correctiveActionEn,
          correctiveActionFr: input.correctiveActionFr,
          preventiveActionEn: input.preventiveActionEn,
          preventiveActionFr: input.preventiveActionFr,
          assignedToId: input.assignedToId,
          dueDate: input.dueDate,
          status: "DRAFT",
        },
        include: {
          finding: {
            select: {
              id: true,
              referenceNumber: true,
              titleEn: true,
              titleFr: true,
              severity: true,
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
      });

      // Log the creation
      await logCreate({
        userId: user.id,
        entityType: "CorrectiveActionPlan",
        entityId: cap.id,
        newState: {
          findingId: input.findingId,
          status: "DRAFT",
          dueDate: input.dueDate,
        },
        metadata: {
          findingReference: cap.finding.referenceNumber,
          severity: cap.finding.severity,
        },
      });

      return cap;
    }),

  /**
   * Get CAP by ID with full details
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const cap = await ctx.db.correctiveActionPlan.findUnique({
        where: { id: input.id },
        include: {
          finding: {
            include: {
              review: {
                select: {
                  id: true,
                  referenceNumber: true,
                  status: true,
                  hostOrganization: {
                    select: {
                      id: true,
                      nameEn: true,
                      nameFr: true,
                      organizationCode: true,
                    },
                  },
                  teamMembers: {
                    select: { userId: true },
                  },
                },
              },
              organization: {
                select: {
                  id: true,
                  nameEn: true,
                  nameFr: true,
                  organizationCode: true,
                },
              },
              question: {
                select: {
                  id: true,
                  pqNumber: true,
                  questionTextEn: true,
                  questionTextFr: true,
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
          documents: true,
        },
      });

      if (!cap) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CAP not found",
        });
      }

      // Check access permission
      const canViewAll = CAP_VIEW_ALL_ROLES.includes(user.role);
      const isOrgMember = user.organizationId === cap.finding.organizationId;
      const isTeamMember = cap.finding.review.teamMembers.some(
        (tm) => tm.userId === user.id
      );

      if (!canViewAll && !isOrgMember && !isTeamMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this CAP",
        });
      }

      return cap;
    }),

  /**
   * Get CAP by finding ID
   */
  getByFinding: protectedProcedure
    .input(z.object({ findingId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const cap = await ctx.db.correctiveActionPlan.findUnique({
        where: { findingId: input.findingId },
        include: {
          finding: {
            select: {
              id: true,
              referenceNumber: true,
              titleEn: true,
              titleFr: true,
              severity: true,
              status: true,
              organizationId: true,
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
      });

      return cap; // Can be null if no CAP exists
    }),

  /**
   * Update CAP (only editable in DRAFT or REJECTED status)
   */
  update: protectedProcedure
    .input(updateCAPSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const { id, ...updateData } = input;

      const existing = await ctx.db.correctiveActionPlan.findUnique({
        where: { id },
        include: {
          finding: {
            select: { organizationId: true },
          },
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CAP not found",
        });
      }

      // Can only edit DRAFT or REJECTED CAPs
      if (!["DRAFT", "REJECTED"].includes(existing.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft or rejected CAPs can be edited",
        });
      }

      // Check permission
      if (
        user.role !== "SUPER_ADMIN" &&
        user.organizationId !== existing.finding.organizationId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only edit CAPs for your organization",
        });
      }

      const updated = await ctx.db.correctiveActionPlan.update({
        where: { id },
        data: updateData,
        include: {
          finding: {
            select: {
              id: true,
              referenceNumber: true,
              titleEn: true,
              titleFr: true,
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
      });

      // Log the update
      await logUpdate({
        userId: user.id,
        entityType: "CorrectiveActionPlan",
        entityId: id,
        previousState: {
          rootCauseEn: existing.rootCauseEn,
          correctiveActionEn: existing.correctiveActionEn,
          dueDate: existing.dueDate,
          assignedToId: existing.assignedToId,
        },
        newState: updateData,
      });

      return updated;
    }),

  /**
   * Submit CAP for review (DRAFT → SUBMITTED)
   */
  submit: protectedProcedure
    .input(statusTransitionSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const cap = await ctx.db.correctiveActionPlan.findUnique({
        where: { id: input.id },
        include: {
          finding: {
            select: { id: true, organizationId: true },
          },
        },
      });

      if (!cap) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CAP not found",
        });
      }

      if (!isValidTransition(cap.status, "SUBMITTED")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot submit a CAP with status ${cap.status}`,
        });
      }

      // Check permission - only organization can submit
      if (
        user.role !== "SUPER_ADMIN" &&
        user.organizationId !== cap.finding.organizationId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the host organization can submit the CAP",
        });
      }

      const updated = await ctx.db.correctiveActionPlan.update({
        where: { id: input.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
        include: {
          finding: {
            select: { id: true, referenceNumber: true },
          },
        },
      });

      // Update finding status
      await ctx.db.finding.update({
        where: { id: cap.findingId },
        data: { status: "CAP_SUBMITTED" },
      });

      // Log the submission
      await logSubmission({
        userId: user.id,
        entityType: "CorrectiveActionPlan",
        entityId: input.id,
        metadata: {
          previousStatus: cap.status,
          notes: input.notes,
          findingReference: updated.finding.referenceNumber,
        },
      });

      return updated;
    }),

  /**
   * Start review of CAP (SUBMITTED → UNDER_REVIEW)
   */
  startReview: roleProcedure(...CAP_REVIEW_ROLES)
    .input(statusTransitionSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const cap = await ctx.db.correctiveActionPlan.findUnique({
        where: { id: input.id },
        include: {
          finding: {
            select: { id: true },
          },
        },
      });

      if (!cap) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CAP not found",
        });
      }

      if (!isValidTransition(cap.status, "UNDER_REVIEW")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot start review for a CAP with status ${cap.status}`,
        });
      }

      const updated = await ctx.db.correctiveActionPlan.update({
        where: { id: input.id },
        data: {
          status: "UNDER_REVIEW",
        },
      });

      // Log the transition
      await logStatusChange({
        userId: user.id,
        entityType: "CorrectiveActionPlan",
        entityId: input.id,
        previousStatus: cap.status,
        newStatus: "UNDER_REVIEW",
        metadata: { notes: input.notes },
      });

      return updated;
    }),

  /**
   * Accept CAP (UNDER_REVIEW → ACCEPTED)
   */
  accept: roleProcedure(...CAP_REVIEW_ROLES)
    .input(statusTransitionSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const cap = await ctx.db.correctiveActionPlan.findUnique({
        where: { id: input.id },
        include: {
          finding: {
            select: { id: true },
          },
        },
      });

      if (!cap) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CAP not found",
        });
      }

      if (!isValidTransition(cap.status, "ACCEPTED")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot accept a CAP with status ${cap.status}`,
        });
      }

      const updated = await ctx.db.correctiveActionPlan.update({
        where: { id: input.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });

      // Update finding status
      await ctx.db.finding.update({
        where: { id: cap.findingId },
        data: { status: "CAP_ACCEPTED" },
      });

      // Log the acceptance
      await logApproval({
        userId: user.id,
        entityType: "CorrectiveActionPlan",
        entityId: input.id,
        metadata: { previousStatus: cap.status, notes: input.notes },
      });

      return updated;
    }),

  /**
   * Reject CAP (UNDER_REVIEW → REJECTED)
   */
  reject: roleProcedure(...CAP_REVIEW_ROLES)
    .input(rejectSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const cap = await ctx.db.correctiveActionPlan.findUnique({
        where: { id: input.id },
        include: {
          finding: {
            select: { id: true },
          },
        },
      });

      if (!cap) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CAP not found",
        });
      }

      if (!isValidTransition(cap.status, "REJECTED")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot reject a CAP with status ${cap.status}`,
        });
      }

      const updated = await ctx.db.correctiveActionPlan.update({
        where: { id: input.id },
        data: {
          status: "REJECTED",
        },
      });

      // Update finding status back to CAP_REQUIRED
      await ctx.db.finding.update({
        where: { id: cap.findingId },
        data: { status: "CAP_REQUIRED" },
      });

      // Log the rejection with reason
      await logRejection({
        userId: user.id,
        entityType: "CorrectiveActionPlan",
        entityId: input.id,
        metadata: { previousStatus: cap.status, reason: input.reason },
      });

      return updated;
    }),

  /**
   * Start implementation (ACCEPTED → IN_PROGRESS)
   */
  startImplementation: protectedProcedure
    .input(statusTransitionSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const cap = await ctx.db.correctiveActionPlan.findUnique({
        where: { id: input.id },
        include: {
          finding: {
            select: { id: true, organizationId: true },
          },
        },
      });

      if (!cap) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CAP not found",
        });
      }

      if (!isValidTransition(cap.status, "IN_PROGRESS")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot start implementation for a CAP with status ${cap.status}`,
        });
      }

      // Check permission - only organization can start implementation
      if (
        user.role !== "SUPER_ADMIN" &&
        user.organizationId !== cap.finding.organizationId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the host organization can start CAP implementation",
        });
      }

      const updated = await ctx.db.correctiveActionPlan.update({
        where: { id: input.id },
        data: {
          status: "IN_PROGRESS",
        },
      });

      // Update finding status
      await ctx.db.finding.update({
        where: { id: cap.findingId },
        data: { status: "IN_PROGRESS" },
      });

      // Log the transition
      await logStatusChange({
        userId: user.id,
        entityType: "CorrectiveActionPlan",
        entityId: input.id,
        previousStatus: cap.status,
        newStatus: "IN_PROGRESS",
        metadata: { notes: input.notes },
      });

      return updated;
    }),

  /**
   * Mark as completed (IN_PROGRESS → COMPLETED)
   */
  markCompleted: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        implementationNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const cap = await ctx.db.correctiveActionPlan.findUnique({
        where: { id: input.id },
        include: {
          finding: {
            select: { id: true, organizationId: true },
          },
        },
      });

      if (!cap) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CAP not found",
        });
      }

      if (!isValidTransition(cap.status, "COMPLETED")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot mark as completed a CAP with status ${cap.status}`,
        });
      }

      // Check permission - only organization can mark as completed
      if (
        user.role !== "SUPER_ADMIN" &&
        user.organizationId !== cap.finding.organizationId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the host organization can mark the CAP as completed",
        });
      }

      const updated = await ctx.db.correctiveActionPlan.update({
        where: { id: input.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      // Log the transition
      await logStatusChange({
        userId: user.id,
        entityType: "CorrectiveActionPlan",
        entityId: input.id,
        previousStatus: cap.status,
        newStatus: "COMPLETED",
        metadata: { implementationNotes: input.implementationNotes },
      });

      return updated;
    }),

  /**
   * Verify CAP implementation (COMPLETED → VERIFIED)
   */
  verify: roleProcedure(...CAP_VERIFY_ROLES)
    .input(verifySchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const cap = await ctx.db.correctiveActionPlan.findUnique({
        where: { id: input.id },
        include: {
          finding: {
            select: { id: true },
          },
        },
      });

      if (!cap) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CAP not found",
        });
      }

      if (!isValidTransition(cap.status, "VERIFIED")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot verify a CAP with status ${cap.status}`,
        });
      }

      const updated = await ctx.db.correctiveActionPlan.update({
        where: { id: input.id },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
          verifiedById: user.id,
          verificationMethod: input.verificationMethod,
          verificationNotes: input.verificationNotes,
        },
      });

      // Update finding status
      await ctx.db.finding.update({
        where: { id: cap.findingId },
        data: { status: "VERIFICATION" },
      });

      // Log the verification
      await logVerification({
        userId: user.id,
        entityType: "CorrectiveActionPlan",
        entityId: input.id,
        verified: true,
        metadata: {
          previousStatus: cap.status,
          verificationMethod: input.verificationMethod,
          verificationNotes: input.verificationNotes,
        },
      });

      return updated;
    }),

  /**
   * Fail verification - send CAP back for rework (COMPLETED → IN_PROGRESS)
   */
  failVerification: roleProcedure(...CAP_VERIFY_ROLES)
    .input(failVerificationSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const cap = await ctx.db.correctiveActionPlan.findUnique({
        where: { id: input.id },
        include: {
          finding: {
            select: { id: true },
          },
        },
      });

      if (!cap) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CAP not found",
        });
      }

      if (!isValidTransition(cap.status, "IN_PROGRESS")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot fail verification for a CAP with status ${cap.status}`,
        });
      }

      const updated = await ctx.db.correctiveActionPlan.update({
        where: { id: input.id },
        data: {
          status: "IN_PROGRESS",
          verificationMethod: input.verificationMethod,
          verificationNotes: `VERIFICATION FAILED: ${input.failureReason}${input.verificationNotes ? `\n\nNotes: ${input.verificationNotes}` : ""}`,
        },
      });

      // Log the failed verification
      await logStatusChange({
        userId: user.id,
        entityType: "CorrectiveActionPlan",
        entityId: input.id,
        previousStatus: cap.status,
        newStatus: "IN_PROGRESS",
        metadata: {
          verificationFailed: true,
          verificationMethod: input.verificationMethod,
          failureReason: input.failureReason,
        },
      });

      return updated;
    }),

  /**
   * Close CAP (VERIFIED → CLOSED)
   */
  close: roleProcedure(...CAP_REVIEW_ROLES)
    .input(statusTransitionSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const cap = await ctx.db.correctiveActionPlan.findUnique({
        where: { id: input.id },
        include: {
          finding: {
            select: { id: true },
          },
        },
      });

      if (!cap) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CAP not found",
        });
      }

      if (!isValidTransition(cap.status, "CLOSED")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot close a CAP with status ${cap.status}`,
        });
      }

      const updated = await ctx.db.correctiveActionPlan.update({
        where: { id: input.id },
        data: {
          status: "CLOSED",
        },
      });

      // Close the finding as well
      await ctx.db.finding.update({
        where: { id: cap.findingId },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
        },
      });

      // Log the closure
      await logStatusChange({
        userId: user.id,
        entityType: "CorrectiveActionPlan",
        entityId: input.id,
        previousStatus: cap.status,
        newStatus: "CLOSED",
        metadata: { notes: input.notes },
      });

      return updated;
    }),

  /**
   * List CAPs with filtering and pagination
   */
  list: protectedProcedure
    .input(listCAPSchema)
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const {
        findingId,
        organizationId,
        reviewId,
        status,
        overdue,
        search,
        page,
        pageSize,
        sortBy,
        sortOrder,
      } = input;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {};

      // Role-based filtering
      const canViewAll = CAP_VIEW_ALL_ROLES.includes(user.role);

      if (!canViewAll) {
        if (CAP_CREATE_ROLES.includes(user.role)) {
          // Organization users see their own CAPs
          where.finding = {
            organizationId: user.organizationId,
          };
        } else if (
          user.role === "LEAD_REVIEWER" ||
          user.role === "PEER_REVIEWER"
        ) {
          // Reviewers see CAPs from reviews they're assigned to
          where.finding = {
            review: {
              teamMembers: {
                some: { userId: user.id },
              },
            },
          };
        }
      }

      // Apply filters
      if (findingId) where.findingId = findingId;
      if (status) where.status = status;

      if (overdue) {
        where.dueDate = { lt: new Date() };
        where.status = { notIn: ["VERIFIED", "CLOSED"] };
      }

      if (organizationId && canViewAll) {
        where.finding = {
          ...where.finding,
          organizationId,
        };
      }

      if (reviewId) {
        where.finding = {
          ...where.finding,
          reviewId,
        };
      }

      // Search
      if (search) {
        where.OR = [
          {
            finding: {
              referenceNumber: { contains: search, mode: "insensitive" },
            },
          },
          {
            finding: {
              titleEn: { contains: search, mode: "insensitive" },
            },
          },
          {
            finding: {
              titleFr: { contains: search, mode: "insensitive" },
            },
          },
          {
            rootCauseEn: { contains: search, mode: "insensitive" },
          },
        ];
      }

      const [caps, total] = await Promise.all([
        ctx.db.correctiveActionPlan.findMany({
          where,
          include: {
            finding: {
              select: {
                id: true,
                referenceNumber: true,
                titleEn: true,
                titleFr: true,
                severity: true,
                review: {
                  select: { id: true, referenceNumber: true },
                },
                organization: {
                  select: { id: true, nameEn: true, nameFr: true, organizationCode: true },
                },
              },
            },
            assignedTo: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.db.correctiveActionPlan.count({ where }),
      ]);

      return {
        caps,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  /**
   * Get overdue CAPs
   */
  getOverdue: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().cuid().optional(),
        reviewId: z.string().cuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {
        dueDate: { lt: new Date() },
        status: { notIn: ["VERIFIED", "CLOSED"] },
      };

      if (input.organizationId) {
        where.finding = { organizationId: input.organizationId };
      }

      if (input.reviewId) {
        where.finding = { ...where.finding, reviewId: input.reviewId };
      }

      const overdueCaps = await ctx.db.correctiveActionPlan.findMany({
        where,
        include: {
          finding: {
            select: {
              id: true,
              referenceNumber: true,
              titleEn: true,
              titleFr: true,
              severity: true,
              organization: {
                select: { id: true, nameEn: true, nameFr: true },
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

      return overdueCaps;
    }),

  /**
   * Get CAP statistics
   */
  getStats: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().cuid().optional(),
        reviewId: z.string().cuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {};

      if (input.organizationId) {
        where.finding = { organizationId: input.organizationId };
      }
      if (input.reviewId) {
        where.finding = { ...where.finding, reviewId: input.reviewId };
      }

      const [total, byStatus, overdue] = await Promise.all([
        ctx.db.correctiveActionPlan.count({ where }),
        ctx.db.correctiveActionPlan.groupBy({
          by: ["status"],
          where,
          _count: true,
        }),
        ctx.db.correctiveActionPlan.count({
          where: {
            ...where,
            dueDate: { lt: new Date() },
            status: { notIn: ["VERIFIED", "CLOSED"] },
          },
        }),
      ]);

      // Convert groupBy result to object
      const statusCounts = byStatus.reduce(
        (acc, item) => ({
          ...acc,
          [item.status]: item._count,
        }),
        {} as Record<CAPStatus, number>
      );

      return {
        total,
        overdue,
        byStatus: statusCounts,
        draft: statusCounts.DRAFT || 0,
        submitted: statusCounts.SUBMITTED || 0,
        underReview: statusCounts.UNDER_REVIEW || 0,
        accepted: statusCounts.ACCEPTED || 0,
        rejected: statusCounts.REJECTED || 0,
        inProgress: statusCounts.IN_PROGRESS || 0,
        completed: statusCounts.COMPLETED || 0,
        verified: statusCounts.VERIFIED || 0,
        closed: statusCounts.CLOSED || 0,
      };
    }),

  /**
   * Delete CAP (admin only, only for DRAFT status)
   */
  delete: roleProcedure("SUPER_ADMIN", "SYSTEM_ADMIN")
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const cap = await ctx.db.correctiveActionPlan.findUnique({
        where: { id: input.id },
        include: {
          documents: true,
        },
      });

      if (!cap) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CAP not found",
        });
      }

      // Can only delete DRAFT CAPs
      if (cap.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft CAPs can be deleted",
        });
      }

      // Cannot delete CAP with documents
      if (cap.documents.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete CAP with attached documents",
        });
      }

      await ctx.db.correctiveActionPlan.delete({
        where: { id: input.id },
      });

      // Log the deletion
      await logDelete({
        userId: user.id,
        entityType: "CorrectiveActionPlan",
        entityId: input.id,
        previousState: {
          findingId: cap.findingId,
          status: cap.status,
          rootCauseEn: cap.rootCauseEn,
          dueDate: cap.dueDate,
        },
      });

      return { success: true };
    }),
});
