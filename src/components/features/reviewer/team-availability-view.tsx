"use client";

/**
 * Team Availability View Component
 *
 * Horizontal timeline showing availability for multiple reviewers.
 * Used when forming review teams to find common available periods.
 */

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { AvailabilityLegend } from "./availability-legend";
import type { AvailabilityType, ReviewerAvailability } from "@prisma/client";
import { AVAILABILITY_TYPE_COLOR } from "@/lib/reviewer/labels";

// =============================================================================
// TYPES
// =============================================================================

export interface TeamMember {
  id: string;
  name: string;
  organization: string;
  slots: ReviewerAvailability[];
}

export interface TeamAvailabilityViewProps {
  members: TeamMember[];
  startDate: Date;
  endDate: Date;
  highlightRange?: { start: Date; end: Date };
  onDateRangeSelect?: (range: { start: Date; end: Date }) => void;
  className?: string;
}

interface DayData {
  date: Date;
  dateKey: string;
  isWeekend: boolean;
  isHighlighted: boolean;
  memberAvailability: Map<string, AvailabilityType | null>;
}

// =============================================================================
// HELPERS
// =============================================================================

function getDaysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  return d >= s && d <= e;
}

function getAvailabilityColor(type: AvailabilityType | null): string {
  if (!type) return "bg-gray-200 dark:bg-gray-700";
  return AVAILABILITY_TYPE_COLOR[type] || "bg-gray-200";
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TeamAvailabilityView({
  members,
  startDate,
  endDate,
  highlightRange,
  // onDateRangeSelect is reserved for future implementation
  className,
}: TeamAvailabilityViewProps) {
  const t = useTranslations("reviewer.availability");
  const locale = useLocale() as "en" | "fr";

  const [viewOffset, setViewOffset] = useState(0);
  const daysToShow = 28; // 4 weeks

  // Calculate visible date range
  const visibleStart = useMemo(() => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + viewOffset);
    return date;
  }, [startDate, viewOffset]);

  const visibleEnd = useMemo(() => {
    const date = new Date(visibleStart);
    date.setDate(date.getDate() + daysToShow - 1);
    return date > endDate ? endDate : date;
  }, [visibleStart, endDate, daysToShow]);

  // Build day data with availability for each member
  const dayData = useMemo((): DayData[] => {
    const days = getDaysBetween(visibleStart, visibleEnd);

    return days.map((date) => {
      const dateKey = date.toISOString().split("T")[0];
      const memberAvailability = new Map<string, AvailabilityType | null>();

      for (const member of members) {
        // Find matching slot for this day
        const slot = member.slots.find((s) =>
          isDateInRange(date, new Date(s.startDate), new Date(s.endDate))
        );
        memberAvailability.set(member.id, slot?.availabilityType || null);
      }

      return {
        date,
        dateKey,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isHighlighted:
          highlightRange != null &&
          isDateInRange(date, highlightRange.start, highlightRange.end),
        memberAvailability,
      };
    });
  }, [visibleStart, visibleEnd, members, highlightRange]);

  // Calculate common availability for visible period
  const commonAvailability = useMemo(() => {
    const fullyAvailable: Date[] = [];
    const partiallyAvailable: Date[] = [];

    for (const day of dayData) {
      const availableCount = Array.from(day.memberAvailability.values()).filter(
        (type) => type === "AVAILABLE" || type === "TENTATIVE"
      ).length;

      if (availableCount === members.length) {
        fullyAvailable.push(day.date);
      } else if (availableCount > 0) {
        partiallyAvailable.push(day.date);
      }
    }

    return { fullyAvailable, partiallyAvailable };
  }, [dayData, members.length]);

  // Navigation
  const canGoPrev = viewOffset > 0;
  const canGoNext = useMemo(() => {
    const maxOffset =
      Math.floor(
        (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
      ) - daysToShow;
    return viewOffset < maxOffset;
  }, [viewOffset, startDate, endDate, daysToShow]);

  const navigatePrev = () => {
    setViewOffset(Math.max(0, viewOffset - 7));
  };

  const navigateNext = () => {
    setViewOffset(viewOffset + 7);
  };

  if (members.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("team.noMembers")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("team.title")}
          </CardTitle>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {members.length} {t("team.reviewers")}
            </Badge>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={navigatePrev}
                disabled={!canGoPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[160px] text-center">
                {visibleStart.toLocaleDateString(locale, {
                  month: "short",
                  day: "numeric",
                })}{" "}
                -{" "}
                {visibleEnd.toLocaleDateString(locale, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={navigateNext}
                disabled={!canGoNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>
              {commonAvailability.fullyAvailable.length} {t("team.daysAllAvailable")}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span>
              {commonAvailability.partiallyAvailable.length} {t("team.daysPartiallyAvailable")}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Timeline header - dates */}
        <div className="flex border-b">
          <div className="w-48 shrink-0 border-r p-2 bg-muted/50">
            <span className="text-xs font-medium text-muted-foreground">
              {t("team.reviewer")}
            </span>
          </div>
          <div className="flex-1 overflow-x-auto">
            <div className="flex min-w-max">
              {dayData.map((day) => (
                <TooltipProvider key={day.dateKey}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "w-8 p-1 text-center text-xs border-r shrink-0",
                          day.isWeekend && "bg-muted/30",
                          day.isHighlighted && "bg-blue-100 dark:bg-blue-900"
                        )}
                      >
                        <div className="text-muted-foreground">
                          {day.date.toLocaleDateString(locale, { weekday: "narrow" })}
                        </div>
                        <div className="font-medium">{day.date.getDate()}</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {day.date.toLocaleDateString(locale, {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        </div>

        {/* Member rows */}
        {members.map((member) => (
          <div key={member.id} className="flex border-b last:border-b-0">
            <div className="w-48 shrink-0 border-r p-2">
              <div className="text-sm font-medium truncate" title={member.name}>
                {member.name}
              </div>
              <div
                className="text-xs text-muted-foreground truncate"
                title={member.organization}
              >
                {member.organization}
              </div>
            </div>
            <div className="flex-1 overflow-x-auto">
              <div className="flex min-w-max">
                {dayData.map((day) => {
                  const availability = day.memberAvailability.get(member.id) ?? null;
                  return (
                    <TooltipProvider key={day.dateKey}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "w-8 h-10 border-r shrink-0 flex items-center justify-center",
                              day.isHighlighted && "ring-1 ring-inset ring-blue-400"
                            )}
                          >
                            <div
                              className={cn(
                                "w-5 h-5 rounded-sm",
                                getAvailabilityColor(availability)
                              )}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-muted-foreground">
                            {day.date.toLocaleDateString(locale, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p className="mt-1">
                            {availability
                              ? t(`type.${availability}`)
                              : t("type.unspecified")}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Common availability row */}
        <div className="flex border-t-2 border-dashed bg-muted/30">
          <div className="w-48 shrink-0 border-r p-2">
            <div className="text-sm font-medium text-primary">
              {t("team.commonAvailability")}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("team.allReviewers")}
            </div>
          </div>
          <div className="flex-1 overflow-x-auto">
            <div className="flex min-w-max">
              {dayData.map((day) => {
                const availableCount = Array.from(
                  day.memberAvailability.values()
                ).filter((type) => type === "AVAILABLE" || type === "TENTATIVE")
                  .length;

                const isFullOverlap = availableCount === members.length;
                const isPartialOverlap = availableCount > 0 && !isFullOverlap;

                return (
                  <TooltipProvider key={day.dateKey}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "w-8 h-10 border-r shrink-0 flex items-center justify-center",
                            day.isHighlighted && "ring-1 ring-inset ring-blue-400"
                          )}
                        >
                          <div
                            className={cn(
                              "w-5 h-5 rounded-sm flex items-center justify-center text-xs font-medium text-white",
                              isFullOverlap && "bg-green-500",
                              isPartialOverlap && "bg-yellow-500",
                              !isFullOverlap && !isPartialOverlap && "bg-red-500"
                            )}
                          >
                            {availableCount > 0 ? availableCount : ""}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">
                          {day.date.toLocaleDateString(locale, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <p className="mt-1">
                          {availableCount} / {members.length} {t("team.available")}
                        </p>
                        {isFullOverlap && (
                          <p className="text-green-600 font-medium">
                            {t("team.allAvailable")}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="p-4 border-t bg-muted/20">
          <AvailabilityLegend
            showHighlight={highlightRange != null}
            compact
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default TeamAvailabilityView;
