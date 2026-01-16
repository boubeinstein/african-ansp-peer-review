/**
 * Reviewer Scoring Functions Tests
 *
 * Tests for expertise, language, availability, and experience scoring.
 */

import { describe, it, expect } from "vitest";
import {
  scoreExpertise,
  scoreLanguage,
  scoreAvailability,
  scoreExperience,
  calculateTotalScore,
  type ExpertiseInput,
  type LanguageInput,
  type AvailabilitySlotInput,
} from "@/lib/reviewer/scoring";
import type { ExpertiseArea, Language, ProficiencyLevel, LanguageProficiency, AvailabilityType } from "@prisma/client";

// =============================================================================
// TEST DATA FACTORIES - Using the scoring module's input types
// =============================================================================

// The scoring module uses minimal input types, so we can use them directly

function createMockExpertise(
  area: ExpertiseArea,
  level: ProficiencyLevel = "PROFICIENT",
  years: number = 5
): ExpertiseInput {
  return {
    area,
    proficiencyLevel: level,
    yearsExperience: years,
  };
}

function createMockLanguage(
  language: Language,
  proficiency: LanguageProficiency = "ADVANCED",
  canConductInterviews: boolean = true
): LanguageInput {
  return {
    language,
    proficiency,
    canConductInterviews,
  };
}

function createMockAvailabilitySlot(
  startDate: Date,
  endDate: Date,
  type: AvailabilityType = "AVAILABLE",
  notes?: string
): AvailabilitySlotInput {
  return {
    startDate,
    endDate,
    availabilityType: type,
    notes: notes ?? null,
  };
}

// =============================================================================
// EXPERTISE SCORING TESTS
// =============================================================================

describe("Reviewer Scoring", () => {
  describe("scoreExpertise", () => {
    it("should give max points for all required expertise match", () => {
      const expertise: ExpertiseInput[] = [
        createMockExpertise("ATS", "EXPERT"),
        createMockExpertise("CNS", "EXPERT"),
        createMockExpertise("MET", "EXPERT"),
      ];
      const required: ExpertiseArea[] = ["ATS", "CNS", "MET"];

      const result = scoreExpertise(expertise, required);

      // EXPERT level gives 1.2x multiplier, so max score for required (30) can be exceeded
      // but capped at total max (40)
      expect(result.score).toBeGreaterThanOrEqual(30);
      expect(result.matchedRequired).toEqual(expect.arrayContaining(["ATS", "CNS", "MET"]));
      expect(result.missingRequired.length).toBe(0);
    });

    it("should give partial points for partial match", () => {
      const expertise: ExpertiseInput[] = [
        createMockExpertise("ATS", "PROFICIENT"),
      ];
      const required: ExpertiseArea[] = ["ATS", "CNS", "MET"];

      const result = scoreExpertise(expertise, required);

      expect(result.score).toBeLessThan(30); // Less than max required points
      expect(result.matchedRequired).toContain("ATS");
      expect(result.missingRequired).toContain("CNS");
      expect(result.missingRequired).toContain("MET");
    });

    it("should add bonus for preferred expertise", () => {
      const expertise: ExpertiseInput[] = [
        createMockExpertise("ATS", "PROFICIENT"),
        createMockExpertise("SAR", "PROFICIENT"), // Preferred, not required
      ];
      const required: ExpertiseArea[] = ["ATS"];
      const preferred: ExpertiseArea[] = ["SAR"];

      const resultWithPreferred = scoreExpertise(expertise, required, preferred);
      const resultWithoutPreferred = scoreExpertise(
        [createMockExpertise("ATS", "PROFICIENT")],
        required,
        preferred
      );

      expect(resultWithPreferred.score).toBeGreaterThan(resultWithoutPreferred.score);
      expect(resultWithPreferred.matchedPreferred).toContain("SAR");
    });

    it("should weight proficiency levels correctly", () => {
      const basicExpertise: ExpertiseInput[] = [createMockExpertise("ATS", "BASIC")];
      const expertExpertise: ExpertiseInput[] = [createMockExpertise("ATS", "EXPERT")];
      const required: ExpertiseArea[] = ["ATS"];

      const basicResult = scoreExpertise(basicExpertise, required);
      const expertResult = scoreExpertise(expertExpertise, required);

      expect(expertResult.score).toBeGreaterThan(basicResult.score);
    });

    it("should return 0 for no matches", () => {
      const expertise: ExpertiseInput[] = [
        createMockExpertise("ATS", "EXPERT"),
      ];
      const required: ExpertiseArea[] = ["CNS", "MET"];

      const result = scoreExpertise(expertise, required);

      expect(result.score).toBe(0);
      expect(result.matchedRequired.length).toBe(0);
      expect(result.missingRequired).toEqual(expect.arrayContaining(["CNS", "MET"]));
    });

    it("should handle empty required expertise", () => {
      const expertise: ExpertiseInput[] = [createMockExpertise("ATS", "EXPERT")];
      const required: ExpertiseArea[] = [];

      const result = scoreExpertise(expertise, required);

      // Full points when no requirements
      expect(result.score).toBe(40);
      expect(result.matchedRequired.length).toBe(0);
      expect(result.missingRequired.length).toBe(0);
    });

    it("should not double count preferred if already in required", () => {
      const expertise: ExpertiseInput[] = [
        createMockExpertise("ATS", "EXPERT"),
        createMockExpertise("CNS", "EXPERT"),
      ];
      const required: ExpertiseArea[] = ["ATS"];
      const preferred: ExpertiseArea[] = ["ATS", "CNS"]; // ATS is both required and preferred

      const result = scoreExpertise(expertise, required, preferred);

      // ATS should only be counted once (in required), CNS in preferred
      expect(result.matchedRequired).toContain("ATS");
      expect(result.matchedPreferred).toContain("CNS");
      expect(result.matchedPreferred).not.toContain("ATS");
    });
  });

  // =============================================================================
  // LANGUAGE SCORING TESTS
  // =============================================================================

  describe("scoreLanguage", () => {
    it("should require minimum coverage for required languages", () => {
      const languages: LanguageInput[] = [
        createMockLanguage("EN", "NATIVE", true),
        createMockLanguage("FR", "NATIVE", true),
      ];
      const required: Language[] = ["EN", "FR"];

      const result = scoreLanguage(languages, required);

      expect(result.score).toBeGreaterThan(0);
      expect(result.matchedLanguages).toContain("EN");
      expect(result.matchedLanguages).toContain("FR");
      expect(result.canConductReview).toBe(true);
    });

    it("should give bonus for NATIVE level", () => {
      const nativeLanguages: LanguageInput[] = [
        createMockLanguage("EN", "NATIVE", true),
      ];
      const intermediateLanguages: LanguageInput[] = [
        createMockLanguage("EN", "INTERMEDIATE", true),
      ];
      const required: Language[] = ["EN"];

      const nativeResult = scoreLanguage(nativeLanguages, required);
      const intermediateResult = scoreLanguage(intermediateLanguages, required);

      expect(nativeResult.score).toBeGreaterThan(intermediateResult.score);
    });

    it("should give bonus for additional languages", () => {
      const singleLanguage: LanguageInput[] = [
        createMockLanguage("EN", "NATIVE", true),
      ];
      const multipleLanguages: LanguageInput[] = [
        createMockLanguage("EN", "NATIVE", true),
        createMockLanguage("FR", "NATIVE", true),
      ];
      const required: Language[] = ["EN", "FR"];

      const singleResult = scoreLanguage(singleLanguage, required);
      const multipleResult = scoreLanguage(multipleLanguages, required);

      expect(multipleResult.score).toBeGreaterThan(singleResult.score);
    });

    it("should penalize BASIC level for required languages", () => {
      const basicLanguages: LanguageInput[] = [
        createMockLanguage("EN", "BASIC", false),
        createMockLanguage("FR", "BASIC", false),
      ];
      const advancedLanguages: LanguageInput[] = [
        createMockLanguage("EN", "ADVANCED", true),
        createMockLanguage("FR", "ADVANCED", true),
      ];
      const required: Language[] = ["EN", "FR"];

      const basicResult = scoreLanguage(basicLanguages, required);
      const advancedResult = scoreLanguage(advancedLanguages, required);

      expect(basicResult.score).toBeLessThan(advancedResult.score);
      expect(basicResult.canConductReview).toBe(false); // BASIC can't conduct review
    });

    it("should mark canConductReview false for missing languages", () => {
      const languages: LanguageInput[] = [
        createMockLanguage("EN", "NATIVE", true),
      ];
      const required: Language[] = ["EN", "FR"];

      const result = scoreLanguage(languages, required);

      expect(result.canConductReview).toBe(false);
      expect(result.missingLanguages).toContain("FR");
    });

    it("should give bonus for canConductInterviews", () => {
      const withInterviews: LanguageInput[] = [
        createMockLanguage("EN", "ADVANCED", true),
      ];
      const withoutInterviews: LanguageInput[] = [
        createMockLanguage("EN", "ADVANCED", false),
      ];
      const required: Language[] = ["EN"];

      const withResult = scoreLanguage(withInterviews, required);
      const withoutResult = scoreLanguage(withoutInterviews, required);

      expect(withResult.score).toBeGreaterThan(withoutResult.score);
    });

    it("should handle empty required languages", () => {
      const languages: LanguageInput[] = [
        createMockLanguage("EN", "NATIVE", true),
      ];
      const required: Language[] = [];

      const result = scoreLanguage(languages, required);

      expect(result.score).toBe(25); // Max score when no requirements
      expect(result.canConductReview).toBe(true);
    });
  });

  // =============================================================================
  // AVAILABILITY SCORING TESTS
  // =============================================================================

  describe("scoreAvailability", () => {
    it("should give full score for complete availability", () => {
      const startDate = new Date("2024-03-01");
      const endDate = new Date("2024-03-05");
      const slots: AvailabilitySlotInput[] = [
        createMockAvailabilitySlot(startDate, endDate, "AVAILABLE"),
      ];

      const result = scoreAvailability(slots, startDate, endDate);

      expect(result.score).toBe(25); // Max availability score
      expect(result.coverage).toBe(1);
      expect(result.availableDays).toBe(5);
    });

    it("should reduce score for tentative days", () => {
      const startDate = new Date("2024-03-01");
      const endDate = new Date("2024-03-05");
      const availableSlots: AvailabilitySlotInput[] = [
        createMockAvailabilitySlot(startDate, endDate, "AVAILABLE"),
      ];
      const tentativeSlots: AvailabilitySlotInput[] = [
        createMockAvailabilitySlot(startDate, endDate, "TENTATIVE"),
      ];

      const availableResult = scoreAvailability(availableSlots, startDate, endDate);
      const tentativeResult = scoreAvailability(tentativeSlots, startDate, endDate);

      expect(tentativeResult.score).toBeLessThan(availableResult.score);
      expect(tentativeResult.coverage).toBe(0.5); // TENTATIVE = 50% coverage
    });

    it("should return 0 for fully unavailable", () => {
      const startDate = new Date("2024-03-01");
      const endDate = new Date("2024-03-05");
      const slots: AvailabilitySlotInput[] = [
        createMockAvailabilitySlot(startDate, endDate, "UNAVAILABLE"),
      ];

      const result = scoreAvailability(slots, startDate, endDate);

      expect(result.score).toBe(0);
      expect(result.coverage).toBe(0);
    });

    it("should calculate partial availability correctly", () => {
      const startDate = new Date("2024-03-01");
      const endDate = new Date("2024-03-05"); // 5 days
      const partialStart = new Date("2024-03-03");
      const slots: AvailabilitySlotInput[] = [
        createMockAvailabilitySlot(partialStart, endDate, "AVAILABLE"), // 3 days
      ];

      const result = scoreAvailability(slots, startDate, endDate);

      expect(result.availableDays).toBe(3);
      expect(result.totalDays).toBe(5);
      expect(result.coverage).toBeCloseTo(0.6, 1);
    });

    it("should handle no availability slots", () => {
      const startDate = new Date("2024-03-01");
      const endDate = new Date("2024-03-05");
      const slots: AvailabilitySlotInput[] = [];

      const result = scoreAvailability(slots, startDate, endDate);

      expect(result.score).toBe(0);
      expect(result.coverage).toBe(0);
      expect(result.availableDays).toBe(0);
    });

    it("should track conflicts from ON_ASSIGNMENT slots", () => {
      const startDate = new Date("2024-03-01");
      const endDate = new Date("2024-03-05");
      const slots: AvailabilitySlotInput[] = [
        createMockAvailabilitySlot(startDate, endDate, "ON_ASSIGNMENT", "Assigned to other review"),
      ];

      const result = scoreAvailability(slots, startDate, endDate);

      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts).toContain("Assigned to other review");
    });

    it("should handle overlapping availability slots", () => {
      const startDate = new Date("2024-03-01");
      const endDate = new Date("2024-03-10");
      const slots: AvailabilitySlotInput[] = [
        createMockAvailabilitySlot(new Date("2024-03-01"), new Date("2024-03-05"), "AVAILABLE"),
        createMockAvailabilitySlot(new Date("2024-03-04"), new Date("2024-03-10"), "AVAILABLE"), // Overlaps
      ];

      const result = scoreAvailability(slots, startDate, endDate);

      expect(result.availableDays).toBe(10);
      expect(result.coverage).toBe(1);
    });

    it("should handle swapped date range (uses absolute difference)", () => {
      const startDate = new Date("2024-03-05");
      const endDate = new Date("2024-03-01"); // End before start
      const slots: AvailabilitySlotInput[] = [];

      const result = scoreAvailability(slots, startDate, endDate);

      // Implementation uses Math.abs() so swapped dates still work
      // but with no availability slots, score is 0
      expect(result.score).toBe(0);
      expect(result.totalDays).toBe(5); // Absolute difference + 1
      expect(result.availableDays).toBe(0);
    });
  });

  // =============================================================================
  // EXPERIENCE SCORING TESTS
  // =============================================================================

  describe("scoreExperience", () => {
    it("should give bonus for years in aviation", () => {
      const lowYears = scoreExperience(3, 0);
      const highYears = scoreExperience(20, 0);

      expect(highYears.yearsBonus).toBeGreaterThan(lowYears.yearsBonus);
    });

    it("should give bonus for reviews completed", () => {
      const fewReviews = scoreExperience(10, 1);
      const manyReviews = scoreExperience(10, 15);

      expect(manyReviews.reviewsBonus).toBeGreaterThan(fewReviews.reviewsBonus);
    });

    it("should cap at maximum points", () => {
      const maxExperience = scoreExperience(100, 100); // Way above thresholds

      expect(maxExperience.score).toBeLessThanOrEqual(10); // Max experience score
      expect(maxExperience.yearsBonus).toBeLessThanOrEqual(5);
      expect(maxExperience.reviewsBonus).toBeLessThanOrEqual(5);
    });

    it("should give tiered years bonus", () => {
      const fiveYears = scoreExperience(5, 0);
      const tenYears = scoreExperience(10, 0);
      const fifteenYears = scoreExperience(15, 0);

      expect(fiveYears.yearsBonus).toBeGreaterThanOrEqual(1);
      expect(tenYears.yearsBonus).toBeGreaterThanOrEqual(3);
      expect(fifteenYears.yearsBonus).toBe(5);
    });

    it("should give tiered reviews bonus", () => {
      const twoReviews = scoreExperience(10, 2);
      const fiveReviews = scoreExperience(10, 5);
      const tenReviews = scoreExperience(10, 10);

      expect(twoReviews.reviewsBonus).toBeGreaterThanOrEqual(1);
      expect(fiveReviews.reviewsBonus).toBeGreaterThanOrEqual(3);
      expect(tenReviews.reviewsBonus).toBe(5);
    });

    it("should handle zero values", () => {
      const result = scoreExperience(0, 0);

      expect(result.score).toBe(0);
      expect(result.yearsBonus).toBe(0);
      expect(result.reviewsBonus).toBe(0);
    });
  });

  // =============================================================================
  // TOTAL SCORE CALCULATION TESTS
  // =============================================================================

  describe("calculateTotalScore", () => {
    it("should sum all component scores", () => {
      const expertise = { score: 30, maxScore: 40, matchedRequired: [], matchedPreferred: [], missingRequired: [] };
      const language = { score: 20, maxScore: 25, matchedLanguages: [], missingLanguages: [], canConductReview: true };
      const availability = { score: 20, maxScore: 25, availableDays: 5, totalDays: 5, coverage: 1, conflicts: [] };
      const experience = { score: 8, maxScore: 10, yearsBonus: 4, reviewsBonus: 4 };

      const result = calculateTotalScore(expertise, language, availability, experience);

      expect(result.totalScore).toBe(78);
      expect(result.maxPossibleScore).toBe(100);
      expect(result.percentage).toBe(78);
    });

    it("should break down scores correctly", () => {
      const expertise = { score: 35, maxScore: 40, matchedRequired: [], matchedPreferred: [], missingRequired: [] };
      const language = { score: 22, maxScore: 25, matchedLanguages: [], missingLanguages: [], canConductReview: true };
      const availability = { score: 18, maxScore: 25, availableDays: 4, totalDays: 5, coverage: 0.8, conflicts: [] };
      const experience = { score: 7, maxScore: 10, yearsBonus: 4, reviewsBonus: 3 };

      const result = calculateTotalScore(expertise, language, availability, experience);

      expect(result.expertiseScore).toBe(35);
      expect(result.languageScore).toBe(22);
      expect(result.availabilityScore).toBe(18);
      expect(result.experienceScore).toBe(7);
    });

    it("should calculate percentage correctly", () => {
      const expertise = { score: 20, maxScore: 40, matchedRequired: [], matchedPreferred: [], missingRequired: [] };
      const language = { score: 12.5, maxScore: 25, matchedLanguages: [], missingLanguages: [], canConductReview: true };
      const availability = { score: 12.5, maxScore: 25, availableDays: 2.5, totalDays: 5, coverage: 0.5, conflicts: [] };
      const experience = { score: 5, maxScore: 10, yearsBonus: 2.5, reviewsBonus: 2.5 };

      const result = calculateTotalScore(expertise, language, availability, experience);

      expect(result.percentage).toBe(50);
    });

    it("should handle all zeros", () => {
      const expertise = { score: 0, maxScore: 40, matchedRequired: [], matchedPreferred: [], missingRequired: [] };
      const language = { score: 0, maxScore: 25, matchedLanguages: [], missingLanguages: [], canConductReview: false };
      const availability = { score: 0, maxScore: 25, availableDays: 0, totalDays: 5, coverage: 0, conflicts: [] };
      const experience = { score: 0, maxScore: 10, yearsBonus: 0, reviewsBonus: 0 };

      const result = calculateTotalScore(expertise, language, availability, experience);

      expect(result.totalScore).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it("should handle max scores", () => {
      const expertise = { score: 40, maxScore: 40, matchedRequired: [], matchedPreferred: [], missingRequired: [] };
      const language = { score: 25, maxScore: 25, matchedLanguages: [], missingLanguages: [], canConductReview: true };
      const availability = { score: 25, maxScore: 25, availableDays: 5, totalDays: 5, coverage: 1, conflicts: [] };
      const experience = { score: 10, maxScore: 10, yearsBonus: 5, reviewsBonus: 5 };

      const result = calculateTotalScore(expertise, language, availability, experience);

      expect(result.totalScore).toBe(100);
      expect(result.percentage).toBe(100);
    });
  });
});
