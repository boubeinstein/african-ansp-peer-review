/**
 * Availability Calendar System - Type Definitions
 *
 * Types for managing reviewer availability, team scheduling,
 * and common date finding for peer review assignments.
 *
 * @module lib/availability/types
 */

import type { AvailabilityType, ReviewerAvailability } from "@prisma/client";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Ordered list of availability types
 */
export const AVAILABILITY_TYPES = [
  "AVAILABLE",
  "UNAVAILABLE",
  "TENTATIVE",
  "ON_ASSIGNMENT",
] as const;

/**
 * Configuration for each availability type
 * Includes display properties and edit permissions
 */
export const AVAILABILITY_CONFIG: Record<
  AvailabilityType,
  {
    labelEn: string;
    labelFr: string;
    color: string; // Tailwind bg color class
    bgColor: string; // Lighter background for calendar cells
    textColor: string; // Text color for contrast
    canEdit: boolean; // ON_ASSIGNMENT = false (system-managed)
    priority: number; // Higher priority types override lower ones when merging
  }
> = {
  AVAILABLE: {
    labelEn: "Available",
    labelFr: "Disponible",
    color: "bg-green-500",
    bgColor: "bg-green-100 dark:bg-green-900",
    textColor: "text-green-700 dark:text-green-300",
    canEdit: true,
    priority: 1,
  },
  TENTATIVE: {
    labelEn: "Tentative",
    labelFr: "Provisoire",
    color: "bg-yellow-500",
    bgColor: "bg-yellow-100 dark:bg-yellow-900",
    textColor: "text-yellow-700 dark:text-yellow-300",
    canEdit: true,
    priority: 2,
  },
  UNAVAILABLE: {
    labelEn: "Unavailable",
    labelFr: "Indisponible",
    color: "bg-red-500",
    bgColor: "bg-red-100 dark:bg-red-900",
    textColor: "text-red-700 dark:text-red-300",
    canEdit: true,
    priority: 3,
  },
  ON_ASSIGNMENT: {
    labelEn: "On Assignment",
    labelFr: "En mission",
    color: "bg-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900",
    textColor: "text-blue-700 dark:text-blue-300",
    canEdit: false, // System-managed when reviewer is assigned to a review
    priority: 4, // Highest priority - cannot be overridden
  },
};

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Availability slot with optional relations
 */
export interface AvailabilitySlot extends Omit<ReviewerAvailability, "startDate" | "endDate"> {
  startDate: Date;
  endDate: Date;
  review?: {
    id: string;
    referenceNumber: string;
    hostOrganization?: {
      nameEn: string;
      nameFr: string;
    };
  } | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

/**
 * Simple date range
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Date range with additional metadata
 */
export interface DateRangeWithInfo extends DateRange {
  daysCount: number;
  label?: string;
}

// =============================================================================
// QUERY TYPES
// =============================================================================

/**
 * Query parameters for fetching availability
 */
export interface AvailabilityQuery {
  reviewerProfileId?: string;
  reviewerProfileIds?: string[];
  startDate: Date;
  endDate: Date;
  types?: AvailabilityType[];
  includeReview?: boolean;
}

/**
 * Query for finding common availability across team
 */
export interface CommonAvailabilityQuery {
  reviewerProfileIds: string[];
  startDate: Date;
  endDate: Date;
  minDays?: number; // Minimum consecutive days required (default: 5)
  requiredType?: AvailabilityType; // Default: AVAILABLE
}

// =============================================================================
// RESULT TYPES
// =============================================================================

/**
 * Availability for a single reviewer
 */
export interface ReviewerAvailabilityResult {
  reviewerProfileId: string;
  reviewerName: string;
  organizationName: string;
  slots: AvailabilitySlot[];
  summary: AvailabilitySummary;
}

/**
 * Summary statistics for availability
 */
export interface AvailabilitySummary {
  totalDays: number;
  availableDays: number;
  tentativeDays: number;
  unavailableDays: number;
  onAssignmentDays: number;
  availabilityPercentage: number;
}

/**
 * Result of team availability analysis
 */
export interface TeamAvailabilityResult {
  reviewers: ReviewerAvailabilityResult[];
  commonAvailableDates: DateRangeWithInfo[]; // Dates where ALL are available
  partialAvailableDates: DateRangeWithInfo[]; // Dates where SOME are available
  overlapMatrix: OverlapMatrixEntry[];
}

/**
 * Entry in the overlap matrix showing which reviewers share availability
 */
export interface OverlapMatrixEntry {
  dateRange: DateRange;
  availableReviewerIds: string[];
  availableCount: number;
  totalReviewers: number;
  isFullOverlap: boolean;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/**
 * Input for creating a single availability slot
 */
export interface CreateAvailabilityInput {
  reviewerProfileId: string;
  startDate: Date;
  endDate: Date;
  availabilityType: AvailabilityType;
  title?: string;
  notes?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
}

/**
 * Input for updating an availability slot
 */
export interface UpdateAvailabilityInput {
  id: string;
  startDate?: Date;
  endDate?: Date;
  availabilityType?: AvailabilityType;
  title?: string;
  notes?: string;
}

/**
 * Input for bulk creating availability slots
 */
export interface BulkCreateAvailabilityInput {
  reviewerProfileId: string;
  slots: Omit<CreateAvailabilityInput, "reviewerProfileId">[];
}

/**
 * Input for bulk deleting availability slots
 */
export interface BulkDeleteAvailabilityInput {
  reviewerProfileId: string;
  startDate: Date;
  endDate: Date;
  types?: AvailabilityType[]; // Only delete specific types
}

// Note: BlockForReviewInput is defined in schemas.ts via Zod inference

// =============================================================================
// CALENDAR DISPLAY TYPES
// =============================================================================

/**
 * A single day in the calendar view
 */
export interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isWeekend: boolean;
  slots: AvailabilitySlot[];
  primaryType: AvailabilityType | null; // Most relevant type for the day
}

/**
 * A week in the calendar view
 */
export interface CalendarWeek {
  weekNumber: number;
  days: CalendarDay[];
}

/**
 * A full month view
 */
export interface CalendarMonth {
  year: number;
  month: number; // 0-11
  weeks: CalendarWeek[];
  totalDays: number;
}

// =============================================================================
// RECURRENCE TYPES (Optional feature)
// =============================================================================

/**
 * Supported recurrence frequencies
 */
export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

/**
 * Parsed recurrence information
 */
export interface RecurrenceInfo {
  frequency: RecurrenceFrequency;
  interval: number; // Every N days/weeks/months/years
  daysOfWeek?: number[]; // 0-6, Sunday=0 (for WEEKLY)
  dayOfMonth?: number; // 1-31 (for MONTHLY)
  monthOfYear?: number; // 1-12 (for YEARLY)
  count?: number; // Number of occurrences
  until?: Date; // End date
  exceptions?: Date[]; // Dates to skip
}

// =============================================================================
// STATS TYPES
// =============================================================================

/**
 * Availability statistics for a reviewer
 */
export interface ReviewerAvailabilityStats {
  reviewerProfileId: string;
  period: DateRange;
  totalDays: number;
  availableDays: number;
  tentativeDays: number;
  unavailableDays: number;
  onAssignmentDays: number;
  availabilityRate: number; // 0-100
  nextAvailablePeriod: DateRange | null;
  longestAvailableStretch: DateRangeWithInfo | null;
  upcomingAssignments: {
    reviewId: string;
    referenceNumber: string;
    startDate: Date;
    endDate: Date;
  }[];
}
