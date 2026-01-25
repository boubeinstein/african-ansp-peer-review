import { format } from "date-fns";

// Review status hierarchy (order matters!)
export const STATUS_HIERARCHY = [
  "REQUESTED",
  "APPROVED",
  "PLANNING",
  "SCHEDULED",
  "IN_PROGRESS",
  "REPORT_DRAFTING",
  "REPORT_REVIEW",
  "COMPLETED",
] as const;

export type ReviewStatus = (typeof STATUS_HIERARCHY)[number] | "CANCELLED";

// =============================================================================
// DATE UTILITIES
// =============================================================================

export function parseDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function minDate(...dates: (Date | null | undefined)[]): Date | null {
  const valid = dates.filter(
    (d): d is Date => d instanceof Date && !isNaN(d.getTime())
  );
  if (valid.length === 0) return null;
  return valid.reduce((min, d) => (d < min ? d : min));
}

export function maxDate(...dates: (Date | null | undefined)[]): Date | null {
  const valid = dates.filter(
    (d): d is Date => d instanceof Date && !isNaN(d.getTime())
  );
  if (valid.length === 0) return null;
  return valid.reduce((max, d) => (d > max ? d : max));
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDateSafe(
  date: Date | null,
  formatStr = "MMMM d, yyyy"
): string | null {
  if (!date) return null;
  return format(date, formatStr);
}

// =============================================================================
// STATUS HELPERS
// =============================================================================

export function hasReachedStatus(
  currentStatus: ReviewStatus,
  targetStatus: ReviewStatus
): boolean {
  if (currentStatus === "CANCELLED") return false;
  const currentIndex = STATUS_HIERARCHY.indexOf(
    currentStatus as (typeof STATUS_HIERARCHY)[number]
  );
  const targetIndex = STATUS_HIERARCHY.indexOf(
    targetStatus as (typeof STATUS_HIERARCHY)[number]
  );
  return currentIndex >= targetIndex && currentIndex !== -1 && targetIndex !== -1;
}

export function isCurrentStatus(
  currentStatus: ReviewStatus,
  targetStatus: ReviewStatus
): boolean {
  return currentStatus === targetStatus;
}
