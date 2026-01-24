/**
 * COI (Conflict of Interest) Checking Tests
 *
 * Tests for conflict of interest detection and severity classification.
 */

import { describe, it, expect } from "vitest";
import {
  findMatchingReviewers,
  calculateMatchScore,
  type MatchingCriteria,
} from "@/lib/reviewer/matching";
import type { ReviewerProfileFull } from "@/types/reviewer";
import type { COIType, ExpertiseArea, Language, AvailabilityType } from "@prisma/client";

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

function createMockReviewerWithCOI(
  coiEntries: Array<{
    organizationId: string;
    type: COIType;
    isActive?: boolean;
    endDate?: Date | null;
  }> = [],
  homeOrganizationId: string = "org_home"
): ReviewerProfileFull {
  const id = `profile_${Math.random().toString(36).slice(2)}`;
  const userId = `user_${Math.random().toString(36).slice(2)}`;

  return {
    id,
    userId,
    organizationId: homeOrganizationId,
    homeOrganizationId,
    status: "SELECTED",
    reviewerType: "PEER_REVIEWER",
    selectionStatus: "SELECTED",
    nominatedAt: null,
    selectedAt: new Date(),
    certifiedAt: null,
    isLeadQualified: false,
    leadQualifiedAt: null,
    yearsExperience: 10,
    reviewsCompleted: 3,
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
      firstName: "Test",
      lastName: "Reviewer",
      email: `${userId}@test.com`,
    },
    homeOrganization: {
      id: homeOrganizationId,
      nameEn: "Home Organization",
      nameFr: "Organisation d'origine",
      organizationCode: "HOME",
      country: "Test Country",
    },
    expertiseRecords: [
      {
        id: `exp_${id}`,
        reviewerProfileId: id,
        area: "ATS" as ExpertiseArea,
        proficiencyLevel: "EXPERT",
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
      },
    ],
    languages: [
      {
        id: `lang_${id}`,
        reviewerProfileId: id,
        language: "EN" as Language,
        proficiency: "NATIVE",
        isNative: true,
        icaoLevel: null,
        icaoAssessmentDate: null,
        icaoExpiryDate: null,
        canConductInterviews: true,
        canWriteReports: true,
      },
    ],
    certifications: [],
    trainingRecords: [],
    availabilityPeriods: [
      {
        id: `avail_${id}`,
        reviewerProfileId: id,
        startDate: new Date("2024-03-01"),
        endDate: new Date("2024-12-31"),
        availabilityType: "AVAILABLE" as AvailabilityType,
        title: null,
        notes: null,
        reviewId: null,
        isRecurring: false,
        recurrencePattern: null,
        createdById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    conflictsOfInterest: coiEntries.map((coi, idx) => ({
      id: `coi_${id}_${idx}`,
      reviewerProfileId: id,
      organizationId: coi.organizationId,
      coiType: coi.type,
      severity: coi.type === "HOME_ORGANIZATION" || coi.type === "FAMILY_RELATIONSHIP" ? "HARD_BLOCK" : "SOFT_WARNING",
      reason: null,
      reasonEn: "Test conflict reason",
      reasonFr: null,
      startDate: new Date(),
      endDate: coi.endDate ?? null,
      isActive: coi.isActive ?? true,
      isAutoDetected: false,
      autoDetectedAt: null,
      createdById: null,
      verifiedById: null,
      verifiedAt: null,
      verificationNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      organization: {
        id: coi.organizationId,
        nameEn: `Organization ${coi.organizationId}`,
        nameFr: `Organisation ${coi.organizationId}`,
        organizationCode: coi.organizationId.slice(0, 4).toUpperCase(),
      },
    })),
  };
}

function createDefaultCriteria(): MatchingCriteria {
  return {
    targetOrganizationId: "org_target",
    requiredExpertise: ["ATS"],
    requiredLanguages: ["EN"],
    reviewStartDate: new Date("2024-06-01"),
    reviewEndDate: new Date("2024-06-05"),
    teamSize: 3,
  };
}

// =============================================================================
// COI CHECKING TESTS
// =============================================================================

describe("COI Checking", () => {
  describe("Home organization conflicts", () => {
    it("should detect home organization as hard conflict", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI(
        [],
        "org_target" // Same as target organization
      );

      const results = findMatchingReviewers(criteria, [reviewer]);

      // Reviewer from target org should be completely excluded
      expect(results.length).toBe(0);
    });

    it("should not flag different home organization", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([], "org_different");

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      expect(result.coiStatus.hasConflict).toBe(false);
      expect(result.coiStatus.severity).toBeNull();
    });
  });

  describe("Manual COI declarations", () => {
    it("should detect HOME_ORGANIZATION as hard conflict", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([
        { organizationId: "org_target", type: "HOME_ORGANIZATION" },
      ]);

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      expect(result.coiStatus.hasConflict).toBe(true);
      expect(result.coiStatus.severity).toBe("HARD");
      expect(result.coiStatus.type).toBe("HOME_ORGANIZATION");
      expect(result.isEligible).toBe(false);
    });

    it("should detect FAMILY_RELATIONSHIP as hard conflict", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([
        { organizationId: "org_target", type: "FAMILY_RELATIONSHIP" },
      ]);

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      expect(result.coiStatus.hasConflict).toBe(true);
      expect(result.coiStatus.severity).toBe("HARD");
      expect(result.coiStatus.type).toBe("FAMILY_RELATIONSHIP");
      expect(result.isEligible).toBe(false);
    });

    it("should detect BUSINESS_INTEREST as soft conflict", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([
        { organizationId: "org_target", type: "BUSINESS_INTEREST" },
      ]);

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      expect(result.coiStatus.hasConflict).toBe(true);
      expect(result.coiStatus.severity).toBe("SOFT");
      expect(result.coiStatus.type).toBe("BUSINESS_INTEREST");
      expect(result.coiStatus.isWaivable).toBe(true);
    });

    it("should detect FORMER_EMPLOYEE as soft conflict", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([
        { organizationId: "org_target", type: "FORMER_EMPLOYEE" },
      ]);

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      expect(result.coiStatus.hasConflict).toBe(true);
      expect(result.coiStatus.severity).toBe("SOFT");
      expect(result.coiStatus.type).toBe("FORMER_EMPLOYEE");
      expect(result.isEligible).toBe(true); // Soft COI doesn't disqualify
    });

    it("should detect RECENT_REVIEW as soft conflict", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([
        { organizationId: "org_target", type: "RECENT_REVIEW" },
      ]);

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      expect(result.coiStatus.hasConflict).toBe(true);
      expect(result.coiStatus.severity).toBe("SOFT");
      expect(result.coiStatus.type).toBe("RECENT_REVIEW");
    });

    it("should detect OTHER as soft conflict", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([
        { organizationId: "org_target", type: "OTHER" },
      ]);

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      expect(result.coiStatus.hasConflict).toBe(true);
      expect(result.coiStatus.severity).toBe("SOFT");
      expect(result.coiStatus.type).toBe("OTHER");
    });
  });

  describe("COI against different organizations", () => {
    it("should not flag COI for unrelated organization", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([
        { organizationId: "org_unrelated", type: "HOME_ORGANIZATION" },
      ]);

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      // COI is declared but not against target
      expect(result.coiStatus.hasConflict).toBe(false);
    });

    it("should only flag COI for target organization", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([
        { organizationId: "org_other1", type: "HOME_ORGANIZATION" },
        { organizationId: "org_other2", type: "FAMILY_RELATIONSHIP" },
        { organizationId: "org_target", type: "FORMER_EMPLOYEE" }, // Only this one matches
      ]);

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      expect(result.coiStatus.hasConflict).toBe(true);
      expect(result.coiStatus.type).toBe("FORMER_EMPLOYEE"); // The one matching target
      expect(result.coiStatus.severity).toBe("SOFT");
    });
  });

  describe("COI severity and waivability", () => {
    it("should mark hard conflicts as not waivable", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([
        { organizationId: "org_target", type: "HOME_ORGANIZATION" },
      ]);

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      expect(result.coiStatus.isWaivable).toBe(false);
    });

    it("should mark soft conflicts as waivable", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([
        { organizationId: "org_target", type: "BUSINESS_INTEREST" },
      ]);

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      expect(result.coiStatus.isWaivable).toBe(true);
    });

    it("should provide human-readable reason", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([
        { organizationId: "org_target", type: "HOME_ORGANIZATION" },
      ]);

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      expect(result.coiStatus.reason).toBeDefined();
      expect(result.coiStatus.reason?.length).toBeGreaterThan(0);
    });
  });

  describe("COI warnings", () => {
    it("should generate warning for hard COI", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([
        { organizationId: "org_target", type: "HOME_ORGANIZATION" },
      ]);

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      expect(result.warnings.some((w) => w.includes("Hard COI"))).toBe(true);
    });

    it("should generate warning for soft COI", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([
        { organizationId: "org_target", type: "FORMER_EMPLOYEE" },
      ]);

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      expect(result.warnings.some((w) => w.includes("Soft COI"))).toBe(true);
    });

    it("should not generate warning when no COI", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([]);

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      expect(result.warnings.some((w) => w.includes("COI"))).toBe(false);
    });
  });

  describe("Multiple COI entries", () => {
    it("should detect first matching COI", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([
        { organizationId: "org_target", type: "FORMER_EMPLOYEE" },
        { organizationId: "org_target", type: "BUSINESS_INTEREST" },
      ]);

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      // First matching COI should be detected
      expect(result.coiStatus.hasConflict).toBe(true);
      expect(result.coiStatus.type).toBe("FORMER_EMPLOYEE");
    });

    it("should handle mixed severity COI entries", () => {
      // Note: Current implementation returns first match
      // This test documents current behavior
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([
        { organizationId: "org_target", type: "FORMER_EMPLOYEE" }, // Soft
        { organizationId: "org_target", type: "HOME_ORGANIZATION" }, // Hard
      ]);

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      expect(result.coiStatus.hasConflict).toBe(true);
      // Returns first match (FORMER_EMPLOYEE)
      expect(result.coiStatus.type).toBe("FORMER_EMPLOYEE");
    });
  });

  describe("No COI scenarios", () => {
    it("should return no conflict for clean reviewer", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([]);

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      expect(result.coiStatus.hasConflict).toBe(false);
      expect(result.coiStatus.severity).toBeNull();
      expect(result.coiStatus.type).toBeUndefined();
      expect(result.coiStatus.reason).toBeUndefined();
      expect(result.coiStatus.isWaivable).toBe(false);
    });

    it("should mark clean reviewer as eligible", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([]);

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      expect(result.isEligible).toBe(true);
    });
  });

  describe("calculateMatchScore COI handling", () => {
    it("should include COI status in match result", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([
        { organizationId: "org_target", type: "BUSINESS_INTEREST" },
      ]);

      const result = calculateMatchScore(reviewer, criteria);

      expect(result.coiStatus).toBeDefined();
      expect(result.coiStatus.hasConflict).toBe(true);
      expect(result.coiStatus.severity).toBe("SOFT");
    });

    it("should still calculate scores even with COI", () => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([
        { organizationId: "org_target", type: "HOME_ORGANIZATION" },
      ]);

      const result = calculateMatchScore(reviewer, criteria);

      // Scores should still be calculated
      expect(result.score).toBeGreaterThan(0);
      expect(result.breakdown.expertiseScore).toBeGreaterThan(0);
    });
  });

  describe("COI type reasons", () => {
    const coiTypeReasons: Array<{ type: COIType; expectedReason: string }> = [
      { type: "HOME_ORGANIZATION", expectedReason: "Current employer" },
      { type: "FAMILY_RELATIONSHIP", expectedReason: "Family relationship" },
      { type: "FORMER_EMPLOYEE", expectedReason: "Former employee" },
      { type: "BUSINESS_INTEREST", expectedReason: "Business interest" },
      { type: "RECENT_REVIEW", expectedReason: "Recently reviewed this organization" },
      { type: "OTHER", expectedReason: "Other declared conflict" },
    ];

    it.each(coiTypeReasons)("should provide correct reason for $type", ({ type, expectedReason }) => {
      const criteria = createDefaultCriteria();
      const reviewer = createMockReviewerWithCOI([
        { organizationId: "org_target", type },
      ]);

      const results = findMatchingReviewers(criteria, [reviewer]);
      const result = results[0];

      expect(result.coiStatus.reason).toBe(expectedReason);
    });
  });
});
