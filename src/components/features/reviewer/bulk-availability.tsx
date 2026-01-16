"use client";

/**
 * Bulk Availability Manager Component
 *
 * For setting recurring availability patterns and managing
 * blackout dates efficiently.
 */

import { useState, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Calendar,
  Copy,
  RefreshCw,
  X,
  Plus,
  AlertCircle,
} from "lucide-react";
import type { AvailabilitySlot, CreateAvailabilityInput } from "@/types/reviewer";
import type { AvailabilityType } from "@prisma/client";
import { AVAILABILITY_TYPE_LABELS, AVAILABILITY_TYPE_COLOR } from "@/lib/reviewer/labels";

// =============================================================================
// TYPES
// =============================================================================

export interface BulkAvailabilityProps {
  reviewerProfileId: string;
  existingSlots: AvailabilitySlot[];
  onCreateSlots: (slots: CreateAvailabilityInput[]) => void;
  onCopyFromMonth: (sourceMonth: Date, targetMonth: Date) => void;
  className?: string;
}

type RecurrenceFrequency = "weekly" | "biweekly" | "monthly";

interface RecurringFormState {
  frequency: RecurrenceFrequency;
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  availabilityType: AvailabilityType;
}

interface BlackoutFormState {
  dates: string[];
  currentDate: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

function generateRecurringSlots(
  pattern: RecurringFormState,
  blackoutDates: string[]
): CreateAvailabilityInput[] {
  const slots: CreateAvailabilityInput[] = [];
  const start = new Date(pattern.startDate);
  const end = new Date(pattern.endDate);
  const blackoutSet = new Set(blackoutDates);

  if (pattern.frequency === "weekly" || pattern.frequency === "biweekly") {
    const increment = pattern.frequency === "weekly" ? 7 : 14;

    for (const dayOfWeek of pattern.daysOfWeek) {
      // Find the first occurrence of this day
      const currentDate = new Date(start);
      const diff = (dayOfWeek - currentDate.getDay() + 7) % 7;
      currentDate.setDate(currentDate.getDate() + diff);

      while (currentDate <= end) {
        const dateStr = formatDateForInput(currentDate);
        if (!blackoutSet.has(dateStr)) {
          slots.push({
            startDate: new Date(currentDate),
            endDate: new Date(currentDate),
            availabilityType: pattern.availabilityType,
            isRecurring: true,
            recurrencePattern: `FREQ=${pattern.frequency.toUpperCase()};BYDAY=${["SU", "MO", "TU", "WE", "TH", "FR", "SA"][dayOfWeek]}`,
          });
        }
        currentDate.setDate(currentDate.getDate() + increment);
      }
    }
  } else if (pattern.frequency === "monthly") {
    // Monthly: create a slot for each month
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = formatDateForInput(currentDate);
      if (!blackoutSet.has(dateStr)) {
        // First day of month to last day
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        slots.push({
          startDate: new Date(currentDate),
          endDate: monthEnd > end ? end : monthEnd,
          availabilityType: pattern.availabilityType,
          isRecurring: true,
          recurrencePattern: "FREQ=MONTHLY",
        });
      }
      currentDate.setMonth(currentDate.getMonth() + 1);
      currentDate.setDate(1);
    }
  }

  return slots;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BulkAvailability({
  // reviewerProfileId is available for future tRPC integration
  existingSlots,
  onCreateSlots,
  onCopyFromMonth,
  className,
}: BulkAvailabilityProps) {
  const t = useTranslations("reviewer.availability.bulk");
  const locale = useLocale() as "en" | "fr";

  // Dialog states
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);

  // Form states
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const threeMonthsLater = new Date(today.getFullYear(), today.getMonth() + 3, 0);

  const [recurringForm, setRecurringForm] = useState<RecurringFormState>({
    frequency: "weekly",
    startDate: formatDateForInput(nextMonth),
    endDate: formatDateForInput(threeMonthsLater),
    daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
    availabilityType: "AVAILABLE",
  });

  const [blackoutForm, setBlackoutForm] = useState<BlackoutFormState>({
    dates: [],
    currentDate: "",
  });

  const [copySource, setCopySource] = useState<string>("");
  const [copyTarget, setCopyTarget] = useState<string>("");

  // Available months for copying (months with existing slots)
  const availableSourceMonths = useMemo(() => {
    const months = new Set<string>();
    for (const slot of existingSlots) {
      const date = new Date(slot.startDate);
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
    }
    return Array.from(months).sort().reverse();
  }, [existingSlots]);

  // Generate target months (next 6 months)
  const targetMonths = useMemo(() => {
    const months: string[] = [];
    const date = new Date();
    for (let i = 0; i < 6; i++) {
      months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
      date.setMonth(date.getMonth() + 1);
    }
    return months;
  }, []);

  // Day names
  const dayNames = useMemo(() => {
    const names = [];
    const date = new Date();
    date.setDate(date.getDate() - date.getDay());
    for (let i = 0; i < 7; i++) {
      names.push({
        short: date.toLocaleDateString(locale, { weekday: "short" }),
        index: i,
      });
      date.setDate(date.getDate() + 1);
    }
    return names;
  }, [locale]);

  // Handlers
  const handleRecurringSubmit = () => {
    const slots = generateRecurringSlots(recurringForm, blackoutForm.dates);
    if (slots.length > 0) {
      onCreateSlots(slots);
    }
    setIsRecurringOpen(false);
  };

  const handleCopySubmit = () => {
    if (copySource && copyTarget) {
      const [sourceYear, sourceMonth] = copySource.split("-").map(Number);
      const [targetYear, targetMonth] = copyTarget.split("-").map(Number);
      onCopyFromMonth(
        new Date(sourceYear, sourceMonth - 1, 1),
        new Date(targetYear, targetMonth - 1, 1)
      );
    }
    setIsCopyOpen(false);
  };

  const handleAddBlackoutDate = () => {
    if (blackoutForm.currentDate && !blackoutForm.dates.includes(blackoutForm.currentDate)) {
      setBlackoutForm((prev) => ({
        ...prev,
        dates: [...prev.dates, prev.currentDate].sort(),
        currentDate: "",
      }));
    }
  };

  const handleRemoveBlackoutDate = (date: string) => {
    setBlackoutForm((prev) => ({
      ...prev,
      dates: prev.dates.filter((d) => d !== date),
    }));
  };

  const toggleDayOfWeek = (day: number) => {
    setRecurringForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort(),
    }));
  };

  // Preview count
  const previewCount = useMemo(() => {
    return generateRecurringSlots(recurringForm, blackoutForm.dates).length;
  }, [recurringForm, blackoutForm.dates]);

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {/* Recurring Pattern */}
          <Dialog open={isRecurringOpen} onOpenChange={setIsRecurringOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("recurring")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t("recurringTitle")}</DialogTitle>
                <DialogDescription>{t("recurringDescription")}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Frequency */}
                <div className="space-y-2">
                  <Label>{t("frequency")}</Label>
                  <RadioGroup
                    value={recurringForm.frequency}
                    onValueChange={(v: RecurrenceFrequency) =>
                      setRecurringForm((prev) => ({ ...prev, frequency: v }))
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="weekly" id="weekly" />
                      <Label htmlFor="weekly" className="font-normal">
                        {t("weekly")}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="biweekly" id="biweekly" />
                      <Label htmlFor="biweekly" className="font-normal">
                        {t("biweekly")}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="monthly" id="monthly" />
                      <Label htmlFor="monthly" className="font-normal">
                        {t("monthly")}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Days of Week (for weekly/biweekly) */}
                {(recurringForm.frequency === "weekly" ||
                  recurringForm.frequency === "biweekly") && (
                  <div className="space-y-2">
                    <Label>{t("daysOfWeek")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {dayNames.map((day) => (
                        <Button
                          key={day.index}
                          type="button"
                          variant={
                            recurringForm.daysOfWeek.includes(day.index) ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => toggleDayOfWeek(day.index)}
                        >
                          {day.short}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("startDate")}</Label>
                    <Input
                      type="date"
                      value={recurringForm.startDate}
                      onChange={(e) =>
                        setRecurringForm((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("endDate")}</Label>
                    <Input
                      type="date"
                      value={recurringForm.endDate}
                      onChange={(e) =>
                        setRecurringForm((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {/* Availability Type */}
                <div className="space-y-2">
                  <Label>{t("availabilityType")}</Label>
                  <RadioGroup
                    value={recurringForm.availabilityType}
                    onValueChange={(v: AvailabilityType) =>
                      setRecurringForm((prev) => ({ ...prev, availabilityType: v }))
                    }
                    className="flex gap-4"
                  >
                    {(["AVAILABLE", "TENTATIVE", "UNAVAILABLE"] as AvailabilityType[]).map(
                      (type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <RadioGroupItem value={type} id={`type-${type}`} />
                          <Label
                            htmlFor={`type-${type}`}
                            className="flex items-center gap-1.5 font-normal cursor-pointer"
                          >
                            <span
                              className={cn("h-2.5 w-2.5 rounded-full", AVAILABILITY_TYPE_COLOR[type])}
                            />
                            {AVAILABILITY_TYPE_LABELS[type][locale]}
                          </Label>
                        </div>
                      )
                    )}
                  </RadioGroup>
                </div>

                <Separator />

                {/* Blackout Dates */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t("blackoutDates")}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={blackoutForm.currentDate}
                      onChange={(e) =>
                        setBlackoutForm((prev) => ({ ...prev, currentDate: e.target.value }))
                      }
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" onClick={handleAddBlackoutDate}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {blackoutForm.dates.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {blackoutForm.dates.map((date) => (
                        <Badge key={date} variant="secondary" className="gap-1">
                          {new Date(date).toLocaleDateString(locale, {
                            month: "short",
                            day: "numeric",
                          })}
                          <button
                            type="button"
                            onClick={() => handleRemoveBlackoutDate(date)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {t("willCreate", { count: previewCount })}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRecurringOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button onClick={handleRecurringSubmit} disabled={previewCount === 0}>
                  {t("create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Copy from Previous Month */}
          <Dialog open={isCopyOpen} onOpenChange={setIsCopyOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={availableSourceMonths.length === 0}
              >
                <Copy className="h-4 w-4 mr-2" />
                {t("copy")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>{t("copyTitle")}</DialogTitle>
                <DialogDescription>{t("copyDescription")}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t("sourceMonth")}</Label>
                  <Select value={copySource} onValueChange={setCopySource}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectMonth")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSourceMonths.map((month) => {
                        const [year, m] = month.split("-");
                        const date = new Date(parseInt(year), parseInt(m) - 1);
                        return (
                          <SelectItem key={month} value={month}>
                            {date.toLocaleDateString(locale, { month: "long", year: "numeric" })}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("targetMonth")}</Label>
                  <Select value={copyTarget} onValueChange={setCopyTarget}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectMonth")} />
                    </SelectTrigger>
                    <SelectContent>
                      {targetMonths.map((month) => {
                        const [year, m] = month.split("-");
                        const date = new Date(parseInt(year), parseInt(m) - 1);
                        return (
                          <SelectItem key={month} value={month}>
                            {date.toLocaleDateString(locale, { month: "long", year: "numeric" })}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCopyOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button onClick={handleCopySubmit} disabled={!copySource || !copyTarget}>
                  {t("copy")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quick Stats */}
        <div className="text-xs text-muted-foreground">
          {existingSlots.length > 0
            ? t("existingSlots", { count: existingSlots.length })
            : t("noSlots")}
        </div>
      </CardContent>
    </Card>
  );
}

export default BulkAvailability;
