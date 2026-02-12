"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpDown, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fieldworkDB } from "@/lib/offline/fieldwork-db";
import { syncEngine } from "@/lib/offline/sync-engine";
import { useOfflineFieldworkStore } from "@/stores/offline-fieldwork-store";
import type { OfflineChecklistItem } from "@/lib/offline/types";

// =============================================================================
// Types
// =============================================================================

interface ConflictData {
  entityType: "checklistItem";
  entityId: string;
  localItem: OfflineChecklistItem;
  serverData?: {
    isCompleted: boolean;
    completedAt: Date | null;
    updatedAt: Date;
  };
}

// =============================================================================
// Props
// =============================================================================

interface ConflictResolverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: ConflictData | null;
}

// =============================================================================
// Component
// =============================================================================

export function ConflictResolver({
  open,
  onOpenChange,
  conflict,
}: ConflictResolverProps) {
  const t = useTranslations("offline.conflict");
  const [resolving, setResolving] = useState(false);
  const refreshSyncStatus = useOfflineFieldworkStore(
    (s) => s.refreshSyncStatus
  );
  const initializeForReview = useOfflineFieldworkStore(
    (s) => s.initializeForReview
  );

  if (!conflict) return null;

  // ---------------------------------------------------------------------------
  // Keep local version — re-enqueue for sync
  // ---------------------------------------------------------------------------

  async function handleKeepMine() {
    if (!conflict) return;
    setResolving(true);
    try {
      // Update local item status back to pending
      await fieldworkDB.checklistItems.update(conflict.entityId, {
        syncStatus: "pending",
      });

      // Re-enqueue for sync
      await syncEngine.enqueue({
        entityType: "checklistItem",
        entityId: conflict.entityId,
        action: "UPDATE",
        payload: JSON.stringify(conflict.localItem),
        maxRetries: 3,
      });

      await refreshSyncStatus();
      if (conflict.localItem.reviewId) {
        await initializeForReview(conflict.localItem.reviewId);
      }

      toast.success(t("resolved"));
      onOpenChange(false);
    } finally {
      setResolving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Keep server version — update local with server data
  // ---------------------------------------------------------------------------

  async function handleKeepServer() {
    if (!conflict || !conflict.serverData) return;
    setResolving(true);
    try {
      await fieldworkDB.checklistItems.update(conflict.entityId, {
        isCompleted: conflict.serverData.isCompleted,
        completedAt: conflict.serverData.completedAt,
        updatedAt: conflict.serverData.updatedAt,
        syncStatus: "synced",
      });

      // Remove any pending sync queue entry for this entity
      const queueEntries = await fieldworkDB.syncQueue
        .filter(
          (e) =>
            e.entityType === "checklistItem" &&
            e.entityId === conflict.entityId
        )
        .toArray();
      for (const entry of queueEntries) {
        await fieldworkDB.syncQueue.delete(entry.id);
      }

      await refreshSyncStatus();
      if (conflict.localItem.reviewId) {
        await initializeForReview(conflict.localItem.reviewId);
      }

      toast.success(t("resolved"));
      onOpenChange(false);
    } finally {
      setResolving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const local = conflict.localItem;
  const server = conflict.serverData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5 text-amber-500" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-2 gap-3">
          {/* Your version */}
          <div className="rounded-lg border p-3 space-y-2">
            <Badge variant="outline" className="text-[10px]">
              {t("yourVersion")}
            </Badge>
            <ComparisonFields
              isCompleted={local.isCompleted}
              notes={local.notes}
              updatedAt={local.updatedAt}
            />
          </div>

          {/* Server version */}
          <div className="rounded-lg border p-3 space-y-2">
            <Badge variant="secondary" className="text-[10px]">
              {t("serverVersion")}
            </Badge>
            {server ? (
              <ComparisonFields
                isCompleted={server.isCompleted}
                updatedAt={server.updatedAt}
              />
            ) : (
              <p className="text-xs text-muted-foreground">—</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1 min-h-[44px]"
            onClick={handleKeepServer}
            disabled={resolving || !server}
          >
            {resolving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : null}
            {t("keepServer")}
          </Button>
          <Button
            className="flex-1 min-h-[44px]"
            onClick={handleKeepMine}
            disabled={resolving}
          >
            {resolving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : null}
            {t("keepMine")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Field comparison display
// =============================================================================

function ComparisonFields({
  isCompleted,
  notes,
  updatedAt,
}: {
  isCompleted: boolean;
  notes?: string;
  updatedAt: Date;
}) {
  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Status:</span>
        {isCompleted ? (
          <span className="flex items-center gap-0.5 text-green-600">
            <Check className="h-3 w-3" /> Completed
          </span>
        ) : (
          <span className="text-muted-foreground">Incomplete</span>
        )}
      </div>
      {notes !== undefined && (
        <div>
          <span className="text-muted-foreground">Notes:</span>
          <p
            className={cn(
              "mt-0.5 text-[11px] leading-relaxed",
              notes ? "" : "text-muted-foreground italic"
            )}
          >
            {notes || "—"}
          </p>
        </div>
      )}
      <div className="text-[10px] text-muted-foreground">
        {new Date(updatedAt).toLocaleString([], {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </div>
    </div>
  );
}

export type { ConflictData };
