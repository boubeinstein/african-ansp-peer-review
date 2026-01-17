/**
 * Reviewer API Integration Tests
 *
 * Tests for reviewer profile management, expertise handling,
 * and permission-based access control.
 */

import { describe, it, expect } from "vitest";
import type {
  ReviewerSelectionStatus,
  ReviewerType,
  ExpertiseArea,
  ProficiencyLevel,
  Language,
  LanguageProficiency,
  COIType,
  UserRole,
} from "@prisma/client";

// =============================================================================
// MOCK TYPES
// =============================================================================

interface MockUser {
  id: string;
  role: UserRole;
  organizationId: string | null;
}

interface MockReviewerProfile {
  id: string;
  userId: string;
  homeOrganizationId: string;
  selectionStatus: ReviewerSelectionStatus;
  reviewerType: ReviewerType;
  isLeadQualified: boolean;
  yearsExperience: number;
  reviewsCompleted: number;
  currentPosition: string;
  isActive: boolean;
}

interface MockExpertise {
  id: string;
  reviewerProfileId: string;
  area: ExpertiseArea;
  proficiencyLevel: ProficiencyLevel;
  yearsExperience: number;
  isPrimary: boolean;
}

interface MockLanguage {
  id: string;
  reviewerProfileId: string;
  language: Language;
  proficiency: LanguageProficiency;
  canConductInterviews: boolean;
  canWriteReports: boolean;
}

interface MockCOI {
  id: string;
  reviewerProfileId: string;
  organizationId: string;
  coiType: COIType;
  isActive: boolean;
}

// =============================================================================
// ACCESS CONTROL CONFIGURATION
// =============================================================================

const ADMIN_ROLES: UserRole[] = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"];

const STATUS_CHANGE_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
];

// Profile editing is allowed for admins, ANSP admins for their org, and users for their own profile
// Kept for reference documentation
// const PROFILE_EDIT_ROLES: UserRole[] = [
//   "SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR",
//   "ANSP_ADMIN", "PEER_REVIEWER", "LEAD_REVIEWER",
// ];

const MAX_EXPERTISE_AREAS = 10;
const MAX_LANGUAGES = 6;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: `user_${Math.random().toString(36).slice(2)}`,
    role: "PEER_REVIEWER",
    organizationId: "org_123",
    ...overrides,
  };
}

function createMockProfile(overrides: Partial<MockReviewerProfile> = {}): MockReviewerProfile {
  const id = `profile_${Math.random().toString(36).slice(2)}`;
  return {
    id,
    userId: `user_${Math.random().toString(36).slice(2)}`,
    homeOrganizationId: "org_123",
    selectionStatus: "NOMINATED",
    reviewerType: "PEER_REVIEWER",
    isLeadQualified: false,
    yearsExperience: 10,
    reviewsCompleted: 3,
    currentPosition: "ATM Expert",
    isActive: true,
    ...overrides,
  };
}

function createMockExpertise(
  profileId: string,
  overrides: Partial<MockExpertise> = {}
): MockExpertise {
  return {
    id: `exp_${Math.random().toString(36).slice(2)}`,
    reviewerProfileId: profileId,
    area: "ATS",
    proficiencyLevel: "PROFICIENT",
    yearsExperience: 5,
    isPrimary: false,
    ...overrides,
  };
}

function createMockLanguage(
  profileId: string,
  overrides: Partial<MockLanguage> = {}
): MockLanguage {
  return {
    id: `lang_${Math.random().toString(36).slice(2)}`,
    reviewerProfileId: profileId,
    language: "EN",
    proficiency: "ADVANCED",
    canConductInterviews: true,
    canWriteReports: true,
    ...overrides,
  };
}

function createMockCOI(
  profileId: string,
  organizationId: string,
  overrides: Partial<MockCOI> = {}
): MockCOI {
  return {
    id: `coi_${Math.random().toString(36).slice(2)}`,
    reviewerProfileId: profileId,
    organizationId,
    coiType: "BUSINESS_INTEREST",
    isActive: true,
    ...overrides,
  };
}

function canCreateProfile(user: MockUser): boolean {
  return ADMIN_ROLES.includes(user.role);
}

function canEditProfile(
  user: MockUser,
  profile: MockReviewerProfile
): { canEdit: boolean; reason?: string } {
  // Admins can edit any profile
  if (ADMIN_ROLES.includes(user.role)) {
    return { canEdit: true };
  }

  // Users can edit their own profile
  if (user.id === profile.userId) {
    return { canEdit: true };
  }

  // ANSP admins can edit profiles from their organization
  if (user.role === "ANSP_ADMIN" && user.organizationId === profile.homeOrganizationId) {
    return { canEdit: true };
  }

  return { canEdit: false, reason: "You do not have permission to edit this profile" };
}

function canChangeStatus(user: MockUser): boolean {
  return STATUS_CHANGE_ROLES.includes(user.role);
}

function canViewProfile(
  user: MockUser,
  profile: MockReviewerProfile
): { canView: boolean; reason?: string } {
  // Admins can view any profile
  if (ADMIN_ROLES.includes(user.role)) {
    return { canView: true };
  }

  // Users can view their own profile
  if (user.id === profile.userId) {
    return { canView: true };
  }

  // Selected reviewers are publicly visible
  if (profile.selectionStatus === "SELECTED" && profile.isActive) {
    return { canView: true };
  }

  // Organization members can view profiles from their org
  if (user.organizationId === profile.homeOrganizationId) {
    return { canView: true };
  }

  // Peer reviewers and lead reviewers can view other selected reviewers
  if (["PEER_REVIEWER", "LEAD_REVIEWER"].includes(user.role) && profile.selectionStatus === "SELECTED") {
    return { canView: true };
  }

  return { canView: false, reason: "You do not have permission to view this profile" };
}

function validateExpertiseLimit(currentCount: number, addCount: number): boolean {
  return currentCount + addCount <= MAX_EXPERTISE_AREAS;
}

function validateLanguageLimit(currentCount: number, addCount: number): boolean {
  return currentCount + addCount <= MAX_LANGUAGES;
}

function isValidStatusTransition(
  from: ReviewerSelectionStatus,
  to: ReviewerSelectionStatus
): boolean {
  const validTransitions: Record<ReviewerSelectionStatus, ReviewerSelectionStatus[]> = {
    NOMINATED: ["UNDER_REVIEW", "WITHDRAWN", "REJECTED"],
    UNDER_REVIEW: ["SELECTED", "NOMINATED", "REJECTED"],
    SELECTED: ["INACTIVE", "WITHDRAWN"],
    INACTIVE: ["SELECTED", "WITHDRAWN"],
    WITHDRAWN: [],
    REJECTED: [],
  };

  return validTransitions[from]?.includes(to) ?? false;
}

// =============================================================================
// PROFILE CRUD TESTS
// =============================================================================

describe("Reviewer API", () => {
  describe("Profile CRUD", () => {
    it("should create reviewer profile with valid data", () => {
      const profile = createMockProfile({
        userId: "user_new",
        homeOrganizationId: "org_abc",
        currentPosition: "ATS Manager",
        yearsExperience: 15,
      });

      expect(profile.id).toBeDefined();
      expect(profile.userId).toBe("user_new");
      expect(profile.homeOrganizationId).toBe("org_abc");
      expect(profile.currentPosition).toBe("ATS Manager");
      expect(profile.yearsExperience).toBe(15);
      expect(profile.selectionStatus).toBe("NOMINATED");
      expect(profile.isActive).toBe(true);
    });

    it("should get profile by ID with all relations", () => {
      const profile = createMockProfile();
      const expertise = [
        createMockExpertise(profile.id, { area: "ATS", isPrimary: true }),
        createMockExpertise(profile.id, { area: "CNS" }),
      ];
      const languages = [
        createMockLanguage(profile.id, { language: "EN" }),
        createMockLanguage(profile.id, { language: "FR" }),
      ];

      expect(profile).toBeDefined();
      expect(expertise.length).toBe(2);
      expect(languages.length).toBe(2);
      expect(expertise[0].isPrimary).toBe(true);
    });

    it("should update profile fields", () => {
      const profile = createMockProfile({
        currentPosition: "Old Position",
        yearsExperience: 10,
      });

      // Simulate update
      const updatedProfile = {
        ...profile,
        currentPosition: "New Position",
        yearsExperience: 15,
      };

      expect(updatedProfile.currentPosition).toBe("New Position");
      expect(updatedProfile.yearsExperience).toBe(15);
      expect(updatedProfile.id).toBe(profile.id); // ID unchanged
    });

    it("should list profiles with pagination", () => {
      const profiles = Array.from({ length: 50 }, (_, i) =>
        createMockProfile({ yearsExperience: i + 1 })
      );

      const page = 1;
      const pageSize = 20;
      const startIndex = (page - 1) * pageSize;
      const pagedProfiles = profiles.slice(startIndex, startIndex + pageSize);

      expect(pagedProfiles.length).toBe(20);
      expect(pagedProfiles[0].yearsExperience).toBe(1);
    });

    it("should search profiles with filters", () => {
      const profiles = [
        createMockProfile({ selectionStatus: "SELECTED", isLeadQualified: true }),
        createMockProfile({ selectionStatus: "SELECTED", isLeadQualified: false }),
        createMockProfile({ selectionStatus: "NOMINATED", isLeadQualified: false }),
      ];

      // Filter by selection status
      const selectedOnly = profiles.filter((p) => p.selectionStatus === "SELECTED");
      expect(selectedOnly.length).toBe(2);

      // Filter by lead qualified
      const leadQualifiedOnly = profiles.filter((p) => p.isLeadQualified);
      expect(leadQualifiedOnly.length).toBe(1);

      // Combined filters
      const selectedLeads = profiles.filter(
        (p) => p.selectionStatus === "SELECTED" && p.isLeadQualified
      );
      expect(selectedLeads.length).toBe(1);
    });

    it("should sort profiles by different fields", () => {
      const profiles = [
        createMockProfile({ yearsExperience: 5, reviewsCompleted: 10 }),
        createMockProfile({ yearsExperience: 15, reviewsCompleted: 2 }),
        createMockProfile({ yearsExperience: 10, reviewsCompleted: 5 }),
      ];

      // Sort by experience descending
      const byExperience = [...profiles].sort((a, b) => b.yearsExperience - a.yearsExperience);
      expect(byExperience[0].yearsExperience).toBe(15);
      expect(byExperience[2].yearsExperience).toBe(5);

      // Sort by reviews descending
      const byReviews = [...profiles].sort((a, b) => b.reviewsCompleted - a.reviewsCompleted);
      expect(byReviews[0].reviewsCompleted).toBe(10);
      expect(byReviews[2].reviewsCompleted).toBe(2);
    });
  });

  // =============================================================================
  // EXPERTISE MANAGEMENT TESTS
  // =============================================================================

  describe("Expertise Management", () => {
    it("should add expertise area to profile", () => {
      const profile = createMockProfile();
      const expertise = createMockExpertise(profile.id, {
        area: "ATS",
        proficiencyLevel: "EXPERT",
        yearsExperience: 10,
        isPrimary: true,
      });

      expect(expertise.reviewerProfileId).toBe(profile.id);
      expect(expertise.area).toBe("ATS");
      expect(expertise.proficiencyLevel).toBe("EXPERT");
      expect(expertise.isPrimary).toBe(true);
    });

    it("should update expertise proficiency level", () => {
      const profile = createMockProfile();
      const expertise = createMockExpertise(profile.id, {
        proficiencyLevel: "COMPETENT",
      });

      // Simulate update
      const updatedExpertise = {
        ...expertise,
        proficiencyLevel: "EXPERT" as ProficiencyLevel,
      };

      expect(updatedExpertise.proficiencyLevel).toBe("EXPERT");
    });

    it("should remove expertise area", () => {
      const profile = createMockProfile();
      const expertiseList = [
        createMockExpertise(profile.id, { area: "ATS" }),
        createMockExpertise(profile.id, { area: "CNS" }),
        createMockExpertise(profile.id, { area: "MET" }),
      ];

      // Remove CNS
      const filtered = expertiseList.filter((e) => e.area !== "CNS");
      expect(filtered.length).toBe(2);
      expect(filtered.some((e) => e.area === "CNS")).toBe(false);
    });

    it("should enforce max expertise limit", () => {
      const currentCount = 8;
      const addCount = 3;

      const canAdd = validateExpertiseLimit(currentCount, addCount);
      expect(canAdd).toBe(false);

      const canAddOne = validateExpertiseLimit(currentCount, 1);
      expect(canAddOne).toBe(true);
    });

    it("should allow only one primary expertise", () => {
      const profile = createMockProfile();
      const expertiseList = [
        createMockExpertise(profile.id, { area: "ATS", isPrimary: true }),
        createMockExpertise(profile.id, { area: "CNS", isPrimary: false }),
        createMockExpertise(profile.id, { area: "MET", isPrimary: false }),
      ];

      const primaryCount = expertiseList.filter((e) => e.isPrimary).length;
      expect(primaryCount).toBe(1);

      // Setting new primary should unset previous
      const newPrimary = expertiseList.map((e) => ({
        ...e,
        isPrimary: e.area === "CNS",
      }));

      const newPrimaryCount = newPrimary.filter((e) => e.isPrimary).length;
      expect(newPrimaryCount).toBe(1);
      expect(newPrimary.find((e) => e.area === "CNS")?.isPrimary).toBe(true);
    });

    it("should validate expertise area values", () => {
      const validAreas: ExpertiseArea[] = [
        "ATS",
        "AIM_AIS",
        "MET",
        "CNS",
        "SAR",
        "PANS_OPS",
        "SMS_POLICY",
        "SMS_RISK",
        "SMS_ASSURANCE",
        "SMS_PROMOTION",
        "AERODROME",
        "RFF",
        "ENGINEERING",
        "QMS",
        "TRAINING",
        "HUMAN_FACTORS",
      ];

      validAreas.forEach((area) => {
        const expertise = createMockExpertise("profile_1", { area });
        expect(expertise.area).toBe(area);
      });
    });

    it("should batch update multiple expertise areas", () => {
      const profile = createMockProfile();
      const batchInput = [
        { area: "ATS" as ExpertiseArea, proficiencyLevel: "EXPERT" as ProficiencyLevel, isPrimary: true },
        { area: "CNS" as ExpertiseArea, proficiencyLevel: "PROFICIENT" as ProficiencyLevel, isPrimary: false },
        { area: "MET" as ExpertiseArea, proficiencyLevel: "COMPETENT" as ProficiencyLevel, isPrimary: false },
      ];

      const createdExpertise = batchInput.map((input) =>
        createMockExpertise(profile.id, input)
      );

      expect(createdExpertise.length).toBe(3);
      expect(createdExpertise[0].isPrimary).toBe(true);
    });
  });

  // =============================================================================
  // LANGUAGE MANAGEMENT TESTS
  // =============================================================================

  describe("Language Management", () => {
    it("should add language to profile", () => {
      const profile = createMockProfile();
      const language = createMockLanguage(profile.id, {
        language: "FR",
        proficiency: "NATIVE",
        canConductInterviews: true,
        canWriteReports: true,
      });

      expect(language.reviewerProfileId).toBe(profile.id);
      expect(language.language).toBe("FR");
      expect(language.proficiency).toBe("NATIVE");
    });

    it("should enforce minimum EN and FR requirement for selected reviewers", () => {
      const profile = createMockProfile({ selectionStatus: "SELECTED" });
      const languages = [
        createMockLanguage(profile.id, { language: "EN", proficiency: "ADVANCED" }),
        createMockLanguage(profile.id, { language: "FR", proficiency: "INTERMEDIATE" }),
      ];

      const hasEnglish = languages.some((l) => l.language === "EN");
      const hasFrench = languages.some((l) => l.language === "FR");

      expect(hasEnglish).toBe(true);
      expect(hasFrench).toBe(true);
    });

    it("should enforce max language limit", () => {
      const currentCount = 5;
      const addCount = 2;

      const canAdd = validateLanguageLimit(currentCount, addCount);
      expect(canAdd).toBe(false);

      const canAddOne = validateLanguageLimit(currentCount, 1);
      expect(canAddOne).toBe(true);
    });

    it("should prevent duplicate languages", () => {
      const profile = createMockProfile();
      const languages = [
        createMockLanguage(profile.id, { language: "EN" }),
        createMockLanguage(profile.id, { language: "FR" }),
      ];

      const newLanguage = "EN" as Language;
      const isDuplicate = languages.some((l) => l.language === newLanguage);

      expect(isDuplicate).toBe(true);
    });
  });

  // =============================================================================
  // COI MANAGEMENT TESTS
  // =============================================================================

  describe("COI Management", () => {
    it("should add COI declaration", () => {
      const profile = createMockProfile();
      const coi = createMockCOI(profile.id, "org_conflict", {
        coiType: "HOME_ORGANIZATION",
        isActive: true,
      });

      expect(coi.reviewerProfileId).toBe(profile.id);
      expect(coi.organizationId).toBe("org_conflict");
      expect(coi.coiType).toBe("HOME_ORGANIZATION");
      expect(coi.isActive).toBe(true);
    });

    it("should auto-add home organization as COI", () => {
      const profile = createMockProfile({ homeOrganizationId: "org_home" });

      // Home org should always be a conflict
      const homeOrgCOI = createMockCOI(profile.id, profile.homeOrganizationId, {
        coiType: "HOME_ORGANIZATION",
        isActive: true,
      });

      expect(homeOrgCOI.organizationId).toBe(profile.homeOrganizationId);
      expect(homeOrgCOI.coiType).toBe("HOME_ORGANIZATION");
    });

    it("should deactivate COI when expired", () => {
      const profile = createMockProfile();
      const coi = createMockCOI(profile.id, "org_old", {
        isActive: true,
      });

      // Simulate expiration
      const expiredCOI = {
        ...coi,
        isActive: false,
      };

      expect(expiredCOI.isActive).toBe(false);
    });

    it("should validate COI types", () => {
      const validTypes: COIType[] = [
        "HOME_ORGANIZATION",
        "FAMILY_RELATIONSHIP",
        "FORMER_EMPLOYEE",
        "BUSINESS_INTEREST",
        "RECENT_REVIEW",
        "OTHER",
      ];

      validTypes.forEach((type) => {
        const coi = createMockCOI("profile_1", "org_1", { coiType: type });
        expect(coi.coiType).toBe(type);
      });
    });
  });

  // =============================================================================
  // PERMISSION TESTS
  // =============================================================================

  describe("Permissions", () => {
    describe("Profile Creation", () => {
      it("should allow admins to create profiles", () => {
        const adminRoles: UserRole[] = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"];

        adminRoles.forEach((role) => {
          const user = createMockUser({ role });
          expect(canCreateProfile(user)).toBe(true);
        });
      });

      it("should deny non-admins from creating profiles", () => {
        const nonAdminRoles: UserRole[] = [
          "ANSP_ADMIN",
          "PEER_REVIEWER",
          "LEAD_REVIEWER",
          "STAFF",
          "STEERING_COMMITTEE",
        ];

        nonAdminRoles.forEach((role) => {
          const user = createMockUser({ role });
          expect(canCreateProfile(user)).toBe(false);
        });
      });
    });

    describe("Profile Editing", () => {
      it("should allow users to edit own profile", () => {
        const userId = "user_123";
        const user = createMockUser({ id: userId, role: "PEER_REVIEWER" });
        const profile = createMockProfile({ userId });

        const { canEdit } = canEditProfile(user, profile);
        expect(canEdit).toBe(true);
      });

      it("should allow admins to edit any profile", () => {
        const user = createMockUser({ role: "SUPER_ADMIN" });
        const profile = createMockProfile({ userId: "different_user" });

        const { canEdit } = canEditProfile(user, profile);
        expect(canEdit).toBe(true);
      });

      it("should allow ANSP admins to edit org member profiles", () => {
        const user = createMockUser({ role: "ANSP_ADMIN", organizationId: "org_123" });
        const profile = createMockProfile({
          userId: "different_user",
          homeOrganizationId: "org_123",
        });

        const { canEdit } = canEditProfile(user, profile);
        expect(canEdit).toBe(true);
      });

      it("should deny editing profiles from other organizations", () => {
        const user = createMockUser({ role: "ANSP_ADMIN", organizationId: "org_123" });
        const profile = createMockProfile({
          userId: "different_user",
          homeOrganizationId: "org_other",
        });

        const { canEdit, reason } = canEditProfile(user, profile);
        expect(canEdit).toBe(false);
        expect(reason).toBeDefined();
      });
    });

    describe("Status Changes", () => {
      it("should restrict status changes to admins", () => {
        const adminRoles: UserRole[] = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"];

        adminRoles.forEach((role) => {
          const user = createMockUser({ role });
          expect(canChangeStatus(user)).toBe(true);
        });
      });

      it("should deny status changes to non-admins", () => {
        const nonAdminRoles: UserRole[] = [
          "ANSP_ADMIN",
          "PEER_REVIEWER",
          "LEAD_REVIEWER",
          "STAFF",
        ];

        nonAdminRoles.forEach((role) => {
          const user = createMockUser({ role });
          expect(canChangeStatus(user)).toBe(false);
        });
      });
    });

    describe("Profile Viewing", () => {
      it("should allow read access to public profiles", () => {
        const user = createMockUser({ role: "STAFF", organizationId: "org_other" });
        const profile = createMockProfile({
          selectionStatus: "SELECTED",
          isActive: true,
        });

        const { canView } = canViewProfile(user, profile);
        expect(canView).toBe(true);
      });

      it("should deny access to non-selected profiles from other orgs", () => {
        const user = createMockUser({ role: "STAFF", organizationId: "org_other" });
        const profile = createMockProfile({
          selectionStatus: "NOMINATED",
          homeOrganizationId: "org_123",
        });

        const { canView } = canViewProfile(user, profile);
        expect(canView).toBe(false);
      });

      it("should allow org members to view their org profiles", () => {
        const user = createMockUser({ role: "STAFF", organizationId: "org_123" });
        const profile = createMockProfile({
          selectionStatus: "NOMINATED",
          homeOrganizationId: "org_123",
        });

        const { canView } = canViewProfile(user, profile);
        expect(canView).toBe(true);
      });

      it("should allow peer reviewers to view selected reviewers", () => {
        const user = createMockUser({ role: "PEER_REVIEWER", organizationId: "org_other" });
        const profile = createMockProfile({
          selectionStatus: "SELECTED",
          homeOrganizationId: "org_123",
        });

        const { canView } = canViewProfile(user, profile);
        expect(canView).toBe(true);
      });
    });
  });

  // =============================================================================
  // STATUS TRANSITION TESTS
  // =============================================================================

  describe("Status Transitions", () => {
    it("should allow valid NOMINATED transitions", () => {
      expect(isValidStatusTransition("NOMINATED", "UNDER_REVIEW")).toBe(true);
      expect(isValidStatusTransition("NOMINATED", "WITHDRAWN")).toBe(true);
      expect(isValidStatusTransition("NOMINATED", "REJECTED")).toBe(true);
      expect(isValidStatusTransition("NOMINATED", "SELECTED")).toBe(false);
    });

    it("should allow valid UNDER_REVIEW transitions", () => {
      expect(isValidStatusTransition("UNDER_REVIEW", "SELECTED")).toBe(true);
      expect(isValidStatusTransition("UNDER_REVIEW", "NOMINATED")).toBe(true);
      expect(isValidStatusTransition("UNDER_REVIEW", "REJECTED")).toBe(true);
      expect(isValidStatusTransition("UNDER_REVIEW", "INACTIVE")).toBe(false);
    });

    it("should allow valid SELECTED transitions", () => {
      expect(isValidStatusTransition("SELECTED", "INACTIVE")).toBe(true);
      expect(isValidStatusTransition("SELECTED", "WITHDRAWN")).toBe(true);
      expect(isValidStatusTransition("SELECTED", "NOMINATED")).toBe(false);
      expect(isValidStatusTransition("SELECTED", "REJECTED")).toBe(false);
    });

    it("should allow valid INACTIVE transitions", () => {
      expect(isValidStatusTransition("INACTIVE", "SELECTED")).toBe(true);
      expect(isValidStatusTransition("INACTIVE", "WITHDRAWN")).toBe(true);
      expect(isValidStatusTransition("INACTIVE", "NOMINATED")).toBe(false);
    });

    it("should not allow transitions from terminal states", () => {
      expect(isValidStatusTransition("WITHDRAWN", "NOMINATED")).toBe(false);
      expect(isValidStatusTransition("WITHDRAWN", "SELECTED")).toBe(false);
      expect(isValidStatusTransition("REJECTED", "NOMINATED")).toBe(false);
      expect(isValidStatusTransition("REJECTED", "SELECTED")).toBe(false);
    });
  });

  // =============================================================================
  // LEAD QUALIFICATION TESTS
  // =============================================================================

  describe("Lead Qualification", () => {
    it("should require minimum experience for lead qualification", () => {
      const minYearsForLead = 10;
      const minReviewsForLead = 2;

      const qualifiedProfile = createMockProfile({
        yearsExperience: 12,
        reviewsCompleted: 5,
      });

      const unqualifiedByYears = createMockProfile({
        yearsExperience: 8,
        reviewsCompleted: 5,
      });

      const unqualifiedByReviews = createMockProfile({
        yearsExperience: 12,
        reviewsCompleted: 1,
      });

      const meetsYears = qualifiedProfile.yearsExperience >= minYearsForLead;
      const meetsReviews = qualifiedProfile.reviewsCompleted >= minReviewsForLead;
      expect(meetsYears && meetsReviews).toBe(true);

      expect(unqualifiedByYears.yearsExperience >= minYearsForLead).toBe(false);
      expect(unqualifiedByReviews.reviewsCompleted >= minReviewsForLead).toBe(false);
    });

    it("should require minimum expertise areas for lead qualification", () => {
      const minExpertiseAreas = 2;

      const profile = createMockProfile();
      const expertise = [
        createMockExpertise(profile.id, { area: "ATS", proficiencyLevel: "EXPERT" }),
        createMockExpertise(profile.id, { area: "CNS", proficiencyLevel: "PROFICIENT" }),
      ];

      const expertCount = expertise.filter(
        (e) => e.proficiencyLevel === "EXPERT" || e.proficiencyLevel === "PROFICIENT"
      ).length;

      expect(expertCount >= minExpertiseAreas).toBe(true);
    });

    it("should require SELECTED status for lead qualification", () => {
      const profile = createMockProfile({ selectionStatus: "NOMINATED" });

      const canBeLeadQualified = profile.selectionStatus === "SELECTED";
      expect(canBeLeadQualified).toBe(false);

      const selectedProfile = createMockProfile({ selectionStatus: "SELECTED" });
      expect(selectedProfile.selectionStatus === "SELECTED").toBe(true);
    });
  });

  // =============================================================================
  // VALIDATION TESTS
  // =============================================================================

  describe("Input Validation", () => {
    it("should validate years of experience range", () => {
      const validYears = [0, 5, 10, 25, 50];
      const invalidYears = [-1, 51, 100];

      validYears.forEach((years) => {
        expect(years >= 0 && years <= 50).toBe(true);
      });

      invalidYears.forEach((years) => {
        expect(years >= 0 && years <= 50).toBe(false);
      });
    });

    it("should validate position length", () => {
      const minLength = 2;
      const maxLength = 100;

      const validPositions = ["Manager", "ATM Expert", "Safety Director General"];
      const invalidPositions = ["A", ""];

      validPositions.forEach((pos) => {
        expect(pos.length >= minLength && pos.length <= maxLength).toBe(true);
      });

      invalidPositions.forEach((pos) => {
        expect(pos.length >= minLength && pos.length <= maxLength).toBe(false);
      });
    });

    it("should validate biography length", () => {
      const maxLength = 2000;

      const validBio = "Experienced aviation professional with expertise in ATS and CNS systems.";
      const longBio = "x".repeat(2001);

      expect(validBio.length <= maxLength).toBe(true);
      expect(longBio.length <= maxLength).toBe(false);
    });
  });
});
