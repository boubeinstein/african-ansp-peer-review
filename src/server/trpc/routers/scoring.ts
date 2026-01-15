/**
 * Scoring Router
 *
 * tRPC procedures for calculating and retrieving assessment scores.
 * Implements ICAO USOAP CMA (EI) and CANSO SoE 2024 (SMS Maturity) scoring.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { scoringService } from "@/server/services/scoring.service";
import { prisma } from "@/lib/db";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const CalculateEIInput = z.object({
  assessmentId: z.string().cuid(),
  useWeighting: z.boolean().optional().default(false),
});

const CalculateSMSInput = z.object({
  assessmentId: z.string().cuid(),
});

const GetScoresInput = z.object({
  assessmentId: z.string().cuid(),
});

const GetScoreBreakdownInput = z.object({
  assessmentId: z.string().cuid(),
});

const CompareAssessmentsInput = z.object({
  assessmentIds: z.array(z.string().cuid()).min(1).max(10),
});

const RecalculateInput = z.object({
  assessmentId: z.string().cuid(),
  force: z.boolean().optional().default(false),
});

const ValidateForScoringInput = z.object({
  assessmentId: z.string().cuid(),
});

const GetOrganizationHistoryInput = z.object({
  organizationId: z.string().cuid(),
  questionnaireType: z.enum(["ANS_USOAP_CMA", "SMS_CANSO_SOE"]).optional(),
});

// =============================================================================
// SCORING ROUTER
// =============================================================================

export const scoringRouter = router({
  /**
   * Calculate EI score for ANS (USOAP CMA) assessment
   */
  calculateEI: protectedProcedure
    .input(CalculateEIInput)
    .mutation(async ({ input, ctx }) => {
      const { assessmentId, useWeighting } = input;

      // Verify user has access to this assessment
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: { organization: true, questionnaire: true },
      });

      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }

      // Check access (user must be from the same org or be admin)
      const isAdmin = ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const isOrgMember = ctx.user.organizationId === assessment.organizationId;

      if (!isAdmin && !isOrgMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this assessment",
        });
      }

      if (assessment.questionnaire.type !== "ANS_USOAP_CMA") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This assessment is not an ANS (USOAP CMA) type",
        });
      }

      try {
        const scores = await scoringService.calculateEIScore(assessmentId, {
          useWeighting,
        });

        return {
          success: true,
          scores,
          assessment: {
            id: assessment.id,
            title: assessment.title,
            organization: assessment.organization.nameEn,
            questionnaireCode: assessment.questionnaire.code,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to calculate EI score",
        });
      }
    }),

  /**
   * Calculate SMS maturity for CANSO SoE assessment
   */
  calculateSMS: protectedProcedure
    .input(CalculateSMSInput)
    .mutation(async ({ input, ctx }) => {
      const { assessmentId } = input;

      // Verify user has access
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: { organization: true, questionnaire: true },
      });

      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }

      const isAdmin = ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const isOrgMember = ctx.user.organizationId === assessment.organizationId;

      if (!isAdmin && !isOrgMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this assessment",
        });
      }

      if (assessment.questionnaire.type !== "SMS_CANSO_SOE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This assessment is not an SMS (CANSO SoE) type",
        });
      }

      try {
        const scores = await scoringService.calculateSMSMaturity(assessmentId);

        return {
          success: true,
          scores,
          assessment: {
            id: assessment.id,
            title: assessment.title,
            organization: assessment.organization.nameEn,
            questionnaireCode: assessment.questionnaire.code,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to calculate SMS maturity",
        });
      }
    }),

  /**
   * Get stored scores for an assessment
   */
  getScores: protectedProcedure
    .input(GetScoresInput)
    .query(async ({ input, ctx }) => {
      const { assessmentId } = input;

      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: { organization: true, questionnaire: true },
      });

      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }

      const isAdmin = ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const isOrgMember = ctx.user.organizationId === assessment.organizationId;

      if (!isAdmin && !isOrgMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this assessment",
        });
      }

      return {
        assessmentId: assessment.id,
        title: assessment.title,
        type: assessment.questionnaire.type,
        organization: assessment.organization.nameEn,
        overallScore: assessment.overallScore,
        eiScore: assessment.eiScore,
        maturityLevel: assessment.maturityLevel,
        categoryScores: assessment.categoryScores,
        progress: assessment.progress,
        status: assessment.status,
      };
    }),

  /**
   * Get detailed score breakdown (recalculate on demand)
   */
  getScoreBreakdown: protectedProcedure
    .input(GetScoreBreakdownInput)
    .query(async ({ input, ctx }) => {
      const { assessmentId } = input;

      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: { organization: true, questionnaire: true },
      });

      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }

      const isAdmin = ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const isOrgMember = ctx.user.organizationId === assessment.organizationId;

      if (!isAdmin && !isOrgMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this assessment",
        });
      }

      try {
        const breakdown = await scoringService.getScoreBreakdown(assessmentId);

        return {
          assessmentId: assessment.id,
          type: assessment.questionnaire.type,
          breakdown,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get score breakdown",
        });
      }
    }),

  /**
   * Compare scores across multiple assessments
   */
  compareAssessments: protectedProcedure
    .input(CompareAssessmentsInput)
    .query(async ({ input, ctx }) => {
      const { assessmentIds } = input;

      // Verify access to all assessments
      const assessments = await prisma.assessment.findMany({
        where: { id: { in: assessmentIds } },
        include: { organization: true },
      });

      const isAdmin = ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";

      for (const assessment of assessments) {
        const isOrgMember =
          ctx.user.organizationId === assessment.organizationId;
        if (!isAdmin && !isOrgMember) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `You do not have permission to access assessment ${assessment.id}`,
          });
        }
      }

      try {
        const comparison = await scoringService.compareScores(assessmentIds);
        return comparison;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to compare assessments",
        });
      }
    }),

  /**
   * Force recalculation of scores
   */
  recalculate: protectedProcedure
    .input(RecalculateInput)
    .mutation(async ({ input, ctx }) => {
      const { assessmentId, force } = input;

      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: { organization: true, questionnaire: true },
      });

      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }

      const isAdmin = ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const isOrgMember = ctx.user.organizationId === assessment.organizationId;

      if (!isAdmin && !isOrgMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this assessment",
        });
      }

      // Validate before recalculating unless forced
      if (!force) {
        const validation =
          await scoringService.validateForScoring(assessmentId);
        if (!validation.canCalculate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: validation.errors.join("; "),
          });
        }
      }

      try {
        await scoringService.calculateAndSaveScores(assessmentId);

        // Fetch updated assessment
        const updated = await prisma.assessment.findUnique({
          where: { id: assessmentId },
        });

        return {
          success: true,
          assessmentId,
          overallScore: updated?.overallScore,
          eiScore: updated?.eiScore,
          maturityLevel: updated?.maturityLevel,
          progress: updated?.progress,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to recalculate scores",
        });
      }
    }),

  /**
   * Validate assessment for scoring
   */
  validateForScoring: protectedProcedure
    .input(ValidateForScoringInput)
    .query(async ({ input, ctx }) => {
      const { assessmentId } = input;

      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: { organization: true },
      });

      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }

      const isAdmin = ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const isOrgMember = ctx.user.organizationId === assessment.organizationId;

      if (!isAdmin && !isOrgMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this assessment",
        });
      }

      try {
        const validation =
          await scoringService.validateForScoring(assessmentId);
        return validation;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Validation failed",
        });
      }
    }),

  /**
   * Get score history for an organization
   */
  getOrganizationHistory: protectedProcedure
    .input(GetOrganizationHistoryInput)
    .query(async ({ input, ctx }) => {
      const { organizationId, questionnaireType } = input;

      // Verify access
      const isAdmin = ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const isOrgMember = ctx.user.organizationId === organizationId;

      if (!isAdmin && !isOrgMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this organization",
        });
      }

      try {
        const history = await scoringService.getOrganizationScoreHistory(
          organizationId,
          questionnaireType
        );
        return history;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get score history",
        });
      }
    }),

  /**
   * Get scoring labels and thresholds (for display)
   */
  getScoringMetadata: protectedProcedure.query(() => {
    return {
      eiThresholds: {
        excellent: { min: 90, label: "Excellent", color: "#22C55E" },
        good: { min: 70, label: "Good", color: "#3B82F6" },
        satisfactory: { min: 50, label: "Satisfactory", color: "#EAB308" },
        needsImprovement: { min: 30, label: "Needs Improvement", color: "#F97316" },
        poor: { min: 0, label: "Poor", color: "#DC2626" },
      },
      maturityLevels: {
        LEVEL_A: {
          code: "A",
          name: "Initial/Ad-hoc",
          description: "No formal processes",
          color: "#DC2626",
          range: "0-20%",
        },
        LEVEL_B: {
          code: "B",
          name: "Defined/Documented",
          description: "Processes documented but not consistently applied",
          color: "#F97316",
          range: "21-40%",
        },
        LEVEL_C: {
          code: "C",
          name: "Implemented/Measured",
          description: "Processes implemented and measured",
          color: "#EAB308",
          range: "41-60%",
        },
        LEVEL_D: {
          code: "D",
          name: "Managed/Controlled",
          description: "Processes managed with continuous monitoring",
          color: "#22C55E",
          range: "61-80%",
        },
        LEVEL_E: {
          code: "E",
          name: "Optimizing/Leading",
          description: "Industry-leading practices, continuous improvement",
          color: "#3B82F6",
          range: "81-100%",
        },
      },
      minCompletionForScoring: 80,
      priorityPQWeight: 1.5,
    };
  }),
});
