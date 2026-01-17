/**
 * Availability Calendar System - Validation Schemas
 *
 * Zod schemas for validating availability-related inputs.
 *
 * @module lib/availability/schemas
 */

import { z } from "zod";

// =============================================================================
// ENUMS
// =============================================================================

export const availabilityTypeSchema = z.enum([
  "AVAILABLE",
  "TENTATIVE",
  "UNAVAILABLE",
  "ON_ASSIGNMENT",
]);

// =============================================================================
// BASE SCHEMAS
// =============================================================================

/**
 * Schema for a date range
 */
export const dateRangeSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

// =============================================================================
// CREATE SCHEMAS
// =============================================================================

/**
 * Schema for creating a single availability slot
 */
export const createSlotSchema = z
  .object({
    reviewerProfileId: z.string().cuid(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    availabilityType: availabilityTypeSchema.default("AVAILABLE"),
    title: z.string().max(200).optional(),
    notes: z.string().max(1000).optional(),
    isRecurring: z.boolean().default(false),
    recurrencePattern: z.string().max(500).optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

/**
 * Schema for creating a slot without the reviewerProfileId (when it's in the URL/context)
 */
export const createSlotInputSchema = createSlotSchema.omit({
  reviewerProfileId: true,
});

/**
 * Schema for bulk creating availability slots
 */
export const bulkCreateSlotsSchema = z.object({
  reviewerProfileId: z.string().cuid(),
  slots: z
    .array(
      z
        .object({
          startDate: z.coerce.date(),
          endDate: z.coerce.date(),
          availabilityType: availabilityTypeSchema.default("AVAILABLE"),
          title: z.string().max(200).optional(),
          notes: z.string().max(1000).optional(),
        })
        .refine((data) => data.endDate >= data.startDate, {
          message: "End date must be on or after start date",
          path: ["endDate"],
        })
    )
    .min(1, "At least one slot is required")
    .max(100, "Maximum 100 slots per request"),
});

// =============================================================================
// UPDATE SCHEMAS
// =============================================================================

/**
 * Schema for updating an availability slot
 */
export const updateSlotSchema = z
  .object({
    id: z.string().cuid(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    availabilityType: availabilityTypeSchema.optional(),
    title: z.string().max(200).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    }
  );

// =============================================================================
// DELETE SCHEMAS
// =============================================================================

/**
 * Schema for deleting a single slot
 */
export const deleteSlotSchema = z.object({
  id: z.string().cuid(),
});

/**
 * Schema for bulk deleting slots in a date range
 */
export const bulkDeleteSlotsSchema = z
  .object({
    reviewerProfileId: z.string().cuid(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    types: z.array(availabilityTypeSchema).optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

// =============================================================================
// QUERY SCHEMAS
// =============================================================================

/**
 * Schema for getting availability for a single reviewer
 */
export const getAvailabilitySchema = z
  .object({
    reviewerProfileId: z.string().cuid(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    types: z.array(availabilityTypeSchema).optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

/**
 * Schema for getting availability by month
 */
export const getByMonthSchema = z.object({
  reviewerProfileId: z.string().cuid(),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(0).max(11), // 0-indexed month
});

/**
 * Schema for getting team availability
 */
export const getTeamAvailabilitySchema = z
  .object({
    reviewerProfileIds: z.array(z.string().cuid()).min(1).max(20),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

/**
 * Schema for finding common availability dates
 */
export const findCommonAvailabilitySchema = z
  .object({
    reviewerProfileIds: z.array(z.string().cuid()).min(2).max(20),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    minDays: z.number().int().min(1).max(90).default(5),
    requiredType: availabilityTypeSchema.default("AVAILABLE"),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

/**
 * Schema for getting availability stats
 */
export const getStatsSchema = z
  .object({
    reviewerProfileId: z.string().cuid(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    daysAhead: z.number().int().min(1).max(365).default(90),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    }
  );

// =============================================================================
// SYSTEM OPERATION SCHEMAS
// =============================================================================

/**
 * Schema for blocking dates for a review assignment
 */
export const blockForReviewSchema = z
  .object({
    reviewerProfileId: z.string().cuid(),
    reviewId: z.string().cuid(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

/**
 * Schema for unblocking dates when removed from a review
 */
export const unblockForReviewSchema = z.object({
  reviewerProfileId: z.string().cuid(),
  reviewId: z.string().cuid(),
});

// =============================================================================
// QUICK ACTION SCHEMAS
// =============================================================================

/**
 * Schema for marking a period as available
 */
export const markPeriodAvailableSchema = z
  .object({
    reviewerProfileId: z.string().cuid(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    clearExisting: z.boolean().default(false), // Whether to remove existing slots first
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

/**
 * Schema for marking next N months as available
 */
export const markNextMonthsAvailableSchema = z.object({
  reviewerProfileId: z.string().cuid(),
  months: z.number().int().min(1).max(12).default(3),
  clearExisting: z.boolean().default(false),
});

/**
 * Schema for copying availability from another month
 */
export const copyFromMonthSchema = z.object({
  reviewerProfileId: z.string().cuid(),
  sourceYear: z.number().int().min(2020).max(2100),
  sourceMonth: z.number().int().min(0).max(11),
  targetYear: z.number().int().min(2020).max(2100),
  targetMonth: z.number().int().min(0).max(11),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreateSlotInput = z.infer<typeof createSlotSchema>;
export type UpdateSlotInput = z.infer<typeof updateSlotSchema>;
export type DeleteSlotInput = z.infer<typeof deleteSlotSchema>;
export type BulkCreateSlotsInput = z.infer<typeof bulkCreateSlotsSchema>;
export type BulkDeleteSlotsInput = z.infer<typeof bulkDeleteSlotsSchema>;
export type GetAvailabilityInput = z.infer<typeof getAvailabilitySchema>;
export type GetByMonthInput = z.infer<typeof getByMonthSchema>;
export type GetTeamAvailabilityInput = z.infer<typeof getTeamAvailabilitySchema>;
export type FindCommonAvailabilityInput = z.infer<typeof findCommonAvailabilitySchema>;
export type GetStatsInput = z.infer<typeof getStatsSchema>;
export type BlockForReviewInput = z.infer<typeof blockForReviewSchema>;
export type UnblockForReviewInput = z.infer<typeof unblockForReviewSchema>;
export type MarkPeriodAvailableInput = z.infer<typeof markPeriodAvailableSchema>;
export type MarkNextMonthsAvailableInput = z.infer<typeof markNextMonthsAvailableSchema>;
export type CopyFromMonthInput = z.infer<typeof copyFromMonthSchema>;
