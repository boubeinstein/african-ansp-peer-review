/**
 * Self-Assessment Module - Progress Tracking Utilities
 *
 * Provides utilities for calculating and tracking assessment progress
 */

import type {
  AssessmentProgress,
  AssessmentResponse,
  AssessmentResponseWithQuestion,
  CategoryProgress,
  ElementProgress,
} from "./types";
import { maturityLevelToScore } from "./scoring";
import { getMaturityLevelFromScore } from "./constants";
import type { QuestionnaireType } from "@prisma/client";

// =============================================================================
// PROGRESS CALCULATION
// =============================================================================

/**
 * Calculate overall assessment progress
 */
export function calculateProgress(
  responses: AssessmentResponseWithQuestion[],
  totalQuestions: number,
  questionnaireType: QuestionnaireType
): AssessmentProgress {
  // Count answered and completed questions
  let answeredQuestions = 0;
  let completedQuestions = 0;
  let skippedQuestions = 0;

  for (const response of responses) {
    const hasResponse = questionnaireType === "ANS_USOAP_CMA"
      ? response.responseValue !== null && response.responseValue !== "NOT_REVIEWED"
      : response.maturityLevel !== null;

    if (hasResponse) {
      answeredQuestions++;

      // Check if N/A (skipped)
      if (response.responseValue === "NOT_APPLICABLE") {
        skippedQuestions++;
      }

      // Check if complete (has evidence)
      if (response.isComplete ||
          (response.evidenceDescription && response.evidenceDescription.length > 0) ||
          response.evidenceUrls.length > 0) {
        completedQuestions++;
      }
    }
  }

  const percentComplete = totalQuestions > 0
    ? Math.round((completedQuestions / totalQuestions) * 100)
    : 0;

  const percentAnswered = totalQuestions > 0
    ? Math.round((answeredQuestions / totalQuestions) * 100)
    : 0;

  // Calculate category progress
  const categoryProgress = calculateCategoryProgress(responses, questionnaireType);

  // Calculate element progress (audit areas for ANS, components for SMS)
  const elementProgress = calculateElementProgress(responses, questionnaireType);

  // Find last activity
  const lastActivityAt = responses.length > 0
    ? new Date(Math.max(...responses.map((r) => new Date(r.respondedAt).getTime())))
    : undefined;

  return {
    assessmentId: responses[0]?.assessmentId ?? "",
    questionnaireType,
    totalQuestions,
    answeredQuestions,
    completedQuestions,
    skippedQuestions,
    percentComplete,
    percentAnswered,
    categoryProgress,
    elementProgress,
    lastActivityAt,
  };
}

/**
 * Calculate progress by category
 */
function calculateCategoryProgress(
  responses: AssessmentResponseWithQuestion[],
  questionnaireType: QuestionnaireType
): CategoryProgress[] {
  // Group responses by category
  const categoryGroups: Record<string, {
    responses: AssessmentResponseWithQuestion[];
    name: string;
  }> = {};

  for (const response of responses) {
    // Determine category based on questionnaire type
    let categoryId: string | null = null;
    let categoryName = "";

    if (questionnaireType === "ANS_USOAP_CMA" && response.question.auditArea) {
      categoryId = response.question.auditArea;
      categoryName = response.question.auditArea;
    } else if (questionnaireType === "SMS_CANSO_SOE" && response.question.smsComponent) {
      categoryId = response.question.smsComponent;
      categoryName = formatComponentName(response.question.smsComponent);
    }

    if (categoryId) {
      if (!categoryGroups[categoryId]) {
        categoryGroups[categoryId] = {
          responses: [],
          name: categoryName,
        };
      }
      categoryGroups[categoryId].responses.push(response);
    }
  }

  // Calculate progress for each category
  const progress: CategoryProgress[] = [];

  for (const [categoryId, { responses: catResponses, name }] of Object.entries(categoryGroups)) {
    const total = catResponses.length;
    let answered = 0;
    let completed = 0;

    for (const response of catResponses) {
      const hasResponse = questionnaireType === "ANS_USOAP_CMA"
        ? response.responseValue !== null && response.responseValue !== "NOT_REVIEWED"
        : response.maturityLevel !== null;

      if (hasResponse) {
        answered++;
        if (response.isComplete ||
            (response.evidenceDescription && response.evidenceDescription.length > 0)) {
          completed++;
        }
      }
    }

    progress.push({
      categoryId,
      categoryCode: categoryId,
      categoryName: name,
      total,
      answered,
      completed,
      percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  }

  return progress.sort((a, b) => a.categoryCode.localeCompare(b.categoryCode));
}

/**
 * Calculate progress by element (audit area for ANS, component for SMS)
 */
function calculateElementProgress(
  responses: AssessmentResponseWithQuestion[],
  questionnaireType: QuestionnaireType
): ElementProgress[] {
  if (questionnaireType === "ANS_USOAP_CMA") {
    return calculateANSElementProgress(responses);
  }
  return calculateSMSElementProgress(responses);
}

/**
 * Calculate ANS audit area progress
 */
function calculateANSElementProgress(
  responses: AssessmentResponseWithQuestion[]
): ElementProgress[] {
  // Group by audit area
  const auditAreaGroups: Record<string, AssessmentResponseWithQuestion[]> = {};

  for (const response of responses) {
    const auditArea = response.question.auditArea;
    if (auditArea) {
      if (!auditAreaGroups[auditArea]) {
        auditAreaGroups[auditArea] = [];
      }
      auditAreaGroups[auditArea].push(response);
    }
  }

  const progress: ElementProgress[] = [];

  for (const [element, elementResponses] of Object.entries(auditAreaGroups)) {
    const total = elementResponses.length;
    let answered = 0;
    let completed = 0;
    let satisfactoryCount = 0;
    let notSatisfactoryCount = 0;
    let notApplicableCount = 0;

    for (const response of elementResponses) {
      if (response.responseValue && response.responseValue !== "NOT_REVIEWED") {
        answered++;

        switch (response.responseValue) {
          case "SATISFACTORY":
            satisfactoryCount++;
            break;
          case "NOT_SATISFACTORY":
            notSatisfactoryCount++;
            break;
          case "NOT_APPLICABLE":
            notApplicableCount++;
            break;
        }

        if (response.isComplete ||
            (response.evidenceDescription && response.evidenceDescription.length > 0)) {
          completed++;
        }
      }
    }

    // Calculate EI score for this area
    const applicable = satisfactoryCount + notSatisfactoryCount;
    const eiScore = applicable > 0
      ? Math.round((satisfactoryCount / applicable) * 100)
      : 0;

    progress.push({
      element,
      elementName: element,
      total,
      answered,
      completed,
      satisfactoryCount,
      notSatisfactoryCount,
      notApplicableCount,
      eiScore,
    });
  }

  return progress.sort((a, b) => a.element.localeCompare(b.element));
}

/**
 * Calculate SMS component progress
 */
function calculateSMSElementProgress(
  responses: AssessmentResponseWithQuestion[]
): ElementProgress[] {
  // Group by SMS component
  const componentGroups: Record<string, AssessmentResponseWithQuestion[]> = {};

  for (const response of responses) {
    const component = response.question.smsComponent;
    if (component) {
      if (!componentGroups[component]) {
        componentGroups[component] = [];
      }
      componentGroups[component].push(response);
    }
  }

  const progress: ElementProgress[] = [];

  for (const [element, elementResponses] of Object.entries(componentGroups)) {
    const total = elementResponses.length;
    let answered = 0;
    let completed = 0;
    const maturityDistribution: Record<string, number> = {
      A: 0, B: 0, C: 0, D: 0, E: 0,
    };
    const scores: number[] = [];

    for (const response of elementResponses) {
      if (response.maturityLevel !== null) {
        answered++;
        maturityDistribution[response.maturityLevel]++;
        scores.push(maturityLevelToScore(response.maturityLevel));

        if (response.isComplete ||
            (response.evidenceDescription && response.evidenceDescription.length > 0)) {
          completed++;
        }
      }
    }

    // Calculate average maturity
    const averageMaturity = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    progress.push({
      element,
      elementName: formatComponentName(element),
      total,
      answered,
      completed,
      maturityDistribution,
      averageMaturity: Math.round(averageMaturity * 100) / 100,
      maturityLevel: scores.length > 0 ? getMaturityLevelFromScore(averageMaturity) : null,
    });
  }

  // Sort by component number
  const componentOrder = [
    "SAFETY_POLICY_OBJECTIVES",
    "SAFETY_RISK_MANAGEMENT",
    "SAFETY_ASSURANCE",
    "SAFETY_PROMOTION",
  ];
  return progress.sort((a, b) =>
    componentOrder.indexOf(a.element) - componentOrder.indexOf(b.element)
  );
}

// =============================================================================
// TIME ESTIMATION
// =============================================================================

/**
 * Estimate remaining time to complete assessment
 */
export function estimateRemainingTime(
  responses: AssessmentResponse[],
  totalQuestions: number,
  averageMinutesPerQuestion: number = 5
): {
  estimatedMinutes: number;
  estimatedHours: number;
  formatted: string;
} {
  const answeredCount = responses.filter(
    (r) => r.responseValue !== null || r.maturityLevel !== null
  ).length;

  const remainingQuestions = totalQuestions - answeredCount;
  const estimatedMinutes = remainingQuestions * averageMinutesPerQuestion;
  const estimatedHours = Math.round((estimatedMinutes / 60) * 10) / 10;

  let formatted: string;
  if (estimatedMinutes < 60) {
    formatted = `${estimatedMinutes} minutes`;
  } else if (estimatedMinutes < 120) {
    formatted = `1 hour ${estimatedMinutes - 60} minutes`;
  } else {
    formatted = `${estimatedHours} hours`;
  }

  return {
    estimatedMinutes,
    estimatedHours,
    formatted,
  };
}

/**
 * Calculate average time per question from response history
 */
export function calculateAverageTimePerQuestion(
  responses: AssessmentResponse[]
): number {
  if (responses.length < 2) return 5; // Default 5 minutes

  // Sort by response time
  const sortedResponses = [...responses]
    .filter((r) => r.respondedAt)
    .sort((a, b) => new Date(a.respondedAt).getTime() - new Date(b.respondedAt).getTime());

  if (sortedResponses.length < 2) return 5;

  // Calculate time differences between consecutive responses
  const timeDiffs: number[] = [];
  for (let i = 1; i < sortedResponses.length; i++) {
    const diff = new Date(sortedResponses[i].respondedAt).getTime() -
                 new Date(sortedResponses[i - 1].respondedAt).getTime();
    // Only count reasonable differences (between 30 seconds and 30 minutes)
    const diffMinutes = diff / (1000 * 60);
    if (diffMinutes >= 0.5 && diffMinutes <= 30) {
      timeDiffs.push(diffMinutes);
    }
  }

  if (timeDiffs.length === 0) return 5;

  // Return average, rounded to 1 decimal
  const average = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
  return Math.round(average * 10) / 10;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format SMS component name for display
 */
function formatComponentName(component: string): string {
  const names: Record<string, string> = {
    SAFETY_POLICY_OBJECTIVES: "Safety Policy & Objectives",
    SAFETY_RISK_MANAGEMENT: "Safety Risk Management",
    SAFETY_ASSURANCE: "Safety Assurance",
    SAFETY_PROMOTION: "Safety Promotion",
  };
  return names[component] || component;
}

/**
 * Get progress status label
 */
export function getProgressStatusLabel(
  percentComplete: number,
  locale: "en" | "fr" = "en"
): string {
  if (percentComplete === 0) {
    return locale === "en" ? "Not Started" : "Non commencé";
  }
  if (percentComplete < 25) {
    return locale === "en" ? "Just Started" : "Tout juste commencé";
  }
  if (percentComplete < 50) {
    return locale === "en" ? "In Progress" : "En cours";
  }
  if (percentComplete < 75) {
    return locale === "en" ? "Halfway Complete" : "À moitié terminé";
  }
  if (percentComplete < 100) {
    return locale === "en" ? "Almost Complete" : "Presque terminé";
  }
  return locale === "en" ? "Complete" : "Terminé";
}

/**
 * Get progress color based on percentage
 */
export function getProgressColor(percentComplete: number): string {
  if (percentComplete === 0) return "gray";
  if (percentComplete < 25) return "red";
  if (percentComplete < 50) return "orange";
  if (percentComplete < 75) return "yellow";
  if (percentComplete < 100) return "blue";
  return "green";
}

/**
 * Check if assessment can be submitted
 */
export function canSubmitAssessment(progress: AssessmentProgress): {
  canSubmit: boolean;
  blockers: string[];
  warnings: string[];
} {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Must have all questions answered
  if (progress.percentAnswered < 100) {
    blockers.push(
      `${progress.totalQuestions - progress.answeredQuestions} questions still need to be answered`
    );
  }

  // Should have evidence for most questions
  if (progress.percentComplete < 75) {
    warnings.push(
      `Only ${progress.percentComplete}% of questions have supporting evidence`
    );
  }

  // Check for any incomplete categories
  const incompleteCategories = progress.categoryProgress.filter(
    (c) => c.answered < c.total
  );
  if (incompleteCategories.length > 0) {
    blockers.push(
      `${incompleteCategories.length} categories have unanswered questions`
    );
  }

  return {
    canSubmit: blockers.length === 0,
    blockers,
    warnings,
  };
}
