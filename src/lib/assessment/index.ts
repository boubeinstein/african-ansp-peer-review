/**
 * Self-Assessment Module - Barrel Export
 *
 * Centralizes exports for the assessment system
 */

// Types
export * from "./types";

// Zod Schemas
export * from "./schemas";

// Constants
export * from "./constants";

// Scoring utilities
export {
  calculateEIScore,
  calculateSimpleEIScore,
  calculateSMSMaturity,
  maturityLevelToScore,
  getLowestMaturityLevel,
  calculateCategoryScores,
  compareScores,
  identifyImprovementAreas,
  validateAssessmentForSubmission,
} from "./scoring";

// Progress utilities
export {
  calculateProgress,
  estimateRemainingTime,
  calculateAverageTimePerQuestion,
  getProgressStatusLabel,
  getProgressColor,
  canSubmitAssessment,
} from "./progress";
