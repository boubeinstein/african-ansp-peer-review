/**
 * Scoring Service
 *
 * Implements ICAO USOAP CMA (EI Score) and CANSO SoE 2024 (SMS Maturity)
 * scoring methodologies for assessments.
 */

import { prisma } from "@/lib/db";
import type {
  MaturityLevel,
  USOAPAuditArea,
  CriticalElement,
  SMSComponent,
  CANSOStudyArea,
  AssessmentStatus,
} from "@prisma/client";
import {
  AUDIT_AREAS,
  CRITICAL_ELEMENTS,
  SMS_COMPONENTS,
  SMS_STUDY_AREAS,
  percentageToMaturityLevel,
  maturityLevelToNumeric,
  numericToMaturityLevel,
  isCountableResponse,
  MIN_COMPLETION_FOR_SCORING,
  PRIORITY_PQ_WEIGHT,
  DEFAULT_PQ_WEIGHT,
} from "@/lib/constants/scoring";

// =============================================================================
// TYPES
// =============================================================================

export interface AuditAreaScore {
  code: USOAPAuditArea;
  name: string;
  nameEn: string;
  nameFr: string;
  eiScore: number;
  satisfactory: number;
  notSatisfactory: number;
  notApplicable: number;
  notReviewed: number;
  total: number;
  applicable: number;
}

export interface CriticalElementScore {
  code: CriticalElement;
  name: string;
  nameEn: string;
  nameFr: string;
  eiScore: number;
  satisfactory: number;
  notSatisfactory: number;
  notApplicable: number;
  notReviewed: number;
  total: number;
  applicable: number;
}

export interface CategoryScore {
  id: string;
  code: string;
  name: string;
  eiScore: number;
  satisfactory: number;
  notSatisfactory: number;
  notApplicable: number;
  notReviewed: number;
  total: number;
  applicable: number;
}

export interface EIScoreResult {
  overall: number;
  weightedOverall: number;
  byAuditArea: Record<USOAPAuditArea, AuditAreaScore>;
  byCriticalElement: Record<CriticalElement, CriticalElementScore>;
  byCategory: Record<string, CategoryScore>;
  totalQuestions: number;
  applicableQuestions: number;
  satisfactoryCount: number;
  notSatisfactoryCount: number;
  notApplicableCount: number;
  notReviewedCount: number;
  completionPercentage: number;
  calculatedAt: Date;
  isComplete: boolean;
}

export interface ComponentScore {
  code: SMSComponent;
  name: string;
  nameEn: string;
  nameFr: string;
  weight: number;
  score: number;
  level: MaturityLevel;
  studyAreas: CANSOStudyArea[];
  questionCount: number;
  answeredCount: number;
}

export interface StudyAreaScore {
  code: CANSOStudyArea;
  name: string;
  nameEn: string;
  nameFr: string;
  componentCode: SMSComponent;
  score: number;
  level: MaturityLevel;
  questionCount: number;
  answeredCount: number;
  levelCounts: Record<MaturityLevel, number>;
}

export interface TransversalScore {
  code: string;
  name: string;
  score: number;
  level: MaturityLevel;
  questionCount: number;
  answeredCount: number;
}

export interface SMSScoreResult {
  overallScore: number;
  overallLevel: MaturityLevel;
  byComponent: Record<SMSComponent, ComponentScore>;
  byStudyArea: Record<CANSOStudyArea, StudyAreaScore>;
  byTransversalArea: Record<string, TransversalScore>;
  questionCount: number;
  answeredCount: number;
  completionPercentage: number;
  calculatedAt: Date;
  isComplete: boolean;
}

export interface ScoreComparison {
  assessments: Array<{
    id: string;
    title: string;
    type: string;
    organizationName: string;
    completedAt: Date | null;
    score: number;
    level?: MaturityLevel;
  }>;
  trend: "improving" | "declining" | "stable" | "insufficient_data";
  averageScore: number;
  highestScore: number;
  lowestScore: number;
}

export interface ValidationResult {
  isValid: boolean;
  canCalculate: boolean;
  completionPercentage: number;
  errors: string[];
  warnings: string[];
}

// =============================================================================
// SCORING SERVICE CLASS
// =============================================================================

export class ScoringService {
  /**
   * Calculate EI score for ANS (USOAP CMA) assessment
   */
  async calculateEIScore(
    assessmentId: string,
    options: { useWeighting?: boolean } = {}
  ): Promise<EIScoreResult> {
    const { useWeighting = false } = options;

    // Fetch assessment with responses
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questionnaire: true,
        responses: {
          include: {
            question: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!assessment) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    if (assessment.questionnaire.type !== "ANS_USOAP_CMA") {
      throw new Error(
        `Assessment is not ANS type: ${assessment.questionnaire.type}`
      );
    }

    // Initialize score containers
    const byAuditArea = initializeAuditAreaScores();
    const byCriticalElement = initializeCriticalElementScores();
    const byCategory: Record<string, CategoryScore> = {};

    // Count totals
    let totalQuestions = 0;
    let satisfactoryCount = 0;
    let notSatisfactoryCount = 0;
    let notApplicableCount = 0;
    let notReviewedCount = 0;
    let weightedSatisfactory = 0;
    let weightedApplicable = 0;

    // Process each response
    for (const response of assessment.responses) {
      const question = response.question;
      const responseValue = response.responseValue;
      const weight = useWeighting && question.isPriorityPQ
        ? PRIORITY_PQ_WEIGHT
        : DEFAULT_PQ_WEIGHT;

      totalQuestions++;

      // Count by response type
      if (responseValue === "SATISFACTORY") {
        satisfactoryCount++;
        weightedSatisfactory += weight;
      } else if (responseValue === "NOT_SATISFACTORY") {
        notSatisfactoryCount++;
      } else if (responseValue === "NOT_APPLICABLE") {
        notApplicableCount++;
      } else {
        notReviewedCount++;
      }

      // Update audit area scores
      if (question.auditArea && question.auditArea in byAuditArea) {
        const area = byAuditArea[question.auditArea as USOAPAuditArea];
        area.total++;
        if (responseValue === "SATISFACTORY") {
          area.satisfactory++;
        } else if (responseValue === "NOT_SATISFACTORY") {
          area.notSatisfactory++;
        } else if (responseValue === "NOT_APPLICABLE") {
          area.notApplicable++;
        } else {
          area.notReviewed++;
        }
        area.applicable = area.total - area.notApplicable - area.notReviewed;
      }

      // Update critical element scores
      if (question.criticalElement && question.criticalElement in byCriticalElement) {
        const ce = byCriticalElement[question.criticalElement as CriticalElement];
        ce.total++;
        if (responseValue === "SATISFACTORY") {
          ce.satisfactory++;
        } else if (responseValue === "NOT_SATISFACTORY") {
          ce.notSatisfactory++;
        } else if (responseValue === "NOT_APPLICABLE") {
          ce.notApplicable++;
        } else {
          ce.notReviewed++;
        }
        ce.applicable = ce.total - ce.notApplicable - ce.notReviewed;
      }

      // Update category scores
      const categoryId = question.categoryId;
      if (!byCategory[categoryId]) {
        byCategory[categoryId] = {
          id: categoryId,
          code: question.category.code,
          name: question.category.nameEn,
          eiScore: 0,
          satisfactory: 0,
          notSatisfactory: 0,
          notApplicable: 0,
          notReviewed: 0,
          total: 0,
          applicable: 0,
        };
      }
      const cat = byCategory[categoryId];
      cat.total++;
      if (responseValue === "SATISFACTORY") {
        cat.satisfactory++;
      } else if (responseValue === "NOT_SATISFACTORY") {
        cat.notSatisfactory++;
      } else if (responseValue === "NOT_APPLICABLE") {
        cat.notApplicable++;
      } else {
        cat.notReviewed++;
      }
      cat.applicable = cat.total - cat.notApplicable - cat.notReviewed;

      // Track weighted applicable
      if (isCountableResponse(responseValue)) {
        weightedApplicable += weight;
      }
    }

    // Calculate EI scores
    const applicableQuestions =
      totalQuestions - notApplicableCount - notReviewedCount;

    const overall =
      applicableQuestions > 0
        ? Math.round((satisfactoryCount / applicableQuestions) * 100 * 10) / 10
        : 0;

    const weightedOverall =
      weightedApplicable > 0
        ? Math.round((weightedSatisfactory / weightedApplicable) * 100 * 10) / 10
        : 0;

    // Calculate per audit area EI
    for (const area of Object.values(byAuditArea)) {
      area.eiScore =
        area.applicable > 0
          ? Math.round((area.satisfactory / area.applicable) * 100 * 10) / 10
          : 0;
    }

    // Calculate per critical element EI
    for (const ce of Object.values(byCriticalElement)) {
      ce.eiScore =
        ce.applicable > 0
          ? Math.round((ce.satisfactory / ce.applicable) * 100 * 10) / 10
          : 0;
    }

    // Calculate per category EI
    for (const cat of Object.values(byCategory)) {
      cat.eiScore =
        cat.applicable > 0
          ? Math.round((cat.satisfactory / cat.applicable) * 100 * 10) / 10
          : 0;
    }

    const completionPercentage =
      totalQuestions > 0
        ? Math.round(
            ((totalQuestions - notReviewedCount) / totalQuestions) * 100
          )
        : 0;

    return {
      overall,
      weightedOverall,
      byAuditArea,
      byCriticalElement,
      byCategory,
      totalQuestions,
      applicableQuestions,
      satisfactoryCount,
      notSatisfactoryCount,
      notApplicableCount,
      notReviewedCount,
      completionPercentage,
      calculatedAt: new Date(),
      isComplete: completionPercentage >= MIN_COMPLETION_FOR_SCORING,
    };
  }

  /**
   * Calculate SMS maturity for CANSO SoE assessment
   */
  async calculateSMSMaturity(assessmentId: string): Promise<SMSScoreResult> {
    // Fetch assessment with responses
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questionnaire: true,
        responses: {
          include: {
            question: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!assessment) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    if (assessment.questionnaire.type !== "SMS_CANSO_SOE") {
      throw new Error(
        `Assessment is not SMS type: ${assessment.questionnaire.type}`
      );
    }

    // Initialize score containers
    const byStudyArea = initializeStudyAreaScores();
    const byComponent = initializeComponentScores();
    const byTransversalArea: Record<string, TransversalScore> = {};

    let totalQuestions = 0;
    let answeredQuestions = 0;

    // Process each response
    for (const response of assessment.responses) {
      const question = response.question;
      const maturityLevel = response.maturityLevel;

      totalQuestions++;

      if (maturityLevel) {
        answeredQuestions++;
      }

      // Update study area scores
      if (question.studyArea && question.studyArea in byStudyArea) {
        const sa = byStudyArea[question.studyArea as CANSOStudyArea];
        sa.questionCount++;
        if (maturityLevel) {
          sa.answeredCount++;
          sa.levelCounts[maturityLevel]++;
        }
      }
    }

    // Calculate study area scores (average maturity level)
    for (const sa of Object.values(byStudyArea)) {
      if (sa.answeredCount > 0) {
        let totalNumeric = 0;
        for (const [level, count] of Object.entries(sa.levelCounts)) {
          totalNumeric += maturityLevelToNumeric(level as MaturityLevel) * count;
        }
        const avgNumeric = totalNumeric / sa.answeredCount;
        // Convert to percentage (1-5 scale to 0-100)
        sa.score = Math.round(((avgNumeric - 1) / 4) * 100 * 10) / 10;
        sa.level = numericToMaturityLevel(avgNumeric);
      }
    }

    // Calculate component scores (weighted average of study areas)
    for (const comp of Object.values(byComponent)) {
      let totalScore = 0;
      let totalWeight = 0;
      let questionCount = 0;
      let answeredCount = 0;

      for (const saCode of comp.studyAreas) {
        const sa = byStudyArea[saCode];
        if (sa.answeredCount > 0) {
          // Each study area within a component has equal weight
          totalScore += sa.score;
          totalWeight += 1;
        }
        questionCount += sa.questionCount;
        answeredCount += sa.answeredCount;
      }

      comp.questionCount = questionCount;
      comp.answeredCount = answeredCount;

      if (totalWeight > 0) {
        comp.score = Math.round((totalScore / totalWeight) * 10) / 10;
        comp.level = percentageToMaturityLevel(comp.score);
      }
    }

    // Calculate overall score (weighted average of components)
    let overallScore = 0;
    for (const comp of Object.values(byComponent)) {
      if (comp.answeredCount > 0) {
        overallScore += comp.score * comp.weight;
      }
    }
    overallScore = Math.round(overallScore * 10) / 10;
    const overallLevel = percentageToMaturityLevel(overallScore);

    const completionPercentage =
      totalQuestions > 0
        ? Math.round((answeredQuestions / totalQuestions) * 100)
        : 0;

    return {
      overallScore,
      overallLevel,
      byComponent,
      byStudyArea,
      byTransversalArea,
      questionCount: totalQuestions,
      answeredCount: answeredQuestions,
      completionPercentage,
      calculatedAt: new Date(),
      isComplete: completionPercentage >= MIN_COMPLETION_FOR_SCORING,
    };
  }

  /**
   * Calculate scores and update assessment record
   */
  async calculateAndSaveScores(assessmentId: string): Promise<void> {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { questionnaire: true },
    });

    if (!assessment) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    if (assessment.questionnaire.type === "ANS_USOAP_CMA") {
      const scores = await this.calculateEIScore(assessmentId);

      // Convert to plain JSON for Prisma
      const categoryScoresJson = JSON.parse(JSON.stringify({
        byAuditArea: scores.byAuditArea,
        byCriticalElement: scores.byCriticalElement,
        byCategory: scores.byCategory,
        metadata: {
          totalQuestions: scores.totalQuestions,
          satisfactoryCount: scores.satisfactoryCount,
          notSatisfactoryCount: scores.notSatisfactoryCount,
          notApplicableCount: scores.notApplicableCount,
          completionPercentage: scores.completionPercentage,
        },
      }));

      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          eiScore: scores.overall,
          overallScore: scores.overall,
          categoryScores: categoryScoresJson,
          progress: scores.completionPercentage,
        },
      });
    } else {
      const scores = await this.calculateSMSMaturity(assessmentId);

      // Convert to plain JSON for Prisma
      const categoryScoresJson = JSON.parse(JSON.stringify({
        byComponent: scores.byComponent,
        byStudyArea: scores.byStudyArea,
        metadata: {
          questionCount: scores.questionCount,
          answeredCount: scores.answeredCount,
          completionPercentage: scores.completionPercentage,
        },
      }));

      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          overallScore: scores.overallScore,
          maturityLevel: scores.overallLevel,
          categoryScores: categoryScoresJson,
          progress: scores.completionPercentage,
        },
      });
    }
  }

  /**
   * Get score breakdown for reporting
   */
  async getScoreBreakdown(
    assessmentId: string
  ): Promise<EIScoreResult | SMSScoreResult> {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { questionnaire: true },
    });

    if (!assessment) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    if (assessment.questionnaire.type === "ANS_USOAP_CMA") {
      return this.calculateEIScore(assessmentId);
    } else {
      return this.calculateSMSMaturity(assessmentId);
    }
  }

  /**
   * Compare scores between assessments (for trend analysis)
   */
  async compareScores(assessmentIds: string[]): Promise<ScoreComparison> {
    if (assessmentIds.length === 0) {
      return {
        assessments: [],
        trend: "insufficient_data",
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
      };
    }

    const assessments = await prisma.assessment.findMany({
      where: { id: { in: assessmentIds } },
      include: {
        organization: true,
        questionnaire: true,
      },
      orderBy: { completedAt: "asc" },
    });

    const results = assessments.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.questionnaire.type,
      organizationName: a.organization.nameEn,
      completedAt: a.completedAt,
      score: a.overallScore ?? 0,
      level: a.maturityLevel ?? undefined,
    }));

    const scores: number[] = results.map((r) => r.score).filter((s): s is number => s > 0);

    if (scores.length < 2) {
      return {
        assessments: results,
        trend: "insufficient_data",
        averageScore: scores.length > 0 ? scores[0] : 0,
        highestScore: scores.length > 0 ? Math.max(...scores) : 0,
        lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      };
    }

    const averageScore =
      Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    // Determine trend based on first and last scores
    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const scoreDiff = lastScore - firstScore;

    let trend: ScoreComparison["trend"];
    if (scoreDiff > 5) {
      trend = "improving";
    } else if (scoreDiff < -5) {
      trend = "declining";
    } else {
      trend = "stable";
    }

    return {
      assessments: results,
      trend,
      averageScore,
      highestScore,
      lowestScore,
    };
  }

  /**
   * Validate assessment is complete enough for scoring
   */
  async validateForScoring(assessmentId: string): Promise<ValidationResult> {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questionnaire: true,
        responses: true,
      },
    });

    if (!assessment) {
      return {
        isValid: false,
        canCalculate: false,
        completionPercentage: 0,
        errors: ["Assessment not found"],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Count responses
    const totalResponses = assessment.responses.length;
    let answeredCount = 0;

    if (assessment.questionnaire.type === "ANS_USOAP_CMA") {
      for (const response of assessment.responses) {
        if (
          response.responseValue &&
          response.responseValue !== "NOT_REVIEWED"
        ) {
          answeredCount++;
        }
      }
    } else {
      for (const response of assessment.responses) {
        if (response.maturityLevel) {
          answeredCount++;
        }
      }
    }

    const completionPercentage =
      totalResponses > 0
        ? Math.round((answeredCount / totalResponses) * 100)
        : 0;

    // Check completion threshold
    if (completionPercentage < MIN_COMPLETION_FOR_SCORING) {
      warnings.push(
        `Assessment is only ${completionPercentage}% complete. Minimum ${MIN_COMPLETION_FOR_SCORING}% required for official scoring.`
      );
    }

    // Check assessment status
    const validStatuses: AssessmentStatus[] = [
      "SUBMITTED",
      "UNDER_REVIEW",
      "COMPLETED",
    ];
    if (!validStatuses.includes(assessment.status)) {
      warnings.push(
        `Assessment status is ${assessment.status}. Consider submitting the assessment for official scoring.`
      );
    }

    // Check for any responses
    if (totalResponses === 0) {
      errors.push("No responses recorded for this assessment");
    }

    return {
      isValid: errors.length === 0,
      canCalculate: errors.length === 0,
      completionPercentage,
      errors,
      warnings,
    };
  }

  /**
   * Get historical scores for an organization
   */
  async getOrganizationScoreHistory(
    organizationId: string,
    questionnaireType?: "ANS_USOAP_CMA" | "SMS_CANSO_SOE"
  ): Promise<ScoreComparison> {
    const whereClause: Record<string, unknown> = {
      organizationId,
      overallScore: { not: null },
    };

    if (questionnaireType) {
      whereClause.questionnaire = { type: questionnaireType };
    }

    const assessments = await prisma.assessment.findMany({
      where: whereClause,
      include: {
        organization: true,
        questionnaire: true,
      },
      orderBy: { completedAt: "asc" },
    });

    return this.compareScores(assessments.map((a: { id: string }) => a.id));
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function initializeAuditAreaScores(): Record<USOAPAuditArea, AuditAreaScore> {
  const scores: Partial<Record<USOAPAuditArea, AuditAreaScore>> = {};

  for (const [code, info] of Object.entries(AUDIT_AREAS)) {
    scores[code as USOAPAuditArea] = {
      code: code as USOAPAuditArea,
      name: info.name,
      nameEn: info.nameEn,
      nameFr: info.nameFr,
      eiScore: 0,
      satisfactory: 0,
      notSatisfactory: 0,
      notApplicable: 0,
      notReviewed: 0,
      total: 0,
      applicable: 0,
    };
  }

  return scores as Record<USOAPAuditArea, AuditAreaScore>;
}

function initializeCriticalElementScores(): Record<
  CriticalElement,
  CriticalElementScore
> {
  const scores: Partial<Record<CriticalElement, CriticalElementScore>> = {};

  for (const [code, info] of Object.entries(CRITICAL_ELEMENTS)) {
    scores[code as CriticalElement] = {
      code: code as CriticalElement,
      name: info.name,
      nameEn: info.nameEn,
      nameFr: info.nameFr,
      eiScore: 0,
      satisfactory: 0,
      notSatisfactory: 0,
      notApplicable: 0,
      notReviewed: 0,
      total: 0,
      applicable: 0,
    };
  }

  return scores as Record<CriticalElement, CriticalElementScore>;
}

function initializeStudyAreaScores(): Record<CANSOStudyArea, StudyAreaScore> {
  const scores: Partial<Record<CANSOStudyArea, StudyAreaScore>> = {};

  for (const [code, info] of Object.entries(SMS_STUDY_AREAS)) {
    scores[code as CANSOStudyArea] = {
      code: code as CANSOStudyArea,
      name: info.name,
      nameEn: info.nameEn,
      nameFr: info.nameFr,
      componentCode: info.component,
      score: 0,
      level: "LEVEL_A",
      questionCount: 0,
      answeredCount: 0,
      levelCounts: {
        LEVEL_A: 0,
        LEVEL_B: 0,
        LEVEL_C: 0,
        LEVEL_D: 0,
        LEVEL_E: 0,
      },
    };
  }

  return scores as Record<CANSOStudyArea, StudyAreaScore>;
}

function initializeComponentScores(): Record<SMSComponent, ComponentScore> {
  const scores: Partial<Record<SMSComponent, ComponentScore>> = {};

  for (const [code, info] of Object.entries(SMS_COMPONENTS)) {
    scores[code as SMSComponent] = {
      code: code as SMSComponent,
      name: info.name,
      nameEn: info.nameEn,
      nameFr: info.nameFr,
      weight: info.weight,
      score: 0,
      level: "LEVEL_A",
      studyAreas: info.studyAreas,
      questionCount: 0,
      answeredCount: 0,
    };
  }

  return scores as Record<SMSComponent, ComponentScore>;
}

// Export singleton instance
export const scoringService = new ScoringService();
