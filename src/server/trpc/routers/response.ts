/**
 * Response Router - Assessment Response Management API
 *
 * Provides CRUD operations for assessment responses including:
 * - Single and bulk response saves
 * - Auto-save support for drafts
 * - Evidence attachment management
 * - Progress tracking
 *
 * Supports both ANS (USOAP CMA) and SMS (CANSO SoE) response types.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import {
  SaveResponseInput,
  BulkSaveResponsesInput,
  GetResponsesInput,
  DeleteResponseInput,
  AddEvidenceInput,
  RemoveEvidenceInput,
  RESPONSE_ERRORS,
  MATURITY_LEVEL_REVERSE,
  ANS_RESPONSE_LABELS,
  SMS_MATURITY_LABELS,
} from "@/lib/validations/response";
import {
  checkAssessmentAccess,
  isAssessmentEditable,
  saveResponse,
  saveResponses,
  getResponses,
  getResponseByQuestion,
  clearResponse,
  addEvidence,
  removeEvidence,
  getDetailedProgress,
  getResponsesForScoring,
  transformResponsesForScoring,
  validateResponseValue,
  validateQuestionInQuestionnaire,
  logResponseAudit,
} from "@/server/services/response.service";
import {
  calculateEIScore,
  calculateSMSMaturity,
  calculateCategoryScores,
} from "@/lib/assessment";

// =============================================================================
// RESPONSE ROUTER
// =============================================================================

export const responseRouter = router({
  // ============================================
  // SAVE OPERATIONS
  // ============================================

  /**
   * Save a single response (auto-save compatible)
   * Used for real-time saving as users answer questions
   */
  save: protectedProcedure
    .input(SaveResponseInput)
    .mutation(async ({ ctx, input }) => {
      const { assessment, hasAccess, canWrite, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        true
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || RESPONSE_ERRORS.ASSESSMENT_NOT_FOUND.en,
        });
      }

      if (!canWrite) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: RESPONSE_ERRORS.UNAUTHORIZED.en,
        });
      }

      // Check assessment is editable
      if (!isAssessmentEditable(assessment.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: RESPONSE_ERRORS.NOT_EDITABLE.en,
        });
      }

      // Validate question belongs to questionnaire
      const isValidQuestion = await validateQuestionInQuestionnaire(
        input.questionId,
        assessment.questionnaireId
      );

      if (!isValidQuestion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: RESPONSE_ERRORS.QUESTION_NOT_FOUND.en,
        });
      }

      // Validate response value
      const validation = validateResponseValue(
        assessment.questionnaire.type,
        input.ansResponse,
        input.smsResponse
      );

      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.error || RESPONSE_ERRORS.INVALID_RESPONSE_TYPE.en,
        });
      }

      // Save response
      const result = await saveResponse(
        input,
        ctx.user.id,
        assessment.questionnaire.type
      );

      // Log audit
      await logResponseAudit(ctx.user.id, "SAVE_RESPONSE", input.assessmentId, input.questionId, {
        ansResponse: input.ansResponse,
        smsResponse: input.smsResponse,
        isDraft: input.isDraft,
      });

      return result;
    }),

  /**
   * Bulk save multiple responses
   * Used for batch updates or offline sync
   */
  bulkSave: protectedProcedure
    .input(BulkSaveResponsesInput)
    .mutation(async ({ ctx, input }) => {
      const { assessment, hasAccess, canWrite, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        true
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || RESPONSE_ERRORS.ASSESSMENT_NOT_FOUND.en,
        });
      }

      if (!canWrite) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: RESPONSE_ERRORS.UNAUTHORIZED.en,
        });
      }

      if (!isAssessmentEditable(assessment.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: RESPONSE_ERRORS.NOT_EDITABLE.en,
        });
      }

      // Validate all responses
      for (const response of input.responses) {
        const validation = validateResponseValue(
          assessment.questionnaire.type,
          response.ansResponse,
          response.smsResponse
        );

        if (!validation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Question ${response.questionId}: ${validation.error}`,
          });
        }
      }

      // Save all responses
      const result = await saveResponses(
        input,
        ctx.user.id,
        assessment.questionnaire.type
      );

      // Log audit
      await logResponseAudit(ctx.user.id, "BULK_SAVE_RESPONSES", input.assessmentId, "bulk", {
        count: result.updatedCount,
        failed: result.failedCount,
      });

      return result;
    }),

  // ============================================
  // GET OPERATIONS
  // ============================================

  /**
   * Get responses for an assessment with filters
   */
  getByAssessment: protectedProcedure
    .input(GetResponsesInput)
    .query(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        false
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || RESPONSE_ERRORS.ASSESSMENT_NOT_FOUND.en,
        });
      }

      const result = await getResponses(input, assessment.questionnaire.type);

      // Transform maturity levels for display
      const responses = result.responses.map((r) => ({
        ...r,
        displayValue:
          assessment.questionnaire.type === "ANS_USOAP_CMA"
            ? r.responseValue
            : r.maturityLevel
              ? MATURITY_LEVEL_REVERSE[r.maturityLevel]
              : null,
      }));

      return {
        ...result,
        responses,
        questionnaireType: assessment.questionnaire.type,
      };
    }),

  /**
   * Get a single response by question ID
   */
  getByQuestion: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string().cuid(),
        questionId: z.string().cuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        false
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || RESPONSE_ERRORS.ASSESSMENT_NOT_FOUND.en,
        });
      }

      const response = await getResponseByQuestion(input.assessmentId, input.questionId);

      if (!response) {
        return null;
      }

      return {
        ...response,
        displayValue:
          assessment.questionnaire.type === "ANS_USOAP_CMA"
            ? response.responseValue
            : response.maturityLevel
              ? MATURITY_LEVEL_REVERSE[response.maturityLevel]
              : null,
        questionnaireType: assessment.questionnaire.type,
      };
    }),

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Clear/delete a response (reset to unanswered)
   */
  delete: protectedProcedure
    .input(DeleteResponseInput)
    .mutation(async ({ ctx, input }) => {
      const { assessment, hasAccess, canWrite, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        true
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || RESPONSE_ERRORS.ASSESSMENT_NOT_FOUND.en,
        });
      }

      if (!canWrite) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: RESPONSE_ERRORS.UNAUTHORIZED.en,
        });
      }

      if (!isAssessmentEditable(assessment.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: RESPONSE_ERRORS.NOT_EDITABLE.en,
        });
      }

      const result = await clearResponse(
        input.assessmentId,
        input.questionId,
        assessment.questionnaire.type
      );

      // Log audit
      await logResponseAudit(ctx.user.id, "DELETE_RESPONSE", input.assessmentId, input.questionId);

      return result;
    }),

  // ============================================
  // EVIDENCE OPERATIONS
  // ============================================

  /**
   * Add evidence URL to a response
   */
  addEvidence: protectedProcedure
    .input(AddEvidenceInput)
    .mutation(async ({ ctx, input }) => {
      const { assessment, hasAccess, canWrite, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        true
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || RESPONSE_ERRORS.ASSESSMENT_NOT_FOUND.en,
        });
      }

      if (!canWrite) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: RESPONSE_ERRORS.UNAUTHORIZED.en,
        });
      }

      if (!isAssessmentEditable(assessment.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: RESPONSE_ERRORS.NOT_EDITABLE.en,
        });
      }

      try {
        const response = await addEvidence(
          input.assessmentId,
          input.questionId,
          input.evidenceUrl
        );

        // Log audit
        await logResponseAudit(
          ctx.user.id,
          "ADD_EVIDENCE",
          input.assessmentId,
          input.questionId,
          { evidenceUrl: input.evidenceUrl }
        );

        return response;
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Response not found",
        });
      }
    }),

  /**
   * Remove evidence URL from a response
   */
  removeEvidence: protectedProcedure
    .input(RemoveEvidenceInput)
    .mutation(async ({ ctx, input }) => {
      const { assessment, hasAccess, canWrite, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        true
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || RESPONSE_ERRORS.ASSESSMENT_NOT_FOUND.en,
        });
      }

      if (!canWrite) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: RESPONSE_ERRORS.UNAUTHORIZED.en,
        });
      }

      if (!isAssessmentEditable(assessment.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: RESPONSE_ERRORS.NOT_EDITABLE.en,
        });
      }

      try {
        const response = await removeEvidence(
          input.assessmentId,
          input.questionId,
          input.evidenceUrl
        );

        // Log audit
        await logResponseAudit(
          ctx.user.id,
          "REMOVE_EVIDENCE",
          input.assessmentId,
          input.questionId,
          { removedUrl: input.evidenceUrl }
        );

        return response;
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Response not found",
        });
      }
    }),

  // ============================================
  // PROGRESS & SCORING
  // ============================================

  /**
   * Get completion progress for an assessment
   */
  getProgress: protectedProcedure
    .input(z.object({ assessmentId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        false
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || RESPONSE_ERRORS.ASSESSMENT_NOT_FOUND.en,
        });
      }

      const progress = await getDetailedProgress(
        input.assessmentId,
        assessment.questionnaire.type
      );

      return {
        ...progress,
        assessmentStatus: assessment.status,
        questionnaireType: assessment.questionnaire.type,
      };
    }),

  /**
   * Calculate current scores without submitting
   */
  calculateScores: protectedProcedure
    .input(z.object({ assessmentId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        false
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || RESPONSE_ERRORS.ASSESSMENT_NOT_FOUND.en,
        });
      }

      // Get all responses
      const responses = await getResponsesForScoring(input.assessmentId);
      const transformedResponses = transformResponsesForScoring(responses);

      const questionnaireType = assessment.questionnaire.type;

      if (questionnaireType === "ANS_USOAP_CMA") {
        const eiScore = calculateEIScore(transformedResponses);
        const categoryScores = calculateCategoryScores(transformedResponses, questionnaireType);

        return {
          type: "ANS" as const,
          eiScore,
          categoryScores,
          overallScore: eiScore.overallEI,
        };
      } else {
        const smsMaturity = calculateSMSMaturity(transformedResponses);
        const categoryScores = calculateCategoryScores(transformedResponses, questionnaireType);

        return {
          type: "SMS" as const,
          smsMaturity,
          categoryScores,
          overallScore: smsMaturity.overallPercentage,
          overallLevel: smsMaturity.overallLevel,
        };
      }
    }),

  // ============================================
  // LABELS & METADATA
  // ============================================

  /**
   * Get response value labels (for UI display)
   */
  getLabels: protectedProcedure
    .input(
      z.object({
        type: z.enum(["ANS_USOAP_CMA", "SMS_CANSO_SOE"]),
        locale: z.enum(["en", "fr"]).default("en"),
      })
    )
    .query(({ input }) => {
      if (input.type === "ANS_USOAP_CMA") {
        return Object.entries(ANS_RESPONSE_LABELS).map(([value, labels]) => ({
          value,
          label: labels[input.locale],
        }));
      } else {
        return Object.entries(SMS_MATURITY_LABELS).map(([value, labels]) => ({
          value,
          label: labels[input.locale],
          short: labels.short,
        }));
      }
    }),

  /**
   * Get response statistics for an assessment
   */
  getStats: protectedProcedure
    .input(z.object({ assessmentId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        false
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || RESPONSE_ERRORS.ASSESSMENT_NOT_FOUND.en,
        });
      }

      const responses = await getResponsesForScoring(input.assessmentId);
      const questionnaireType = assessment.questionnaire.type;

      let stats;
      if (questionnaireType === "ANS_USOAP_CMA") {
        let satisfactory = 0;
        let notSatisfactory = 0;
        let notApplicable = 0;
        let notReviewed = 0;

        for (const r of responses) {
          switch (r.responseValue) {
            case "SATISFACTORY":
              satisfactory++;
              break;
            case "NOT_SATISFACTORY":
              notSatisfactory++;
              break;
            case "NOT_APPLICABLE":
              notApplicable++;
              break;
            default:
              notReviewed++;
          }
        }

        const applicable = satisfactory + notSatisfactory;
        const complianceRate =
          applicable > 0 ? Math.round((satisfactory / applicable) * 100) : null;

        stats = {
          type: "ANS" as const,
          total: responses.length,
          satisfactory,
          notSatisfactory,
          notApplicable,
          notReviewed,
          complianceRate,
        };
      } else {
        const maturityCounts: Record<string, number> = {
          A: 0,
          B: 0,
          C: 0,
          D: 0,
          E: 0,
          unanswered: 0,
        };

        for (const r of responses) {
          if (r.maturityLevel) {
            const level = MATURITY_LEVEL_REVERSE[r.maturityLevel];
            maturityCounts[level]++;
          } else {
            maturityCounts.unanswered++;
          }
        }

        // Calculate average maturity
        const answered = responses.length - maturityCounts.unanswered;
        let avgScore = 0;
        if (answered > 0) {
          const scores: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5 };
          let totalScore = 0;
          for (const [level, count] of Object.entries(maturityCounts)) {
            if (level !== "unanswered" && scores[level]) {
              totalScore += scores[level] * count;
            }
          }
          avgScore = totalScore / answered;
        }

        let avgLevel: string | null = null;
        if (avgScore >= 4.5) avgLevel = "E";
        else if (avgScore >= 3.5) avgLevel = "D";
        else if (avgScore >= 2.5) avgLevel = "C";
        else if (avgScore >= 1.5) avgLevel = "B";
        else if (avgScore > 0) avgLevel = "A";

        stats = {
          type: "SMS" as const,
          total: responses.length,
          maturityDistribution: maturityCounts,
          averageScore: answered > 0 ? Math.round(avgScore * 100) / 100 : null,
          averageLevel: avgLevel,
          answeredCount: answered,
        };
      }

      const withEvidence = responses.filter((r) => r.evidenceUrls.length > 0).length;
      const withNotes = responses.filter((r) => r.notes && r.notes.length > 0).length;

      return {
        ...stats,
        evidenceCount: withEvidence,
        notesCount: withNotes,
        evidencePercent:
          responses.length > 0
            ? Math.round((withEvidence / responses.length) * 100)
            : 0,
      };
    }),
});

export type ResponseRouter = typeof responseRouter;
