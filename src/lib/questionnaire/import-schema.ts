import { z } from "zod";

// =============================================================================
// ENUM SCHEMAS
// =============================================================================

export const USOAPAuditAreaSchema = z.enum([
  "LEG",
  "ORG",
  "PEL",
  "OPS",
  "AIR",
  "AIG",
  "ANS",
  "AGA",
  "SSP",
]);

export const CriticalElementSchema = z.enum([
  "CE_1",
  "CE_2",
  "CE_3",
  "CE_4",
  "CE_5",
  "CE_6",
  "CE_7",
  "CE_8",
]);

export const SMSComponentSchema = z.enum([
  "SAFETY_POLICY_OBJECTIVES",
  "SAFETY_RISK_MANAGEMENT",
  "SAFETY_ASSURANCE",
  "SAFETY_PROMOTION",
]);

export const CANSOStudyAreaSchema = z.enum([
  "SA_1_1",
  "SA_1_2",
  "SA_1_3",
  "SA_1_4",
  "SA_1_5",
  "SA_2_1",
  "SA_2_2",
  "SA_3_1",
  "SA_3_2",
  "SA_3_3",
  "SA_4_1",
  "SA_4_2",
]);

export const MaturityLevelSchema = z.enum([
  "LEVEL_A",
  "LEVEL_B",
  "LEVEL_C",
  "LEVEL_D",
  "LEVEL_E",
]);

export const TransversalAreaSchema = z.enum(["SPM", "HP", "CI"]);

export const PQAmendmentStatusSchema = z.enum([
  "NO_CHANGE",
  "REVISED",
  "NEW",
  "MERGED",
  "DELETED",
  "REFERENCE_REVISED",
]);

export const ResponseTypeSchema = z.enum([
  "SATISFACTORY_NOT",
  "MATURITY_LEVEL",
  "YES_NO",
  "SCALE_1_5",
  "TEXT",
  "MULTI_SELECT",
]);

export const ICAOReferenceTypeSchema = z.enum([
  "CC",
  "STD",
  "RP",
  "PANS",
  "GM",
  "Cir",
  "SUPPS",
]);

// =============================================================================
// ICAO REFERENCE IMPORT SCHEMA
// =============================================================================

export const ICAOReferenceImportSchema = z.object({
  referenceType: ICAOReferenceTypeSchema,
  document: z.string().min(1, "Document name is required"),
  chapter: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export type ICAOReferenceImport = z.infer<typeof ICAOReferenceImportSchema>;

// =============================================================================
// ANS USOAP CMA QUESTION IMPORT SCHEMA
// =============================================================================

export const ANSQuestionImportSchema = z.object({
  // Required fields
  pqNumber: z
    .string()
    .min(1, "PQ number is required")
    .regex(/^[A-Z]+-\d+(\.\d+)?$/, "PQ number must be in format AA-NNN or AA-NNN.N"),
  questionTextEn: z.string().min(1, "English question text is required"),
  questionTextFr: z.string().min(1, "French question text is required"),
  auditArea: USOAPAuditAreaSchema,
  criticalElement: CriticalElementSchema,
  sortOrder: z.number().int().positive(),

  // Optional fields
  isPriorityPQ: z.boolean().default(false),
  requiresOnSite: z.boolean().default(false),
  pqStatus: PQAmendmentStatusSchema.default("NO_CHANGE"),
  previousPqNumber: z.string().optional().nullable(),
  guidanceEn: z.string().optional().nullable(),
  guidanceFr: z.string().optional().nullable(),
  responseType: ResponseTypeSchema.default("SATISFACTORY_NOT"),
  requiredEvidence: z.array(z.string()).default([]),
  weight: z.number().positive().default(1.0),
  maxScore: z.number().positive().default(1.0),

  // ICAO References
  icaoReferences: z.array(ICAOReferenceImportSchema).default([]),
});

export type ANSQuestionImport = z.infer<typeof ANSQuestionImportSchema>;

// =============================================================================
// SMS CANSO SoE QUESTION IMPORT SCHEMA
// =============================================================================

export const SMSQuestionImportSchema = z.object({
  // Required fields
  smsComponent: SMSComponentSchema,
  studyArea: CANSOStudyAreaSchema,
  questionTextEn: z.string().min(1, "English question text is required"),
  questionTextFr: z.string().min(1, "French question text is required"),
  sortOrder: z.number().int().positive(),

  // Optional fields
  pqNumber: z.string().optional().nullable(),
  maturityLevel: MaturityLevelSchema.optional().nullable(),
  transversalArea: TransversalAreaSchema.optional().nullable(),
  guidanceEn: z.string().optional().nullable(),
  guidanceFr: z.string().optional().nullable(),
  responseType: ResponseTypeSchema.default("MATURITY_LEVEL"),
  requiredEvidence: z.array(z.string()).default([]),
  weight: z.number().positive().default(1.0),
  maxScore: z.number().positive().default(5.0),

  // ICAO References (optional for SMS)
  icaoReferences: z.array(ICAOReferenceImportSchema).default([]),
});

export type SMSQuestionImport = z.infer<typeof SMSQuestionImportSchema>;

// =============================================================================
// CATEGORY IMPORT SCHEMA
// =============================================================================

export const CategoryImportSchema = z.object({
  code: z.string().min(1, "Category code is required"),
  nameEn: z.string().min(1, "English name is required"),
  nameFr: z.string().min(1, "French name is required"),
  descriptionEn: z.string().optional().nullable(),
  descriptionFr: z.string().optional().nullable(),
  sortOrder: z.number().int().positive(),

  // For ANS questionnaires
  auditArea: USOAPAuditAreaSchema.optional().nullable(),
  criticalElement: CriticalElementSchema.optional().nullable(),

  // For SMS questionnaires
  smsComponent: SMSComponentSchema.optional().nullable(),
  studyArea: CANSOStudyAreaSchema.optional().nullable(),
  transversalArea: TransversalAreaSchema.optional().nullable(),
});

export type CategoryImport = z.infer<typeof CategoryImportSchema>;

// =============================================================================
// QUESTIONNAIRE IMPORT SCHEMA
// =============================================================================

export const QuestionnaireTypeSchema = z.enum(["ANS_USOAP_CMA", "SMS_CANSO_SOE"]);

export const QuestionnaireImportSchema = z.object({
  code: z.string().min(1, "Questionnaire code is required"),
  type: QuestionnaireTypeSchema,
  version: z.string().min(1, "Version is required"),
  titleEn: z.string().min(1, "English title is required"),
  titleFr: z.string().min(1, "French title is required"),
  descriptionEn: z.string().optional().nullable(),
  descriptionFr: z.string().optional().nullable(),
  effectiveDate: z.coerce.date(),
  expiryDate: z.coerce.date().optional().nullable(),
});

export type QuestionnaireImport = z.infer<typeof QuestionnaireImportSchema>;

// =============================================================================
// BULK IMPORT SCHEMA
// =============================================================================

export const ANSBulkImportSchema = z.object({
  questionnaire: QuestionnaireImportSchema.extend({
    type: z.literal("ANS_USOAP_CMA"),
  }),
  categories: z.array(CategoryImportSchema).min(1, "At least one category is required"),
  questions: z.array(ANSQuestionImportSchema).min(1, "At least one question is required"),
});

export type ANSBulkImport = z.infer<typeof ANSBulkImportSchema>;

export const SMSBulkImportSchema = z.object({
  questionnaire: QuestionnaireImportSchema.extend({
    type: z.literal("SMS_CANSO_SOE"),
  }),
  categories: z.array(CategoryImportSchema).min(1, "At least one category is required"),
  questions: z.array(SMSQuestionImportSchema).min(1, "At least one question is required"),
});

export type SMSBulkImport = z.infer<typeof SMSBulkImportSchema>;

// Union type for any bulk import
export const BulkImportSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ANS_USOAP_CMA"),
    data: ANSBulkImportSchema,
  }),
  z.object({
    type: z.literal("SMS_CANSO_SOE"),
    data: SMSBulkImportSchema,
  }),
]);

export type BulkImport = z.infer<typeof BulkImportSchema>;

// =============================================================================
// VALIDATION RESULT TYPES
// =============================================================================

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult<T> {
  isValid: boolean;
  data: T | null;
  errors: ValidationError[];
  warnings: string[];
}

export interface ImportSummary {
  totalQuestions: number;
  totalCategories: number;
  totalReferences: number;
  newQuestions: number;
  updatedQuestions: number;
  errors: ValidationError[];
  warnings: string[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validate a single ANS question import row
 */
export function validateANSQuestion(
  data: unknown,
  rowIndex: number
): ValidationResult<ANSQuestionImport> {
  const result = ANSQuestionImportSchema.safeParse(data);

  if (result.success) {
    return {
      isValid: true,
      data: result.data,
      errors: [],
      warnings: [],
    };
  }

  const errors: ValidationError[] = result.error.issues.map((err) => ({
    row: rowIndex,
    field: err.path.join("."),
    message: err.message,
    value: (data as Record<string, unknown>)?.[err.path[0] as string],
  }));

  return {
    isValid: false,
    data: null,
    errors,
    warnings: [],
  };
}

/**
 * Validate a single SMS question import row
 */
export function validateSMSQuestion(
  data: unknown,
  rowIndex: number
): ValidationResult<SMSQuestionImport> {
  const result = SMSQuestionImportSchema.safeParse(data);

  if (result.success) {
    return {
      isValid: true,
      data: result.data,
      errors: [],
      warnings: [],
    };
  }

  const errors: ValidationError[] = result.error.issues.map((err) => ({
    row: rowIndex,
    field: err.path.join("."),
    message: err.message,
    value: (data as Record<string, unknown>)?.[err.path[0] as string],
  }));

  return {
    isValid: false,
    data: null,
    errors,
    warnings: [],
  };
}

/**
 * Validate bulk import data
 */
export function validateBulkImport(
  type: "ANS_USOAP_CMA" | "SMS_CANSO_SOE",
  data: unknown
): ValidationResult<ANSBulkImport | SMSBulkImport> {
  const schema = type === "ANS_USOAP_CMA" ? ANSBulkImportSchema : SMSBulkImportSchema;
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      isValid: true,
      data: result.data as ANSBulkImport | SMSBulkImport,
      errors: [],
      warnings: [],
    };
  }

  const errors: ValidationError[] = result.error.issues.map((err) => ({
    row: 0,
    field: err.path.join("."),
    message: err.message,
  }));

  return {
    isValid: false,
    data: null,
    errors,
    warnings: [],
  };
}
