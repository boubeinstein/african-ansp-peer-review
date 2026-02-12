"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import {
  Camera,
  Check,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  OfflineChecklistItem,
  OfflineFieldEvidence,
  ChecklistItemStatus,
} from "@/lib/offline/types";
import { EvidenceCaptureButton } from "./evidence-capture-button";
import { EvidenceGallery } from "./evidence-gallery";
import { VoiceNoteRecorder } from "./voice-note-recorder";

// =============================================================================
// Constants
// =============================================================================

const NOTES_DEBOUNCE_MS = 500;

const STATUSES: ChecklistItemStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "NOT_APPLICABLE",
];

// =============================================================================
// Props
// =============================================================================

interface ChecklistItemCardProps {
  item: OfflineChecklistItem;
  evidenceItems: OfflineFieldEvidence[];
  onUpdate: (
    itemId: string,
    updates: Partial<OfflineChecklistItem>
  ) => Promise<void>;
}

// =============================================================================
// Component
// =============================================================================

export function ChecklistItemCard({
  item,
  evidenceItems,
  onUpdate,
}: ChecklistItemCardProps) {
  const t = useTranslations("fieldwork.checklist");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(item.notes);
  const [updating, setUpdating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const label = locale === "fr" ? item.labelFr : item.labelEn;
  const evidenceCount = evidenceItems.length;
  const hasPendingSync = item.syncStatus === "pending" || item.syncStatus === "syncing";

  // Sync local notes state when item changes externally
  useEffect(() => {
    setNotes(item.notes);
  }, [item.notes]);

  // ---------------------------------------------------------------------------
  // Debounced notes save
  // ---------------------------------------------------------------------------

  const saveNotes = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void onUpdate(item.id, { notes: value });
      }, NOTES_DEBOUNCE_MS);
    },
    [item.id, onUpdate]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleNotesChange(value: string) {
    setNotes(value);
    saveNotes(value);
  }

  // ---------------------------------------------------------------------------
  // Checkbox toggle
  // ---------------------------------------------------------------------------

  async function handleToggleCompleted(checked: boolean) {
    setUpdating(true);
    try {
      await onUpdate(item.id, {
        isCompleted: checked,
        completedAt: checked ? new Date() : null,
        status: checked ? "COMPLETED" : "NOT_STARTED",
      });
      toast.success(t("itemUpdated"));
    } catch {
      toast.error(t("updateFailed"));
    } finally {
      setUpdating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Status change
  // ---------------------------------------------------------------------------

  async function handleStatusChange(value: string) {
    const status = value as ChecklistItemStatus;
    const isCompleted = status === "COMPLETED";
    try {
      await onUpdate(item.id, {
        status,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      });
      toast.success(t("itemUpdated"));
    } catch {
      toast.error(t("updateFailed"));
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card
        className={cn(
          "border-l-4 transition-colors",
          item.isCompleted
            ? "border-l-green-500"
            : item.status === "IN_PROGRESS"
              ? "border-l-blue-500"
              : "border-l-transparent"
        )}
      >
        {/* Header row — always visible */}
        <CollapsibleTrigger asChild>
          <button
            className="flex items-center gap-3 w-full p-3 text-left min-h-[56px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            type="button"
          >
            {/* Checkbox */}
            <span
              className="shrink-0"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") e.stopPropagation();
              }}
            >
              <Checkbox
                checked={item.isCompleted}
                onCheckedChange={(checked) =>
                  void handleToggleCompleted(!!checked)
                }
                disabled={updating}
                className="h-6 w-6"
              />
            </span>

            {/* Label + badges */}
            <div className="flex-1 min-w-0">
              <span
                className={cn(
                  "text-sm font-medium leading-snug",
                  item.isCompleted && "line-through text-muted-foreground"
                )}
              >
                {label}
              </span>

              <div className="flex items-center gap-1.5 mt-1">
                {/* Phase badge */}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {item.itemCode}
                </Badge>

                {/* Evidence count */}
                {evidenceCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <Camera className="h-3 w-3" />
                    {evidenceCount}
                  </span>
                )}

                {/* Pending sync dot */}
                {hasPendingSync && (
                  <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                )}
              </div>
            </div>

            {/* Completed check icon */}
            {item.isCompleted && (
              <Check className="h-4 w-4 text-green-500 shrink-0" />
            )}

            {/* Expand chevron */}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>

        {/* Expandable content */}
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-4 border-t pt-3">
            {/* Status selector */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("statusLabel")}
              </label>
              <Select
                value={item.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`status.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("notes")}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder={t("notesPlaceholder")}
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            {/* Evidence capture + gallery */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground">
                {t("evidence")}
                {evidenceCount > 0 && (
                  <span className="ml-1.5 text-muted-foreground/70">
                    ({t("evidenceCount", { count: evidenceCount })})
                  </span>
                )}
              </label>

              <div className="flex flex-wrap gap-2">
                <EvidenceCaptureButton
                  checklistItemId={item.id}
                  reviewId={item.reviewId}
                />
                <VoiceNoteRecorder
                  checklistItemId={item.id}
                  reviewId={item.reviewId}
                />
              </div>

              <EvidenceGallery checklistItemId={item.id} />
            </div>

            {/* Sync status indicator */}
            {updating && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("syncing")}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
