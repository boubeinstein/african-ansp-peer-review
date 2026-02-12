"use client";

import { useTranslations } from "next-intl";
import {
  Cloud,
  CloudOff,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOfflineFieldworkStore } from "@/stores/offline-fieldwork-store";

// =============================================================================
// Props
// =============================================================================

interface SyncProgressIndicatorProps {
  onTap: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function SyncProgressIndicator({ onTap }: SyncProgressIndicatorProps) {
  const t = useTranslations("offline");
  const isOnline = useOfflineFieldworkStore((s) => s.isOnline);
  const isSyncing = useOfflineFieldworkStore((s) => s.isSyncing);
  const syncStatus = useOfflineFieldworkStore((s) => s.syncStatus);

  const pendingCount = syncStatus.pending;
  const failedCount = syncStatus.failed;
  const conflictCount = syncStatus.conflicts;
  const totalIssues = pendingCount + failedCount + conflictCount;

  // Nothing to show when online and fully synced
  if (isOnline && totalIssues === 0 && !isSyncing) return null;

  return (
    <button
      type="button"
      onClick={onTap}
      className={cn(
        "fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full px-3 py-2 shadow-lg border text-sm font-medium transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "min-h-[40px]",
        !isOnline
          ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/50 dark:border-red-800 dark:text-red-400"
          : isSyncing
            ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-400"
            : failedCount > 0
              ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/50 dark:border-red-800 dark:text-red-400"
              : "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-400"
      )}
    >
      {/* Status icon */}
      {!isOnline ? (
        <CloudOff className="h-4 w-4" />
      ) : isSyncing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : failedCount > 0 ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Cloud className="h-4 w-4" />
      )}

      {/* Label */}
      <span className="text-xs whitespace-nowrap">
        {!isOnline
          ? t("offline")
          : isSyncing
            ? t("syncingCount", { count: pendingCount })
            : failedCount > 0
              ? t("failedItems", { count: failedCount })
              : t("pendingCount", { count: pendingCount })}
      </span>

      {/* Failed count badge */}
      {failedCount > 0 && !isSyncing && isOnline && (
        <span className="flex items-center justify-center h-5 min-w-[20px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
          {failedCount}
        </span>
      )}
    </button>
  );
}
