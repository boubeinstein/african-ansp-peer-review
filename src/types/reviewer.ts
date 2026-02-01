/**
 * Reviewer Profile Module - TypeScript Types
 * Aligned with ICAO Doc 9734 and CANSO Standard of Excellence
 *
 * @module types/reviewer
 */

import {
  ReviewerSelectionStatus,
  ReviewerType,
  ContactMethod,
  ExpertiseArea,
  ProficiencyLevel,
  Language,
  LanguageProficiency,
  AvailabilityType,
  COIType,
  CertificationType,
  TrainingType,
  TrainingStatus,
} from "@/types/prisma-enums";

// ============================================
// ENUM RE-EXPORTS (for client-side use)
// ============================================

export {
  ReviewerSelectionStatus,
  ReviewerType,
  ContactMethod,
  ExpertiseArea,
  ProficiencyLevel,
  Language,
  LanguageProficiency,
  AvailabilityType,
  COIType,
  CertificationType,
  TrainingType,
  TrainingStatus,
};

// ============================================
// BASE TYPES (for extending) - Permissive to match Prisma
// ============================================

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Organization {
  id: string;
  nameEn: string;
  nameFr: string;
  organizationCode: string | null;
  country: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaReviewerProfile = Record<string, any> & {
  id: string;
  userId: string;
  reviewerType: ReviewerType;
  selectionStatus: ReviewerSelectionStatus;
  isLeadQualified: boolean;
  currentPosition: string;
  homeOrganizationId: string;
  createdAt: Date;
  updatedAt: Date;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaReviewerExpertise = Record<string, any> & {
  id: string;
  reviewerProfileId: string;
  area: ExpertiseArea;
  proficiencyLevel: ProficiencyLevel;
  yearsExperience: number | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaReviewerLanguage = Record<string, any> & {
  id: string;
  reviewerProfileId: string;
  language: Language;
  proficiency: LanguageProficiency;
  canConductInterviews: boolean;
  canWriteReports: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaReviewerCertification = Record<string, any> & {
  id: string;
  reviewerProfileId: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaReviewerTraining = Record<string, any> & {
  id: string;
  reviewerProfileId: string;
  trainingType: TrainingType;
  status: TrainingStatus;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaReviewerAvailability = Record<string, any> & {
  id: string;
  reviewerProfileId: string;
  startDate: Date;
  endDate: Date;
  availabilityType: AvailabilityType;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaReviewerCOI = Record<string, any> & {
  id: string;
  reviewerProfileId: string;
  organizationId: string;
  coiType: COIType;
  isActive: boolean;
};

// ============================================
// TYPE RE-EXPORTS
// ============================================

export type ReviewerProfile = PrismaReviewerProfile;
export type ReviewerExpertise = PrismaReviewerExpertise;
export type ReviewerLanguage = PrismaReviewerLanguage;
export type ReviewerCertification = PrismaReviewerCertification;
export type ReviewerTraining = PrismaReviewerTraining;
export type ReviewerAvailability = PrismaReviewerAvailability;
export type ReviewerCOI = PrismaReviewerCOI;

// ============================================
// COMPOSITE TYPES
// ============================================

/**
 * Full reviewer profile with all relations
 */
export interface ReviewerProfileFull extends PrismaReviewerProfile {
  user: Pick<User, "id" | "firstName" | "lastName" | "email">;
  homeOrganization: Pick<Organization, "id" | "nameEn" | "nameFr" | "organizationCode" | "country">;
  expertiseRecords: PrismaReviewerExpertise[];
  languages: PrismaReviewerLanguage[];
  certifications: PrismaReviewerCertification[];
  trainingRecords: PrismaReviewerTraining[];
  availabilityPeriods: PrismaReviewerAvailability[];
  conflictsOfInterest: (PrismaReviewerCOI & {
    organization: Pick<Organization, "id" | "nameEn" | "nameFr" | "organizationCode">;
  })[];
}

/**
 * Lightweight reviewer for list views
 */
export interface ReviewerListItem {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  title: string | null;
  currentPosition: string;
  homeOrganization: {
    id: string;
    nameEn: string;
    nameFr: string;
    organizationCode: string | null;
    country: string;
  };
  reviewerType: PrismaReviewerProfile["reviewerType"];
  selectionStatus: PrismaReviewerProfile["selectionStatus"];
  isLeadQualified: boolean;
  isAvailable: boolean;
  availableFrom: Date | null;
  availableTo: Date | null;
  primaryExpertise: PrismaReviewerExpertise["area"][];
  languages: PrismaReviewerLanguage["language"][];
  reviewsCompleted: number;
  yearsExperience: number;
}

/**
 * Reviewer card for UI display
 */
export interface ReviewerCard {
  id: string;
  fullName: string;
  title: string | null;
  position: string;
  organizationName: string;
  organizationCode: string | null;
  country: string;
  type: PrismaReviewerProfile["reviewerType"];
  status: PrismaReviewerProfile["selectionStatus"];
  isLeadQualified: boolean;
  expertise: {
    area: PrismaReviewerExpertise["area"];
    proficiencyLevel: PrismaReviewerExpertise["proficiencyLevel"];
  }[];
  languages: {
    language: PrismaReviewerLanguage["language"];
    canConductInterviews: boolean;
    canWriteReports: boolean;
  }[];
  avatarUrl: string | null;
}

/**
 * Reviewer match result for assignment algorithm
 */
export interface ReviewerMatchResult {
  reviewerId: string;
  profileId: string;
  fullName: string;
  organization: string;
  scores: {
    expertise: number; // 0-40 points
    language: number; // 0-30 points
    availability: number; // 0-20 points
    experience: number; // 0-10 points
    total: number; // 0-100 points
  };
  matchedExpertise: PrismaReviewerExpertise["area"][];
  matchedLanguages: PrismaReviewerLanguage["language"][];
  conflicts: string[];
  isEligible: boolean;
  ineligibilityReason?: string;
}

/**
 * Criteria for reviewer matching
 */
export interface ReviewerMatchCriteria {
  targetOrganizationId: string;
  requiredExpertise: PrismaReviewerExpertise["area"][];
  preferredExpertise?: PrismaReviewerExpertise["area"][];
  requiredLanguages: PrismaReviewerLanguage["language"][];
  preferredLanguages?: PrismaReviewerLanguage["language"][];
  reviewPeriod: {
    startDate: Date;
    endDate: Date;
  };
  teamSize?: number;
  requireLeadQualified?: boolean;
  excludeReviewerIds?: string[];
}

/**
 * Reviewer statistics for dashboard
 */
export interface ReviewerStats {
  totalReviewers: number;
  activeReviewers: number;
  leadQualifiedCount: number;
  byRegion: Record<string, number>;
  byExpertise: Record<string, number>;
  byLanguage: Record<string, number>;
  byStatus: Record<string, number>;
}

/**
 * Reviewer filter options
 */
export interface ReviewerFilterOptions {
  selectionStatus?: PrismaReviewerProfile["selectionStatus"][];
  reviewerType?: PrismaReviewerProfile["reviewerType"][];
  expertiseAreas?: PrismaReviewerExpertise["area"][];
  languages?: PrismaReviewerLanguage["language"][];
  isLeadQualified?: boolean;
  isAvailable?: boolean;
  homeOrganizationId?: string;
  region?: string;
  minReviews?: number;
  minYearsExperience?: number;
}

/**
 * Reviewer sort options
 */
export type ReviewerSortField =
  | "fullName"
  | "organization"
  | "reviewsCompleted"
  | "yearsExperience"
  | "selectionStatus"
  | "createdAt";

export interface ReviewerSortOptions {
  field: ReviewerSortField;
  direction: "asc" | "desc";
}

// ============================================
// AVAILABILITY TYPES
// ============================================

/**
 * Availability slot for calendar display
 */
export interface AvailabilitySlot {
  id: string;
  reviewerProfileId: string;
  startDate: Date;
  endDate: Date;
  availabilityType: PrismaReviewerAvailability["availabilityType"];
  notes?: string | null;
  isRecurring: boolean;
  recurrencePattern?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating availability slot
 */
export interface CreateAvailabilityInput {
  startDate: Date;
  endDate: Date;
  availabilityType: PrismaReviewerAvailability["availabilityType"];
  notes?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
}

/**
 * Input for updating availability slot
 */
export interface UpdateAvailabilityInput extends Partial<CreateAvailabilityInput> {
  id: string;
}

/**
 * Recurring availability pattern
 */
export interface RecurringPattern {
  frequency: "weekly" | "biweekly" | "monthly";
  daysOfWeek?: number[]; // 0-6, Sunday=0
  dayOfMonth?: number; // 1-31
  endDate?: Date;
  exceptions?: Date[]; // Blackout dates
}

/**
 * Availability summary for a date range
 */
export interface AvailabilitySummaryData {
  totalDays: number;
  availableDays: number;
  tentativeDays: number;
  unavailableDays: number;
  onAssignmentDays: number;
  availabilityPercentage: number;
}
