"use client";

/**
 * Availability Slot Dialog Component
 *
 * Dialog for creating and editing availability slots.
 * Includes date range picker, availability type selector, and notes.
 */

import { useState, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar, Trash2, AlertCircle } from "lucide-react";
import type {
  AvailabilitySlot,
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
} from "@/types/reviewer";
import type { AvailabilityType } from "@prisma/client";
import { AVAILABILITY_TYPE_LABELS, AVAILABILITY_TYPE_COLOR } from "@/lib/reviewer/labels";

// =============================================================================
// TYPES
// =============================================================================

export interface AvailabilitySlotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (slot: CreateAvailabilityInput | UpdateAvailabilityInput) => void;
  onDelete?: (id: string) => void;
  initialData?: AvailabilitySlot;
  selectedDates?: { start: Date; end: Date };
}

interface FormState {
  startDate: string;
  endDate: string;
  availabilityType: AvailabilityType;
  notes: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getInitialFormState(
  initialData?: AvailabilitySlot,
  selectedDates?: { start: Date; end: Date }
): FormState {
  if (initialData) {
    return {
      startDate: formatDateForInput(new Date(initialData.startDate)),
      endDate: formatDateForInput(new Date(initialData.endDate)),
      availabilityType: initialData.availabilityType,
      notes: initialData.notes ?? "",
    };
  }

  if (selectedDates) {
    return {
      startDate: formatDateForInput(selectedDates.start),
      endDate: formatDateForInput(selectedDates.end),
      availabilityType: "AVAILABLE",
      notes: "",
    };
  }

  const today = new Date();
  return {
    startDate: formatDateForInput(today),
    endDate: formatDateForInput(today),
    availabilityType: "AVAILABLE",
    notes: "",
  };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AvailabilitySlotDialog({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  selectedDates,
}: AvailabilitySlotDialogProps) {
  const t = useTranslations("reviewer.availability");
  const locale = useLocale() as "en" | "fr";

  // Generate a key that changes when the dialog opens with new data
  // This forces form state to reinitialize properly
  const formKey = useMemo(() => {
    if (!isOpen) return "closed";
    return `${initialData?.id ?? "new"}-${selectedDates?.start?.getTime() ?? 0}`;
  }, [isOpen, initialData?.id, selectedDates?.start]);

  // Form state - reinitializes when formKey changes
  const [formState, setFormState] = useState<FormState>(() =>
    getInitialFormState(initialData, selectedDates)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastFormKey, setLastFormKey] = useState(formKey);

  // Reset form when formKey changes (dialog opens with new data)
  if (formKey !== lastFormKey) {
    setFormState(getInitialFormState(initialData, selectedDates));
    setErrors({});
    setLastFormKey(formKey);
  }

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formState.startDate) {
      newErrors.startDate = t("validation.startDateRequired");
    }

    if (!formState.endDate) {
      newErrors.endDate = t("validation.endDateRequired");
    }

    if (formState.startDate && formState.endDate) {
      const start = new Date(formState.startDate);
      const end = new Date(formState.endDate);
      if (end < start) {
        newErrors.endDate = t("validation.endDateAfterStart");
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const data = {
      startDate: new Date(formState.startDate),
      endDate: new Date(formState.endDate),
      availabilityType: formState.availabilityType,
      notes: formState.notes || undefined,
    };

    if (initialData) {
      onSave({ ...data, id: initialData.id });
    } else {
      onSave(data);
    }
  };

  const handleDelete = () => {
    if (initialData && onDelete) {
      onDelete(initialData.id);
    }
  };

  const isEditing = !!initialData;
  const availabilityTypes: AvailabilityType[] = ["AVAILABLE", "TENTATIVE", "UNAVAILABLE"];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isEditing ? t("editSlot") : t("addSlot")}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t("dialog.editDescription") : t("dialog.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">{t("startDate")}</Label>
              <Input
                id="startDate"
                type="date"
                value={formState.startDate}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className={cn(errors.startDate && "border-red-500")}
              />
              {errors.startDate && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.startDate}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">{t("endDate")}</Label>
              <Input
                id="endDate"
                type="date"
                value={formState.endDate}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className={cn(errors.endDate && "border-red-500")}
              />
              {errors.endDate && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.endDate}
                </p>
              )}
            </div>
          </div>

          {/* Availability Type */}
          <div className="space-y-2">
            <Label>{t("typeLabel")}</Label>
            <RadioGroup
              value={formState.availabilityType}
              onValueChange={(value: AvailabilityType) =>
                setFormState((prev) => ({ ...prev, availabilityType: value }))
              }
              className="grid grid-cols-1 gap-2"
            >
              {availabilityTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <RadioGroupItem value={type} id={type} />
                  <Label
                    htmlFor={type}
                    className="flex items-center gap-2 cursor-pointer font-normal"
                  >
                    <span
                      className={cn(
                        "h-3 w-3 rounded-full",
                        AVAILABILITY_TYPE_COLOR[type]
                      )}
                    />
                    {AVAILABILITY_TYPE_LABELS[type][locale]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea
              id="notes"
              placeholder={t("notesPlaceholder")}
              value={formState.notes}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
            />
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            {/* Delete Button (for existing slots) */}
            {isEditing && onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" className="w-full sm:w-auto">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("delete")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("deleteConfirm.title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("deleteConfirm.description")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("deleteConfirm.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      {t("deleteConfirm.confirm")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                {t("cancel")}
              </Button>
              <Button type="submit" className="flex-1">
                {t("save")}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AvailabilitySlotDialog;
