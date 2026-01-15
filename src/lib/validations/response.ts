/**
 * Response Validation Schemas
 *
 * Zod schemas for assessment response management.
 * Supports both ANS (USOAP CMA) and SMS (CANSO SoE) response types.
 */

import { z } from "zod";
import { MaturityLevel } from "@prisma/client";

// =============================================================================
// ANS RESPONSE VALUES (USOAP CMA)
// =============================================================================

/**
 * ANS response values following ICAO USOAP CMA methodology
 * - SATISFACTORY: The PQ requirement is fully met
 * - NOT_SATISFACTORY: The PQ requirement is not met (finding)
 * - NOT_APPLICABLE: The PQ does not apply to this State/ANSP
 * - NOT_REVIEWED: Not yet assessed (initial state)
 */
export const ANSResponseValue = z.enum([
  "SATISFACTORY",
  "NOT_SATISFACTORY",
  "NOT_APPLICABLE",
  "NOT_REVIEWED",
]);

export type ANSResponseValue = z.infer<typeof ANSResponseValue>;

/**
 * Localized labels for ANS response values
 */
export const ANS_RESPONSE_LABELS = {
  SATISFACTORY: {
    en: "Satisfactory",
    fr: "Satisfaisant",
  },
  NOT_SATISFACTORY: {
    en: "Not Satisfactory",
    fr: "Non Satisfaisant",
  },
  NOT_APPLICABLE: {
    en: "Not Applicable",
    fr: "Non Applicable",
  },
  NOT_REVIEWED: {
    en: "Not Reviewed",
    fr: "Non Examiné",
  },
} as const;

// =============================================================================
// SMS RESPONSE VALUES (CANSO SoE)
// =============================================================================

/**
 * SMS maturity levels following CANSO Standard of Excellence
 * Maps to the Prisma MaturityLevel enum
 */
export const SMSResponseValue = z.nativeEnum(MaturityLevel);

export type SMSResponseValue = z.infer<typeof SMSResponseValue>;

/**
 * Simplified maturity level input (A-E instead of LEVEL_A, etc.)
 */
export const MaturityLevelInput = z.enum(["A", "B", "C", "D", "E"]);

export type MaturityLevelInput = z.infer<typeof MaturityLevelInput>;

/**
 * Localized labels for SMS maturity levels
 */
export const SMS_MATURITY_LABELS = {
  LEVEL_A: {
    en: "Level A - Initial/Ad-hoc",
    fr: "Niveau A - Initial/Ad-hoc",
    short: "A",
  },
  LEVEL_B: {
    en: "Level B - Planned/Documented",
    fr: "Niveau B - Planifié/Documenté",
    short: "B",
  },
  LEVEL_C: {
    en: "Level C - Implemented/Managed",
    fr: "Niveau C - Mis en œuvre/Géré",
    short: "C",
  },
  LEVEL_D: {
    en: "Level D - Monitored/Reviewed",
    fr: "Niveau D - Surveillé/Revu",
    short: "D",
  },
  LEVEL_E: {
    en: "Level E - Optimized/Continuous Improvement",
    fr: "Niveau E - Optimisé/Amélioration Continue",
    short: "E",
  },
} as const;

/**
 * Mapping between short form (A-E) and database enum
 */
export const MATURITY_LEVEL_MAP: Record<MaturityLevelInput, MaturityLevel> = {
  A: "LEVEL_A",
  B: "LEVEL_B",
  C: "LEVEL_C",
  D: "LEVEL_D",
  E: "LEVEL_E",
};

export const MATURITY_LEVEL_REVERSE: Record<MaturityLevel, MaturityLevelInput> = {
  LEVEL_A: "A",
  LEVEL_B: "B",
  LEVEL_C: "C",
  LEVEL_D: "D",
  LEVEL_E: "E",
};

// =============================================================================
// RESPONSE INPUT SCHEMAS
// =============================================================================

/**
 * Save a single response
 */
export const SaveResponseInput = z.object({
  assessmentId: z.string().cuid(),
  questionId: z.string().cuid(),

  // Response value - one of these based on questionnaire type
  ansResponse: ANSResponseValue.optional().nullable(),
  smsResponse: MaturityLevelInput.optional().nullable(),

  // Supporting information
  notes: z.string().max(2000).optional(),
  evidenceNotes: z.string().max(1000).optional(),

  // For partial saves / auto-save
  isDraft: z.boolean().default(true),
});

export type SaveResponseInput = z.infer<typeof SaveResponseInput>;

/**
 * Bulk save multiple responses
 */
export const BulkSaveResponsesInput = z.object({
  assessmentId: z.string().cuid(),
  responses: z
    .array(
      z.object({
        questionId: z.string().cuid(),
        ansResponse: ANSResponseValue.optional().nullable(),
        smsResponse: MaturityLevelInput.optional().nullable(),
        notes: z.string().max(2000).optional(),
        evidenceNotes: z.string().max(1000).optional(),
        isDraft: z.boolean().default(true),
      })
    )
    .min(1)
    .max(1000),
});

export type BulkSaveResponsesInput = z.infer<typeof BulkSaveResponsesInput>;

/**
 * Get responses with filters
 */
export const GetResponsesInput = z.object({
  assessmentId: z.string().cuid(),
  categoryId: z.string().cuid().optional(),
  questionId: z.string().cuid().optional(),
  auditArea: z.string().optional(),
  criticalElement: z.string().optional(),
  smsComponent: z.string().optional(),
  studyArea: z.string().optional(),
  onlyUnanswered: z.boolean().optional(),
  onlyDraft: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(1000).default(50),
});

export type GetResponsesInput = z.infer<typeof GetResponsesInput>;

/**
 * Delete/clear a response
 */
export const DeleteResponseInput = z.object({
  assessmentId: z.string().cuid(),
  questionId: z.string().cuid(),
});

export type DeleteResponseInput = z.infer<typeof DeleteResponseInput>;

/**
 * Add evidence to a response
 */
export const AddEvidenceInput = z.object({
  assessmentId: z.string().cuid(),
  questionId: z.string().cuid(),
  evidenceUrl: z.string().url(),
  evidenceDescription: z.string().max(500).optional(),
});

export type AddEvidenceInput = z.infer<typeof AddEvidenceInput>;

/**
 * Remove evidence from a response
 */
export const RemoveEvidenceInput = z.object({
  assessmentId: z.string().cuid(),
  questionId: z.string().cuid(),
  evidenceUrl: z.string().url(),
});

export type RemoveEvidenceInput = z.infer<typeof RemoveEvidenceInput>;

// =============================================================================
// RESPONSE OUTPUT TYPES
// =============================================================================

/**
 * Response save result with progress update
 */
export interface SaveResponseResult {
  success: boolean;
  response: {
    id: string;
    questionId: string;
    value: string | MaturityLevel | null;
    isDraft: boolean;
    updatedAt: Date;
  };
  progress: {
    answered: number;
    total: number;
    percentage: number;
  };
}

/**
 * Bulk save result
 */
export interface BulkSaveResult {
  success: boolean;
  updatedCount: number;
  failedCount: number;
  errors: Array<{
    questionId: string;
    error: string;
  }>;
  progress: {
    answered: number;
    total: number;
    percentage: number;
  };
}

/**
 * Progress statistics
 */
export interface ResponseProgress {
  totalQuestions: number;
  answeredQuestions: number;
  draftResponses: number;
  finalizedResponses: number;
  percentage: number;
  estimatedTimeRemaining: number | null;
  byCategory: Record<
    string,
    {
      total: number;
      answered: number;
      percentage: number;
    }
  >;
}

// =============================================================================
// ERROR MESSAGES
// =============================================================================

export const RESPONSE_ERRORS = {
  ASSESSMENT_NOT_FOUND: {
    en: "Assessment not found",
    fr: "Évaluation non trouvée",
  },
  QUESTION_NOT_FOUND: {
    en: "Question not found in this questionnaire",
    fr: "Question non trouvée dans ce questionnaire",
  },
  NOT_EDITABLE: {
    en: "Assessment is not editable. Only draft assessments can be modified.",
    fr: "L'évaluation n'est pas modifiable. Seuls les brouillons peuvent être modifiés.",
  },
  INVALID_RESPONSE_TYPE: {
    en: "Invalid response type for this questionnaire",
    fr: "Type de réponse invalide pour ce questionnaire",
  },
  UNAUTHORIZED: {
    en: "You do not have permission to modify this assessment",
    fr: "Vous n'avez pas la permission de modifier cette évaluation",
  },
  VALIDATION_FAILED: {
    en: "Response validation failed",
    fr: "La validation de la réponse a échoué",
  },
} as const;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Check if a response value is valid for the given questionnaire type
 */
export function isValidResponseForType(
  questionnaireType: "ANS_USOAP_CMA" | "SMS_CANSO_SOE",
  ansResponse?: string | null,
  smsResponse?: string | null
): boolean {
  if (questionnaireType === "ANS_USOAP_CMA") {
    // ANS questionnaire should have ansResponse, not smsResponse
    if (smsResponse && !ansResponse) return false;
    if (ansResponse && !ANSResponseValue.safeParse(ansResponse).success) {
      return false;
    }
    return true;
  } else {
    // SMS questionnaire should have smsResponse, not ansResponse
    if (ansResponse && !smsResponse) return false;
    if (smsResponse && !MaturityLevelInput.safeParse(smsResponse).success) {
      return false;
    }
    return true;
  }
}

/**
 * Convert maturity level input to database enum
 */
export function toMaturityLevel(input: MaturityLevelInput): MaturityLevel {
  return MATURITY_LEVEL_MAP[input];
}

/**
 * Convert database enum to maturity level input
 */
export function fromMaturityLevel(level: MaturityLevel): MaturityLevelInput {
  return MATURITY_LEVEL_REVERSE[level];
}

/**
 * Get score for maturity level (1-5 scale)
 */
export function maturityLevelToScore(level: MaturityLevelInput): number {
  const scores: Record<MaturityLevelInput, number> = {
    A: 1,
    B: 2,
    C: 3,
    D: 4,
    E: 5,
  };
  return scores[level];
}

/**
 * Get maturity level from score
 */
export function scoreToMaturityLevel(score: number): MaturityLevelInput {
  if (score >= 4.5) return "E";
  if (score >= 3.5) return "D";
  if (score >= 2.5) return "C";
  if (score >= 1.5) return "B";
  return "A";
}
