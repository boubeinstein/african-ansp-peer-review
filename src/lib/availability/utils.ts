/**
 * Availability Calendar System - Utility Functions
 *
 * Helper functions for date range operations, slot merging,
 * and common availability calculations.
 *
 * @module lib/availability/utils
 */

import type { AvailabilityType } from "@prisma/client";
import type {
  AvailabilitySlot,
  DateRange,
  DateRangeWithInfo,
  AvailabilitySummary,
  TeamAvailabilityResult,
  ReviewerAvailabilityResult,
  OverlapMatrixEntry,
} from "./types";
import { AVAILABILITY_CONFIG } from "./types";

// =============================================================================
// DATE HELPERS
// =============================================================================

/**
 * Get a date with time set to midnight (start of day)
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get a date with time set to 23:59:59.999 (end of day)
 */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Get the number of days between two dates (inclusive)
 */
export function getDaysBetween(start: Date, end: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const s = startOfDay(start);
  const e = startOfDay(end);
  return Math.round(Math.abs((e.getTime() - s.getTime()) / oneDay)) + 1;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Generate an array of dates between start and end (inclusive)
 */
export function getDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = startOfDay(start);
  const endDate = startOfDay(end);

  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// =============================================================================
// RANGE OPERATIONS
// =============================================================================

/**
 * Check if two date ranges overlap
 */
export function doRangesOverlap(range1: DateRange, range2: DateRange): boolean {
  const start1 = startOfDay(range1.start);
  const end1 = startOfDay(range1.end);
  const start2 = startOfDay(range2.start);
  const end2 = startOfDay(range2.end);

  return start1 <= end2 && start2 <= end1;
}

/**
 * Check if a date falls within a range (inclusive)
 */
export function isDateInRange(date: Date, range: DateRange): boolean {
  const d = startOfDay(date);
  const start = startOfDay(range.start);
  const end = startOfDay(range.end);
  return d >= start && d <= end;
}

/**
 * Get the intersection of two date ranges, or null if they don't overlap
 */
export function getIntersection(
  range1: DateRange,
  range2: DateRange
): DateRange | null {
  if (!doRangesOverlap(range1, range2)) {
    return null;
  }

  return {
    start: new Date(Math.max(range1.start.getTime(), range2.start.getTime())),
    end: new Date(Math.min(range1.end.getTime(), range2.end.getTime())),
  };
}

/**
 * Merge an array of overlapping date ranges into non-overlapping ranges
 */
export function mergeRanges(ranges: DateRange[]): DateRange[] {
  if (ranges.length === 0) return [];

  // Sort by start date
  const sorted = [...ranges].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  const merged: DateRange[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    // Check if current overlaps or is adjacent to last
    if (current.start.getTime() <= last.end.getTime() + 24 * 60 * 60 * 1000) {
      // Extend the last range
      last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
    } else {
      // Add as new range
      merged.push({ ...current });
    }
  }

  return merged;
}

// =============================================================================
// SLOT OPERATIONS
// =============================================================================

/**
 * Get the availability type for a specific date from a list of slots
 * Later slots and higher priority types take precedence
 */
export function getAvailabilityForDate(
  date: Date,
  slots: AvailabilitySlot[]
): AvailabilityType | null {
  const matchingSlots = slots.filter((slot) =>
    isDateInRange(date, { start: slot.startDate, end: slot.endDate })
  );

  if (matchingSlots.length === 0) {
    return null;
  }

  // Sort by priority (higher priority wins) then by creation date (later wins)
  matchingSlots.sort((a, b) => {
    const priorityA = AVAILABILITY_CONFIG[a.availabilityType].priority;
    const priorityB = AVAILABILITY_CONFIG[b.availabilityType].priority;
    if (priorityA !== priorityB) {
      return priorityB - priorityA;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return matchingSlots[0].availabilityType;
}

/**
 * Merge overlapping availability slots of the same type
 */
export function mergeOverlappingSlots(
  slots: AvailabilitySlot[]
): AvailabilitySlot[] {
  if (slots.length === 0) return [];

  // Group by availability type
  const grouped = new Map<AvailabilityType, AvailabilitySlot[]>();

  for (const slot of slots) {
    const existing = grouped.get(slot.availabilityType) || [];
    existing.push(slot);
    grouped.set(slot.availabilityType, existing);
  }

  const merged: AvailabilitySlot[] = [];

  for (const typeSlots of grouped.values()) {
    // Sort by start date
    const sorted = [...typeSlots].sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime()
    );

    let current = { ...sorted[0] };

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];

      // Check if overlapping or adjacent
      if (
        next.startDate.getTime() <=
        current.endDate.getTime() + 24 * 60 * 60 * 1000
      ) {
        // Merge
        current.endDate = new Date(
          Math.max(current.endDate.getTime(), next.endDate.getTime())
        );
        // Combine notes if different
        if (next.notes && next.notes !== current.notes) {
          current.notes = current.notes
            ? `${current.notes}; ${next.notes}`
            : next.notes;
        }
      } else {
        merged.push(current);
        current = { ...next };
      }
    }

    merged.push(current);
  }

  // Sort final result by start date
  return merged.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

// =============================================================================
// SUMMARY CALCULATIONS
// =============================================================================

/**
 * Calculate availability summary for a date range
 */
export function calculateSummary(
  slots: AvailabilitySlot[],
  dateRange: DateRange
): AvailabilitySummary {
  const totalDays = getDaysBetween(dateRange.start, dateRange.end);

  // Create a map of each day to its availability type
  const dayAvailability = new Map<string, AvailabilityType>();
  const dates = getDateRange(dateRange.start, dateRange.end);

  // Default to null (no entry = no explicit availability)
  for (const date of dates) {
    const type = getAvailabilityForDate(date, slots);
    if (type) {
      dayAvailability.set(date.toISOString().split("T")[0], type);
    }
  }

  // Count days by type
  let availableDays = 0;
  let tentativeDays = 0;
  let unavailableDays = 0;
  let onAssignmentDays = 0;

  for (const type of dayAvailability.values()) {
    switch (type) {
      case "AVAILABLE":
        availableDays++;
        break;
      case "TENTATIVE":
        tentativeDays++;
        break;
      case "UNAVAILABLE":
        unavailableDays++;
        break;
      case "ON_ASSIGNMENT":
        onAssignmentDays++;
        break;
    }
  }

  // Days without explicit availability are counted as undefined
  const unspecifiedDays =
    totalDays - availableDays - tentativeDays - unavailableDays - onAssignmentDays;
  unavailableDays += unspecifiedDays; // Treat unspecified as unavailable

  const availabilityPercentage =
    totalDays > 0
      ? Math.round(((availableDays + tentativeDays * 0.5) / totalDays) * 100)
      : 0;

  return {
    totalDays,
    availableDays,
    tentativeDays,
    unavailableDays,
    onAssignmentDays,
    availabilityPercentage,
  };
}

// =============================================================================
// TEAM AVAILABILITY
// =============================================================================

/**
 * Find common availability periods for a team of reviewers
 */
export function findCommonAvailability(
  teamSlots: Map<string, AvailabilitySlot[]>,
  dateRange: DateRange,
  minDays: number = 5,
  requiredType: AvailabilityType = "AVAILABLE"
): DateRangeWithInfo[] {
  const reviewerIds = Array.from(teamSlots.keys());
  if (reviewerIds.length === 0) return [];

  const dates = getDateRange(dateRange.start, dateRange.end);
  const commonDates: Date[] = [];

  // Find dates where ALL reviewers have the required availability type
  for (const date of dates) {
    const allAvailable = reviewerIds.every((reviewerId) => {
      const slots = teamSlots.get(reviewerId) || [];
      const type = getAvailabilityForDate(date, slots);
      return type === requiredType || (requiredType === "AVAILABLE" && type === "TENTATIVE");
    });

    if (allAvailable) {
      commonDates.push(date);
    }
  }

  if (commonDates.length === 0) return [];

  // Group consecutive dates into ranges
  const ranges: DateRangeWithInfo[] = [];
  let rangeStart = commonDates[0];
  let rangeEnd = commonDates[0];

  for (let i = 1; i < commonDates.length; i++) {
    const current = commonDates[i];
    const prev = commonDates[i - 1];

    // Check if consecutive (allowing for weekend gaps if needed)
    const dayDiff =
      (current.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000);

    if (dayDiff === 1) {
      rangeEnd = current;
    } else {
      // End current range
      const daysCount = getDaysBetween(rangeStart, rangeEnd);
      if (daysCount >= minDays) {
        ranges.push({
          start: rangeStart,
          end: rangeEnd,
          daysCount,
        });
      }
      rangeStart = current;
      rangeEnd = current;
    }
  }

  // Don't forget the last range
  const lastDaysCount = getDaysBetween(rangeStart, rangeEnd);
  if (lastDaysCount >= minDays) {
    ranges.push({
      start: rangeStart,
      end: rangeEnd,
      daysCount: lastDaysCount,
    });
  }

  return ranges;
}

/**
 * Calculate team availability result with overlap matrix
 */
export function calculateTeamAvailability(
  reviewers: {
    id: string;
    name: string;
    organization: string;
    slots: AvailabilitySlot[];
  }[],
  dateRange: DateRange
): TeamAvailabilityResult {
  const teamSlots = new Map<string, AvailabilitySlot[]>();
  const reviewerResults: ReviewerAvailabilityResult[] = [];

  for (const reviewer of reviewers) {
    teamSlots.set(reviewer.id, reviewer.slots);
    reviewerResults.push({
      reviewerProfileId: reviewer.id,
      reviewerName: reviewer.name,
      organizationName: reviewer.organization,
      slots: reviewer.slots,
      summary: calculateSummary(reviewer.slots, dateRange),
    });
  }

  // Find common available dates (all reviewers)
  const commonAvailableDates = findCommonAvailability(
    teamSlots,
    dateRange,
    1, // minDays = 1 for this calculation
    "AVAILABLE"
  );

  // Find partial available dates (calculate overlap matrix)
  const dates = getDateRange(dateRange.start, dateRange.end);
  const dailyOverlap: Map<string, string[]> = new Map();

  for (const date of dates) {
    const dateKey = date.toISOString().split("T")[0];
    const availableReviewers: string[] = [];

    for (const reviewer of reviewers) {
      const type = getAvailabilityForDate(date, reviewer.slots);
      if (type === "AVAILABLE" || type === "TENTATIVE") {
        availableReviewers.push(reviewer.id);
      }
    }

    if (availableReviewers.length > 0 && availableReviewers.length < reviewers.length) {
      dailyOverlap.set(dateKey, availableReviewers);
    }
  }

  // Group consecutive days with same overlap into ranges
  const partialAvailableDates: DateRangeWithInfo[] = [];
  const overlapMatrix: OverlapMatrixEntry[] = [];

  // Simple grouping: just report dates where some (but not all) are available
  let currentRange: { start: Date; end: Date; reviewers: string[] } | null = null;

  for (const date of dates) {
    const dateKey = date.toISOString().split("T")[0];
    const availableReviewers = dailyOverlap.get(dateKey);

    if (availableReviewers) {
      if (
        currentRange &&
        JSON.stringify(availableReviewers.sort()) ===
          JSON.stringify(currentRange.reviewers.sort()) &&
        getDaysBetween(currentRange.end, date) === 2
      ) {
        currentRange.end = date;
      } else {
        if (currentRange) {
          const daysCount = getDaysBetween(currentRange.start, currentRange.end);
          partialAvailableDates.push({
            start: currentRange.start,
            end: currentRange.end,
            daysCount,
            label: `${currentRange.reviewers.length}/${reviewers.length} available`,
          });
          overlapMatrix.push({
            dateRange: { start: currentRange.start, end: currentRange.end },
            availableReviewerIds: currentRange.reviewers,
            availableCount: currentRange.reviewers.length,
            totalReviewers: reviewers.length,
            isFullOverlap: false,
          });
        }
        currentRange = {
          start: date,
          end: date,
          reviewers: availableReviewers,
        };
      }
    } else if (currentRange) {
      const daysCount = getDaysBetween(currentRange.start, currentRange.end);
      partialAvailableDates.push({
        start: currentRange.start,
        end: currentRange.end,
        daysCount,
        label: `${currentRange.reviewers.length}/${reviewers.length} available`,
      });
      overlapMatrix.push({
        dateRange: { start: currentRange.start, end: currentRange.end },
        availableReviewerIds: currentRange.reviewers,
        availableCount: currentRange.reviewers.length,
        totalReviewers: reviewers.length,
        isFullOverlap: false,
      });
      currentRange = null;
    }
  }

  // Handle last range
  if (currentRange) {
    const daysCount = getDaysBetween(currentRange.start, currentRange.end);
    partialAvailableDates.push({
      start: currentRange.start,
      end: currentRange.end,
      daysCount,
      label: `${currentRange.reviewers.length}/${reviewers.length} available`,
    });
    overlapMatrix.push({
      dateRange: { start: currentRange.start, end: currentRange.end },
      availableReviewerIds: currentRange.reviewers,
      availableCount: currentRange.reviewers.length,
      totalReviewers: reviewers.length,
      isFullOverlap: false,
    });
  }

  // Add full overlap entries
  for (const range of commonAvailableDates) {
    overlapMatrix.push({
      dateRange: { start: range.start, end: range.end },
      availableReviewerIds: reviewers.map((r) => r.id),
      availableCount: reviewers.length,
      totalReviewers: reviewers.length,
      isFullOverlap: true,
    });
  }

  // Sort overlap matrix by date
  overlapMatrix.sort(
    (a, b) => a.dateRange.start.getTime() - b.dateRange.start.getTime()
  );

  return {
    reviewers: reviewerResults,
    commonAvailableDates,
    partialAvailableDates,
    overlapMatrix,
  };
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Check if a slot conflicts with existing ON_ASSIGNMENT slots
 */
export function hasAssignmentConflict(
  newSlot: { startDate: Date; endDate: Date },
  existingSlots: AvailabilitySlot[]
): boolean {
  const assignmentSlots = existingSlots.filter(
    (s) => s.availabilityType === "ON_ASSIGNMENT"
  );

  for (const slot of assignmentSlots) {
    if (
      doRangesOverlap(
        { start: newSlot.startDate, end: newSlot.endDate },
        { start: slot.startDate, end: slot.endDate }
      )
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a reviewer is available for a date range
 */
export function isAvailableForPeriod(
  slots: AvailabilitySlot[],
  dateRange: DateRange,
  acceptTentative: boolean = false
): boolean {
  const dates = getDateRange(dateRange.start, dateRange.end);

  for (const date of dates) {
    const type = getAvailabilityForDate(date, slots);
    if (type !== "AVAILABLE" && (!acceptTentative || type !== "TENTATIVE")) {
      return false;
    }
  }

  return true;
}
