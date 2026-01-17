"use client";

/**
 * Availability Summary Card Component
 *
 * Compact card showing availability summary for a reviewer.
 * Useful on reviewer cards/lists to show quick availability status.
 */

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Calendar,
  TrendingUp,
  Info,
} from "lucide-react";
import type { ReviewerAvailability } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface AvailabilitySummaryCardProps {
  slots: ReviewerAvailability[];
  daysAhead?: number;
  showNextAvailable?: boolean;
  variant?: "default" | "compact" | "inline" | "badge";
  className?: string;
}

interface SummaryData {
  totalDays: number;
  availableDays: number;
  tentativeDays: number;
  unavailableDays: number;
  onAssignmentDays: number;
  availabilityPercentage: number;
  nextAvailablePeriod: { start: Date; end: Date } | null;
}

// =============================================================================
// HELPERS
// =============================================================================

function calculateSummary(
  slots: ReviewerAvailability[],
  daysAhead: number
): SummaryData {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysAhead);

  // Count days by type
  let availableDays = 0;
  let tentativeDays = 0;
  let unavailableDays = 0;
  let onAssignmentDays = 0;

  const current = new Date(today);
  let nextAvailableStart: Date | null = null;
  let nextAvailableEnd: Date | null = null;
  let inAvailablePeriod = false;

  while (current <= endDate) {
    // Find slot for this date
    const slot = slots.find((s) => {
      const start = new Date(s.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(s.endDate);
      end.setHours(23, 59, 59, 999);
      return current >= start && current <= end;
    });

    if (slot) {
      switch (slot.availabilityType) {
        case "AVAILABLE":
          availableDays++;
          if (!nextAvailableStart && !inAvailablePeriod) {
            nextAvailableStart = new Date(current);
            inAvailablePeriod = true;
          }
          if (inAvailablePeriod) {
            nextAvailableEnd = new Date(current);
          }
          break;
        case "TENTATIVE":
          tentativeDays++;
          if (inAvailablePeriod) {
            // End the available period on tentative
          }
          break;
        case "UNAVAILABLE":
          unavailableDays++;
          if (inAvailablePeriod) {
            inAvailablePeriod = false;
          }
          break;
        case "ON_ASSIGNMENT":
          onAssignmentDays++;
          if (inAvailablePeriod) {
            inAvailablePeriod = false;
          }
          break;
      }
    } else {
      unavailableDays++; // No slot = unavailable
      if (inAvailablePeriod) {
        inAvailablePeriod = false;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  const availabilityPercentage =
    daysAhead > 0
      ? Math.round(((availableDays + tentativeDays * 0.5) / daysAhead) * 100)
      : 0;

  return {
    totalDays: daysAhead,
    availableDays,
    tentativeDays,
    unavailableDays,
    onAssignmentDays,
    availabilityPercentage,
    nextAvailablePeriod:
      nextAvailableStart && nextAvailableEnd
        ? { start: nextAvailableStart, end: nextAvailableEnd }
        : null,
  };
}

function getAvailabilityBadgeVariant(
  percentage: number
): "default" | "secondary" | "destructive" {
  if (percentage >= 70) return "default";
  if (percentage >= 40) return "secondary";
  return "destructive";
}

function getAvailabilityStatus(
  percentage: number,
  t: (key: string) => string
): { label: string; color: string } {
  if (percentage >= 70) {
    return { label: t("status.highlyAvailable"), color: "text-green-600" };
  }
  if (percentage >= 40) {
    return { label: t("status.partiallyAvailable"), color: "text-yellow-600" };
  }
  return { label: t("status.limitedAvailability"), color: "text-red-600" };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AvailabilitySummaryCard({
  slots,
  daysAhead = 90,
  showNextAvailable = true,
  variant = "default",
  className,
}: AvailabilitySummaryCardProps) {
  const t = useTranslations("reviewer.availability");
  const locale = useLocale() as "en" | "fr";

  const summary = useMemo(
    () => calculateSummary(slots, daysAhead),
    [slots, daysAhead]
  );

  const status = useMemo(
    () => getAvailabilityStatus(summary.availabilityPercentage, t),
    [summary.availabilityPercentage, t]
  );

  // Badge variant - just show a colored badge
  if (variant === "badge") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={getAvailabilityBadgeVariant(summary.availabilityPercentage)}
              className={cn("gap-1", className)}
            >
              <Calendar className="h-3 w-3" />
              {summary.availabilityPercentage}%
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {t("summary.available")}: {summary.availableDays} {t("summary.days")}
            </p>
            <p>
              {t("summary.nextDays", { days: daysAhead })}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Inline variant - horizontal layout for lists
  if (variant === "inline") {
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant={getAvailabilityBadgeVariant(summary.availabilityPercentage)}
              >
                {summary.availabilityPercentage}%
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("summary.nextDays", { days: daysAhead })}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // Compact variant - smaller card
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border bg-card",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-muted">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">
                {summary.availableDays}
              </span>
              <span className="text-sm text-muted-foreground">
                / {summary.totalDays}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("summary.daysAvailable")}
            </p>
          </div>
        </div>
        <div className="ml-auto">
          <Badge variant={getAvailabilityBadgeVariant(summary.availabilityPercentage)}>
            {summary.availabilityPercentage}%
          </Badge>
        </div>
      </div>
    );
  }

  // Default variant - full card
  return (
    <Card className={cn("", className)}>
      <CardContent className="pt-4 space-y-4">
        {/* Header with percentage */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{t("summary.title")}</span>
          </div>
          <Badge variant={getAvailabilityBadgeVariant(summary.availabilityPercentage)}>
            {summary.availabilityPercentage}% {t("summary.available")}
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <Progress value={summary.availabilityPercentage} className="h-2" />
          <p className={cn("text-sm font-medium", status.color)}>{status.label}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <CalendarCheck className="h-4 w-4 text-green-600 shrink-0" />
            <span className="text-muted-foreground">{t("summary.available")}:</span>
            <span className="font-medium ml-auto">{summary.availableDays}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-yellow-600 shrink-0" />
            <span className="text-muted-foreground">{t("summary.tentative")}:</span>
            <span className="font-medium ml-auto">{summary.tentativeDays}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CalendarX className="h-4 w-4 text-red-600 shrink-0" />
            <span className="text-muted-foreground">{t("summary.unavailable")}:</span>
            <span className="font-medium ml-auto">{summary.unavailableDays}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="text-muted-foreground">{t("summary.onAssignment")}:</span>
            <span className="font-medium ml-auto">{summary.onAssignmentDays}</span>
          </div>
        </div>

        {/* Next available period */}
        {showNextAvailable && summary.nextAvailablePeriod && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{t("summary.nextAvailable")}:</span>
              <span className="font-medium">
                {summary.nextAvailablePeriod.start.toLocaleDateString(locale, {
                  month: "short",
                  day: "numeric",
                })}
                {!isSameDay(
                  summary.nextAvailablePeriod.start,
                  summary.nextAvailablePeriod.end
                ) && (
                  <>
                    {" - "}
                    {summary.nextAvailablePeriod.end.toLocaleDateString(locale, {
                      month: "short",
                      day: "numeric",
                    })}
                  </>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Period info */}
        <p className="text-xs text-muted-foreground text-center">
          {t("summary.nextDays", { days: daysAhead })}
        </p>
      </CardContent>
    </Card>
  );
}

// Helper function
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export default AvailabilitySummaryCard;
