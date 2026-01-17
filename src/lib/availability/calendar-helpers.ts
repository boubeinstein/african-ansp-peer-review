/**
 * Availability Calendar System - Calendar Helpers
 *
 * Helper functions for generating calendar views
 * and date formatting utilities.
 *
 * @module lib/availability/calendar-helpers
 */

import type { AvailabilitySlot, CalendarDay, CalendarWeek, CalendarMonth } from "./types";
import { startOfDay, isSameDay, isDateInRange, getAvailabilityForDate } from "./utils";

// =============================================================================
// CALENDAR GENERATION
// =============================================================================

/**
 * Generate array of days for a month view (including padding days from prev/next month)
 * Returns 42 days (6 weeks) to ensure consistent calendar grid
 */
export function generateMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Get the day of week for the first day (0 = Sunday)
  const startDayOfWeek = firstDayOfMonth.getDay();

  // Add days from previous month to fill the first week
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push(date);
  }

  // Add all days of current month
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    days.push(new Date(year, month, day));
  }

  // Add days from next month to complete the grid (6 weeks = 42 days)
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

/**
 * Generate array of days for a week view
 */
export function generateWeekDays(date: Date): Date[] {
  const days: Date[] = [];
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay()); // Sunday

  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }

  return days;
}

/**
 * Generate a full CalendarMonth structure with availability data
 */
export function generateCalendarMonth(
  year: number,
  month: number,
  slots: AvailabilitySlot[]
): CalendarMonth {
  const today = startOfDay(new Date());
  const days = generateMonthDays(year, month);

  const weeks: CalendarWeek[] = [];
  let currentWeek: CalendarDay[] = [];

  for (let i = 0; i < days.length; i++) {
    const date = days[i];
    const daySlots = slots.filter((slot) =>
      isDateInRange(date, { start: slot.startDate, end: slot.endDate })
    );

    const calendarDay: CalendarDay = {
      date,
      dayOfMonth: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday: isSameDay(date, today),
      isPast: startOfDay(date) < today,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      slots: daySlots,
      primaryType: getAvailabilityForDate(date, slots),
    };

    currentWeek.push(calendarDay);

    if (currentWeek.length === 7) {
      weeks.push({
        weekNumber: getWeekNumber(currentWeek[0].date),
        days: currentWeek,
      });
      currentWeek = [];
    }
  }

  return {
    year,
    month,
    weeks,
    totalDays: new Date(year, month + 1, 0).getDate(),
  };
}

// =============================================================================
// WEEK HELPERS
// =============================================================================

/**
 * Get ISO week number for a date
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get the start of the week (Sunday) for a given date
 */
export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return startOfDay(d);
}

/**
 * Get the end of the week (Saturday) for a given date
 */
export function getEndOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + (6 - d.getDay()));
  return startOfDay(d);
}

// =============================================================================
// DATE CHECKS
// =============================================================================

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date): boolean {
  return startOfDay(date) < startOfDay(new Date());
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date): boolean {
  return startOfDay(date) > startOfDay(new Date());
}

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// =============================================================================
// MONTH NAVIGATION
// =============================================================================

/**
 * Get the previous month's year and month
 */
export function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 0) {
    return { year: year - 1, month: 11 };
  }
  return { year, month: month - 1 };
}

/**
 * Get the next month's year and month
 */
export function getNextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 11) {
    return { year: year + 1, month: 0 };
  }
  return { year, month: month + 1 };
}

/**
 * Get the first day of a month
 */
export function getFirstOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

/**
 * Get the last day of a month
 */
export function getLastOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Format a date range for display
 */
export function formatDateRange(
  start: Date,
  end: Date,
  locale: string = "en"
): string {
  const startStr = start.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });

  const endStr = end.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Same day
  if (isSameDay(start, end)) {
    return start.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // Same month and year
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString(locale, { month: "short", day: "numeric" })} - ${end.getDate()}, ${end.getFullYear()}`;
  }

  // Different months
  return `${startStr} - ${endStr}`;
}

/**
 * Format a month and year for display
 */
export function formatMonthYear(year: number, month: number, locale: string = "en"): string {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

/**
 * Format a date relative to today
 */
export function formatRelativeDate(date: Date, locale: string = "en"): string {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (diffDays === 0) return locale === "fr" ? "Aujourd'hui" : "Today";
  if (diffDays === 1) return locale === "fr" ? "Demain" : "Tomorrow";
  if (diffDays === -1) return locale === "fr" ? "Hier" : "Yesterday";
  if (diffDays > 0 && diffDays < 7) {
    return date.toLocaleDateString(locale, { weekday: "long" });
  }

  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: diffDays > 365 || diffDays < -365 ? "numeric" : undefined,
  });
}

// =============================================================================
// RECURRENCE HELPERS (Basic implementation)
// =============================================================================

/**
 * Parse a simple recurrence pattern
 * Supports basic RRULE format subset: FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
 */
export function parseRecurrenceRule(rule: string): {
  frequency: string;
  interval: number;
  daysOfWeek?: number[];
  until?: Date;
} | null {
  if (!rule) return null;

  try {
    const parts = rule.split(";");
    const result: {
      frequency: string;
      interval: number;
      daysOfWeek?: number[];
      until?: Date;
    } = {
      frequency: "WEEKLY",
      interval: 1,
    };

    for (const part of parts) {
      const [key, value] = part.split("=");

      switch (key) {
        case "FREQ":
          result.frequency = value;
          break;
        case "INTERVAL":
          result.interval = parseInt(value, 10);
          break;
        case "BYDAY": {
          const dayMap: Record<string, number> = {
            SU: 0,
            MO: 1,
            TU: 2,
            WE: 3,
            TH: 4,
            FR: 5,
            SA: 6,
          };
          result.daysOfWeek = value
            .split(",")
            .map((d) => dayMap[d])
            .filter((d) => d !== undefined);
          break;
        }
        case "UNTIL":
          result.until = new Date(value);
          break;
      }
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * Generate dates based on a recurrence pattern
 */
export function generateRecurringDates(
  startDate: Date,
  endDate: Date,
  rule: string,
  maxOccurrences: number = 100
): Date[] {
  const parsed = parseRecurrenceRule(rule);
  if (!parsed) return [startDate];

  const dates: Date[] = [];
  const current = new Date(startDate);
  const until = parsed.until
    ? new Date(Math.min(parsed.until.getTime(), endDate.getTime()))
    : endDate;

  while (current <= until && dates.length < maxOccurrences) {
    if (parsed.frequency === "WEEKLY" && parsed.daysOfWeek) {
      // For weekly recurrence with specific days
      if (parsed.daysOfWeek.includes(current.getDay())) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    } else if (parsed.frequency === "DAILY") {
      dates.push(new Date(current));
      current.setDate(current.getDate() + parsed.interval);
    } else if (parsed.frequency === "WEEKLY") {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 7 * parsed.interval);
    } else if (parsed.frequency === "MONTHLY") {
      dates.push(new Date(current));
      current.setMonth(current.getMonth() + parsed.interval);
    } else {
      dates.push(new Date(current));
      break;
    }
  }

  return dates;
}
