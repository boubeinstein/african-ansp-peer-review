"use client";

/**
 * Availability Calendar Component
 *
 * Monthly/weekly calendar view for managing reviewer availability.
 * Supports adding, editing, and viewing availability slots.
 */

import { useState, useMemo, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
} from "lucide-react";
import { AvailabilityLegend } from "./availability-legend";
import { AvailabilitySlotDialog } from "./availability-slot-dialog";
import type {
  AvailabilitySlot,
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
} from "@/types/reviewer";
import type { AvailabilityType } from "@/types/prisma-enums";
import { AVAILABILITY_TYPE_COLOR } from "@/lib/reviewer/labels";

// =============================================================================
// TYPES
// =============================================================================

export interface AvailabilityCalendarProps {
  reviewerProfileId: string;
  availabilitySlots: AvailabilitySlot[];
  onAddSlot: (slot: CreateAvailabilityInput) => void;
  onUpdateSlot: (slot: UpdateAvailabilityInput) => void;
  onRemoveSlot: (id: string) => void;
  readOnly?: boolean;
  highlightRange?: { start: Date; end: Date };
  className?: string;
}

type ViewMode = "month" | "week";

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isHighlighted: boolean;
  slots: AvailabilitySlot[];
}

// =============================================================================
// HELPERS
// =============================================================================

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Add days from previous month to fill the first week
  const firstDayOfWeek = firstDay.getDay();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push(date);
  }

  // Add all days of current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }

  // Add days from next month to complete the last week
  const remainingDays = 7 - (days.length % 7);
  if (remainingDays < 7) {
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }

  return days;
}

function getDaysInWeek(date: Date): Date[] {
  const days: Date[] = [];
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());

  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }

  return days;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return d >= s && d <= e;
}

function getSlotColor(type: AvailabilityType): string {
  return AVAILABILITY_TYPE_COLOR[type] || "bg-gray-500";
}

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

interface DayCellProps {
  day: CalendarDay;
  viewMode: ViewMode;
  readOnly: boolean;
  onSelect: (date: Date) => void;
  onSlotClick: (slot: AvailabilitySlot) => void;
}

function DayCell({ day, viewMode, readOnly, onSelect, onSlotClick }: DayCellProps) {
  const t = useTranslations("reviewer.availability");
  const locale = useLocale() as "en" | "fr";

  const handleClick = () => {
    if (!readOnly && day.slots.length === 0) {
      onSelect(day.date);
    }
  };

  const handleSlotClick = (e: React.MouseEvent, slot: AvailabilitySlot) => {
    e.stopPropagation();
    if (!readOnly) {
      onSlotClick(slot);
    }
  };

  const isWeekView = viewMode === "week";
  const cellHeight = isWeekView ? "min-h-[120px]" : "min-h-[80px]";

  return (
    <div
      className={cn(
        "border-b border-r p-1 transition-colors",
        cellHeight,
        !day.isCurrentMonth && "bg-muted/30",
        day.isToday && "bg-blue-50 dark:bg-blue-950",
        day.isHighlighted && "ring-2 ring-inset ring-blue-400",
        !readOnly && day.slots.length === 0 && "cursor-pointer hover:bg-muted/50"
      )}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            "text-xs font-medium",
            !day.isCurrentMonth && "text-muted-foreground",
            day.isToday && "text-blue-600 font-bold"
          )}
        >
          {day.date.getDate()}
        </span>
        {!readOnly && day.slots.length === 0 && (
          <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
        )}
      </div>

      <div className="space-y-0.5">
        {day.slots.slice(0, isWeekView ? 4 : 2).map((slot) => (
          <TooltipProvider key={slot.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "w-full text-left text-xs px-1 py-0.5 rounded truncate text-white",
                    getSlotColor(slot.availabilityType),
                    !readOnly && "hover:opacity-80 cursor-pointer"
                  )}
                  onClick={(e) => handleSlotClick(e, slot)}
                >
                  {isWeekView && slot.notes ? slot.notes : ""}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div className="text-xs">
                  <p className="font-medium">{t(`type.${slot.availabilityType}`)}</p>
                  {slot.notes && <p className="text-muted-foreground">{slot.notes}</p>}
                  <p className="text-muted-foreground mt-1">
                    {new Date(slot.startDate).toLocaleDateString(locale)} -{" "}
                    {new Date(slot.endDate).toLocaleDateString(locale)}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {day.slots.length > (isWeekView ? 4 : 2) && (
          <span className="text-xs text-muted-foreground">
            +{day.slots.length - (isWeekView ? 4 : 2)} {t("more")}
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AvailabilityCalendar({
  // reviewerProfileId is available for future tRPC integration
  availabilitySlots,
  onAddSlot,
  onUpdateSlot,
  onRemoveSlot,
  readOnly = false,
  highlightRange,
  className,
}: AvailabilityCalendarProps) {
  const t = useTranslations("reviewer.availability");
  const locale = useLocale() as "en" | "fr";

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDates, setSelectedDates] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Calculate calendar days
  const calendarDays = useMemo((): CalendarDay[] => {
    const days =
      viewMode === "month"
        ? getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth())
        : getDaysInWeek(currentDate);

    const today = new Date();

    return days.map((date) => ({
      date,
      isCurrentMonth: date.getMonth() === currentDate.getMonth(),
      isToday: isSameDay(date, today),
      isHighlighted:
        highlightRange != null && isDateInRange(date, highlightRange.start, highlightRange.end),
      slots: availabilitySlots.filter((slot) =>
        isDateInRange(date, new Date(slot.startDate), new Date(slot.endDate))
      ),
    }));
  }, [currentDate, viewMode, availabilitySlots, highlightRange]);

  // Navigation
  const navigatePrevious = useCallback(() => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  }, [currentDate, viewMode]);

  const navigateNext = useCallback(() => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  }, [currentDate, viewMode]);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Handlers
  const handleDaySelect = useCallback((date: Date) => {
    setSelectedDates({ start: date, end: date });
    setSelectedSlot(null);
    setIsDialogOpen(true);
  }, []);

  const handleSlotClick = useCallback((slot: AvailabilitySlot) => {
    setSelectedSlot(slot);
    setSelectedDates(null);
    setIsDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
    setSelectedDates(null);
    setSelectedSlot(null);
  }, []);

  const handleSaveSlot = useCallback(
    (data: CreateAvailabilityInput | UpdateAvailabilityInput) => {
      if ("id" in data) {
        onUpdateSlot(data);
      } else {
        onAddSlot(data);
      }
      handleDialogClose();
    },
    [onAddSlot, onUpdateSlot, handleDialogClose]
  );

  const handleDeleteSlot = useCallback(
    (id: string) => {
      onRemoveSlot(id);
      handleDialogClose();
    },
    [onRemoveSlot, handleDialogClose]
  );

  // Week day headers
  const weekDays = useMemo(() => {
    const days = [];
    const date = new Date();
    date.setDate(date.getDate() - date.getDay());
    for (let i = 0; i < 7; i++) {
      days.push(
        date.toLocaleDateString(locale, { weekday: "short" })
      );
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [locale]);

  // Format header
  const headerText = useMemo(() => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString(locale, {
        month: "long",
        year: "numeric",
      });
    } else {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
      })} - ${endOfWeek.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    }
  }, [currentDate, viewMode, locale]);

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {t("title")}
          </CardTitle>

          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex rounded-lg border">
              <Button
                variant={viewMode === "month" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode("month")}
              >
                {t("view.month")}
              </Button>
              <Button
                variant={viewMode === "week" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode("week")}
              >
                {t("view.week")}
              </Button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={navigateToday}>
                {t("navigation.today")}
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigatePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Add Button */}
            {!readOnly && (
              <Button
                size="sm"
                onClick={() => {
                  setSelectedDates({ start: new Date(), end: new Date() });
                  setSelectedSlot(null);
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("addSlot")}
              </Button>
            )}
          </div>
        </div>

        <div className="text-lg font-semibold text-center mt-2">{headerText}</div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Week Day Headers */}
        <div className="grid grid-cols-7 border-t border-l">
          {weekDays.map((day, i) => (
            <div
              key={i}
              className="border-b border-r px-2 py-1 text-center text-xs font-medium text-muted-foreground bg-muted/50"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 border-l">
          {calendarDays.map((day, i) => (
            <DayCell
              key={i}
              day={day}
              viewMode={viewMode}
              readOnly={readOnly}
              onSelect={handleDaySelect}
              onSlotClick={handleSlotClick}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="p-4 border-t">
          <AvailabilityLegend showHighlight={highlightRange != null} />
        </div>
      </CardContent>

      {/* Slot Dialog */}
      <AvailabilitySlotDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onSave={handleSaveSlot}
        onDelete={selectedSlot ? handleDeleteSlot : undefined}
        initialData={selectedSlot ?? undefined}
        selectedDates={selectedDates ?? undefined}
      />
    </Card>
  );
}

export default AvailabilityCalendar;
