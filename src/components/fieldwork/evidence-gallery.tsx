"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  MapPin,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Clock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useOfflineFieldworkStore } from "@/stores/offline-fieldwork-store";
import type { OfflineFieldEvidence, SyncStatus } from "@/lib/offline/types";

// =============================================================================
// Props
// =============================================================================

interface EvidenceGalleryProps {
  checklistItemId: string;
}

// =============================================================================
// Component
// =============================================================================

export function EvidenceGallery({ checklistItemId }: EvidenceGalleryProps) {
  const t = useTranslations("fieldwork.checklist");
  const evidenceMap = useOfflineFieldworkStore((s) => s.evidence);
  const removeEvidence = useOfflineFieldworkStore((s) => s.removeEvidence);

  const items = useMemo(
    () => evidenceMap.get(checklistItemId) ?? [],
    [evidenceMap, checklistItemId]
  );

  const [viewItem, setViewItem] = useState<OfflineFieldEvidence | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (items.length === 0) return null;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeEvidence(deleteTarget);
      toast.success(t("evidenceDeleted"));
      // Close detail view if we just deleted the viewed item
      if (viewItem?.id === deleteTarget) setViewItem(null);
    } catch {
      toast.error(t("deleteFailed"));
    } finally {
      setDeleteTarget(null);
      setDeleting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {items.map((ev) => (
          <ThumbnailCard
            key={ev.id}
            evidence={ev}
            onClick={() => setViewItem(ev)}
          />
        ))}
      </div>

      {/* Full-size detail dialog */}
      <Dialog open={viewItem !== null} onOpenChange={(open) => !open && setViewItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("evidence")}</DialogTitle>
          </DialogHeader>

          {viewItem && (
            <EvidenceDetail
              evidence={viewItem}
              onDelete={() => setDeleteTarget(viewItem.id)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteEvidenceTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteEvidenceDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// =============================================================================
// Thumbnail card
// =============================================================================

function ThumbnailCard({
  evidence,
  onClick,
}: {
  evidence: OfflineFieldEvidence;
  onClick: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const blob = evidence.thumbnailBlob ?? evidence.blob;
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [evidence.thumbnailBlob, evidence.blob]);

  return (
    <button
      onClick={onClick}
      className="relative aspect-square rounded-lg overflow-hidden border bg-muted focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Evidence thumbnail"
          className="h-full w-full object-cover"
        />
      )}

      {/* GPS badge */}
      {evidence.gpsLatitude !== null && (
        <span className="absolute top-1 left-1 flex items-center justify-center h-5 w-5 rounded-full bg-black/50 text-white">
          <MapPin className="h-3 w-3" />
        </span>
      )}

      {/* Sync status dot */}
      <span
        className={cn(
          "absolute top-1 right-1 h-2.5 w-2.5 rounded-full border border-white",
          syncDotColor(evidence.syncStatus)
        )}
      />

      {/* Timestamp */}
      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5 truncate px-1">
        {formatTime(evidence.capturedAt)}
      </span>
    </button>
  );
}

// =============================================================================
// Full evidence detail
// =============================================================================

function EvidenceDetail({
  evidence,
  onDelete,
}: {
  evidence: OfflineFieldEvidence;
  onDelete: () => void;
}) {
  const t = useTranslations("fieldwork.checklist");
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(evidence.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [evidence.blob]);

  return (
    <div className="space-y-4">
      {/* Full image */}
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Evidence full size"
          className="w-full rounded-lg object-contain max-h-[400px]"
        />
      )}

      {/* Metadata */}
      <div className="space-y-2 text-sm">
        {evidence.gpsLatitude !== null && evidence.gpsLongitude !== null && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>
              {evidence.gpsLatitude.toFixed(6)}, {evidence.gpsLongitude.toFixed(6)}
            </span>
            {evidence.gpsAccuracy !== null && (
              <span className="text-[10px]">
                (±{evidence.gpsAccuracy.toFixed(0)}m)
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>{formatDateTime(evidence.capturedAt)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <SyncStatusBadge status={evidence.syncStatus} />
        </div>

        {evidence.annotations && (
          <p className="text-muted-foreground border-l-2 pl-2 text-xs">
            {evidence.annotations}
          </p>
        )}
      </div>

      {/* Delete button */}
      <Button
        variant="destructive"
        size="sm"
        className="w-full min-h-[44px]"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4 mr-1.5" />
        {t("delete")}
      </Button>
    </div>
  );
}

// =============================================================================
// Sync status badge
// =============================================================================

function SyncStatusBadge({ status }: { status: SyncStatus }) {
  switch (status) {
    case "synced":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-green-600">
          <Check className="h-3.5 w-3.5" /> Synced
        </span>
      );
    case "pending":
    case "syncing":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
          <Loader2 className={cn("h-3.5 w-3.5", status === "syncing" && "animate-spin")} />
          {status === "syncing" ? "Syncing…" : "Pending"}
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5" /> Failed
        </span>
      );
    case "conflict":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-red-600">
          <X className="h-3.5 w-3.5" /> Conflict
        </span>
      );
  }
}

// =============================================================================
// Helpers
// =============================================================================

function syncDotColor(status: SyncStatus): string {
  switch (status) {
    case "synced":
      return "bg-green-500";
    case "pending":
    case "syncing":
      return "bg-amber-400";
    case "failed":
    case "conflict":
      return "bg-red-500";
  }
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
