/**
 * Self-Assessment Module - Score Calculation Utilities
 *
 * Implements scoring methodologies aligned with:
 * - ICAO USOAP CMA for EI (Effective Implementation) calculation
 * - CANSO Standard of Excellence (SoE) for SMS maturity calculation
 */

import type {
  AssessmentResponse,
  AssessmentResponseWithQuestion,
  EIScoreResult,
  SMSMaturityResult,
  SMSMaturityLevel,
} from "./types";
import {
  SMS_COMPONENT_WEIGHTS,
  getMaturityLevelFromScore,
  SMS_MATURITY_LEVELS,
} from "./constants";
import type { USOAPAuditArea, CriticalElement, SMSComponent, CANSOStudyArea } from "@prisma/client";

// =============================================================================
// EI SCORE CALCULATION (USOAP CMA METHODOLOGY)
// =============================================================================

/**
 * Calculate EI (Effective Implementation) score
 *
 * Formula: EI = (Satisfactory / (Total - Not Applicable)) * 100
 *
 * Per ICAO USOAP CMA methodology:
 * - Satisfactory (S) = 1 point
 * - Not Satisfactory (NS) = 0 points
 * - Not Applicable (NA) = Excluded from calculation
 * - Not Reviewed (NR) = Excluded from calculation
 */
export function calculateEIScore(
  responses: AssessmentResponseWithQuestion[]
): EIScoreResult {
  // Initialize counters
  let satisfactoryCount = 0;
  let notSatisfactoryCount = 0;
  let notApplicableCount = 0;
  let notReviewedCount = 0;

  // Initialize audit area tracking
  const auditAreaScores: EIScoreResult["auditAreaScores"] = {} as EIScoreResult["auditAreaScores"];
  const criticalElementScores: EIScoreResult["criticalElementScores"] = {} as EIScoreResult["criticalElementScores"];

  // Process each response
  for (const response of responses) {
    const { responseValue, question } = response;
    const auditArea = question.auditArea;
    const criticalElement = question.criticalElement;

    // Count by response type
    switch (responseValue) {
      case "SATISFACTORY":
        satisfactoryCount++;
        break;
      case "NOT_SATISFACTORY":
        notSatisfactoryCount++;
        break;
      case "NOT_APPLICABLE":
        notApplicableCount++;
        break;
      case "NOT_REVIEWED":
      default:
        notReviewedCount++;
        break;
    }

    // Track by audit area
    if (auditArea) {
      if (!auditAreaScores[auditArea]) {
        auditAreaScores[auditArea] = {
          ei: 0,
          satisfactory: 0,
          notSatisfactory: 0,
          notApplicable: 0,
          total: 0,
        };
      }
      auditAreaScores[auditArea].total++;
      if (responseValue === "SATISFACTORY") {
        auditAreaScores[auditArea].satisfactory++;
      } else if (responseValue === "NOT_SATISFACTORY") {
        auditAreaScores[auditArea].notSatisfactory++;
      } else if (responseValue === "NOT_APPLICABLE") {
        auditAreaScores[auditArea].notApplicable++;
      }
    }

    // Track by critical element
    if (criticalElement) {
      if (!criticalElementScores[criticalElement]) {
        criticalElementScores[criticalElement] = {
          ei: 0,
          satisfactory: 0,
          notSatisfactory: 0,
          total: 0,
        };
      }
      criticalElementScores[criticalElement].total++;
      if (responseValue === "SATISFACTORY") {
        criticalElementScores[criticalElement].satisfactory++;
      } else if (responseValue === "NOT_SATISFACTORY") {
        criticalElementScores[criticalElement].notSatisfactory++;
      }
    }
  }

  // Calculate overall EI
  const totalApplicable = satisfactoryCount + notSatisfactoryCount;
  const overallEI = totalApplicable > 0
    ? Math.round((satisfactoryCount / totalApplicable) * 100 * 100) / 100
    : 0;

  // Calculate EI for each audit area
  for (const area of Object.keys(auditAreaScores) as USOAPAuditArea[]) {
    const scores = auditAreaScores[area];
    const applicable = scores.satisfactory + scores.notSatisfactory;
    scores.ei = applicable > 0
      ? Math.round((scores.satisfactory / applicable) * 100 * 100) / 100
      : 0;
  }

  // Calculate EI for each critical element
  for (const ce of Object.keys(criticalElementScores) as CriticalElement[]) {
    const scores = criticalElementScores[ce];
    const applicable = scores.satisfactory + scores.notSatisfactory;
    scores.ei = applicable > 0
      ? Math.round((scores.satisfactory / applicable) * 100 * 100) / 100
      : 0;
  }

  // Calculate priority PQ score if applicable
  const priorityResponses = responses.filter((r) => r.question.isPriorityPQ);
  let priorityPQScore: number | undefined;
  if (priorityResponses.length > 0) {
    const prioritySatisfactory = priorityResponses.filter(
      (r) => r.responseValue === "SATISFACTORY"
    ).length;
    const priorityApplicable = priorityResponses.filter(
      (r) => r.responseValue === "SATISFACTORY" || r.responseValue === "NOT_SATISFACTORY"
    ).length;
    priorityPQScore = priorityApplicable > 0
      ? Math.round((prioritySatisfactory / priorityApplicable) * 100 * 100) / 100
      : 0;
  }

  return {
    overallEI,
    totalApplicable,
    satisfactoryCount,
    notSatisfactoryCount,
    notApplicableCount,
    notReviewedCount,
    auditAreaScores,
    criticalElementScores,
    priorityPQScore,
  };
}

/**
 * Calculate EI score from simple response array (without question details)
 */
export function calculateSimpleEIScore(
  satisfactoryCount: number,
  notSatisfactoryCount: number
): number {
  const total = satisfactoryCount + notSatisfactoryCount;
  if (total === 0) return 0;
  return Math.round((satisfactoryCount / total) * 100 * 100) / 100;
}

// =============================================================================
// SMS MATURITY CALCULATION (CANSO SOE METHODOLOGY)
// =============================================================================

/**
 * Calculate SMS Maturity score
 *
 * Per CANSO SoE methodology:
 * - Each question is scored A(1) to E(5)
 * - Component score = weighted average of question scores
 * - Overall score = weighted average of component scores
 * - Overall level = lowest component level (per CANSO guidance)
 */
export function calculateSMSMaturity(
  responses: AssessmentResponseWithQuestion[]
): SMSMaturityResult {
  // Initialize component tracking
  const componentScores: SMSMaturityResult["componentLevels"] = {} as SMSMaturityResult["componentLevels"];
  const studyAreaScores: SMSMaturityResult["studyAreaLevels"] = {} as SMSMaturityResult["studyAreaLevels"];
  const maturityDistribution: Record<string, number> = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    E: 0,
    null: 0,
  };

  // Group responses by component and study area
  const componentResponses: Record<string, AssessmentResponseWithQuestion[]> = {};
  const studyAreaResponses: Record<string, AssessmentResponseWithQuestion[]> = {};

  for (const response of responses) {
    const { maturityLevel, question } = response;
    const component = question.smsComponent;
    const studyArea = question.studyArea;

    // Count maturity distribution
    maturityDistribution[maturityLevel ?? "null"]++;

    // Group by component
    if (component) {
      if (!componentResponses[component]) {
        componentResponses[component] = [];
      }
      componentResponses[component].push(response);
    }

    // Group by study area
    if (studyArea) {
      if (!studyAreaResponses[studyArea]) {
        studyAreaResponses[studyArea] = [];
      }
      studyAreaResponses[studyArea].push(response);
    }
  }

  // Calculate component scores
  for (const component of Object.keys(componentResponses) as SMSComponent[]) {
    const compResponses = componentResponses[component];
    const scores = compResponses
      .filter((r) => r.maturityLevel !== null)
      .map((r) => maturityLevelToScore(r.maturityLevel!));

    const avgScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    const weight = SMS_COMPONENT_WEIGHTS[component] || 0.25;

    componentScores[component] = {
      level: getMaturityLevelFromScore(avgScore),
      score: Math.round(avgScore * 100) / 100,
      weight,
      weightedScore: Math.round(avgScore * weight * 100) / 100,
      questionCount: compResponses.length,
    };
  }

  // Calculate study area scores
  for (const studyArea of Object.keys(studyAreaResponses) as CANSOStudyArea[]) {
    const saResponses = studyAreaResponses[studyArea];
    const scores = saResponses
      .filter((r) => r.maturityLevel !== null)
      .map((r) => maturityLevelToScore(r.maturityLevel!));

    const avgScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    studyAreaScores[studyArea] = {
      level: getMaturityLevelFromScore(avgScore),
      score: Math.round(avgScore * 100) / 100,
      questionCount: saResponses.length,
    };
  }

  // Calculate overall weighted score
  let totalWeight = 0;
  let weightedSum = 0;
  for (const component of Object.keys(componentScores) as SMSComponent[]) {
    const compScore = componentScores[component];
    weightedSum += compScore.weightedScore;
    totalWeight += compScore.weight;
  }

  const overallScore = totalWeight > 0
    ? Math.round((weightedSum / totalWeight) * 100) / 100
    : 0;

  // Per CANSO guidance: overall level = lowest component level
  const componentLevels = Object.values(componentScores)
    .filter((c) => c.questionCount > 0)
    .map((c) => c.level);

  const overallLevel = componentLevels.length > 0
    ? getLowestMaturityLevel(componentLevels)
    : null;

  // Calculate overall percentage
  const overallPercentage = Math.round((overallScore / 5) * 100);

  // Identify gap areas (below Level C)
  const gapAreas: string[] = [];
  for (const [component, scores] of Object.entries(componentScores)) {
    if (scores.level && (scores.level === "A" || scores.level === "B")) {
      gapAreas.push(component);
    }
  }

  return {
    overallLevel,
    overallScore,
    overallPercentage,
    componentLevels: componentScores,
    studyAreaLevels: studyAreaScores,
    maturityDistribution,
    gapAreas,
  };
}

/**
 * Convert maturity level to numeric score
 */
export function maturityLevelToScore(level: NonNullable<SMSMaturityLevel>): number {
  return SMS_MATURITY_LEVELS[level].scoreValue;
}

/**
 * Get the lowest maturity level from an array
 */
export function getLowestMaturityLevel(
  levels: (SMSMaturityLevel | null)[]
): SMSMaturityLevel {
  const validLevels = levels.filter((l): l is NonNullable<SMSMaturityLevel> => l !== null);
  if (validLevels.length === 0) return null;

  const scoreOrder: NonNullable<SMSMaturityLevel>[] = ["A", "B", "C", "D", "E"];
  for (const level of scoreOrder) {
    if (validLevels.includes(level)) {
      return level;
    }
  }
  return validLevels[0];
}

// =============================================================================
// CATEGORY-LEVEL SCORING
// =============================================================================

/**
 * Calculate scores grouped by category
 */
export function calculateCategoryScores(
  responses: AssessmentResponseWithQuestion[],
  questionnaireType: "ANS_USOAP_CMA" | "SMS_CANSO_SOE"
): Record<string, number> {
  // Group responses by category (audit area for ANS, component for SMS)
  const categoryGroups: Record<string, AssessmentResponseWithQuestion[]> = {};

  for (const response of responses) {
    let category: string | null = null;

    if (questionnaireType === "ANS_USOAP_CMA") {
      category = response.question.auditArea ?? null;
    } else {
      category = response.question.smsComponent ?? null;
    }

    if (category) {
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(response);
    }
  }

  // Calculate score for each category
  const categoryScores: Record<string, number> = {};

  for (const [category, catResponses] of Object.entries(categoryGroups)) {
    if (questionnaireType === "ANS_USOAP_CMA") {
      // EI score calculation
      const satisfactory = catResponses.filter(
        (r) => r.responseValue === "SATISFACTORY"
      ).length;
      const applicable = catResponses.filter(
        (r) => r.responseValue === "SATISFACTORY" || r.responseValue === "NOT_SATISFACTORY"
      ).length;
      categoryScores[category] = applicable > 0
        ? Math.round((satisfactory / applicable) * 100 * 100) / 100
        : 0;
    } else {
      // SMS maturity score calculation (1-5 scale converted to percentage)
      const scores = catResponses
        .filter((r) => r.maturityLevel !== null)
        .map((r) => maturityLevelToScore(r.maturityLevel as NonNullable<SMSMaturityLevel>));
      const avgScore = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;
      categoryScores[category] = Math.round((avgScore / 5) * 100 * 100) / 100;
    }
  }

  return categoryScores;
}

// =============================================================================
// COMPARISON UTILITIES
// =============================================================================

/**
 * Compare two assessment scores and calculate delta
 */
export function compareScores(
  currentScore: number,
  previousScore: number
): {
  delta: number;
  percentageChange: number;
  trend: "IMPROVING" | "DECLINING" | "STABLE";
} {
  const delta = Math.round((currentScore - previousScore) * 100) / 100;
  const percentageChange = previousScore > 0
    ? Math.round((delta / previousScore) * 100 * 100) / 100
    : delta > 0 ? 100 : 0;

  let trend: "IMPROVING" | "DECLINING" | "STABLE";
  if (Math.abs(delta) < 1) {
    trend = "STABLE";
  } else if (delta > 0) {
    trend = "IMPROVING";
  } else {
    trend = "DECLINING";
  }

  return { delta, percentageChange, trend };
}

/**
 * Calculate improvement areas between assessments
 */
export function identifyImprovementAreas(
  currentScores: Record<string, number>,
  previousScores: Record<string, number>,
  threshold: number = 5
): {
  improved: string[];
  declined: string[];
  unchanged: string[];
} {
  const improved: string[] = [];
  const declined: string[] = [];
  const unchanged: string[] = [];

  const allCategories = new Set([
    ...Object.keys(currentScores),
    ...Object.keys(previousScores),
  ]);

  for (const category of allCategories) {
    const current = currentScores[category] ?? 0;
    const previous = previousScores[category] ?? 0;
    const delta = current - previous;

    if (delta >= threshold) {
      improved.push(category);
    } else if (delta <= -threshold) {
      declined.push(category);
    } else {
      unchanged.push(category);
    }
  }

  return { improved, declined, unchanged };
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Check if assessment meets submission requirements
 */
export function validateAssessmentForSubmission(
  responses: AssessmentResponse[],
  totalQuestions: number,
  questionnaireType: "ANS_USOAP_CMA" | "SMS_CANSO_SOE"
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Count answered questions
  const answeredCount = responses.filter((r) => {
    if (questionnaireType === "ANS_USOAP_CMA") {
      return r.responseValue !== null && r.responseValue !== "NOT_REVIEWED";
    }
    return r.maturityLevel !== null;
  }).length;

  const answeredPercentage = (answeredCount / totalQuestions) * 100;

  // Check minimum answered requirement
  if (answeredPercentage < 100) {
    errors.push(
      `Only ${answeredCount} of ${totalQuestions} questions answered (${Math.round(answeredPercentage)}%). All questions must be answered.`
    );
  }

  // Count questions with evidence
  const withEvidenceCount = responses.filter(
    (r) => r.isComplete || (r.evidenceDescription && r.evidenceDescription.length > 0)
  ).length;
  const evidencePercentage = (withEvidenceCount / totalQuestions) * 100;

  // Check evidence requirement
  const minEvidence = questionnaireType === "ANS_USOAP_CMA" ? 80 : 75;
  if (evidencePercentage < minEvidence) {
    warnings.push(
      `Only ${Math.round(evidencePercentage)}% of questions have evidence. Recommended: at least ${minEvidence}%.`
    );
  }

  // Check for NOT_REVIEWED responses (ANS only)
  if (questionnaireType === "ANS_USOAP_CMA") {
    const notReviewedCount = responses.filter(
      (r) => r.responseValue === "NOT_REVIEWED"
    ).length;
    if (notReviewedCount > 0) {
      errors.push(
        `${notReviewedCount} questions are marked as "Not Reviewed". All questions must be assessed.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
