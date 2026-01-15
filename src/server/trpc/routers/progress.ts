/**
 * Progress Router
 *
 * tRPC procedures for tracking assessment progress, activity timeline,
 * and dashboard analytics.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { progressService } from "@/server/services/progress.service";
import { prisma } from "@/lib/db";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const GetProgressInput = z.object({
  assessmentId: z.string().cuid(),
});

const GetTimelineInput = z.object({
  assessmentId: z.string().cuid(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

const LogEventInput = z.object({
  assessmentId: z.string().cuid(),
  type: z.enum([
    "CREATED",
    "STARTED",
    "RESPONSE_SAVED",
    "EVIDENCE_ADDED",
    "EVIDENCE_REMOVED",
    "STATUS_CHANGED",
    "SUBMITTED",
    "REVIEWED",
    "COMPLETED",
    "REOPENED",
    "COMMENT_ADDED",
  ]),
  description: z.string().min(1).max(500),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const GetOrganizationAnalyticsInput = z.object({
  organizationId: z.string().cuid(),
});

const GetDashboardStatsInput = z.object({
  organizationId: z.string().cuid().optional(),
});

const GetAssessmentsNeedingAttentionInput = z.object({
  organizationId: z.string().cuid().optional(),
  limit: z.number().min(1).max(50).optional().default(10),
});

const GetAssessmentSummaryInput = z.object({
  assessmentId: z.string().cuid(),
});

// =============================================================================
// PROGRESS ROUTER
// =============================================================================

export const progressRouter = router({
  /**
   * Get progress statistics for an assessment
   */
  getProgress: protectedProcedure
    .input(GetProgressInput)
    .query(async ({ input, ctx }) => {
      const { assessmentId } = input;

      // Verify user has access to this assessment
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
      });

      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }

      // Check access (user must be from the same org or be admin)
      const isAdmin =
        ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const isOrgMember = ctx.user.organizationId === assessment.organizationId;

      if (!isAdmin && !isOrgMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this assessment",
        });
      }

      try {
        const progress =
          await progressService.getAssessmentProgress(assessmentId);
        return progress;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get progress statistics",
        });
      }
    }),

  /**
   * Update assessment progress (recalculate)
   */
  updateProgress: protectedProcedure
    .input(GetProgressInput)
    .mutation(async ({ input, ctx }) => {
      const { assessmentId } = input;

      // Verify access
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
      });

      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }

      const isAdmin =
        ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const isOrgMember = ctx.user.organizationId === assessment.organizationId;

      if (!isAdmin && !isOrgMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this assessment",
        });
      }

      try {
        const newProgress =
          await progressService.updateAssessmentProgress(assessmentId);
        return { assessmentId, progress: newProgress };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update progress",
        });
      }
    }),

  /**
   * Get activity timeline for an assessment
   */
  getTimeline: protectedProcedure
    .input(GetTimelineInput)
    .query(async ({ input, ctx }) => {
      const { assessmentId, limit, offset } = input;

      // Verify access
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
      });

      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }

      const isAdmin =
        ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const isOrgMember = ctx.user.organizationId === assessment.organizationId;

      if (!isAdmin && !isOrgMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this assessment",
        });
      }

      try {
        const timeline = await progressService.getAssessmentTimeline(
          assessmentId,
          limit,
          offset
        );
        return timeline;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to get timeline",
        });
      }
    }),

  /**
   * Log an event for an assessment
   */
  logEvent: protectedProcedure
    .input(LogEventInput)
    .mutation(async ({ input, ctx }) => {
      const { assessmentId, type, description, metadata } = input;

      // Verify access
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
      });

      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }

      const isAdmin =
        ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const isOrgMember = ctx.user.organizationId === assessment.organizationId;

      if (!isAdmin && !isOrgMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this assessment",
        });
      }

      try {
        await progressService.logEvent({
          assessmentId,
          type,
          description,
          metadata,
          userId: ctx.user.id,
        });
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to log event",
        });
      }
    }),

  /**
   * Get organization-level analytics
   */
  getOrganizationAnalytics: protectedProcedure
    .input(GetOrganizationAnalyticsInput)
    .query(async ({ input, ctx }) => {
      const { organizationId } = input;

      // Verify access
      const isAdmin =
        ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const isOrgMember = ctx.user.organizationId === organizationId;

      if (!isAdmin && !isOrgMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this organization",
        });
      }

      try {
        const analytics =
          await progressService.getOrganizationAnalytics(organizationId);
        return analytics;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get organization analytics",
        });
      }
    }),

  /**
   * Get dashboard statistics
   */
  getDashboardStats: protectedProcedure
    .input(GetDashboardStatsInput)
    .query(async ({ input, ctx }) => {
      const { organizationId } = input;

      // If organizationId is provided, verify access
      if (organizationId) {
        const isAdmin =
          ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
        const isOrgMember = ctx.user.organizationId === organizationId;

        if (!isAdmin && !isOrgMember) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to access this organization",
          });
        }
      }

      try {
        // Use user's org if no specific org requested
        const targetOrgId = organizationId ?? ctx.user.organizationId ?? undefined;
        const stats = await progressService.getDashboardStats(
          ctx.user.id,
          targetOrgId
        );
        return stats;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get dashboard statistics",
        });
      }
    }),

  /**
   * Get assessment summary with progress
   */
  getAssessmentSummary: protectedProcedure
    .input(GetAssessmentSummaryInput)
    .query(async ({ input, ctx }) => {
      const { assessmentId } = input;

      // Verify access
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
      });

      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }

      const isAdmin =
        ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const isOrgMember = ctx.user.organizationId === assessment.organizationId;

      if (!isAdmin && !isOrgMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this assessment",
        });
      }

      try {
        const summary =
          await progressService.getAssessmentSummary(assessmentId);
        return summary;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get assessment summary",
        });
      }
    }),

  /**
   * Get assessments that need attention
   */
  getAssessmentsNeedingAttention: protectedProcedure
    .input(GetAssessmentsNeedingAttentionInput)
    .query(async ({ input, ctx }) => {
      const { organizationId, limit } = input;

      // If organizationId is provided, verify access
      if (organizationId) {
        const isAdmin =
          ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
        const isOrgMember = ctx.user.organizationId === organizationId;

        if (!isAdmin && !isOrgMember) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to access this organization",
          });
        }
      }

      try {
        const targetOrgId = organizationId ?? ctx.user.organizationId ?? undefined;
        const assessments =
          await progressService.getAssessmentsNeedingAttention(
            targetOrgId,
            limit
          );
        return assessments;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get assessments needing attention",
        });
      }
    }),

  /**
   * Get event type metadata (for display)
   */
  getEventTypeMetadata: protectedProcedure.query(() => {
    return {
      eventTypes: {
        CREATED: {
          label: "Created",
          labelFr: "Créé",
          icon: "Plus",
          color: "#22C55E",
        },
        STARTED: {
          label: "Started",
          labelFr: "Démarré",
          icon: "Play",
          color: "#3B82F6",
        },
        RESPONSE_SAVED: {
          label: "Response Saved",
          labelFr: "Réponse enregistrée",
          icon: "Save",
          color: "#6366F1",
        },
        EVIDENCE_ADDED: {
          label: "Evidence Added",
          labelFr: "Document ajouté",
          icon: "Paperclip",
          color: "#8B5CF6",
        },
        EVIDENCE_REMOVED: {
          label: "Evidence Removed",
          labelFr: "Document supprimé",
          icon: "Trash2",
          color: "#F97316",
        },
        STATUS_CHANGED: {
          label: "Status Changed",
          labelFr: "Statut modifié",
          icon: "RefreshCw",
          color: "#EAB308",
        },
        SUBMITTED: {
          label: "Submitted",
          labelFr: "Soumis",
          icon: "Send",
          color: "#14B8A6",
        },
        REVIEWED: {
          label: "Reviewed",
          labelFr: "Examiné",
          icon: "CheckCircle",
          color: "#0EA5E9",
        },
        COMPLETED: {
          label: "Completed",
          labelFr: "Complété",
          icon: "CheckCircle2",
          color: "#22C55E",
        },
        REOPENED: {
          label: "Reopened",
          labelFr: "Réouvert",
          icon: "RefreshCcw",
          color: "#F59E0B",
        },
        COMMENT_ADDED: {
          label: "Comment Added",
          labelFr: "Commentaire ajouté",
          icon: "MessageSquare",
          color: "#64748B",
        },
      },
    };
  }),
});
