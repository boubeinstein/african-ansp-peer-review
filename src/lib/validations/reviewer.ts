/**
 * Zod Validation Schemas for Reviewer Profile Module
 *
 * Validates all input for tRPC procedures
 * Aligned with ICAO and CANSO standards
 */

import { z } from "zod";

// ============================================
// ENUM SCHEMAS
// ============================================

export const reviewerSelectionStatusSchema = z.enum([
  "NOMINATED",
  "UNDER_REVIEW",
  "SELECTED",
  "INACTIVE",
  "WITHDRAWN",
  "REJECTED",
]);

export const reviewerTypeSchema = z.enum([
  "PEER_REVIEWER",
  "LEAD_REVIEWER",
  "SENIOR_REVIEWER",
  "OBSERVER",
]);

export const expertiseAreaSchema = z.enum([
  "ATS",
  "AIM_AIS",
  "FPD",
  "MAP",
  "MET",
  "CNS",
  "PANS_OPS",
  "SAR",
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
]);

export const proficiencyLevelSchema = z.enum([
  "BASIC",
  "COMPETENT",
  "PROFICIENT",
  "EXPERT",
]);

export const languageSchema = z.enum(["EN", "FR", "AR", "PT", "ES"]);

export const languageProficiencySchema = z.enum([
  "BASIC",
  "INTERMEDIATE",
  "ADVANCED",
  "NATIVE",
]);

export const certificationTypeSchema = z.enum([
  "PEER_REVIEWER",
  "LEAD_REVIEWER",
  "SMS_ASSESSOR",
  "ICAO_AUDITOR",
  "CANSO_TRAINER",
  "ATC_LICENSE",
  "OTHER",
]);

export const trainingTypeSchema = z.enum([
  "INITIAL_REVIEWER",
  "REFRESHER",
  "LEAD_REVIEWER",
  "SMS_ASSESSMENT",
  "USOAP_CMA",
  "CANSO_SOE",
  "SPECIALIZED",
]);

export const trainingStatusSchema = z.enum([
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "INCOMPLETE",
  "CANCELLED",
]);

export const availabilityTypeSchema = z.enum([
  "AVAILABLE",
  "TENTATIVE",
  "UNAVAILABLE",
  "ON_ASSIGNMENT",
]);

export const coiTypeSchema = z.enum([
  // Legacy types
  "EMPLOYMENT",
  "FINANCIAL",
  "CONTRACTUAL",
  "PERSONAL",
  "PREVIOUS_REVIEW",
  // Current types
  "HOME_ORGANIZATION",
  "FAMILY_RELATIONSHIP",
  "FORMER_EMPLOYEE",
  "BUSINESS_INTEREST",
  "RECENT_REVIEW",
  "OTHER",
]);

export const contactMethodSchema = z.enum(["EMAIL", "PHONE", "WHATSAPP", "TEAMS"]);

// ============================================
// REVIEWER PROFILE SCHEMAS
// ============================================

export const createReviewerProfileSchema = z.object({
  userId: z.string().cuid("Invalid user ID"),
  homeOrganizationId: z.string().cuid("Invalid organization ID"),

  // Professional Information
  title: z.string().max(20, "Title too long").optional().nullable(),
  currentPosition: z
    .string()
    .min(2, "Position must be at least 2 characters")
    .max(100, "Position too long"),
  yearsOfExperience: z
    .number()
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .max(50, "Maximum 50 years"),
  biography: z.string().max(2000, "Biography too long").optional().nullable(),
  biographyFr: z.string().max(2000, "Biography too long").optional().nullable(),

  // Selection
  nominationDate: z.coerce.date().optional().nullable(),
  selectionStatus: reviewerSelectionStatusSchema.default("NOMINATED"),

  // Classification
  reviewerType: reviewerTypeSchema.default("PEER_REVIEWER"),
  isLeadQualified: z.boolean().default(false),

  // Contact
  preferredContactMethod: contactMethodSchema.default("EMAIL"),
  alternateEmail: z.string().email("Invalid email").optional().nullable(),
  alternatePhone: z.string().max(20, "Phone too long").optional().nullable(),
});

export const updateReviewerProfileSchema = z.object({
  id: z.string().cuid("Invalid profile ID"),

  // All fields optional for partial updates
  title: z.string().max(20).optional().nullable(),
  currentPosition: z.string().min(2).max(100).optional(),
  yearsOfExperience: z.number().int().min(0).max(50).optional(),
  biography: z.string().max(2000).optional().nullable(),
  biographyFr: z.string().max(2000).optional().nullable(),
  selectionStatus: reviewerSelectionStatusSchema.optional(),
  reviewerType: reviewerTypeSchema.optional(),
  isLeadQualified: z.boolean().optional(),
  preferredContactMethod: contactMethodSchema.optional(),
  alternateEmail: z.string().email().optional().nullable(),
  alternatePhone: z.string().max(20).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const reviewerProfileFilterSchema = z.object({
  search: z.string().max(100).optional(),
  organizationId: z.string().cuid().optional(),
  selectionStatus: reviewerSelectionStatusSchema.optional(),
  reviewerType: reviewerTypeSchema.optional(),
  expertiseAreas: z.array(expertiseAreaSchema).optional(),
  languages: z.array(languageSchema).optional(),
  isLeadQualified: z.boolean().optional(),
  isActive: z.boolean().optional(),

  // Pagination
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),

  // Sorting
  sortBy: z.enum(["name", "organization", "experience", "createdAt", "reviewsCompleted"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// ============================================
// EXPERTISE SCHEMAS
// ============================================

export const createExpertiseSchema = z.object({
  reviewerProfileId: z.string().cuid(),
  expertiseArea: expertiseAreaSchema,
  proficiencyLevel: proficiencyLevelSchema.default("COMPETENT"),
  yearsInArea: z.number().int().min(0).max(50).optional().nullable(),
  isPrimary: z.boolean().default(false),
  qualificationDetails: z.string().max(1000).optional().nullable(),
});

export const updateExpertiseSchema = z.object({
  id: z.string().cuid(),
  proficiencyLevel: proficiencyLevelSchema.optional(),
  yearsInArea: z.number().int().min(0).max(50).optional().nullable(),
  isPrimary: z.boolean().optional(),
  qualificationDetails: z.string().max(1000).optional().nullable(),
});

export const batchExpertiseSchema = z.object({
  reviewerProfileId: z.string().cuid(),
  expertise: z
    .array(
      z.object({
        expertiseArea: expertiseAreaSchema,
        proficiencyLevel: proficiencyLevelSchema.default("COMPETENT"),
        yearsInArea: z.number().int().min(0).max(50).optional().nullable(),
        isPrimary: z.boolean().default(false),
      })
    )
    .min(1, "At least one expertise area required")
    .max(10, "Maximum 10 expertise areas"),
});

// ============================================
// LANGUAGE SCHEMAS
// ============================================

export const createLanguageSchema = z.object({
  reviewerProfileId: z.string().cuid(),
  language: languageSchema,
  proficiencyLevel: languageProficiencySchema,
  isNative: z.boolean().default(false),
  canConduct: z.boolean().default(false),
  icaoLevel: z.number().int().min(1).max(6).optional().nullable(),
  certificationDate: z.coerce.date().optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
});

export const updateLanguageSchema = z.object({
  id: z.string().cuid(),
  proficiencyLevel: languageProficiencySchema.optional(),
  isNative: z.boolean().optional(),
  canConduct: z.boolean().optional(),
  icaoLevel: z.number().int().min(1).max(6).optional().nullable(),
  certificationDate: z.coerce.date().optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
});

export const batchLanguageSchema = z.object({
  reviewerProfileId: z.string().cuid(),
  languages: z
    .array(
      z.object({
        language: languageSchema,
        proficiencyLevel: languageProficiencySchema,
        isNative: z.boolean().default(false),
        canConduct: z.boolean().default(false),
      })
    )
    .min(1, "At least one language required")
    .max(6, "Maximum 6 languages"),
});

// ============================================
// CERTIFICATION SCHEMAS
// ============================================

export const createCertificationSchema = z.object({
  reviewerProfileId: z.string().cuid(),
  certificationType: certificationTypeSchema,
  certificationName: z.string().min(2).max(200),
  certificationNameFr: z.string().max(200).optional().nullable(),
  issuingAuthority: z.string().min(2).max(200),
  issueDate: z.coerce.date(),
  expiryDate: z.coerce.date().optional().nullable(),
  certificateNumber: z.string().max(50).optional().nullable(),
  documentUrl: z.string().url().optional().nullable(),
});

export const updateCertificationSchema = z.object({
  id: z.string().cuid(),
  certificationName: z.string().min(2).max(200).optional(),
  certificationNameFr: z.string().max(200).optional().nullable(),
  issuingAuthority: z.string().min(2).max(200).optional(),
  expiryDate: z.coerce.date().optional().nullable(),
  isValid: z.boolean().optional(),
  documentUrl: z.string().url().optional().nullable(),
});

// ============================================
// TRAINING SCHEMAS
// ============================================

export const createTrainingSchema = z.object({
  reviewerProfileId: z.string().cuid(),
  trainingType: trainingTypeSchema,
  trainingName: z.string().min(2).max(200),
  trainingNameFr: z.string().max(200).optional().nullable(),
  provider: z.string().min(2).max(200),
  startDate: z.coerce.date(),
  completionDate: z.coerce.date().optional().nullable(),
  status: trainingStatusSchema.default("SCHEDULED"),
  location: z.string().max(200).optional().nullable(),
  isOnline: z.boolean().default(false),
  hoursCompleted: z.number().int().min(0).max(1000).optional().nullable(),
  grade: z.string().max(20).optional().nullable(),
  certificateUrl: z.string().url().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateTrainingSchema = z.object({
  id: z.string().cuid(),
  completionDate: z.coerce.date().optional().nullable(),
  status: trainingStatusSchema.optional(),
  hoursCompleted: z.number().int().min(0).max(1000).optional().nullable(),
  grade: z.string().max(20).optional().nullable(),
  certificateUrl: z.string().url().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

// ============================================
// AVAILABILITY SCHEMAS
// ============================================

// Base schema without refinement - safe for .omit() operations
export const createAvailabilitySchemaBase = z.object({
  reviewerProfileId: z.string().cuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  availabilityType: availabilityTypeSchema.default("AVAILABLE"),
  notes: z.string().max(500).optional().nullable(),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.string().max(100).optional().nullable(),
});

// Full schema with date validation refinement
export const createAvailabilitySchema = createAvailabilitySchemaBase.refine(
  (data) => data.endDate >= data.startDate,
  {
    message: "End date must be on or after start date",
    path: ["endDate"],
  }
);

export const updateAvailabilitySchema = z.object({
  id: z.string().cuid(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  availabilityType: availabilityTypeSchema.optional(),
  notes: z.string().max(500).optional().nullable(),
});

export const availabilityQuerySchema = z.object({
  reviewerProfileId: z.string().cuid().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  availabilityTypes: z.array(availabilityTypeSchema).optional(),
});

// ============================================
// COI SCHEMAS
// ============================================

export const createCOISchema = z.object({
  reviewerProfileId: z.string().cuid(),
  organizationId: z.string().cuid(),
  coiType: coiTypeSchema,
  reason: z.string().max(1000).optional().nullable(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional().nullable(),
});

export const updateCOISchema = z.object({
  id: z.string().cuid(),
  reason: z.string().max(1000).optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const verifyCOISchema = z.object({
  id: z.string().cuid(),
  verificationNotes: z.string().max(500).optional().nullable(),
});

// ============================================
// MATCHING CRITERIA SCHEMA
// ============================================

export const matchingCriteriaSchema = z.object({
  targetOrganizationId: z.string().cuid(),
  requiredExpertise: z.array(expertiseAreaSchema).min(1, "At least one expertise required"),
  preferredExpertise: z.array(expertiseAreaSchema).optional(),
  requiredLanguages: z.array(languageSchema).min(1, "At least one language required"),
  preferredLanguages: z.array(languageSchema).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  requireLeadQualified: z.boolean().default(false),
  excludeReviewerIds: z.array(z.string().cuid()).optional(),
  maxResults: z.number().int().min(1).max(50).default(10),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type CreateReviewerProfileInput = z.infer<typeof createReviewerProfileSchema>;
export type UpdateReviewerProfileInput = z.infer<typeof updateReviewerProfileSchema>;
export type ReviewerProfileFilterInput = z.infer<typeof reviewerProfileFilterSchema>;

export type CreateExpertiseInput = z.infer<typeof createExpertiseSchema>;
export type UpdateExpertiseInput = z.infer<typeof updateExpertiseSchema>;
export type BatchExpertiseInput = z.infer<typeof batchExpertiseSchema>;

export type CreateLanguageInput = z.infer<typeof createLanguageSchema>;
export type UpdateLanguageInput = z.infer<typeof updateLanguageSchema>;
export type BatchLanguageInput = z.infer<typeof batchLanguageSchema>;

export type CreateCertificationInput = z.infer<typeof createCertificationSchema>;
export type UpdateCertificationInput = z.infer<typeof updateCertificationSchema>;

export type CreateTrainingInput = z.infer<typeof createTrainingSchema>;
export type UpdateTrainingInput = z.infer<typeof updateTrainingSchema>;

export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;

export type CreateCOIInput = z.infer<typeof createCOISchema>;
export type UpdateCOIInput = z.infer<typeof updateCOISchema>;
export type VerifyCOIInput = z.infer<typeof verifyCOISchema>;

export type MatchingCriteriaInput = z.infer<typeof matchingCriteriaSchema>;
