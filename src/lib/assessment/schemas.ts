/**
 * Self-Assessment Module - Zod Validation Schemas
 *
 * Provides runtime validation for assessment data, aligned with:
 * - ICAO USOAP CMA methodology for ANS assessments
 * - CANSO Standard of Excellence (SoE) for SMS assessments
 */

import { z } from "zod";

// =============================================================================
// ENUM SCHEMAS
// =============================================================================

export const AssessmentStatusSchema = z.enum([
  "DRAFT",
  "IN_PROGRESS",
  "SUBMITTED",
  "UNDER_REVIEW",
  "COMPLETED",
  "ARCHIVED",
]);

export const AssessmentTypeSchema = z.enum([
  "SELF_ASSESSMENT",
  "GAP_ANALYSIS",
  "PRE_REVIEW",
  "MOCK_REVIEW",
]);

export const ANSResponseValueSchema = z.enum([
  "SATISFACTORY",
  "NOT_SATISFACTORY",
  "NOT_APPLICABLE",
  "NOT_REVIEWED",
]);

export const SMSMaturityLevelSchema = z.enum(["A", "B", "C", "D", "E"]).nullable();

export const EvidenceTypeSchema = z.enum([
  "DOCUMENT",
  "PROCEDURE",
  "RECORD",
  "INTERVIEW",
  "OBSERVATION",
  "OTHER",
]);

export const QuestionnaireTypeSchema = z.enum([
  "ANS_USOAP_CMA",
  "SMS_CANSO_SOE",
]);

// =============================================================================
// ASSESSMENT SCHEMAS
// =============================================================================

/**
 * Schema for creating a new assessment
 * Note: organizationId is obtained from the session, not from the client
 */
export const CreateAssessmentSchema = z.object({
  // Either questionnaireId OR questionnaireType (API resolves the other)
  questionnaireId: z.string().cuid().optional(),
  questionnaireType: z.enum(["ANS_USOAP_CMA", "SMS_CANSO_SOE"]).optional(),
  assessmentType: AssessmentTypeSchema,
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters"),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .optional(),
  dueDate: z.coerce.date().optional(),
  scope: z.array(z.string()).optional(), // Audit areas or SMS components
}).refine(
  (data) => data.questionnaireId || data.questionnaireType,
  { message: "Either questionnaireId or questionnaireType is required" }
);

export type CreateAssessmentInput = z.infer<typeof CreateAssessmentSchema>;

/**
 * Schema for updating an assessment
 */
export const UpdateAssessmentSchema = z.object({
  id: z.string().cuid(),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters")
    .optional(),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .optional(),
  dueDate: z.coerce.date().optional().nullable(),
});

export type UpdateAssessmentInput = z.infer<typeof UpdateAssessmentSchema>;

/**
 * Schema for changing assessment status
 */
export const UpdateAssessmentStatusSchema = z.object({
  id: z.string().cuid(),
  status: AssessmentStatusSchema,
  comments: z.string().max(500).optional(),
});

export type UpdateAssessmentStatusInput = z.infer<typeof UpdateAssessmentStatusSchema>;

/**
 * Schema for submitting/completing an assessment
 */
export const SubmitAssessmentSchema = z.object({
  id: z.string().cuid(),
  finalComments: z.string().max(2000).optional(),
  confirmComplete: z.boolean().refine((val) => val === true, {
    message: "You must confirm the assessment is complete",
  }),
});

export type SubmitAssessmentInput = z.infer<typeof SubmitAssessmentSchema>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Base schema for ANS response
 */
export const ANSResponseSchema = z.object({
  responseValue: ANSResponseValueSchema,
  evidenceDescription: z.string().max(2000).optional(),
  assessorComments: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
});

/**
 * Base schema for SMS response
 */
export const SMSResponseSchema = z.object({
  maturityLevel: SMSMaturityLevelSchema,
  evidenceDescription: z.string().max(2000).optional(),
  assessorComments: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
});

/**
 * Schema for submitting a single response
 */
export const SubmitResponseSchema = z
  .object({
    assessmentId: z.string().cuid(),
    questionId: z.string().cuid(),
    questionnaireType: QuestionnaireTypeSchema,

    // ANS fields
    responseValue: ANSResponseValueSchema.optional().nullable(),

    // SMS fields
    maturityLevel: SMSMaturityLevelSchema.optional(),

    // Common fields
    evidenceDescription: z.string().max(2000).optional(),
    assessorComments: z.string().max(2000).optional(),
    internalNotes: z.string().max(2000).optional(),
    needsReview: z.boolean().default(false),
  })
  .refine(
    (data) => {
      // ANS assessments require responseValue
      if (data.questionnaireType === "ANS_USOAP_CMA") {
        return data.responseValue !== undefined;
      }
      // SMS assessments require maturityLevel
      if (data.questionnaireType === "SMS_CANSO_SOE") {
        return data.maturityLevel !== undefined;
      }
      return true;
    },
    {
      message: "Response value or maturity level required based on questionnaire type",
    }
  );

export type SubmitResponseInput = z.infer<typeof SubmitResponseSchema>;

/**
 * Schema for bulk response update
 */
export const BulkResponseUpdateSchema = z.object({
  assessmentId: z.string().cuid(),
  questionnaireType: QuestionnaireTypeSchema,
  responses: z
    .array(
      z.object({
        questionId: z.string().cuid(),
        responseValue: ANSResponseValueSchema.optional().nullable(),
        maturityLevel: SMSMaturityLevelSchema.optional(),
      })
    )
    .min(1, "At least one response is required")
    .max(100, "Maximum 100 responses per batch"),
});

export type BulkResponseUpdateInput = z.infer<typeof BulkResponseUpdateSchema>;

/**
 * Schema for marking response as complete
 */
export const CompleteResponseSchema = z.object({
  responseId: z.string().cuid(),
  isComplete: z.boolean(),
  verificationNotes: z.string().max(500).optional(),
});

export type CompleteResponseInput = z.infer<typeof CompleteResponseSchema>;

// =============================================================================
// EVIDENCE SCHEMAS
// =============================================================================

/**
 * Schema for uploading evidence
 */
export const UploadEvidenceSchema = z
  .object({
    responseId: z.string().cuid(),
    type: EvidenceTypeSchema,
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(200, "Title must be less than 200 characters"),
    description: z.string().max(1000).optional(),
    documentReference: z.string().max(100).optional(),
    icaoReference: z.string().max(100).optional(),
    externalUrl: z.string().url().optional(),
    validFrom: z.coerce.date().optional(),
    validUntil: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      // If validUntil is provided, it must be after validFrom
      if (data.validFrom && data.validUntil) {
        return data.validUntil > data.validFrom;
      }
      return true;
    },
    {
      message: "Valid until date must be after valid from date",
      path: ["validUntil"],
    }
  );

export type UploadEvidenceInput = z.infer<typeof UploadEvidenceSchema>;

/**
 * Schema for updating evidence
 */
export const UpdateEvidenceSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(1000).optional(),
  type: EvidenceTypeSchema.optional(),
  documentReference: z.string().max(100).optional(),
  icaoReference: z.string().max(100).optional(),
  isVerified: z.boolean().optional(),
});

export type UpdateEvidenceInput = z.infer<typeof UpdateEvidenceSchema>;

/**
 * Schema for deleting evidence
 */
export const DeleteEvidenceSchema = z.object({
  id: z.string().cuid(),
  reason: z.string().max(500).optional(),
});

export type DeleteEvidenceInput = z.infer<typeof DeleteEvidenceSchema>;

// =============================================================================
// FILTER SCHEMAS
// =============================================================================

/**
 * Schema for filtering assessments
 */
export const AssessmentFilterSchema = z.object({
  organizationId: z.string().cuid().optional(),
  questionnaireId: z.string().cuid().optional(),
  questionnaireType: QuestionnaireTypeSchema.optional(),
  assessmentType: AssessmentTypeSchema.optional(),
  status: z
    .union([AssessmentStatusSchema, z.array(AssessmentStatusSchema)])
    .optional(),
  createdById: z.string().cuid().optional(),

  // Date filters
  startedAfter: z.coerce.date().optional(),
  startedBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
  dueBefore: z.coerce.date().optional(),

  // Score filters
  minScore: z.number().min(0).max(100).optional(),
  maxScore: z.number().min(0).max(100).optional(),

  // Search
  search: z.string().max(100).optional(),
});

export type AssessmentFilterInput = z.infer<typeof AssessmentFilterSchema>;

/**
 * Schema for filtering responses
 */
export const ResponseFilterSchema = z.object({
  assessmentId: z.string().cuid(),
  questionId: z.string().cuid().optional(),
  responseValue: ANSResponseValueSchema.optional(),
  maturityLevel: SMSMaturityLevelSchema.optional(),
  isComplete: z.boolean().optional(),
  needsReview: z.boolean().optional(),

  // ANS filters
  auditArea: z
    .enum(["LEG", "ORG", "PEL", "OPS", "AIR", "AIG", "ANS", "AGA", "SSP"])
    .optional(),
  criticalElement: z
    .enum(["CE_1", "CE_2", "CE_3", "CE_4", "CE_5", "CE_6", "CE_7", "CE_8"])
    .optional(),
  isPriorityPQ: z.boolean().optional(),

  // SMS filters
  smsComponent: z
    .enum([
      "SAFETY_POLICY_OBJECTIVES",
      "SAFETY_RISK_MANAGEMENT",
      "SAFETY_ASSURANCE",
      "SAFETY_PROMOTION",
    ])
    .optional(),
  studyArea: z
    .enum([
      "SA_1_1", "SA_1_2", "SA_1_3", "SA_1_4", "SA_1_5",
      "SA_2_1", "SA_2_2",
      "SA_3_1", "SA_3_2", "SA_3_3",
      "SA_4_1", "SA_4_2",
    ])
    .optional(),
});

export type ResponseFilterInput = z.infer<typeof ResponseFilterSchema>;

// =============================================================================
// SCORING SCHEMAS
// =============================================================================

/**
 * Schema for score calculation request
 */
export const CalculateScoreSchema = z.object({
  assessmentId: z.string().cuid(),
  includeIncomplete: z.boolean().default(false),
  saveResults: z.boolean().default(true),
});

export type CalculateScoreInput = z.infer<typeof CalculateScoreSchema>;

/**
 * Schema for comparing assessments
 */
export const CompareAssessmentsSchema = z.object({
  assessmentIds: z
    .array(z.string().cuid())
    .min(2, "At least 2 assessments required for comparison")
    .max(5, "Maximum 5 assessments can be compared"),
});

export type CompareAssessmentsInput = z.infer<typeof CompareAssessmentsSchema>;

// =============================================================================
// PAGINATION SCHEMA
// =============================================================================

export const AssessmentPaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(["startedAt", "dueDate", "status", "title", "overallScore"])
    .default("startedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type AssessmentPaginationInput = z.infer<typeof AssessmentPaginationSchema>;

// =============================================================================
// EXPORT SCHEMAS
// =============================================================================

/**
 * Schema for exporting assessment data
 */
export const ExportAssessmentSchema = z.object({
  assessmentId: z.string().cuid(),
  format: z.enum(["pdf", "excel", "csv", "json"]).default("pdf"),
  includeEvidence: z.boolean().default(true),
  includeComments: z.boolean().default(true),
  includeScoring: z.boolean().default(true),
  language: z.enum(["en", "fr"]).default("en"),
});

export type ExportAssessmentInput = z.infer<typeof ExportAssessmentSchema>;
