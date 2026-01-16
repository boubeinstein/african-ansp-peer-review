"use client";

/**
 * Availability Summary Component
 *
 * Quick view showing availability statistics for a date range.
 * Useful for assignment matching decisions.
 */

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, CalendarClock, CalendarX, Calendar } from "lucide-react";
import type { AvailabilitySlot, AvailabilitySummaryData } from "@/types/reviewer";
import type { AvailabilityType } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface AvailabilitySummaryProps {
  availabilitySlots: AvailabilitySlot[];
  dateRange: { start: Date; end: Date };
  compact?: boolean;
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function getDaysBetween(start: Date, end: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round(Math.abs((e.getTime() - s.getTime()) / oneDay)) + 1;
}

function calculateSummary(
  slots: AvailabilitySlot[],
  dateRange: { start: Date; end: Date }
): AvailabilitySummaryData {
  const totalDays = getDaysBetween(dateRange.start, dateRange.end);

  // Create a map of each day to its availability type
  const dayAvailability = new Map<string, AvailabilityType>();

  // Initialize all days as unavailable (no entry = unavailable)
  const currentDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);

  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split("T")[0];
    dayAvailability.set(dateKey, "UNAVAILABLE");
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Apply slots (later slots override earlier ones)
  for (const slot of slots) {
    const slotStart = new Date(slot.startDate);
    const slotEnd = new Date(slot.endDate);

    const iterDate = new Date(Math.max(slotStart.getTime(), dateRange.start.getTime()));
    const iterEnd = new Date(Math.min(slotEnd.getTime(), dateRange.end.getTime()));

    while (iterDate <= iterEnd) {
      const dateKey = iterDate.toISOString().split("T")[0];
      if (dayAvailability.has(dateKey)) {
        dayAvailability.set(dateKey, slot.availabilityType);
      }
      iterDate.setDate(iterDate.getDate() + 1);
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

  const availabilityPercentage = totalDays > 0
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

function getAvailabilityBadgeVariant(percentage: number): "default" | "secondary" | "destructive" {
  if (percentage >= 80) return "default";
  if (percentage >= 50) return "secondary";
  return "destructive";
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AvailabilitySummary({
  availabilitySlots,
  dateRange,
  compact = false,
  className,
}: AvailabilitySummaryProps) {
  const t = useTranslations("reviewer.availability");

  const summary = useMemo(
    () => calculateSummary(availabilitySlots, dateRange),
    [availabilitySlots, dateRange]
  );

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="flex items-center gap-1.5">
          <CalendarCheck className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">{summary.availableDays}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarClock className="h-4 w-4 text-yellow-600" />
          <span className="text-sm font-medium">{summary.tentativeDays}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarX className="h-4 w-4 text-red-600" />
          <span className="text-sm font-medium">{summary.unavailableDays}</span>
        </div>
        <Badge variant={getAvailabilityBadgeVariant(summary.availabilityPercentage)}>
          {summary.availabilityPercentage}%
        </Badge>
      </div>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {t("summary.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Availability Percentage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("summary.percentage")}</span>
            <Badge variant={getAvailabilityBadgeVariant(summary.availabilityPercentage)}>
              {summary.availabilityPercentage}%
            </Badge>
          </div>
          <Progress value={summary.availabilityPercentage} className="h-2" />
        </div>

        {/* Day Counts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950">
            <CalendarCheck className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                {summary.availableDays}
              </p>
              <p className="text-xs text-green-600 dark:text-green-500">
                {t("summary.available")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950">
            <CalendarClock className="h-4 w-4 text-yellow-600" />
            <div>
              <p className="text-lg font-semibold text-yellow-700 dark:text-yellow-400">
                {summary.tentativeDays}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-500">
                {t("summary.tentative")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950">
            <CalendarX className="h-4 w-4 text-red-600" />
            <div>
              <p className="text-lg font-semibold text-red-700 dark:text-red-400">
                {summary.unavailableDays}
              </p>
              <p className="text-xs text-red-600 dark:text-red-500">
                {t("summary.unavailable")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
            <Calendar className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                {summary.totalDays}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-500">
                {t("summary.totalDays")}
              </p>
            </div>
          </div>
        </div>

        {/* On Assignment Warning */}
        {summary.onAssignmentDays > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">
              {summary.onAssignmentDays} {t("summary.onAssignment")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AvailabilitySummary;
