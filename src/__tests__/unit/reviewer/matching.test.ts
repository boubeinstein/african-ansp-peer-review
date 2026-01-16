/**
 * Reviewer Matching Algorithm Tests
 *
 * Tests for the reviewer assignment matching algorithm including
 * scoring, filtering, and team building.
 */

import { describe, it, expect } from "vitest";
import {
  findMatchingReviewers,
  buildOptimalTeam,
  filterByMinScore,
  filterEligibleOnly,
  getTopCandidates,
  canAssignReviewer,
  type MatchingCriteria,
  type MatchResult,
} from "@/lib/reviewer/matching";
import type { ReviewerProfileFull } from "@/types/reviewer";
import type { ExpertiseArea, Language, COIType, AvailabilityType } from "@prisma/client";

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

function createMockReviewerProfile(
  overrides: Partial<{
    id: string;
    userId: string;
    homeOrganizationId: string;
    isLeadQualified: boolean;
    yearsExperience: number;
    reviewsCompleted: number;
    expertise: { area: ExpertiseArea; level: "BASIC" | "COMPETENT" | "PROFICIENT" | "EXPERT" }[];
    languages: { language: Language; proficiency: "BASIC" | "INTERMEDIATE" | "ADVANCED" | "NATIVE"; canConductInterviews: boolean }[];
    availability: { startDate: Date; endDate: Date; type: AvailabilityType }[];
    coi: { organizationId: string; type: COIType }[];
    firstName: string;
    lastName: string;
    organizationName: string;
    organizationCode: string;
  }> = {}
): ReviewerProfileFull {
  const id = overrides.id ?? `profile_${Math.random().toString(36).slice(2)}`;
  const userId = overrides.userId ?? `user_${Math.random().toString(36).slice(2)}`;
  const homeOrgId = overrides.homeOrganizationId ?? "org_home";

  return {
    id,
    userId,
    organizationId: homeOrgId,
    homeOrganizationId: homeOrgId,
    status: "SELECTED",
    reviewerType: "PEER_REVIEWER",
    selectionStatus: "SELECTED",
    nominatedAt: null,
    selectedAt: new Date(),
    certifiedAt: null,
    isLeadQualified: overrides.isLeadQualified ?? false,
    leadQualifiedAt: null,
    yearsExperience: overrides.yearsExperience ?? 10,
    reviewsCompleted: overrides.reviewsCompleted ?? 3,
    reviewsAsLead: 0,
    lastReviewDate: null,
    isAvailable: true,
    availableFrom: null,
    availableTo: null,
    currentPosition: "ATM Expert",
    biography: null,
    biographyFr: null,
    expertiseAreas: [],
    specializations: [],
    conflictOrganizations: [],
    averageRating: null,
    feedbackCount: 0,
    preferredContactMethod: "EMAIL",
    alternativeEmail: null,
    alternativePhone: null,
    passportCountry: null,
    visaCountries: [],
    travelRestrictions: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: userId,
      firstName: overrides.firstName ?? "Test",
      lastName: overrides.lastName ?? "Reviewer",
      email: `${userId}@test.com`,
    },
    homeOrganization: {
      id: homeOrgId,
      nameEn: overrides.organizationName ?? "Home Organization",
      nameFr: overrides.organizationName ?? "Organisation d'origine",
      icaoCode: overrides.organizationCode ?? "HOME",
      country: "Test Country",
    },
    expertiseRecords: (overrides.expertise ?? []).map((exp, idx) => ({
      id: `exp_${id}_${idx}`,
      reviewerProfileId: id,
      area: exp.area,
      proficiencyLevel: exp.level,
      yearsExperience: 5,
      isVerified: false,
      verifiedAt: null,
      verifiedBy: null,
      description: null,
      descriptionFr: null,
      certifications: [],
      canAssessANS: false,
      canAssessSMS: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    languages: (overrides.languages ?? []).map((lang, idx) => ({
      id: `lang_${id}_${idx}`,
      reviewerProfileId: id,
      language: lang.language,
      proficiency: lang.proficiency,
      isNative: lang.proficiency === "NATIVE",
      icaoLevel: null,
      icaoAssessmentDate: null,
      icaoExpiryDate: null,
      canConductInterviews: lang.canConductInterviews,
      canWriteReports: true,
    })),
    certifications: [],
    trainingRecords: [],
    availabilityPeriods: (overrides.availability ?? []).map((avail, idx) => ({
      id: `avail_${id}_${idx}`,
      reviewerProfileId: id,
      startDate: avail.startDate,
      endDate: avail.endDate,
      availabilityType: avail.type,
      notes: null,
      isRecurring: false,
      recurrencePattern: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    conflictsOfInterest: (overrides.coi ?? []).map((coi, idx) => ({
      id: `coi_${id}_${idx}`,
      reviewerProfileId: id,
      organizationId: coi.organizationId,
      coiType: coi.type,
      reason: null,
      startDate: new Date(),
      endDate: null,
      isActive: true,
      verifiedById: null,
      verifiedAt: null,
      verificationNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      organization: {
        id: coi.organizationId,
        nameEn: "Conflict Organization",
        nameFr: "Organisation en conflit",
        icaoCode: "COI",
      },
    })),
  };
}

function createDefaultCriteria(overrides: Partial<MatchingCriteria> = {}): MatchingCriteria {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() + 1);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 5);

  return {
    targetOrganizationId: "org_target",
    requiredExpertise: overrides.requiredExpertise ?? ["ATS", "CNS"],
    preferredExpertise: overrides.preferredExpertise,
    requiredLanguages: overrides.requiredLanguages ?? ["EN", "FR"],
    reviewStartDate: overrides.reviewStartDate ?? startDate,
    reviewEndDate: overrides.reviewEndDate ?? endDate,
    teamSize: overrides.teamSize ?? 3,
    mustIncludeReviewerIds: overrides.mustIncludeReviewerIds,
    excludeReviewerIds: overrides.excludeReviewerIds,
  };
}

// =============================================================================
// FIND MATCHING REVIEWERS TESTS
// =============================================================================

describe("Reviewer Matching Algorithm", () => {
  describe("findMatchingReviewers", () => {
    it("should exclude reviewers with hard COI conflicts", () => {
      const criteria = createDefaultCriteria();
      const reviewerWithHardCOI = createMockReviewerProfile({
        id: "reviewer_hard_coi",
        expertise: [{ area: "ATS", level: "EXPERT" }],
        languages: [{ language: "EN", proficiency: "NATIVE", canConductInterviews: true }],
        coi: [{ organizationId: "org_target", type: "EMPLOYMENT" }],
      });
      const normalReviewer = createMockReviewerProfile({
        id: "reviewer_normal",
        expertise: [{ area: "ATS", level: "EXPERT" }],
        languages: [{ language: "EN", proficiency: "NATIVE", canConductInterviews: true }],
      });

      const results = findMatchingReviewers(criteria, [reviewerWithHardCOI, normalReviewer]);

      // Hard COI reviewer should be marked as ineligible
      const hardCOIResult = results.find((r) => r.reviewerProfileId === "reviewer_hard_coi");
      expect(hardCOIResult?.isEligible).toBe(false);
      expect(hardCOIResult?.coiStatus.severity).toBe("HARD");
    });

    it("should include reviewers with soft COI (with warning)", () => {
      const criteria = createDefaultCriteria();
      const reviewerWithSoftCOI = createMockReviewerProfile({
        id: "reviewer_soft_coi",
        expertise: [{ area: "ATS", level: "EXPERT" }, { area: "CNS", level: "PROFICIENT" }],
        languages: [
          { language: "EN", proficiency: "NATIVE", canConductInterviews: true },
          { language: "FR", proficiency: "ADVANCED", canConductInterviews: true },
        ],
        availability: [{ startDate: criteria.reviewStartDate, endDate: criteria.reviewEndDate, type: "AVAILABLE" }],
        coi: [{ organizationId: "org_target", type: "PERSONAL" }],
      });

      const results = findMatchingReviewers(criteria, [reviewerWithSoftCOI]);
      const result = results[0];

      expect(result.coiStatus.hasConflict).toBe(true);
      expect(result.coiStatus.severity).toBe("SOFT");
      expect(result.isEligible).toBe(true); // Soft COI doesn't disqualify
      expect(result.warnings.some((w) => w.includes("Soft COI"))).toBe(true);
    });

    it("should exclude reviewers from target organization (automatic COI)", () => {
      const criteria = createDefaultCriteria();
      const reviewerFromTarget = createMockReviewerProfile({
        id: "reviewer_from_target",
        homeOrganizationId: "org_target",
        expertise: [{ area: "ATS", level: "EXPERT" }],
        languages: [{ language: "EN", proficiency: "NATIVE", canConductInterviews: true }],
      });

      const results = findMatchingReviewers(criteria, [reviewerFromTarget]);

      // Should not appear in results at all
      expect(results.length).toBe(0);
    });

    it("should exclude unavailable reviewers from eligible candidates", () => {
      const criteria = createDefaultCriteria();
      const unavailableReviewer = createMockReviewerProfile({
        id: "reviewer_unavailable",
        expertise: [{ area: "ATS", level: "EXPERT" }, { area: "CNS", level: "PROFICIENT" }],
        languages: [
          { language: "EN", proficiency: "NATIVE", canConductInterviews: true },
          { language: "FR", proficiency: "ADVANCED", canConductInterviews: true },
        ],
        availability: [], // No availability
      });

      const results = findMatchingReviewers(criteria, [unavailableReviewer]);
      expect(results[0].isEligible).toBe(false);
      expect(results[0].availabilityStatus.isAvailable).toBe(false);
    });

    it("should sort by total score descending", () => {
      const criteria = createDefaultCriteria();
      const lowScoreReviewer = createMockReviewerProfile({
        id: "reviewer_low",
        expertise: [{ area: "ATS", level: "BASIC" }],
        languages: [{ language: "EN", proficiency: "BASIC", canConductInterviews: false }],
        availability: [{ startDate: criteria.reviewStartDate, endDate: criteria.reviewEndDate, type: "AVAILABLE" }],
      });
      const highScoreReviewer = createMockReviewerProfile({
        id: "reviewer_high",
        expertise: [
          { area: "ATS", level: "EXPERT" },
          { area: "CNS", level: "EXPERT" },
        ],
        languages: [
          { language: "EN", proficiency: "NATIVE", canConductInterviews: true },
          { language: "FR", proficiency: "NATIVE", canConductInterviews: true },
        ],
        availability: [{ startDate: criteria.reviewStartDate, endDate: criteria.reviewEndDate, type: "AVAILABLE" }],
        yearsExperience: 20,
        reviewsCompleted: 15,
      });

      const results = findMatchingReviewers(criteria, [lowScoreReviewer, highScoreReviewer]);

      // Eligible reviewers should be sorted by score (highest first)
      const eligibleResults = results.filter((r) => r.isEligible);
      if (eligibleResults.length > 1) {
        expect(eligibleResults[0].score).toBeGreaterThanOrEqual(eligibleResults[1].score);
      }
    });

    it("should respect excludeReviewerIds", () => {
      const criteria = createDefaultCriteria({
        excludeReviewerIds: ["reviewer_excluded"],
      });
      const excludedReviewer = createMockReviewerProfile({
        id: "reviewer_excluded",
        expertise: [{ area: "ATS", level: "EXPERT" }],
        languages: [{ language: "EN", proficiency: "NATIVE", canConductInterviews: true }],
      });
      const includedReviewer = createMockReviewerProfile({
        id: "reviewer_included",
        expertise: [{ area: "ATS", level: "EXPERT" }],
        languages: [{ language: "EN", proficiency: "NATIVE", canConductInterviews: true }],
      });

      const results = findMatchingReviewers(criteria, [excludedReviewer, includedReviewer]);

      expect(results.find((r) => r.reviewerProfileId === "reviewer_excluded")).toBeUndefined();
      expect(results.find((r) => r.reviewerProfileId === "reviewer_included")).toBeDefined();
    });

    it("should score expertise correctly", () => {
      const criteria = createDefaultCriteria({
        requiredExpertise: ["ATS", "CNS", "MET"],
      });
      const partialExpertise = createMockReviewerProfile({
        id: "partial",
        expertise: [{ area: "ATS", level: "EXPERT" }], // Only 1 of 3
        languages: [{ language: "EN", proficiency: "NATIVE", canConductInterviews: true }],
      });
      const fullExpertise = createMockReviewerProfile({
        id: "full",
        expertise: [
          { area: "ATS", level: "EXPERT" },
          { area: "CNS", level: "PROFICIENT" },
          { area: "MET", level: "COMPETENT" },
        ],
        languages: [{ language: "EN", proficiency: "NATIVE", canConductInterviews: true }],
      });

      const results = findMatchingReviewers(criteria, [partialExpertise, fullExpertise]);
      const partialResult = results.find((r) => r.reviewerProfileId === "partial");
      const fullResult = results.find((r) => r.reviewerProfileId === "full");

      expect(fullResult!.breakdown.expertiseScore).toBeGreaterThan(partialResult!.breakdown.expertiseScore);
    });

    it("should score language proficiency correctly", () => {
      const criteria = createDefaultCriteria({
        requiredLanguages: ["EN", "FR"],
      });
      const basicLanguage = createMockReviewerProfile({
        id: "basic_lang",
        expertise: [{ area: "ATS", level: "EXPERT" }],
        languages: [
          { language: "EN", proficiency: "BASIC", canConductInterviews: false },
          { language: "FR", proficiency: "BASIC", canConductInterviews: false },
        ],
      });
      const nativeLanguage = createMockReviewerProfile({
        id: "native_lang",
        expertise: [{ area: "ATS", level: "EXPERT" }],
        languages: [
          { language: "EN", proficiency: "NATIVE", canConductInterviews: true },
          { language: "FR", proficiency: "NATIVE", canConductInterviews: true },
        ],
      });

      const results = findMatchingReviewers(criteria, [basicLanguage, nativeLanguage]);
      const basicResult = results.find((r) => r.reviewerProfileId === "basic_lang");
      const nativeResult = results.find((r) => r.reviewerProfileId === "native_lang");

      expect(nativeResult!.breakdown.languageScore).toBeGreaterThan(basicResult!.breakdown.languageScore);
    });
  });

  // =============================================================================
  // BUILD OPTIMAL TEAM TESTS
  // =============================================================================

  describe("buildOptimalTeam", () => {
    it("should build team with full expertise coverage", () => {
      const criteria = createDefaultCriteria({
        requiredExpertise: ["ATS", "CNS", "MET"],
        teamSize: 3,
      });

      // Each expert needs at least 50% coverage (2/3 areas) to be eligible
      const atsExpert = createMockReviewerProfile({
        id: "ats_expert",
        expertise: [
          { area: "ATS", level: "EXPERT" },
          { area: "CNS", level: "PROFICIENT" },
        ],
        languages: [
          { language: "EN", proficiency: "NATIVE", canConductInterviews: true },
          { language: "FR", proficiency: "ADVANCED", canConductInterviews: true },
        ],
        availability: [{ startDate: criteria.reviewStartDate, endDate: criteria.reviewEndDate, type: "AVAILABLE" }],
      });
      const cnsExpert = createMockReviewerProfile({
        id: "cns_expert",
        expertise: [
          { area: "CNS", level: "EXPERT" },
          { area: "MET", level: "PROFICIENT" },
        ],
        languages: [
          { language: "EN", proficiency: "NATIVE", canConductInterviews: true },
          { language: "FR", proficiency: "ADVANCED", canConductInterviews: true },
        ],
        availability: [{ startDate: criteria.reviewStartDate, endDate: criteria.reviewEndDate, type: "AVAILABLE" }],
      });
      const metExpert = createMockReviewerProfile({
        id: "met_expert",
        expertise: [
          { area: "MET", level: "EXPERT" },
          { area: "ATS", level: "PROFICIENT" },
        ],
        languages: [
          { language: "EN", proficiency: "NATIVE", canConductInterviews: true },
          { language: "FR", proficiency: "ADVANCED", canConductInterviews: true },
        ],
        availability: [{ startDate: criteria.reviewStartDate, endDate: criteria.reviewEndDate, type: "AVAILABLE" }],
      });

      const candidates = findMatchingReviewers(criteria, [atsExpert, cnsExpert, metExpert]);
      const result = buildOptimalTeam(criteria, candidates);

      expect(result.team.length).toBe(3);
      expect(result.coverageReport.expertiseCoverage).toBe(1); // 100%
      expect(result.coverageReport.expertiseMissing.length).toBe(0);
    });

    it("should ensure language requirements are met", () => {
      const criteria = createDefaultCriteria({
        requiredLanguages: ["EN", "FR"],
        teamSize: 2,
      });

      const englishOnly = createMockReviewerProfile({
        id: "en_only",
        expertise: [{ area: "ATS", level: "EXPERT" }, { area: "CNS", level: "PROFICIENT" }],
        languages: [{ language: "EN", proficiency: "NATIVE", canConductInterviews: true }],
        availability: [{ startDate: criteria.reviewStartDate, endDate: criteria.reviewEndDate, type: "AVAILABLE" }],
      });
      const frenchOnly = createMockReviewerProfile({
        id: "fr_only",
        expertise: [{ area: "ATS", level: "EXPERT" }, { area: "CNS", level: "PROFICIENT" }],
        languages: [{ language: "FR", proficiency: "NATIVE", canConductInterviews: true }],
        availability: [{ startDate: criteria.reviewStartDate, endDate: criteria.reviewEndDate, type: "AVAILABLE" }],
      });
      const bilingual = createMockReviewerProfile({
        id: "bilingual",
        expertise: [{ area: "ATS", level: "EXPERT" }, { area: "CNS", level: "PROFICIENT" }],
        languages: [
          { language: "EN", proficiency: "NATIVE", canConductInterviews: true },
          { language: "FR", proficiency: "NATIVE", canConductInterviews: true },
        ],
        availability: [{ startDate: criteria.reviewStartDate, endDate: criteria.reviewEndDate, type: "AVAILABLE" }],
      });

      const candidates = findMatchingReviewers(criteria, [englishOnly, frenchOnly, bilingual]);
      const result = buildOptimalTeam(criteria, candidates);

      // Team should cover both languages
      expect(result.coverageReport.languagesCovered).toContain("EN");
      expect(result.coverageReport.languagesCovered).toContain("FR");
    });

    it("should respect team size constraints", () => {
      const criteria = createDefaultCriteria({
        teamSize: 2,
      });

      const reviewers = Array.from({ length: 5 }, (_, i) =>
        createMockReviewerProfile({
          id: `reviewer_${i}`,
          expertise: [{ area: "ATS", level: "EXPERT" }, { area: "CNS", level: "PROFICIENT" }],
          languages: [
            { language: "EN", proficiency: "NATIVE", canConductInterviews: true },
            { language: "FR", proficiency: "ADVANCED", canConductInterviews: true },
          ],
          availability: [{ startDate: criteria.reviewStartDate, endDate: criteria.reviewEndDate, type: "AVAILABLE" }],
        })
      );

      const candidates = findMatchingReviewers(criteria, reviewers);
      const result = buildOptimalTeam(criteria, candidates);

      expect(result.team.length).toBeLessThanOrEqual(criteria.teamSize);
    });

    it("should handle must-include reviewers", () => {
      const criteria = createDefaultCriteria({
        mustIncludeReviewerIds: ["must_include"],
        teamSize: 3,
      });

      const mustIncludeReviewer = createMockReviewerProfile({
        id: "must_include",
        expertise: [{ area: "ATS", level: "BASIC" }],
        languages: [{ language: "EN", proficiency: "INTERMEDIATE", canConductInterviews: false }],
        availability: [{ startDate: criteria.reviewStartDate, endDate: criteria.reviewEndDate, type: "AVAILABLE" }],
      });
      const betterReviewer = createMockReviewerProfile({
        id: "better",
        expertise: [{ area: "ATS", level: "EXPERT" }, { area: "CNS", level: "EXPERT" }],
        languages: [
          { language: "EN", proficiency: "NATIVE", canConductInterviews: true },
          { language: "FR", proficiency: "NATIVE", canConductInterviews: true },
        ],
        availability: [{ startDate: criteria.reviewStartDate, endDate: criteria.reviewEndDate, type: "AVAILABLE" }],
      });

      const candidates = findMatchingReviewers(criteria, [mustIncludeReviewer, betterReviewer]);
      const result = buildOptimalTeam(criteria, candidates);

      expect(result.team.some((m) => m.reviewerProfileId === "must_include")).toBe(true);
    });

    it("should report missing coverage accurately", () => {
      const criteria = createDefaultCriteria({
        requiredExpertise: ["ATS", "CNS", "MET", "SAR"],
        teamSize: 2,
      });

      // Each reviewer needs at least 50% coverage (2/4 areas) to be eligible
      const limitedReviewer1 = createMockReviewerProfile({
        id: "limited1",
        expertise: [
          { area: "ATS", level: "EXPERT" },
          { area: "CNS", level: "PROFICIENT" },
        ],
        languages: [
          { language: "EN", proficiency: "NATIVE", canConductInterviews: true },
          { language: "FR", proficiency: "ADVANCED", canConductInterviews: true },
        ],
        availability: [{ startDate: criteria.reviewStartDate, endDate: criteria.reviewEndDate, type: "AVAILABLE" }],
      });
      const limitedReviewer2 = createMockReviewerProfile({
        id: "limited2",
        expertise: [
          { area: "CNS", level: "EXPERT" },
          { area: "ATS", level: "PROFICIENT" },
        ],
        languages: [
          { language: "EN", proficiency: "NATIVE", canConductInterviews: true },
          { language: "FR", proficiency: "ADVANCED", canConductInterviews: true },
        ],
        availability: [{ startDate: criteria.reviewStartDate, endDate: criteria.reviewEndDate, type: "AVAILABLE" }],
      });

      const candidates = findMatchingReviewers(criteria, [limitedReviewer1, limitedReviewer2]);
      const result = buildOptimalTeam(criteria, candidates);

      // Should accurately report missing MET and SAR
      expect(result.coverageReport.expertiseMissing).toContain("MET");
      expect(result.coverageReport.expertiseMissing).toContain("SAR");
      expect(result.coverageReport.expertiseCoverage).toBe(0.5); // 2 of 4
    });

    it("should prioritize lead-qualified reviewers when team lacks one", () => {
      const criteria = createDefaultCriteria({
        teamSize: 2,
      });

      const normalReviewer = createMockReviewerProfile({
        id: "normal",
        isLeadQualified: false,
        expertise: [{ area: "ATS", level: "EXPERT" }, { area: "CNS", level: "EXPERT" }],
        languages: [
          { language: "EN", proficiency: "NATIVE", canConductInterviews: true },
          { language: "FR", proficiency: "NATIVE", canConductInterviews: true },
        ],
        availability: [{ startDate: criteria.reviewStartDate, endDate: criteria.reviewEndDate, type: "AVAILABLE" }],
      });
      const leadReviewer = createMockReviewerProfile({
        id: "lead",
        isLeadQualified: true,
        expertise: [{ area: "ATS", level: "PROFICIENT" }], // Lower expertise score
        languages: [
          { language: "EN", proficiency: "NATIVE", canConductInterviews: true },
          { language: "FR", proficiency: "ADVANCED", canConductInterviews: true },
        ],
        availability: [{ startDate: criteria.reviewStartDate, endDate: criteria.reviewEndDate, type: "AVAILABLE" }],
      });

      const candidates = findMatchingReviewers(criteria, [normalReviewer, leadReviewer]);
      const result = buildOptimalTeam(criteria, candidates);

      expect(result.coverageReport.hasLeadQualified).toBe(true);
    });
  });

  // =============================================================================
  // UTILITY FUNCTION TESTS
  // =============================================================================

  describe("utility functions", () => {
    describe("filterByMinScore", () => {
      it("should filter out candidates below minimum score", () => {
        const mockResults: MatchResult[] = [
          { reviewerProfileId: "high", score: 80 } as MatchResult,
          { reviewerProfileId: "medium", score: 50 } as MatchResult,
          { reviewerProfileId: "low", score: 30 } as MatchResult,
        ];

        const filtered = filterByMinScore(mockResults, 50);

        expect(filtered.length).toBe(2);
        expect(filtered.every((r) => r.score >= 50)).toBe(true);
      });
    });

    describe("filterEligibleOnly", () => {
      it("should filter out ineligible candidates", () => {
        const mockResults: MatchResult[] = [
          { reviewerProfileId: "eligible", isEligible: true } as MatchResult,
          { reviewerProfileId: "ineligible", isEligible: false } as MatchResult,
        ];

        const filtered = filterEligibleOnly(mockResults);

        expect(filtered.length).toBe(1);
        expect(filtered[0].reviewerProfileId).toBe("eligible");
      });
    });

    describe("getTopCandidates", () => {
      it("should return top N candidates", () => {
        const mockResults: MatchResult[] = [
          { reviewerProfileId: "1", score: 90 } as MatchResult,
          { reviewerProfileId: "2", score: 80 } as MatchResult,
          { reviewerProfileId: "3", score: 70 } as MatchResult,
          { reviewerProfileId: "4", score: 60 } as MatchResult,
        ];

        const top = getTopCandidates(mockResults, 2);

        expect(top.length).toBe(2);
        expect(top[0].reviewerProfileId).toBe("1");
        expect(top[1].reviewerProfileId).toBe("2");
      });
    });

    describe("canAssignReviewer", () => {
      it("should return true for eligible reviewer", () => {
        const criteria = createDefaultCriteria();
        const eligibleReviewer = createMockReviewerProfile({
          expertise: [{ area: "ATS", level: "EXPERT" }, { area: "CNS", level: "PROFICIENT" }],
          languages: [
            { language: "EN", proficiency: "NATIVE", canConductInterviews: true },
            { language: "FR", proficiency: "ADVANCED", canConductInterviews: true },
          ],
          availability: [{ startDate: criteria.reviewStartDate, endDate: criteria.reviewEndDate, type: "AVAILABLE" }],
        });

        const result = canAssignReviewer(eligibleReviewer, criteria);

        expect(result.canAssign).toBe(true);
        expect(result.reasons.length).toBe(0);
      });

      it("should return false with reasons for ineligible reviewer", () => {
        const criteria = createDefaultCriteria();
        // Test with a reviewer that has no expertise (ineligible)
        const noExpertiseReviewer = createMockReviewerProfile({
          expertise: [], // No expertise
          languages: [],
          availability: [],
        });

        const result = canAssignReviewer(noExpertiseReviewer, criteria);

        expect(result.canAssign).toBe(false);
        expect(result.reasons.length).toBeGreaterThan(0);
      });
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe("edge cases", () => {
    it("should handle empty reviewer list", () => {
      const criteria = createDefaultCriteria();
      const results = findMatchingReviewers(criteria, []);

      expect(results.length).toBe(0);
    });

    it("should handle empty required expertise", () => {
      const criteria = createDefaultCriteria({
        requiredExpertise: [],
      });
      const reviewer = createMockReviewerProfile({
        expertise: [{ area: "ATS", level: "EXPERT" }],
        languages: [
          { language: "EN", proficiency: "NATIVE", canConductInterviews: true },
          { language: "FR", proficiency: "ADVANCED", canConductInterviews: true },
        ],
        availability: [{ startDate: criteria.reviewStartDate, endDate: criteria.reviewEndDate, type: "AVAILABLE" }],
      });

      const results = findMatchingReviewers(criteria, [reviewer]);

      // Should still score expertise (get full points when no requirements)
      expect(results[0].breakdown.expertiseScore).toBe(40);
    });

    it("should handle tentative availability", () => {
      const criteria = createDefaultCriteria();
      const tentativeReviewer = createMockReviewerProfile({
        id: "tentative",
        expertise: [{ area: "ATS", level: "EXPERT" }, { area: "CNS", level: "PROFICIENT" }],
        languages: [
          { language: "EN", proficiency: "NATIVE", canConductInterviews: true },
          { language: "FR", proficiency: "ADVANCED", canConductInterviews: true },
        ],
        availability: [{ startDate: criteria.reviewStartDate, endDate: criteria.reviewEndDate, type: "TENTATIVE" }],
      });

      const results = findMatchingReviewers(criteria, [tentativeReviewer]);

      // Tentative should count as 50% availability
      expect(results[0].availabilityDetails.coverage).toBe(0.5);
    });

    it("should handle partial date coverage", () => {
      const criteria = createDefaultCriteria();
      const partialStart = new Date(criteria.reviewStartDate);
      partialStart.setDate(partialStart.getDate() + 2); // Start 2 days late

      const partialReviewer = createMockReviewerProfile({
        id: "partial",
        expertise: [{ area: "ATS", level: "EXPERT" }, { area: "CNS", level: "PROFICIENT" }],
        languages: [
          { language: "EN", proficiency: "NATIVE", canConductInterviews: true },
          { language: "FR", proficiency: "ADVANCED", canConductInterviews: true },
        ],
        availability: [{ startDate: partialStart, endDate: criteria.reviewEndDate, type: "AVAILABLE" }],
      });

      const results = findMatchingReviewers(criteria, [partialReviewer]);

      // Should have partial coverage
      expect(results[0].availabilityDetails.coverage).toBeLessThan(1);
      expect(results[0].availabilityDetails.coverage).toBeGreaterThan(0);
    });
  });
});
