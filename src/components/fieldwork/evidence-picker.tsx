"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOfflineFieldworkStore } from "@/stores/offline-fieldwork-store";
import { FieldEvidenceType } from "@/lib/offline/types";
import type { OfflineFieldEvidence } from "@/lib/offline/types";

// =============================================================================
// Props
// =============================================================================

interface EvidencePickerProps {
  reviewId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

// =============================================================================
// Component
// =============================================================================

export function EvidencePicker({
  reviewId,
  selectedIds,
  onChange,
}: EvidencePickerProps) {
  const t = useTranslations("fieldwork.findings");
  const evidenceMap = useOfflineFieldworkStore((s) => s.evidence);

  // Flatten all evidence for this review
  const allEvidence = useMemo(() => {
    const items: OfflineFieldEvidence[] = [];
    for (const list of evidenceMap.values()) {
      for (const ev of list) {
        if (ev.reviewId === reviewId) {
          items.push(ev);
        }
      }
    }
    return items;
  }, [evidenceMap, reviewId]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggle(id: string) {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  if (allEvidence.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">{t("noEvidence")}</p>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {allEvidence.map((ev) => (
        <PickerThumbnail
          key={ev.id}
          evidence={ev}
          selected={selectedSet.has(ev.id)}
          onToggle={() => toggle(ev.id)}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Thumbnail with selection overlay
// =============================================================================

function PickerThumbnail({
  evidence,
  selected,
  onToggle,
}: {
  evidence: OfflineFieldEvidence;
  selected: boolean;
  onToggle: () => void;
}) {
  const isVoice = evidence.type === FieldEvidenceType.VOICE_NOTE;
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isVoice) return;
    const blob = evidence.thumbnailBlob ?? evidence.blob;
    const objectUrl = URL.createObjectURL(blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing external object URL with React state
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [evidence.thumbnailBlob, evidence.blob, isVoice]);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "relative aspect-square rounded-lg overflow-hidden border-2 focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] transition-colors",
        selected
          ? "border-primary ring-1 ring-primary/30"
          : "border-transparent",
        isVoice ? "bg-violet-50 dark:bg-violet-950/30" : "bg-muted"
      )}
    >
      {isVoice ? (
        <div className="flex flex-col items-center justify-center h-full gap-1">
          <Mic className="h-5 w-5 text-violet-500" />
          <span className="text-[9px] font-mono text-violet-600 dark:text-violet-400">
            {evidence.annotations || "—"}
          </span>
        </div>
      ) : (
        url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Evidence"
            className="h-full w-full object-cover"
          />
        )
      )}

      {/* Selection checkmark overlay */}
      {selected && (
        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
          <span className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-4 w-4 text-primary-foreground" />
          </span>
        </div>
      )}
    </button>
  );
}
