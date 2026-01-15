/**
 * Scoring Engine Unit Tests
 *
 * Tests for ICAO USOAP CMA EI score calculation and CANSO SoE SMS maturity scoring.
 */

import { describe, it, expect } from "vitest";
import {
  calculateEIScore,
  calculateSimpleEIScore,
  calculateSMSMaturity,
  maturityLevelToScore,
  getLowestMaturityLevel,
  calculateCategoryScores,
  compareScores,
  identifyImprovementAreas,
  validateAssessmentForSubmission,
} from "@/lib/assessment/scoring";
import {
  getMaturityLevelFromScore,
  getEIScoreCategory,
  calculateWeightedSMSScore,
} from "@/lib/assessment/constants";
import type { AssessmentResponseWithQuestion, AssessmentResponse } from "@/lib/assessment/types";
import type { USOAPAuditArea, CriticalElement, SMSComponent, CANSOStudyArea } from "@prisma/client";

// =============================================================================
// HELPER FUNCTIONS FOR CREATING TEST DATA
// =============================================================================

function createMockANSResponse(
  responseValue: "SATISFACTORY" | "NOT_SATISFACTORY" | "NOT_APPLICABLE" | "NOT_REVIEWED",
  options: {
    auditArea?: string;
    criticalElement?: string;
    isPriorityPQ?: boolean;
  } = {}
): AssessmentResponseWithQuestion {
  return {
    id: `resp_${Math.random().toString(36).slice(2)}`,
    assessmentId: "test_assessment",
    questionId: `q_${Math.random().toString(36).slice(2)}`,
    responseValue,
    maturityLevel: null,
    evidenceDescription: undefined,
    evidenceUrls: [],
    isComplete: false,
    needsReview: false,
    respondedById: "test_user",
    respondedAt: new Date(),
    lastModifiedAt: new Date(),
    question: {
      id: `q_${Math.random().toString(36).slice(2)}`,
      pqNumber: `PQ_${Math.random().toString(36).slice(2)}`,
      questionTextEn: "Test question?",
      questionTextFr: "Question de test?",
      weight: 1.0,
      isPriorityPQ: options.isPriorityPQ ?? false,
      auditArea: options.auditArea as USOAPAuditArea | undefined,
      criticalElement: options.criticalElement as CriticalElement | undefined,
      smsComponent: undefined,
      studyArea: undefined,
      requiresOnSite: false,
    },
  };
}

function createMockSMSResponse(
  maturityLevel: "A" | "B" | "C" | "D" | "E" | null,
  options: {
    smsComponent?: string;
    studyArea?: string;
  } = {}
): AssessmentResponseWithQuestion {
  return {
    id: `resp_${Math.random().toString(36).slice(2)}`,
    assessmentId: "test_assessment",
    questionId: `q_${Math.random().toString(36).slice(2)}`,
    responseValue: null,
    maturityLevel,
    evidenceDescription: undefined,
    evidenceUrls: [],
    isComplete: false,
    needsReview: false,
    respondedById: "test_user",
    respondedAt: new Date(),
    lastModifiedAt: new Date(),
    question: {
      id: `q_${Math.random().toString(36).slice(2)}`,
      pqNumber: `PQ_${Math.random().toString(36).slice(2)}`,
      questionTextEn: "Test SMS question?",
      questionTextFr: "Question SMS de test?",
      weight: 1.0,
      isPriorityPQ: false,
      auditArea: undefined,
      criticalElement: undefined,
      smsComponent: options.smsComponent as SMSComponent | undefined,
      studyArea: options.studyArea as CANSOStudyArea | undefined,
      requiresOnSite: false,
    },
  };
}

// =============================================================================
// EI SCORE CALCULATION TESTS
// =============================================================================

describe("EI Score Calculation", () => {
  describe("calculateEIScore", () => {
    it("should calculate 100% EI when all responses are Satisfactory", () => {
      const responses = [
        createMockANSResponse("SATISFACTORY"),
        createMockANSResponse("SATISFACTORY"),
        createMockANSResponse("SATISFACTORY"),
        createMockANSResponse("SATISFACTORY"),
        createMockANSResponse("SATISFACTORY"),
      ];

      const result = calculateEIScore(responses);

      expect(result.overallEI).toBe(100);
      expect(result.satisfactoryCount).toBe(5);
      expect(result.notSatisfactoryCount).toBe(0);
      expect(result.totalApplicable).toBe(5);
    });

    it("should calculate 0% EI when all responses are Not Satisfactory", () => {
      const responses = [
        createMockANSResponse("NOT_SATISFACTORY"),
        createMockANSResponse("NOT_SATISFACTORY"),
        createMockANSResponse("NOT_SATISFACTORY"),
        createMockANSResponse("NOT_SATISFACTORY"),
        createMockANSResponse("NOT_SATISFACTORY"),
      ];

      const result = calculateEIScore(responses);

      expect(result.overallEI).toBe(0);
      expect(result.satisfactoryCount).toBe(0);
      expect(result.notSatisfactoryCount).toBe(5);
      expect(result.totalApplicable).toBe(5);
    });

    it("should exclude N/A from calculation", () => {
      const responses = [
        createMockANSResponse("SATISFACTORY"),
        createMockANSResponse("SATISFACTORY"),
        createMockANSResponse("NOT_APPLICABLE"),
        createMockANSResponse("NOT_APPLICABLE"),
        createMockANSResponse("NOT_APPLICABLE"),
      ];

      const result = calculateEIScore(responses);

      expect(result.overallEI).toBe(100);
      expect(result.satisfactoryCount).toBe(2);
      expect(result.notApplicableCount).toBe(3);
      expect(result.totalApplicable).toBe(2);
    });

    it("should exclude Not Reviewed from calculation", () => {
      const responses = [
        createMockANSResponse("SATISFACTORY"),
        createMockANSResponse("NOT_SATISFACTORY"),
        createMockANSResponse("NOT_REVIEWED"),
        createMockANSResponse("NOT_REVIEWED"),
      ];

      const result = calculateEIScore(responses);

      expect(result.overallEI).toBe(50);
      expect(result.satisfactoryCount).toBe(1);
      expect(result.notSatisfactoryCount).toBe(1);
      expect(result.notReviewedCount).toBe(2);
      expect(result.totalApplicable).toBe(2);
    });

    it("should calculate correct EI for mixed responses", () => {
      const responses = [
        createMockANSResponse("SATISFACTORY"),
        createMockANSResponse("SATISFACTORY"),
        createMockANSResponse("SATISFACTORY"),
        createMockANSResponse("NOT_SATISFACTORY"),
        createMockANSResponse("NOT_SATISFACTORY"),
        createMockANSResponse("NOT_APPLICABLE"),
        createMockANSResponse("NOT_REVIEWED"),
      ];

      const result = calculateEIScore(responses);

      // 3 Satisfactory, 2 Not Satisfactory = 3/5 = 60%
      expect(result.overallEI).toBe(60);
      expect(result.satisfactoryCount).toBe(3);
      expect(result.notSatisfactoryCount).toBe(2);
      expect(result.notApplicableCount).toBe(1);
      expect(result.notReviewedCount).toBe(1);
      expect(result.totalApplicable).toBe(5);
    });

    it("should handle empty responses", () => {
      const result = calculateEIScore([]);

      expect(result.overallEI).toBe(0);
      expect(result.totalApplicable).toBe(0);
    });

    it("should handle all N/A responses", () => {
      const responses = [
        createMockANSResponse("NOT_APPLICABLE"),
        createMockANSResponse("NOT_APPLICABLE"),
        createMockANSResponse("NOT_APPLICABLE"),
      ];

      const result = calculateEIScore(responses);

      expect(result.overallEI).toBe(0);
      expect(result.totalApplicable).toBe(0);
      expect(result.notApplicableCount).toBe(3);
    });

    it("should calculate EI by audit area", () => {
      const responses = [
        createMockANSResponse("SATISFACTORY", { auditArea: "ANS" }),
        createMockANSResponse("SATISFACTORY", { auditArea: "ANS" }),
        createMockANSResponse("NOT_SATISFACTORY", { auditArea: "ANS" }),
        createMockANSResponse("SATISFACTORY", { auditArea: "AGA" }),
        createMockANSResponse("NOT_SATISFACTORY", { auditArea: "AGA" }),
      ];

      const result = calculateEIScore(responses);

      // ANS: 2/3 = 66.67%, AGA: 1/2 = 50%
      expect(result.auditAreaScores["ANS"].ei).toBeCloseTo(66.67, 1);
      expect(result.auditAreaScores["ANS"].satisfactory).toBe(2);
      expect(result.auditAreaScores["ANS"].notSatisfactory).toBe(1);

      expect(result.auditAreaScores["AGA"].ei).toBe(50);
      expect(result.auditAreaScores["AGA"].satisfactory).toBe(1);
      expect(result.auditAreaScores["AGA"].notSatisfactory).toBe(1);
    });

    it("should calculate EI by critical element", () => {
      const responses = [
        createMockANSResponse("SATISFACTORY", { criticalElement: "CE_1" }),
        createMockANSResponse("SATISFACTORY", { criticalElement: "CE_1" }),
        createMockANSResponse("NOT_SATISFACTORY", { criticalElement: "CE_1" }),
        createMockANSResponse("SATISFACTORY", { criticalElement: "CE_2" }),
      ];

      const result = calculateEIScore(responses);

      // CE_1: 2/3 = 66.67%, CE_2: 1/1 = 100%
      expect(result.criticalElementScores["CE_1"].ei).toBeCloseTo(66.67, 1);
      expect(result.criticalElementScores["CE_2"].ei).toBe(100);
    });

    it("should calculate priority PQ score separately", () => {
      const responses = [
        createMockANSResponse("SATISFACTORY", { isPriorityPQ: true }),
        createMockANSResponse("SATISFACTORY", { isPriorityPQ: true }),
        createMockANSResponse("NOT_SATISFACTORY", { isPriorityPQ: true }),
        createMockANSResponse("SATISFACTORY", { isPriorityPQ: false }),
        createMockANSResponse("NOT_SATISFACTORY", { isPriorityPQ: false }),
      ];

      const result = calculateEIScore(responses);

      // Priority: 2/3 = 66.67%
      // Overall: 3/5 = 60%
      expect(result.priorityPQScore).toBeCloseTo(66.67, 1);
      expect(result.overallEI).toBe(60);
    });
  });

  describe("calculateSimpleEIScore", () => {
    it("should calculate EI from simple counts", () => {
      expect(calculateSimpleEIScore(80, 20)).toBe(80);
      expect(calculateSimpleEIScore(50, 50)).toBe(50);
      expect(calculateSimpleEIScore(100, 0)).toBe(100);
      expect(calculateSimpleEIScore(0, 100)).toBe(0);
    });

    it("should return 0 when no applicable responses", () => {
      expect(calculateSimpleEIScore(0, 0)).toBe(0);
    });

    it("should round to 2 decimal places", () => {
      expect(calculateSimpleEIScore(1, 2)).toBeCloseTo(33.33, 2);
      expect(calculateSimpleEIScore(2, 3)).toBe(40);
    });
  });
});

// =============================================================================
// SMS MATURITY CALCULATION TESTS
// =============================================================================

describe("SMS Maturity Calculation", () => {
  describe("maturityLevelToScore", () => {
    it("should convert maturity levels to correct numeric scores", () => {
      expect(maturityLevelToScore("A")).toBe(1);
      expect(maturityLevelToScore("B")).toBe(2);
      expect(maturityLevelToScore("C")).toBe(3);
      expect(maturityLevelToScore("D")).toBe(4);
      expect(maturityLevelToScore("E")).toBe(5);
    });
  });

  describe("getMaturityLevelFromScore", () => {
    it("should convert numeric scores to correct maturity levels", () => {
      expect(getMaturityLevelFromScore(1)).toBe("A");
      expect(getMaturityLevelFromScore(1.4)).toBe("A");
      expect(getMaturityLevelFromScore(1.5)).toBe("B");
      expect(getMaturityLevelFromScore(2)).toBe("B");
      expect(getMaturityLevelFromScore(2.5)).toBe("C");
      expect(getMaturityLevelFromScore(3)).toBe("C");
      expect(getMaturityLevelFromScore(3.5)).toBe("D");
      expect(getMaturityLevelFromScore(4)).toBe("D");
      expect(getMaturityLevelFromScore(4.5)).toBe("E");
      expect(getMaturityLevelFromScore(5)).toBe("E");
    });
  });

  describe("getLowestMaturityLevel", () => {
    it("should return the lowest level from an array", () => {
      expect(getLowestMaturityLevel(["A", "B", "C"])).toBe("A");
      expect(getLowestMaturityLevel(["B", "C", "D"])).toBe("B");
      expect(getLowestMaturityLevel(["C", "D", "E"])).toBe("C");
      expect(getLowestMaturityLevel(["D", "E"])).toBe("D");
      expect(getLowestMaturityLevel(["E"])).toBe("E");
    });

    it("should handle null values", () => {
      expect(getLowestMaturityLevel(["B", null, "D"])).toBe("B");
      expect(getLowestMaturityLevel([null, "C", null])).toBe("C");
    });

    it("should return null for empty or all-null arrays", () => {
      expect(getLowestMaturityLevel([])).toBe(null);
      expect(getLowestMaturityLevel([null, null])).toBe(null);
    });
  });

  describe("calculateSMSMaturity", () => {
    it("should calculate overall maturity from uniform responses", () => {
      const responses = [
        createMockSMSResponse("C", { smsComponent: "SAFETY_POLICY_OBJECTIVES" }),
        createMockSMSResponse("C", { smsComponent: "SAFETY_POLICY_OBJECTIVES" }),
        createMockSMSResponse("C", { smsComponent: "SAFETY_RISK_MANAGEMENT" }),
        createMockSMSResponse("C", { smsComponent: "SAFETY_RISK_MANAGEMENT" }),
        createMockSMSResponse("C", { smsComponent: "SAFETY_ASSURANCE" }),
        createMockSMSResponse("C", { smsComponent: "SAFETY_PROMOTION" }),
      ];

      const result = calculateSMSMaturity(responses);

      expect(result.overallLevel).toBe("C");
      expect(result.overallScore).toBe(3);
    });

    it("should use lowest component level as overall level", () => {
      const responses = [
        createMockSMSResponse("E", { smsComponent: "SAFETY_POLICY_OBJECTIVES" }),
        createMockSMSResponse("E", { smsComponent: "SAFETY_POLICY_OBJECTIVES" }),
        createMockSMSResponse("A", { smsComponent: "SAFETY_RISK_MANAGEMENT" }), // Lowest
        createMockSMSResponse("D", { smsComponent: "SAFETY_ASSURANCE" }),
        createMockSMSResponse("D", { smsComponent: "SAFETY_PROMOTION" }),
      ];

      const result = calculateSMSMaturity(responses);

      // Overall level should be A (lowest component)
      expect(result.overallLevel).toBe("A");
    });

    it("should calculate component-level scores correctly", () => {
      const responses = [
        createMockSMSResponse("D", { smsComponent: "SAFETY_POLICY_OBJECTIVES" }),
        createMockSMSResponse("E", { smsComponent: "SAFETY_POLICY_OBJECTIVES" }),
        createMockSMSResponse("C", { smsComponent: "SAFETY_RISK_MANAGEMENT" }),
        createMockSMSResponse("C", { smsComponent: "SAFETY_RISK_MANAGEMENT" }),
      ];

      const result = calculateSMSMaturity(responses);

      // SAFETY_POLICY_OBJECTIVES: (4+5)/2 = 4.5 -> Level E
      expect(result.componentLevels["SAFETY_POLICY_OBJECTIVES"].score).toBe(4.5);
      expect(result.componentLevels["SAFETY_POLICY_OBJECTIVES"].level).toBe("E");

      // SAFETY_RISK_MANAGEMENT: (3+3)/2 = 3 -> Level C
      expect(result.componentLevels["SAFETY_RISK_MANAGEMENT"].score).toBe(3);
      expect(result.componentLevels["SAFETY_RISK_MANAGEMENT"].level).toBe("C");
    });

    it("should calculate study area scores", () => {
      const responses = [
        createMockSMSResponse("D", { studyArea: "SA_1_1" }),
        createMockSMSResponse("D", { studyArea: "SA_1_1" }),
        createMockSMSResponse("B", { studyArea: "SA_2_1" }),
        createMockSMSResponse("C", { studyArea: "SA_2_1" }),
      ];

      const result = calculateSMSMaturity(responses);

      // SA_1_1: (4+4)/2 = 4 -> Level D
      expect(result.studyAreaLevels["SA_1_1"].score).toBe(4);
      expect(result.studyAreaLevels["SA_1_1"].level).toBe("D");

      // SA_2_1: (2+3)/2 = 2.5 -> Level C
      expect(result.studyAreaLevels["SA_2_1"].score).toBe(2.5);
      expect(result.studyAreaLevels["SA_2_1"].level).toBe("C");
    });

    it("should track maturity distribution", () => {
      const responses = [
        createMockSMSResponse("A", { smsComponent: "SAFETY_POLICY_OBJECTIVES" }),
        createMockSMSResponse("B", { smsComponent: "SAFETY_POLICY_OBJECTIVES" }),
        createMockSMSResponse("B", { smsComponent: "SAFETY_RISK_MANAGEMENT" }),
        createMockSMSResponse("C", { smsComponent: "SAFETY_ASSURANCE" }),
        createMockSMSResponse("C", { smsComponent: "SAFETY_PROMOTION" }),
        createMockSMSResponse("C", { smsComponent: "SAFETY_PROMOTION" }),
      ];

      const result = calculateSMSMaturity(responses);

      expect(result.maturityDistribution["A"]).toBe(1);
      expect(result.maturityDistribution["B"]).toBe(2);
      expect(result.maturityDistribution["C"]).toBe(3);
      expect(result.maturityDistribution["D"]).toBe(0);
      expect(result.maturityDistribution["E"]).toBe(0);
    });

    it("should identify gap areas (below Level C)", () => {
      const responses = [
        createMockSMSResponse("A", { smsComponent: "SAFETY_POLICY_OBJECTIVES" }),
        createMockSMSResponse("B", { smsComponent: "SAFETY_RISK_MANAGEMENT" }),
        createMockSMSResponse("C", { smsComponent: "SAFETY_ASSURANCE" }),
        createMockSMSResponse("D", { smsComponent: "SAFETY_PROMOTION" }),
      ];

      const result = calculateSMSMaturity(responses);

      expect(result.gapAreas).toContain("SAFETY_POLICY_OBJECTIVES");
      expect(result.gapAreas).toContain("SAFETY_RISK_MANAGEMENT");
      expect(result.gapAreas).not.toContain("SAFETY_ASSURANCE");
      expect(result.gapAreas).not.toContain("SAFETY_PROMOTION");
    });

    it("should handle empty responses", () => {
      const result = calculateSMSMaturity([]);

      expect(result.overallLevel).toBe(null);
      expect(result.overallScore).toBe(0);
    });

    it("should handle null maturity levels", () => {
      const responses = [
        createMockSMSResponse(null, { smsComponent: "SAFETY_POLICY_OBJECTIVES" }),
        createMockSMSResponse("C", { smsComponent: "SAFETY_RISK_MANAGEMENT" }),
      ];

      const result = calculateSMSMaturity(responses);

      expect(result.maturityDistribution["null"]).toBe(1);
      expect(result.componentLevels["SAFETY_RISK_MANAGEMENT"].score).toBe(3);
    });

    it("should apply component weights correctly", () => {
      const responses = [
        createMockSMSResponse("D", { smsComponent: "SAFETY_POLICY_OBJECTIVES" }), // 0.25 weight
        createMockSMSResponse("D", { smsComponent: "SAFETY_RISK_MANAGEMENT" }), // 0.30 weight
        createMockSMSResponse("D", { smsComponent: "SAFETY_ASSURANCE" }), // 0.25 weight
        createMockSMSResponse("D", { smsComponent: "SAFETY_PROMOTION" }), // 0.20 weight
      ];

      const result = calculateSMSMaturity(responses);

      // All D (score 4), so weighted average should be 4
      expect(result.overallScore).toBe(4);
      expect(result.componentLevels["SAFETY_POLICY_OBJECTIVES"].weight).toBe(0.25);
      expect(result.componentLevels["SAFETY_RISK_MANAGEMENT"].weight).toBe(0.30);
    });
  });

  describe("calculateWeightedSMSScore", () => {
    it("should calculate weighted average correctly", () => {
      const scores = {
        SAFETY_POLICY_OBJECTIVES: 4, // 0.25 weight
        SAFETY_RISK_MANAGEMENT: 3,  // 0.30 weight
        SAFETY_ASSURANCE: 4,        // 0.25 weight
        SAFETY_PROMOTION: 5,        // 0.20 weight
      };

      // (4*0.25 + 3*0.30 + 4*0.25 + 5*0.20) / (0.25+0.30+0.25+0.20)
      // = (1 + 0.9 + 1 + 1) / 1 = 3.9
      const result = calculateWeightedSMSScore(scores);
      expect(result).toBeCloseTo(3.9, 1);
    });

    it("should handle partial component scores", () => {
      const scores = {
        SAFETY_POLICY_OBJECTIVES: 4,
        SAFETY_RISK_MANAGEMENT: 3,
      };

      const result = calculateWeightedSMSScore(scores);
      // (4*0.25 + 3*0.30) / (0.25 + 0.30) = (1 + 0.9) / 0.55 = 3.45
      expect(result).toBeCloseTo(3.45, 1);
    });

    it("should return 0 for empty scores", () => {
      const result = calculateWeightedSMSScore({});
      expect(result).toBe(0);
    });
  });
});

// =============================================================================
// EI SCORE CATEGORY TESTS
// =============================================================================

describe("EI Score Categories", () => {
  describe("getEIScoreCategory", () => {
    it("should categorize scores correctly", () => {
      expect(getEIScoreCategory(95)).toBe("EXCELLENT");
      expect(getEIScoreCategory(90)).toBe("EXCELLENT");
      expect(getEIScoreCategory(89)).toBe("GOOD");
      expect(getEIScoreCategory(75)).toBe("GOOD");
      expect(getEIScoreCategory(74)).toBe("SATISFACTORY");
      expect(getEIScoreCategory(60)).toBe("SATISFACTORY");
      expect(getEIScoreCategory(59)).toBe("NEEDS_IMPROVEMENT");
      expect(getEIScoreCategory(40)).toBe("NEEDS_IMPROVEMENT");
      expect(getEIScoreCategory(39)).toBe("CRITICAL");
      expect(getEIScoreCategory(0)).toBe("CRITICAL");
    });
  });
});

// =============================================================================
// CATEGORY SCORING TESTS
// =============================================================================

describe("Category Scoring", () => {
  describe("calculateCategoryScores", () => {
    it("should calculate ANS category scores by audit area", () => {
      const responses = [
        createMockANSResponse("SATISFACTORY", { auditArea: "ANS" }),
        createMockANSResponse("SATISFACTORY", { auditArea: "ANS" }),
        createMockANSResponse("NOT_SATISFACTORY", { auditArea: "ANS" }),
        createMockANSResponse("SATISFACTORY", { auditArea: "AGA" }),
        createMockANSResponse("SATISFACTORY", { auditArea: "AGA" }),
      ];

      const result = calculateCategoryScores(responses, "ANS_USOAP_CMA");

      // ANS: 2/3 = 66.67%
      expect(result["ANS"]).toBeCloseTo(66.67, 1);
      // AGA: 2/2 = 100%
      expect(result["AGA"]).toBe(100);
    });

    it("should calculate SMS category scores by component", () => {
      const responses = [
        createMockSMSResponse("D", { smsComponent: "SAFETY_POLICY_OBJECTIVES" }),
        createMockSMSResponse("E", { smsComponent: "SAFETY_POLICY_OBJECTIVES" }),
        createMockSMSResponse("C", { smsComponent: "SAFETY_RISK_MANAGEMENT" }),
      ];

      const result = calculateCategoryScores(responses, "SMS_CANSO_SOE");

      // SAFETY_POLICY_OBJECTIVES: (4+5)/2 = 4.5, converted to percentage: 4.5/5*100 = 90%
      expect(result["SAFETY_POLICY_OBJECTIVES"]).toBe(90);
      // SAFETY_RISK_MANAGEMENT: 3/5*100 = 60%
      expect(result["SAFETY_RISK_MANAGEMENT"]).toBe(60);
    });
  });
});

// =============================================================================
// COMPARISON UTILITIES TESTS
// =============================================================================

describe("Score Comparison", () => {
  describe("compareScores", () => {
    it("should identify improving trend", () => {
      const result = compareScores(80, 70);

      expect(result.delta).toBe(10);
      expect(result.percentageChange).toBeCloseTo(14.29, 1);
      expect(result.trend).toBe("IMPROVING");
    });

    it("should identify declining trend", () => {
      const result = compareScores(60, 75);

      expect(result.delta).toBe(-15);
      expect(result.percentageChange).toBe(-20);
      expect(result.trend).toBe("DECLINING");
    });

    it("should identify stable trend for small changes", () => {
      const result = compareScores(75.5, 75);

      expect(result.delta).toBe(0.5);
      expect(result.trend).toBe("STABLE");
    });

    it("should handle zero previous score", () => {
      const result = compareScores(50, 0);

      expect(result.delta).toBe(50);
      expect(result.percentageChange).toBe(100);
      expect(result.trend).toBe("IMPROVING");
    });
  });

  describe("identifyImprovementAreas", () => {
    it("should identify improved categories", () => {
      const current = { ANS: 80, AGA: 60, SSP: 70 };
      const previous = { ANS: 70, AGA: 65, SSP: 60 };

      const result = identifyImprovementAreas(current, previous);

      expect(result.improved).toContain("ANS");
      expect(result.improved).toContain("SSP");
      expect(result.declined).toContain("AGA");
    });

    it("should identify unchanged categories within threshold", () => {
      const current = { ANS: 72 };
      const previous = { ANS: 70 };

      const result = identifyImprovementAreas(current, previous, 5);

      expect(result.unchanged).toContain("ANS");
    });

    it("should handle new categories", () => {
      const current = { ANS: 80, NEW: 60 };
      const previous = { ANS: 70 };

      const result = identifyImprovementAreas(current, previous);

      expect(result.improved).toContain("ANS");
      expect(result.improved).toContain("NEW");
    });

    it("should handle removed categories", () => {
      const current = { ANS: 80 };
      const previous = { ANS: 70, OLD: 60 };

      const result = identifyImprovementAreas(current, previous);

      expect(result.improved).toContain("ANS");
      expect(result.declined).toContain("OLD");
    });
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe("Assessment Validation", () => {
  describe("validateAssessmentForSubmission", () => {
    it("should validate complete ANS assessment", () => {
      const responses: AssessmentResponse[] = [
        {
          id: "1",
          assessmentId: "test",
          questionId: "q1",
          responseValue: "SATISFACTORY",
          maturityLevel: null,
          evidenceDescription: "Evidence provided",
          evidenceUrls: [],
          isComplete: true,
          needsReview: false,
          respondedById: "user1",
          respondedAt: new Date(),
          lastModifiedAt: new Date(),
        },
        {
          id: "2",
          assessmentId: "test",
          questionId: "q2",
          responseValue: "NOT_SATISFACTORY",
          maturityLevel: null,
          evidenceDescription: "Evidence provided",
          evidenceUrls: [],
          isComplete: true,
          needsReview: false,
          respondedById: "user1",
          respondedAt: new Date(),
          lastModifiedAt: new Date(),
        },
      ];

      const result = validateAssessmentForSubmission(
        responses,
        2,
        "ANS_USOAP_CMA"
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject incomplete ANS assessment", () => {
      const responses: AssessmentResponse[] = [
        {
          id: "1",
          assessmentId: "test",
          questionId: "q1",
          responseValue: "SATISFACTORY",
          maturityLevel: null,
          evidenceDescription: undefined,
          evidenceUrls: [],
          isComplete: false,
          needsReview: false,
          respondedById: "user1",
          respondedAt: new Date(),
          lastModifiedAt: new Date(),
        },
      ];

      const result = validateAssessmentForSubmission(
        responses,
        5, // 5 total questions but only 1 answered
        "ANS_USOAP_CMA"
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject ANS assessment with NOT_REVIEWED responses", () => {
      const responses: AssessmentResponse[] = [
        {
          id: "1",
          assessmentId: "test",
          questionId: "q1",
          responseValue: "NOT_REVIEWED",
          maturityLevel: null,
          evidenceDescription: undefined,
          evidenceUrls: [],
          isComplete: false,
          needsReview: false,
          respondedById: "user1",
          respondedAt: new Date(),
          lastModifiedAt: new Date(),
        },
      ];

      const result = validateAssessmentForSubmission(
        responses,
        1,
        "ANS_USOAP_CMA"
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes("Not Reviewed"))).toBe(true);
    });

    it("should warn about low evidence percentage", () => {
      const responses: AssessmentResponse[] = [
        {
          id: "1",
          assessmentId: "test",
          questionId: "q1",
          responseValue: "SATISFACTORY",
          maturityLevel: null,
          evidenceDescription: undefined, // No evidence
          evidenceUrls: [],
          isComplete: false,
          needsReview: false,
          respondedById: "user1",
          respondedAt: new Date(),
          lastModifiedAt: new Date(),
        },
        {
          id: "2",
          assessmentId: "test",
          questionId: "q2",
          responseValue: "SATISFACTORY",
          maturityLevel: null,
          evidenceDescription: undefined, // No evidence
          evidenceUrls: [],
          isComplete: false,
          needsReview: false,
          respondedById: "user1",
          respondedAt: new Date(),
          lastModifiedAt: new Date(),
        },
      ];

      const result = validateAssessmentForSubmission(
        responses,
        2,
        "ANS_USOAP_CMA"
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes("evidence"))).toBe(true);
    });

    it("should validate complete SMS assessment", () => {
      const responses: AssessmentResponse[] = [
        {
          id: "1",
          assessmentId: "test",
          questionId: "q1",
          responseValue: null,
          maturityLevel: "C",
          evidenceDescription: "Evidence provided",
          evidenceUrls: [],
          isComplete: true,
          needsReview: false,
          respondedById: "user1",
          respondedAt: new Date(),
          lastModifiedAt: new Date(),
        },
      ];

      const result = validateAssessmentForSubmission(
        responses,
        1,
        "SMS_CANSO_SOE"
      );

      expect(result.isValid).toBe(true);
    });
  });
});

// =============================================================================
// EDGE CASES AND BOUNDARY TESTS
// =============================================================================

describe("Edge Cases", () => {
  it("should handle single response correctly", () => {
    const satisfactoryResponses = [createMockANSResponse("SATISFACTORY")];
    const notSatisfactoryResponses = [createMockANSResponse("NOT_SATISFACTORY")];

    expect(calculateEIScore(satisfactoryResponses).overallEI).toBe(100);
    expect(calculateEIScore(notSatisfactoryResponses).overallEI).toBe(0);
  });

  it("should handle large number of responses", () => {
    const responses: AssessmentResponseWithQuestion[] = [];
    for (let i = 0; i < 1000; i++) {
      responses.push(
        createMockANSResponse(i % 2 === 0 ? "SATISFACTORY" : "NOT_SATISFACTORY")
      );
    }

    const result = calculateEIScore(responses);

    expect(result.overallEI).toBe(50);
    expect(result.totalApplicable).toBe(1000);
  });

  it("should handle precision correctly for decimal percentages", () => {
    const responses = [
      createMockANSResponse("SATISFACTORY"),
      createMockANSResponse("SATISFACTORY"),
      createMockANSResponse("NOT_SATISFACTORY"),
    ];

    const result = calculateEIScore(responses);

    // 2/3 = 66.666... should be rounded to 66.67
    expect(result.overallEI).toBeCloseTo(66.67, 2);
  });
});
