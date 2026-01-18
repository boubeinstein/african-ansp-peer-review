/**
 * Assessment Helper Functions
 *
 * Centralized utilities for checking if assessment responses are "answered"
 * to ensure consistent counting between UI and server.
 */

import type { QuestionnaireType } from "@prisma/client";

/**
 * Valid ANS response values that count as "answered"
 * NOT_REVIEWED is explicitly NOT considered answered
 */
export const VALID_ANS_RESPONSE_VALUES = [
  "SATISFACTORY",
  "NOT_SATISFACTORY",
  "NOT_APPLICABLE",
] as const;

export type ValidANSResponseValue = (typeof VALID_ANS_RESPONSE_VALUES)[number];

/**
 * Valid SMS maturity levels (UI format: A, B, C, D, E)
 */
export const VALID_SMS_MATURITY_LEVELS = ["A", "B", "C", "D", "E"] as const;

/**
 * Valid SMS maturity levels (Database format: LEVEL_A, LEVEL_B, etc.)
 */
export const VALID_SMS_MATURITY_LEVELS_DB = [
  "LEVEL_A",
  "LEVEL_B",
  "LEVEL_C",
  "LEVEL_D",
  "LEVEL_E",
] as const;

export type ValidSMSMaturityLevel = (typeof VALID_SMS_MATURITY_LEVELS)[number];
export type ValidSMSMaturityLevelDB = (typeof VALID_SMS_MATURITY_LEVELS_DB)[number];

/**
 * Check if an ANS response is considered "answered"
 *
 * A response is answered if:
 * - responseValue is not null/undefined/empty
 * - responseValue is one of: SATISFACTORY, NOT_SATISFACTORY, NOT_APPLICABLE
 * - responseValue is NOT "NOT_REVIEWED" (explicitly unanswered)
 */
export function isANSResponseAnswered(
  responseValue: string | null | undefined
): boolean {
  // Defensive: Check for falsy values (null, undefined, empty string)
  if (!responseValue) {
    return false;
  }
  // NOT_REVIEWED is explicitly unanswered
  if (responseValue === "NOT_REVIEWED") {
    return false;
  }
  // Only return true for valid answered values
  const isValid = VALID_ANS_RESPONSE_VALUES.includes(
    responseValue as ValidANSResponseValue
  );
  return isValid;
}

/**
 * Check if an SMS response is considered "answered"
 *
 * A response is answered if maturityLevel is set to a valid value.
 * Handles both UI format (A, B, C, D, E) and database format (LEVEL_A, LEVEL_B, etc.)
 */
export function isSMSResponseAnswered(
  maturityLevel: string | null | undefined
): boolean {
  if (!maturityLevel) return false;
  // Check UI format (A, B, C, D, E)
  if (VALID_SMS_MATURITY_LEVELS.includes(maturityLevel as ValidSMSMaturityLevel)) {
    return true;
  }
  // Check database format (LEVEL_A, LEVEL_B, etc.)
  if (VALID_SMS_MATURITY_LEVELS_DB.includes(maturityLevel as ValidSMSMaturityLevelDB)) {
    return true;
  }
  return false;
}

/**
 * Check if a response is answered based on questionnaire type
 */
export function isResponseAnswered(
  questionnaireType: QuestionnaireType | "ANS_USOAP_CMA" | "SMS_CANSO" | null,
  responseValue: string | null | undefined,
  maturityLevel: string | null | undefined
): boolean {
  if (!questionnaireType) return false;

  if (questionnaireType === "ANS_USOAP_CMA") {
    return isANSResponseAnswered(responseValue);
  }

  return isSMSResponseAnswered(maturityLevel);
}

/**
 * Response data structure used for counting
 */
interface ResponseForCounting {
  responseValue?: string | null;
  maturityLevel?: string | null;
  questionId?: string;
}

/**
 * Count answered responses from a list
 */
export function countAnsweredResponses(
  responses: ResponseForCounting[],
  questionnaireType: QuestionnaireType | "ANS_USOAP_CMA" | "SMS_CANSO"
): number {
  return responses.filter((r) =>
    isResponseAnswered(questionnaireType, r.responseValue, r.maturityLevel)
  ).length;
}

/**
 * Get IDs of unanswered questions
 */
export function getUnansweredQuestionIds(
  questions: Array<{ id: string }>,
  responses: ResponseForCounting[],
  questionnaireType: QuestionnaireType | "ANS_USOAP_CMA" | "SMS_CANSO"
): string[] {
  const answeredQuestionIds = new Set(
    responses
      .filter((r) =>
        isResponseAnswered(questionnaireType, r.responseValue, r.maturityLevel)
      )
      .map((r) => r.questionId)
      .filter((id): id is string => !!id)
  );

  return questions.filter((q) => !answeredQuestionIds.has(q.id)).map((q) => q.id);
}

/**
 * Calculate progress percentage
 */
export function calculateProgressPercent(
  answeredCount: number,
  totalCount: number
): number {
  if (totalCount === 0) return 0;
  return Math.round((answeredCount / totalCount) * 100);
}
