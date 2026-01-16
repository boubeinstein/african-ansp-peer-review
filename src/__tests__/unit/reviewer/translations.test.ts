/**
 * Reviewer Module Translations Tests
 *
 * Ensures all required translation keys exist in both EN and FR.
 */

import { describe, it, expect } from "vitest";
import enMessages from "../../../../messages/en.json";
import frMessages from "../../../../messages/fr.json";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get nested value from an object using dot notation path.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current: unknown, key: string) => {
    if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Check if a value is a non-empty string.
 */
function isValidTranslation(value: unknown): boolean {
  return typeof value === "string" && value.length > 0;
}

// =============================================================================
// REQUIRED TRANSLATION KEYS
// =============================================================================

const requiredReviewerKeys = [
  // Core reviewer translations
  "reviewer.title",
  "reviewer.titlePlural",

  // Profile section
  "reviewer.profile.title",
  "reviewer.profile.edit",
  "reviewer.profile.create",
  "reviewer.profile.personalInfo",
  "reviewer.profile.professionalInfo",
  "reviewer.profile.biography",
  "reviewer.profile.currentPosition",
  "reviewer.profile.yearsOfExperience",
  "reviewer.profile.homeOrganization",

  // Form fields
  "reviewer.form.title",
  "reviewer.form.position",
  "reviewer.form.yearsExperience",
  "reviewer.form.biographyEn",
  "reviewer.form.biographyFr",
  "reviewer.form.preferredContact",

  // Stats
  "reviewer.stats.reviewsCompleted",
  "reviewer.stats.yearsExperience",
  "reviewer.stats.leadQualified",

  // Expertise section
  "reviewer.expertise.title",
  "reviewer.expertise.area",
  "reviewer.expertise.proficiency",
  "reviewer.expertise.years",
  "reviewer.expertise.primary",
  "reviewer.expertise.add",
  "reviewer.expertise.noData",

  // Language section
  "reviewer.language.title",
  "reviewer.language.add",
  "reviewer.language.proficiency",
  "reviewer.language.native",
  "reviewer.language.canConduct",
  "reviewer.language.required",
  "reviewer.language.noData",

  // Certification section
  "reviewer.certification.title",
  "reviewer.certification.add",
  "reviewer.certification.type",
  "reviewer.certification.name",
  "reviewer.certification.issuer",
  "reviewer.certification.issued",
  "reviewer.certification.expires",
  "reviewer.certification.valid",
  "reviewer.certification.status.valid",
  "reviewer.certification.status.expired",
  "reviewer.certification.status.expiringSoon",
  "reviewer.certification.noData",

  // COI (Conflicts of Interest) section
  "reviewer.coi.title",
  "reviewer.coi.organization",
  "reviewer.coi.type",
  "reviewer.coi.reason",
  "reviewer.coi.declare",
  "reviewer.coi.noConflicts",
  "reviewer.coi.homeOrgConflict",
  "reviewer.coi.types.EMPLOYMENT",
  "reviewer.coi.types.FINANCIAL",
  "reviewer.coi.types.CONSULTANCY",
  "reviewer.coi.types.FAMILIAL",
  "reviewer.coi.types.OTHER",
  "reviewer.coi.severity.HARD",
  "reviewer.coi.severity.SOFT",
  "reviewer.coi.status.ACTIVE",
  "reviewer.coi.status.WAIVED",
  "reviewer.coi.status.EXPIRED",

  // Availability section
  "reviewer.availability.title",
  "reviewer.availability.addSlot",
  "reviewer.availability.editSlot",
  "reviewer.availability.type.AVAILABLE",
  "reviewer.availability.type.TENTATIVE",
  "reviewer.availability.type.UNAVAILABLE",
  "reviewer.availability.type.ON_ASSIGNMENT",
  "reviewer.availability.dateRange",
  "reviewer.availability.startDate",
  "reviewer.availability.endDate",
  "reviewer.availability.notes",
  "reviewer.availability.save",
  "reviewer.availability.cancel",
  "reviewer.availability.delete",

  // Availability summary
  "reviewer.availability.summary.title",
  "reviewer.availability.summary.available",
  "reviewer.availability.summary.tentative",
  "reviewer.availability.summary.unavailable",
  "reviewer.availability.summary.percentage",

  // Bulk availability
  "reviewer.availability.bulk.title",
  "reviewer.availability.bulk.recurring",
  "reviewer.availability.bulk.copy",
  "reviewer.availability.bulk.frequency",
  "reviewer.availability.bulk.weekly",
  "reviewer.availability.bulk.biweekly",
  "reviewer.availability.bulk.monthly",

  // Selection status values
  "reviewer.status.NOMINATED",
  "reviewer.status.UNDER_REVIEW",
  "reviewer.status.SELECTED",
  "reviewer.status.INACTIVE",
  "reviewer.status.WITHDRAWN",
  "reviewer.status.REJECTED",

  // Matching algorithm section
  "reviewer.matching.title",
  "reviewer.matching.criteria",
  "reviewer.matching.criteriaDescription",
  "reviewer.matching.targetOrganization",
  "reviewer.matching.requiredExpertise",
  "reviewer.matching.preferredExpertise",
  "reviewer.matching.requiredLanguages",
  "reviewer.matching.reviewPeriod",
  "reviewer.matching.startDate",
  "reviewer.matching.endDate",
  "reviewer.matching.teamSize",
  "reviewer.matching.reviewers",
  "reviewer.matching.findMatches",
  "reviewer.matching.searching",
  "reviewer.matching.autoSelect",
  "reviewer.matching.export",
  "reviewer.matching.confirmTeam",
  "reviewer.matching.results",
  "reviewer.matching.eligible",
  "reviewer.matching.ineligible",
  "reviewer.matching.selected",
  "reviewer.matching.score",
  "reviewer.matching.leadQualified",
  "reviewer.matching.notEligible",
  "reviewer.matching.reviewsCompleted",
  "reviewer.matching.available",
  "reviewer.matching.viewProfile",
  "reviewer.matching.noSearchYet",
  "reviewer.matching.noSearchYetDescription",
  "reviewer.matching.noResults",
  "reviewer.matching.noResultsDescription",
  "reviewer.matching.ineligibleReviewers",

  // Score breakdown
  "reviewer.matching.breakdown.expertise",
  "reviewer.matching.breakdown.language",
  "reviewer.matching.breakdown.availability",
  "reviewer.matching.breakdown.experience",

  // Team building
  "reviewer.matching.team.title",
  "reviewer.matching.team.selected",
  "reviewer.matching.team.membersSelected",
  "reviewer.matching.team.members",
  "reviewer.matching.team.coverage",
  "reviewer.matching.team.missing",
  "reviewer.matching.team.noSelection",
  "reviewer.matching.team.noSelectionDescription",
  "reviewer.matching.team.expertiseCoverage",
  "reviewer.matching.team.languageCoverage",
  "reviewer.matching.team.expertiseTitle",
  "reviewer.matching.team.languageTitle",
  "reviewer.matching.team.hasLead",
  "reviewer.matching.team.hasLeadDescription",
  "reviewer.matching.team.noLead",
  "reviewer.matching.team.noLeadDescription",
  "reviewer.matching.team.balance.GOOD",
  "reviewer.matching.team.balance.FAIR",
  "reviewer.matching.team.balance.POOR",
  "reviewer.matching.team.suggestions",
  "reviewer.matching.team.suggestExpertise",
  "reviewer.matching.team.suggestLanguage",
  "reviewer.matching.team.suggestLead",

  // Warnings
  "reviewer.matching.warnings.coiConflict",
  "reviewer.matching.warnings.notAvailable",
  "reviewer.matching.warnings.missingExpertise",

  // Actions
  "reviewer.actions.create",
  "reviewer.actions.edit",
  "reviewer.actions.view",

  // Messages
  "reviewer.messages.createSuccess",
  "reviewer.messages.updateSuccess",
  "reviewer.messages.coiWarning",
];

const requiredReviewersKeys = [
  // Reviewer directory
  "reviewers.title",
  "reviewers.description",
  "reviewers.stats.total",
  "reviewers.stats.selected",
  "reviewers.stats.active",
  "reviewers.stats.available",

  // Search and filters
  "reviewers.search.placeholder",
  "reviewers.search.filters",
  "reviewers.search.clearFilters",
  "reviewers.search.activeFilters",

  // Sort options
  "reviewers.sort.label",
  "reviewers.sort.name",
  "reviewers.sort.organization",
  "reviewers.sort.status",
  "reviewers.sort.experience",
  "reviewers.sort.reviews",

  // View options
  "reviewers.view.card",
  "reviewers.view.table",

  // Filters
  "reviewers.filters.title",
  "reviewers.filters.expertise",
  "reviewers.filters.languages",
  "reviewers.filters.status",
  "reviewers.filters.availableOnly",
  "reviewers.filters.leadQualifiedOnly",
  "reviewers.filters.apply",

  // Results
  "reviewers.results.showing",

  // Pagination
  "reviewers.pagination.previous",
  "reviewers.pagination.next",
  "reviewers.pagination.page",

  // Card view
  "reviewers.card.leadQualified",
  "reviewers.card.available",
  "reviewers.card.reviews",
  "reviewers.card.experience",

  // Table view
  "reviewers.table.name",
  "reviewers.table.organization",
  "reviewers.table.expertise",
  "reviewers.table.languages",
  "reviewers.table.status",
  "reviewers.table.reviews",
  "reviewers.table.actions",

  // Actions
  "reviewers.actions.view",
  "reviewers.actions.edit",
  "reviewers.actions.export",
  "reviewers.actions.addReviewer",

  // Empty state
  "reviewers.empty.title",
  "reviewers.empty.description",
];

const requiredNavigationKeys = [
  "navigation.reviewers",
];

// =============================================================================
// TESTS
// =============================================================================

describe("Reviewer Module Translations", () => {
  describe("English (EN) translations", () => {
    it.each(requiredReviewerKeys)("should have EN translation for %s", (key) => {
      const value = getNestedValue(enMessages, key);
      expect(value, `Missing EN translation for: ${key}`).toBeDefined();
      expect(isValidTranslation(value), `Invalid EN translation for: ${key}`).toBe(true);
    });

    it.each(requiredReviewersKeys)("should have EN translation for %s", (key) => {
      const value = getNestedValue(enMessages, key);
      expect(value, `Missing EN translation for: ${key}`).toBeDefined();
      expect(isValidTranslation(value), `Invalid EN translation for: ${key}`).toBe(true);
    });

    it.each(requiredNavigationKeys)("should have EN translation for %s", (key) => {
      const value = getNestedValue(enMessages, key);
      expect(value, `Missing EN translation for: ${key}`).toBeDefined();
      expect(isValidTranslation(value), `Invalid EN translation for: ${key}`).toBe(true);
    });
  });

  describe("French (FR) translations", () => {
    it.each(requiredReviewerKeys)("should have FR translation for %s", (key) => {
      const value = getNestedValue(frMessages, key);
      expect(value, `Missing FR translation for: ${key}`).toBeDefined();
      expect(isValidTranslation(value), `Invalid FR translation for: ${key}`).toBe(true);
    });

    it.each(requiredReviewersKeys)("should have FR translation for %s", (key) => {
      const value = getNestedValue(frMessages, key);
      expect(value, `Missing FR translation for: ${key}`).toBeDefined();
      expect(isValidTranslation(value), `Invalid FR translation for: ${key}`).toBe(true);
    });

    it.each(requiredNavigationKeys)("should have FR translation for %s", (key) => {
      const value = getNestedValue(frMessages, key);
      expect(value, `Missing FR translation for: ${key}`).toBeDefined();
      expect(isValidTranslation(value), `Invalid FR translation for: ${key}`).toBe(true);
    });
  });

  describe("Translation completeness", () => {
    it("should have reviewer section in both languages", () => {
      expect(enMessages.reviewer).toBeDefined();
      expect(frMessages.reviewer).toBeDefined();
    });

    it("should have reviewers section in both languages", () => {
      expect(enMessages.reviewers).toBeDefined();
      expect(frMessages.reviewers).toBeDefined();
    });

    it("should have matching key structure between EN and FR", () => {
      const enReviewerKeys = Object.keys(enMessages.reviewer || {});
      const frReviewerKeys = Object.keys(frMessages.reviewer || {});

      // All EN keys should exist in FR
      for (const key of enReviewerKeys) {
        expect(
          frReviewerKeys.includes(key),
          `FR missing key in reviewer: ${key}`
        ).toBe(true);
      }
    });

    it("should have all status values translated", () => {
      const statusKeys = [
        "NOMINATED",
        "UNDER_REVIEW",
        "SELECTED",
        "INACTIVE",
        "WITHDRAWN",
        "REJECTED",
      ];

      for (const status of statusKeys) {
        const enValue = getNestedValue(enMessages, `reviewer.status.${status}`);
        const frValue = getNestedValue(frMessages, `reviewer.status.${status}`);

        expect(enValue, `Missing EN status: ${status}`).toBeDefined();
        expect(frValue, `Missing FR status: ${status}`).toBeDefined();
      }
    });

    it("should have all COI types translated", () => {
      const coiTypes = [
        "EMPLOYMENT",
        "FINANCIAL",
        "CONSULTANCY",
        "FAMILIAL",
        "OTHER",
      ];

      for (const type of coiTypes) {
        const enValue = getNestedValue(enMessages, `reviewer.coi.types.${type}`);
        const frValue = getNestedValue(frMessages, `reviewer.coi.types.${type}`);

        expect(enValue, `Missing EN COI type: ${type}`).toBeDefined();
        expect(frValue, `Missing FR COI type: ${type}`).toBeDefined();
      }
    });

    it("should have all availability types translated", () => {
      const availTypes = ["AVAILABLE", "TENTATIVE", "UNAVAILABLE", "ON_ASSIGNMENT"];

      for (const type of availTypes) {
        const enValue = getNestedValue(enMessages, `reviewer.availability.type.${type}`);
        const frValue = getNestedValue(frMessages, `reviewer.availability.type.${type}`);

        expect(enValue, `Missing EN availability type: ${type}`).toBeDefined();
        expect(frValue, `Missing FR availability type: ${type}`).toBeDefined();
      }
    });

    it("should have all team balance values translated", () => {
      const balanceValues = ["GOOD", "FAIR", "POOR"];

      for (const value of balanceValues) {
        const enValue = getNestedValue(enMessages, `reviewer.matching.team.balance.${value}`);
        const frValue = getNestedValue(frMessages, `reviewer.matching.team.balance.${value}`);

        expect(enValue, `Missing EN balance value: ${value}`).toBeDefined();
        expect(frValue, `Missing FR balance value: ${value}`).toBeDefined();
      }
    });
  });

  describe("Translation quality", () => {
    it("should not have empty strings in required keys", () => {
      const allKeys = [...requiredReviewerKeys, ...requiredReviewersKeys, ...requiredNavigationKeys];

      for (const key of allKeys) {
        const enValue = getNestedValue(enMessages, key);
        const frValue = getNestedValue(frMessages, key);

        if (typeof enValue === "string") {
          expect(enValue.trim().length, `Empty EN string for: ${key}`).toBeGreaterThan(0);
        }
        if (typeof frValue === "string") {
          expect(frValue.trim().length, `Empty FR string for: ${key}`).toBeGreaterThan(0);
        }
      }
    });

    it("should have different FR translations (not just EN copy)", () => {
      // Sample keys that should definitely differ between EN and FR
      const sampleKeys = [
        "reviewer.profile.title",
        "reviewer.expertise.title",
        "reviewer.language.title",
        "reviewer.availability.title",
        "reviewer.matching.title",
        "reviewers.title",
      ];

      let differentCount = 0;

      for (const key of sampleKeys) {
        const enValue = getNestedValue(enMessages, key);
        const frValue = getNestedValue(frMessages, key);

        if (enValue !== frValue) {
          differentCount++;
        }
      }

      // At least 50% of sample keys should have different EN/FR values
      expect(
        differentCount,
        "Too many FR translations appear to be copies of EN"
      ).toBeGreaterThanOrEqual(Math.floor(sampleKeys.length * 0.5));
    });
  });
});
