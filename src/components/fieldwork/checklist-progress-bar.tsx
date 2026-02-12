"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { OfflineChecklistItem } from "@/lib/offline/types";

// =============================================================================
// Props
// =============================================================================

interface ChecklistProgressBarProps {
  items: OfflineChecklistItem[];
}

// =============================================================================
// Component
// =============================================================================

export function ChecklistProgressBar({ items }: ChecklistProgressBarProps) {
  const t = useTranslations("fieldwork.checklist");

  const { completed, total, pct } = useMemo(() => {
    const total = items.length;
    const completed = items.filter((i) => i.isCompleted).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, pct };
  }, [items]);

  if (total === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("progress")}</span>
        <span>
          {t("progressLabel", { completed, total })} ({pct}%)
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            progressColor(pct)
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function progressColor(pct: number): string {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 50) return "bg-yellow-500";
  if (pct >= 25) return "bg-orange-500";
  return "bg-red-500";
}
