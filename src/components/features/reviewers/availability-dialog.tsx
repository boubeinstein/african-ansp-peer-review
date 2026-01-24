"use client";

/**
 * Availability Dialog Component
 *
 * A dialog for reviewers to quickly update their availability status.
 * Features:
 * - Toggle availability on/off
 * - Set availability window (from/to dates)
 * - Quick preset buttons for common periods
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format, addDays } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface AvailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvailability?: {
    isAvailable: boolean;
    availableFrom: Date | null;
    availableTo: Date | null;
  };
  reviewerProfileId?: string;
}

// =============================================================================
// INNER FORM COMPONENT (remounts when dialog opens to reset state)
// =============================================================================

interface AvailabilityFormProps {
  currentAvailability?: {
    isAvailable: boolean;
    availableFrom: Date | null;
    availableTo: Date | null;
  };
  reviewerProfileId?: string;
  onClose: () => void;
}

function AvailabilityForm({
  currentAvailability,
  reviewerProfileId,
  onClose,
}: AvailabilityFormProps) {
  const t = useTranslations("reviewers.availability");
  const tCommon = useTranslations("common");

  // Today at start of day for date comparisons
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [isAvailable, setIsAvailable] = useState(
    currentAvailability?.isAvailable ?? true
  );
  const [availableFrom, setAvailableFrom] = useState<Date | undefined>(
    currentAvailability?.availableFrom ?? undefined
  );
  const [availableTo, setAvailableTo] = useState<Date | undefined>(
    currentAvailability?.availableTo ?? undefined
  );

  const utils = trpc.useUtils();

  const updateMutation = trpc.reviewer.updateProfileAvailability.useMutation({
    onSuccess: () => {
      toast.success(t("updated"));
      utils.reviewer.getByUserId.invalidate();
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSave = () => {
    if (!reviewerProfileId) {
      toast.error("No reviewer profile found");
      return;
    }

    updateMutation.mutate({
      reviewerProfileId,
      isAvailable,
      availableFrom: availableFrom ?? null,
      availableTo: availableTo ?? null,
    });
  };

  // Check which preset buttons should be visible (not expired)
  const q1End = new Date(2026, 2, 31);
  const q2End = new Date(2026, 5, 30);
  const isQ1Valid = q1End >= today;
  const isQ2Valid = q2End >= today;

  const setPreset = (preset: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    switch (preset) {
      case "next30":
        setAvailableFrom(now);
        setAvailableTo(addDays(now, 30));
        break;
      case "next90":
        setAvailableFrom(now);
        setAvailableTo(addDays(now, 90));
        break;
      case "q1": {
        // Q1 2026: Jan 1 - Mar 31
        const q1Start = new Date(2026, 0, 1);
        // If Q1 start is in past, use today instead
        setAvailableFrom(q1Start < now ? now : q1Start);
        setAvailableTo(new Date(2026, 2, 31));
        break;
      }
      case "q2": {
        // Q2 2026: Apr 1 - Jun 30
        const q2Start = new Date(2026, 3, 1);
        setAvailableFrom(q2Start < now ? now : q2Start);
        setAvailableTo(new Date(2026, 5, 30));
        break;
      }
    }
    setIsAvailable(true);
  };

  // Helper to check if a date is in the past
  const isDateDisabled = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d < today;
  };

  // Helper to check if "To" date should be disabled
  const isToDateDisabled = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // Disable dates before today AND before availableFrom
    const minDate = availableFrom && availableFrom > today ? availableFrom : today;
    return d < minDate;
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          {t("title")}
        </DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Status Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {isAvailable ? (
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            ) : (
              <XCircle className="h-8 w-8 text-red-500" />
            )}
            <div>
              <p className="font-medium">
                {isAvailable ? t("statusAvailable") : t("statusUnavailable")}
              </p>
              <p className="text-sm text-muted-foreground">
                {isAvailable
                  ? t("statusAvailableDesc")
                  : t("statusUnavailableDesc")}
              </p>
            </div>
          </div>
          <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
        </div>

        {/* Date Range - Only shown when available */}
        {isAvailable && (
          <div className="space-y-4">
            <Label>{t("window")}</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t("from")}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !availableFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {availableFrom
                        ? format(availableFrom, "PPP")
                        : t("selectDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={availableFrom}
                      onSelect={(date) => {
                        setAvailableFrom(date);
                        // If "to" date is before new "from" date, clear it
                        if (date && availableTo && date > availableTo) {
                          setAvailableTo(undefined);
                        }
                      }}
                      disabled={isDateDisabled}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t("to")}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !availableTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {availableTo
                        ? format(availableTo, "PPP")
                        : t("selectDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={availableTo}
                      onSelect={setAvailableTo}
                      disabled={isToDateDisabled}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreset("next30")}
              >
                {t("next30Days")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreset("next90")}
              >
                {t("next90Days")}
              </Button>
              {isQ1Valid && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreset("q1")}
                >
                  Q1 2026
                </Button>
              )}
              {isQ2Valid && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreset("q2")}
                >
                  Q2 2026
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {tCommon("actions.cancel")}
        </Button>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {tCommon("actions.save")}
        </Button>
      </DialogFooter>
    </>
  );
}

// =============================================================================
// MAIN COMPONENT (wrapper)
// =============================================================================

export function AvailabilityDialog({
  open,
  onOpenChange,
  currentAvailability,
  reviewerProfileId,
}: AvailabilityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* Key on open state forces remount and state reset when dialog opens */}
        {open && (
          <AvailabilityForm
            currentAvailability={currentAvailability}
            reviewerProfileId={reviewerProfileId}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AvailabilityDialog;
