/**
 * COI (Conflict of Interest) Zod Validation Schemas
 *
 * Validates all input for COI-related tRPC procedures.
 */

import { z } from "zod";
import { MIN_COI_REASON_LENGTH, MIN_OVERRIDE_JUSTIFICATION_LENGTH } from "./types";

// =============================================================================
// ENUM SCHEMAS
// =============================================================================

export const coiTypeSchema = z.enum([
  "HOME_ORGANIZATION",
  "FAMILY_RELATIONSHIP",
  "FORMER_EMPLOYEE",
  "BUSINESS_INTEREST",
  "RECENT_REVIEW",
  "OTHER",
]);

export const coiSeveritySchema = z.enum([
  "HARD_BLOCK",
  "SOFT_WARNING",
]);

// =============================================================================
// COI SCHEMAS
// =============================================================================

/**
 * Schema for creating a new COI
 */
export const createCOISchema = z.object({
  reviewerProfileId: z.string().cuid("Invalid reviewer profile ID"),
  organizationId: z.string().cuid("Invalid organization ID"),
  coiType: coiTypeSchema,
  severity: coiSeveritySchema.optional(), // Will use default based on type if not provided
  reasonEn: z.string()
    .min(MIN_COI_REASON_LENGTH, `Reason must be at least ${MIN_COI_REASON_LENGTH} characters`)
    .max(2000, "Reason must be less than 2000 characters"),
  reasonFr: z.string()
    .min(MIN_COI_REASON_LENGTH, `Reason must be at least ${MIN_COI_REASON_LENGTH} characters`)
    .max(2000, "Reason must be less than 2000 characters")
    .optional()
    .nullable(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional().nullable(),
});

/**
 * Schema for updating a COI
 */
export const updateCOISchema = z.object({
  id: z.string().cuid("Invalid COI ID"),
  reasonEn: z.string()
    .min(MIN_COI_REASON_LENGTH, `Reason must be at least ${MIN_COI_REASON_LENGTH} characters`)
    .max(2000, "Reason must be less than 2000 characters")
    .optional(),
  reasonFr: z.string()
    .min(MIN_COI_REASON_LENGTH, `Reason must be at least ${MIN_COI_REASON_LENGTH} characters`)
    .max(2000, "Reason must be less than 2000 characters")
    .optional()
    .nullable(),
  endDate: z.coerce.date().optional().nullable(),
  isActive: z.boolean().optional(),
});

/**
 * Schema for checking COI for a single reviewer
 */
export const checkCOISchema = z.object({
  reviewerProfileId: z.string().cuid("Invalid reviewer profile ID"),
  organizationId: z.string().cuid("Invalid organization ID"),
  reviewId: z.string().cuid("Invalid review ID").optional(),
});

/**
 * Schema for checking COI for a team
 */
export const checkTeamCOISchema = z.object({
  reviewerProfileIds: z.array(z.string().cuid("Invalid reviewer profile ID")).min(1, "At least one reviewer required"),
  organizationId: z.string().cuid("Invalid organization ID"),
  reviewId: z.string().cuid("Invalid review ID").optional(),
});

/**
 * Schema for listing COIs with filters
 */
export const listCOISchema = z.object({
  // Filters
  reviewerProfileId: z.string().cuid().optional(),
  organizationId: z.string().cuid().optional(),
  coiType: coiTypeSchema.optional(),
  severity: coiSeveritySchema.optional(),
  isActive: z.boolean().optional(),
  isAutoDetected: z.boolean().optional(),

  // Pagination
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),

  // Sorting
  sortBy: z.enum(["createdAt", "startDate", "coiType", "severity"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// =============================================================================
// OVERRIDE SCHEMAS
// =============================================================================

/**
 * Schema for creating a COI override
 */
export const createOverrideSchema = z.object({
  reviewerProfileId: z.string().cuid("Invalid reviewer profile ID"),
  organizationId: z.string().cuid("Invalid organization ID"),
  reviewId: z.string().cuid("Invalid review ID").optional().nullable(),
  justification: z.string()
    .min(MIN_OVERRIDE_JUSTIFICATION_LENGTH, `Justification must be at least ${MIN_OVERRIDE_JUSTIFICATION_LENGTH} characters`)
    .max(5000, "Justification must be less than 5000 characters"),
  expiresAt: z.coerce.date().optional().nullable(),
});

/**
 * Schema for revoking a COI override
 */
export const revokeOverrideSchema = z.object({
  id: z.string().cuid("Invalid override ID"),
  revokeReason: z.string()
    .min(10, "Revoke reason must be at least 10 characters")
    .max(1000, "Revoke reason must be less than 1000 characters"),
});

/**
 * Schema for listing COI overrides with filters
 */
export const listOverridesSchema = z.object({
  // Filters
  reviewerProfileId: z.string().cuid().optional(),
  organizationId: z.string().cuid().optional(),
  reviewId: z.string().cuid().optional(),
  isRevoked: z.boolean().optional(),

  // Pagination
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),

  // Sorting
  sortBy: z.enum(["approvedAt", "expiresAt", "createdAt"]).default("approvedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Schema for syncing auto-detected COIs
 */
export const syncAutoDetectedSchema = z.object({
  reviewerProfileId: z.string().cuid("Invalid reviewer profile ID"),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreateCOIInput = z.infer<typeof createCOISchema>;
export type UpdateCOIInput = z.infer<typeof updateCOISchema>;
export type CheckCOIInput = z.infer<typeof checkCOISchema>;
export type CheckTeamCOIInput = z.infer<typeof checkTeamCOISchema>;
export type ListCOIInput = z.infer<typeof listCOISchema>;
export type CreateOverrideInput = z.infer<typeof createOverrideSchema>;
export type RevokeOverrideInput = z.infer<typeof revokeOverrideSchema>;
export type ListOverridesInput = z.infer<typeof listOverridesSchema>;
export type SyncAutoDetectedInput = z.infer<typeof syncAutoDetectedSchema>;
