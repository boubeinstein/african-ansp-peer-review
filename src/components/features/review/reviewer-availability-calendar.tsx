"use client";

/**
 * Reviewer Availability Calendar Component
 *
 * Mini calendar showing reviewer availability for a selected period.
 * Features:
 * - Color coding: green (available), red (unavailable), yellow (tentative), blue (on review)
 * - Tooltip showing reason/notes
 * - Can be used inline or in a popover
 */

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  addMonths,
  subMonths,
} from "date-fns";
import { fr, enUS } from "date-fns/locale";

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Icons
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Info,
} from "lucide-react";

import type { AvailabilityType } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

interface AvailabilitySlot {
  id: string;
  startDate: Date | string;
  endDate: Date | string;
  availabilityType: AvailabilityType;
  notes?: string | null;
  title?: string | null;
}

export interface ReviewerAvailabilityCalendarProps {
  reviewerProfileId: string;
  reviewerName?: string;
  /** Review period start date */
  reviewStartDate?: Date | string;
  /** Review period end date */
  reviewEndDate?: Date | string;
  /** Pre-loaded availability slots (optional - will fetch if not provided) */
  availabilitySlots?: AvailabilitySlot[];
  /** Compact mode for inline display */
  compact?: boolean;
  className?: string;
}

export interface AvailabilityIndicatorProps {
  reviewerProfileId: string;
  reviewStartDate?: Date | string;
  reviewEndDate?: Date | string;
  /** Pre-loaded availability slots (optional) */
  availabilitySlots?: AvailabilitySlot[];
  /** Show as badge only (no popover) */
  badgeOnly?: boolean;
  className?: string;
}

interface DayAvailability {
  date: Date;
  type: AvailabilityType | "UNKNOWN";
  slots: AvailabilitySlot[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const AVAILABILITY_COLORS: Record<AvailabilityType | "UNKNOWN", string> = {
  AVAILABLE: "bg-green-500",
  UNAVAILABLE: "bg-red-500",
  TENTATIVE: "bg-yellow-500",
  ON_ASSIGNMENT: "bg-blue-500",
  UNKNOWN: "bg-gray-300",
};

const AVAILABILITY_BG_COLORS: Record<AvailabilityType | "UNKNOWN", string> = {
  AVAILABLE: "bg-green-100 text-green-800 hover:bg-green-200",
  UNAVAILABLE: "bg-red-100 text-red-800 hover:bg-red-200",
  TENTATIVE: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  ON_ASSIGNMENT: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  UNKNOWN: "bg-gray-100 text-gray-600 hover:bg-gray-200",
};

const AVAILABILITY_ICONS: Record<AvailabilityType | "UNKNOWN", typeof CheckCircle2> = {
  AVAILABLE: CheckCircle2,
  UNAVAILABLE: XCircle,
  TENTATIVE: AlertCircle,
  ON_ASSIGNMENT: Clock,
  UNKNOWN: Info,
};

// =============================================================================
// HELPERS
// =============================================================================

function toDate(date: Date | string): Date {
  return date instanceof Date ? date : new Date(date);
}

function getDayAvailability(
  date: Date,
  slots: AvailabilitySlot[]
): DayAvailability {
  const matchingSlots = slots.filter((slot) => {
    const start = toDate(slot.startDate);
    const end = toDate(slot.endDate);
    return isWithinInterval(date, { start, end });
  });

  // Priority: UNAVAILABLE > ON_ASSIGNMENT > TENTATIVE > AVAILABLE > UNKNOWN
  let type: AvailabilityType | "UNKNOWN" = "UNKNOWN";
  if (matchingSlots.length > 0) {
    if (matchingSlots.some((s) => s.availabilityType === "UNAVAILABLE")) {
      type = "UNAVAILABLE";
    } else if (matchingSlots.some((s) => s.availabilityType === "ON_ASSIGNMENT")) {
      type = "ON_ASSIGNMENT";
    } else if (matchingSlots.some((s) => s.availabilityType === "TENTATIVE")) {
      type = "TENTATIVE";
    } else if (matchingSlots.some((s) => s.availabilityType === "AVAILABLE")) {
      type = "AVAILABLE";
    }
  }

  return { date, type, slots: matchingSlots };
}

function calculateAvailabilityCoverage(
  slots: AvailabilitySlot[],
  startDate: Date,
  endDate: Date
): { coverage: number; availableDays: number; totalDays: number } {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const totalDays = days.length;

  const availableDays = days.filter((day) => {
    const dayAvail = getDayAvailability(day, slots);
    return dayAvail.type === "AVAILABLE" || dayAvail.type === "TENTATIVE";
  }).length;

  return {
    coverage: totalDays > 0 ? availableDays / totalDays : 0,
    availableDays,
    totalDays,
  };
}

// =============================================================================
// MINI CALENDAR COMPONENT
// =============================================================================

function MiniCalendar({
  currentMonth,
  slots,
  reviewStartDate,
  reviewEndDate,
  locale,
  t,
}: {
  currentMonth: Date;
  slots: AvailabilitySlot[];
  reviewStartDate?: Date;
  reviewEndDate?: Date;
  locale: "en" | "fr";
  t: ReturnType<typeof useTranslations>;
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const dateLocale = locale === "fr" ? fr : enUS;
  const weekDays = locale === "fr"
    ? ["L", "M", "M", "J", "V", "S", "D"]
    : ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="space-y-2">
      {/* Month header */}
      <div className="text-center font-medium capitalize">
        {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {weekDays.map((day, i) => (
          <div key={i} className="text-xs font-medium text-muted-foreground p-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const dayAvail = getDayAvailability(day, slots);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isInReviewPeriod =
            reviewStartDate &&
            reviewEndDate &&
            isWithinInterval(day, {
              start: reviewStartDate,
              end: reviewEndDate,
            });

          return (
            <TooltipProvider key={day.toISOString()} delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "relative h-7 w-7 flex items-center justify-center text-xs rounded-sm transition-colors cursor-default",
                      !isCurrentMonth && "opacity-30",
                      isInReviewPeriod && "ring-1 ring-primary ring-offset-1",
                      AVAILABILITY_BG_COLORS[dayAvail.type]
                    )}
                  >
                    {format(day, "d")}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {format(day, "EEEE, MMMM d", { locale: dateLocale })}
                    </p>
                    <p className="text-xs">
                      {t(`availability.types.${dayAvail.type}`)}
                    </p>
                    {dayAvail.slots.map((slot) =>
                      slot.notes ? (
                        <p key={slot.id} className="text-xs text-muted-foreground">
                          {slot.notes}
                        </p>
                      ) : null
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN CALENDAR COMPONENT
// =============================================================================

export function ReviewerAvailabilityCalendar({
  reviewerProfileId,
  reviewerName,
  reviewStartDate,
  reviewEndDate,
  availabilitySlots: preloadedSlots,
  compact = false,
  className,
}: ReviewerAvailabilityCalendarProps) {
  const t = useTranslations("reviewer");
  const locale = useLocale() as "en" | "fr";

  // Determine initial month based on review period or current date
  const initialMonth = reviewStartDate
    ? startOfMonth(toDate(reviewStartDate))
    : startOfMonth(new Date());

  const [currentMonth, setCurrentMonth] = useState(initialMonth);

  // Fetch availability if not preloaded
  const { data: fetchedSlots, isLoading } = trpc.reviewer.getAvailability.useQuery(
    {
      reviewerId: reviewerProfileId,
      startDate: reviewStartDate ? toDate(reviewStartDate) : subMonths(new Date(), 1),
      endDate: reviewEndDate ? toDate(reviewEndDate) : addMonths(new Date(), 3),
    },
    {
      enabled: !preloadedSlots && !!reviewerProfileId,
    }
  );

  const slots = preloadedSlots ?? fetchedSlots ?? [];

  // Calculate coverage for review period
  const coverage = useMemo(() => {
    if (!reviewStartDate || !reviewEndDate) return null;
    return calculateAvailabilityCoverage(
      slots,
      toDate(reviewStartDate),
      toDate(reviewEndDate)
    );
  }, [slots, reviewStartDate, reviewEndDate]);

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {isLoading ? (
          <Skeleton className="h-[180px] w-full" />
        ) : (
          <MiniCalendar
            currentMonth={currentMonth}
            slots={slots}
            reviewStartDate={reviewStartDate ? toDate(reviewStartDate) : undefined}
            reviewEndDate={reviewEndDate ? toDate(reviewEndDate) : undefined}
            locale={locale}
            t={t}
          />
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            {reviewerName
              ? t("availability.calendarTitle", { name: reviewerName })
              : t("availability.calendar")}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : (
          <>
            <MiniCalendar
              currentMonth={currentMonth}
              slots={slots}
              reviewStartDate={reviewStartDate ? toDate(reviewStartDate) : undefined}
              reviewEndDate={reviewEndDate ? toDate(reviewEndDate) : undefined}
              locale={locale}
              t={t}
            />

            {/* Legend */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {(["AVAILABLE", "TENTATIVE", "UNAVAILABLE", "ON_ASSIGNMENT"] as const).map(
                (type) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "h-3 w-3 rounded-sm",
                        AVAILABILITY_COLORS[type]
                      )}
                    />
                    <span className="text-xs text-muted-foreground">
                      {t(`availability.types.${type}`)}
                    </span>
                  </div>
                )
              )}
            </div>

            {/* Coverage Summary */}
            {coverage && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("availability.reviewPeriodCoverage")}
                  </span>
                  <span
                    className={cn(
                      "font-medium",
                      coverage.coverage >= 0.8
                        ? "text-green-600"
                        : coverage.coverage >= 0.5
                        ? "text-yellow-600"
                        : "text-red-600"
                    )}
                  >
                    {Math.round(coverage.coverage * 100)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("availability.daysAvailable", {
                    available: coverage.availableDays,
                    total: coverage.totalDays,
                  })}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// AVAILABILITY INDICATOR COMPONENT (for inline use)
// =============================================================================

export function AvailabilityIndicator({
  reviewerProfileId,
  reviewStartDate,
  reviewEndDate,
  availabilitySlots: preloadedSlots,
  badgeOnly = false,
  className,
}: AvailabilityIndicatorProps) {
  const t = useTranslations("reviewer.availability");
  const locale = useLocale() as "en" | "fr";

  // Fetch availability if not preloaded
  const { data: fetchedSlots, isLoading } = trpc.reviewer.getAvailability.useQuery(
    {
      reviewerId: reviewerProfileId,
      startDate: reviewStartDate ? toDate(reviewStartDate) : undefined,
      endDate: reviewEndDate ? toDate(reviewEndDate) : undefined,
    },
    {
      enabled: !preloadedSlots && !!reviewerProfileId && !!reviewStartDate && !!reviewEndDate,
    }
  );

  const slots = preloadedSlots ?? fetchedSlots ?? [];

  // Calculate coverage
  const coverage = useMemo(() => {
    if (!reviewStartDate || !reviewEndDate) return null;
    return calculateAvailabilityCoverage(
      slots,
      toDate(reviewStartDate),
      toDate(reviewEndDate)
    );
  }, [slots, reviewStartDate, reviewEndDate]);

  if (isLoading) {
    return <Skeleton className="h-5 w-16" />;
  }

  if (!coverage) {
    return null;
  }

  const Icon =
    coverage.coverage >= 0.8
      ? CheckCircle2
      : coverage.coverage >= 0.5
      ? AlertCircle
      : XCircle;

  const colorClass =
    coverage.coverage >= 0.8
      ? "text-green-600 border-green-300"
      : coverage.coverage >= 0.5
      ? "text-yellow-600 border-yellow-300"
      : "text-red-600 border-red-300";

  const badge = (
    <Badge
      variant="outline"
      className={cn("gap-1 text-xs", colorClass, className)}
    >
      <Icon className="h-3 w-3" />
      {Math.round(coverage.coverage * 100)}% {t("available")}
    </Badge>
  );

  if (badgeOnly) {
    return badge;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="cursor-pointer">{badge}</button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <ReviewerAvailabilityCalendar
          reviewerProfileId={reviewerProfileId}
          reviewStartDate={reviewStartDate}
          reviewEndDate={reviewEndDate}
          availabilitySlots={slots}
          className="border-0 shadow-none"
        />
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// AVAILABILITY FILTER HOOK
// =============================================================================

export function useAvailabilityFilter(
  reviewers: Array<{ id: string; availabilitySlots?: AvailabilitySlot[] }>,
  reviewStartDate?: Date | string,
  reviewEndDate?: Date | string,
  minCoverage: number = 0.5
): {
  availableReviewers: Array<{ id: string; availabilitySlots?: AvailabilitySlot[] }>;
  unavailableReviewers: Array<{ id: string; availabilitySlots?: AvailabilitySlot[] }>;
  getCoverage: (reviewerId: string) => number | null;
} {
  return useMemo(() => {
    if (!reviewStartDate || !reviewEndDate) {
      return {
        availableReviewers: reviewers,
        unavailableReviewers: [],
        getCoverage: () => null,
      };
    }

    const coverageMap = new Map<string, number>();
    const start = toDate(reviewStartDate);
    const end = toDate(reviewEndDate);

    reviewers.forEach((reviewer) => {
      const slots = reviewer.availabilitySlots ?? [];
      const { coverage } = calculateAvailabilityCoverage(slots, start, end);
      coverageMap.set(reviewer.id, coverage);
    });

    const availableReviewers = reviewers.filter((r) => {
      const coverage = coverageMap.get(r.id) ?? 0;
      return coverage >= minCoverage;
    });

    const unavailableReviewers = reviewers.filter((r) => {
      const coverage = coverageMap.get(r.id) ?? 0;
      return coverage < minCoverage;
    });

    return {
      availableReviewers,
      unavailableReviewers,
      getCoverage: (reviewerId: string) => coverageMap.get(reviewerId) ?? null,
    };
  }, [reviewers, reviewStartDate, reviewEndDate, minCoverage]);
}

export default ReviewerAvailabilityCalendar;
