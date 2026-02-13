"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  Check,
  Loader2,
  CheckSquare,
  Camera,
  ClipboardList,
  Clock,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fieldworkDB } from "@/lib/offline/fieldwork-db";
import { syncEngine } from "@/lib/offline/sync-engine";
import { useOfflineFieldworkStore } from "@/stores/offline-fieldwork-store";
import type { SyncQueueEntry } from "@/lib/offline/types";
import { ConflictResolver, type ConflictData } from "./conflict-resolver";

// =============================================================================
// Constants
// =============================================================================

const REFRESH_INTERVAL_MS = 5_000;

// =============================================================================
// Props
// =============================================================================

interface SyncStatusPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

export function SyncStatusPanel({ open, onOpenChange }: SyncStatusPanelProps) {
  const t = useTranslations("offline");
  const isOnline = useOfflineFieldworkStore((s) => s.isOnline);
  const isSyncing = useOfflineFieldworkStore((s) => s.isSyncing);
  const syncStatus = useOfflineFieldworkStore((s) => s.syncStatus);
  const triggerSync = useOfflineFieldworkStore((s) => s.triggerSync);
  const refreshSyncStatus = useOfflineFieldworkStore(
    (s) => s.refreshSyncStatus
  );

  const [queueEntries, setQueueEntries] = useState<SyncQueueEntry[]>([]);
  const [retrying, setRetrying] = useState(false);
  const [conflict, setConflict] = useState<ConflictData | null>(null);

  // ---------------------------------------------------------------------------
  // Load queue entries and auto-refresh
  // ---------------------------------------------------------------------------

  const loadQueue = useCallback(async () => {
    const entries = await fieldworkDB.syncQueue
      .orderBy("createdAt")
      .reverse()
      .toArray();
    setQueueEntries(entries);
    await refreshSyncStatus();
  }, [refreshSyncStatus]);

  useEffect(() => {
    if (!open) return;
    void loadQueue();
    const timer = setInterval(() => void loadQueue(), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [open, loadQueue]);

  // ---------------------------------------------------------------------------
  // Derived counts
  // ---------------------------------------------------------------------------

  const counts = useMemo(() => {
    let pending = 0;
    let failed = 0;

    for (const entry of queueEntries) {
      if (entry.retryCount >= entry.maxRetries) {
        failed++;
      } else {
        pending++;
      }
    }

    return {
      pending,
      syncing: isSyncing ? pending : 0,
      failed,
      conflicts: syncStatus.conflicts,
    };
  }, [queueEntries, isSyncing, syncStatus.conflicts]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function handleSyncNow() {
    await triggerSync();
    await loadQueue();
  }

  async function handleRetryFailed() {
    setRetrying(true);
    try {
      const count = await syncEngine.retryFailed();
      if (count > 0) {
        toast.success(t("retryingCount", { count }));
        await triggerSync();
      }
      await loadQueue();
    } finally {
      setRetrying(false);
    }
  }

  async function handleOpenConflict(entry: SyncQueueEntry) {
    if (entry.entityType !== "checklistItem") return;
    const localItem = await fieldworkDB.checklistItems.get(entry.entityId);
    if (!localItem) return;

    // Try to parse server data from the error message if available
    setConflict({
      entityType: "checklistItem",
      entityId: entry.entityId,
      localItem,
      serverData: undefined,
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[80vh] flex flex-col">
          <SheetHeader className="pb-3">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                {t("syncStatus")}
              </SheetTitle>
              <Badge
                variant={isOnline ? "success" : "destructive"}
                className="gap-1"
              >
                {isOnline ? (
                  <Cloud className="h-3 w-3" />
                ) : (
                  <CloudOff className="h-3 w-3" />
                )}
                {isOnline ? t("online") : t("offline")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {syncStatus.lastSyncAt
                ? t("lastSync", {
                    time: new Date(syncStatus.lastSyncAt).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit" }
                    ),
                  })
                : t("neverSynced")}
            </p>
          </SheetHeader>

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-2 pb-3">
            <SummaryCard
              label={t("pendingItems", { count: counts.pending })}
              count={counts.pending}
              color="amber"
            />
            <SummaryCard
              label={t("syncingItems", { count: counts.syncing })}
              count={counts.syncing}
              color="blue"
              animate={isSyncing}
            />
            <SummaryCard
              label={t("syncedItems", { count: 0 })}
              count={0}
              color="green"
            />
            <SummaryCard
              label={t("failedItems", { count: counts.failed })}
              count={counts.failed}
              color="red"
            />
          </div>

          {/* Queue list */}
          <ScrollArea className="flex-1 -mx-4 px-4">
            <div className="space-y-2 pb-4">
              {queueEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Check className="h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {t("syncComplete")}
                  </p>
                </div>
              ) : (
                queueEntries.map((entry) => (
                  <QueueItem
                    key={entry.id}
                    entry={entry}
                    onRetry={handleRetryFailed}
                    onResolveConflict={() => void handleOpenConflict(entry)}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Bottom actions */}
          <div className="flex gap-2 pt-3 border-t">
            <Button
              className="flex-1 min-h-[44px]"
              onClick={() => void handleSyncNow()}
              disabled={!isOnline || isSyncing || counts.pending === 0}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1.5" />
              )}
              {t("syncNow")}
            </Button>

            {counts.failed > 0 && (
              <Button
                variant="outline"
                className="min-h-[44px]"
                onClick={() => void handleRetryFailed()}
                disabled={retrying || !isOnline}
              >
                {retrying ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mr-1.5" />
                )}
                {t("retryFailed")}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Conflict resolver dialog */}
      <ConflictResolver
        open={conflict !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConflict(null);
            void loadQueue();
          }
        }}
        conflict={conflict}
      />
    </>
  );
}

// =============================================================================
// Summary card
// =============================================================================

function SummaryCard({
  label,
  count,
  color,
  animate,
}: {
  label: string;
  count: number;
  color: "amber" | "blue" | "green" | "red";
  animate?: boolean;
}) {
  const colorClasses = {
    amber: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
    blue: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
    green: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
    red: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
  };

  const textClasses = {
    amber: "text-amber-700 dark:text-amber-400",
    blue: "text-blue-700 dark:text-blue-400",
    green: "text-green-700 dark:text-green-400",
    red: "text-red-700 dark:text-red-400",
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-2 text-center",
        colorClasses[color]
      )}
    >
      <p
        className={cn(
          "text-lg font-bold tabular-nums",
          textClasses[color],
          animate && "animate-pulse"
        )}
      >
        {count}
      </p>
      <p className="text-[9px] text-muted-foreground leading-tight truncate">
        {label}
      </p>
    </div>
  );
}

// =============================================================================
// Queue item row
// =============================================================================

function QueueItem({
  entry,
  onRetry: _onRetry,
  onResolveConflict,
}: {
  entry: SyncQueueEntry;
  onRetry: () => void;
  onResolveConflict: () => void;
}) {
  const t = useTranslations("offline");
  const isFailed = entry.retryCount >= entry.maxRetries;
  const isConflict = entry.error?.includes("Conflict");

  return (
    <div className="flex items-center gap-3 rounded-lg border p-2.5 text-sm">
      {/* Entity type icon */}
      <EntityIcon entityType={entry.entityType} />

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">
          {t(`entityType.${entry.entityType as "checklistItem" | "fieldEvidence" | "draftFinding"}`)}
          {" — "}
          {t(`action.${entry.action}`)}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            {formatQueueTime(entry.createdAt)}
          </span>
        </div>
        {isFailed && entry.error && (
          <p className="text-[10px] text-red-500 mt-0.5 truncate">
            {entry.error}
          </p>
        )}
      </div>

      {/* Status + action */}
      {isConflict ? (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onResolveConflict();
          }}
        >
          Resolve
        </Button>
      ) : isFailed ? (
        <Badge variant="destructive" className="text-[10px] shrink-0">
          Failed
        </Badge>
      ) : (
        <Badge variant="warning" className="text-[10px] shrink-0">
          Pending
        </Badge>
      )}
    </div>
  );
}

// =============================================================================
// Entity icon
// =============================================================================

function EntityIcon({ entityType }: { entityType: string }) {
  const iconClass = "h-4 w-4 text-muted-foreground";

  switch (entityType) {
    case "checklistItem":
      return <CheckSquare className={iconClass} />;
    case "fieldEvidence":
      return <Camera className={iconClass} />;
    case "draftFinding":
      return <ClipboardList className={iconClass} />;
    default:
      return <Cloud className={iconClass} />;
  }
}

// =============================================================================
// Helpers
// =============================================================================

function formatQueueTime(date: Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffS = Math.floor((now - then) / 1000);

  if (diffS < 60) return "just now";
  if (diffS < 3600) return `${Math.floor(diffS / 60)}m ago`;
  if (diffS < 86400) return `${Math.floor(diffS / 3600)}h ago`;
  return new Date(date).toLocaleString([], {
    dateStyle: "short",
    timeStyle: "short",
  });
}
