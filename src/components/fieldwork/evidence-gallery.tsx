"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  MapPin,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Clock,
  X,
  Mic,
  Play,
  Pause,
  Pen,
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
import { FieldEvidenceType } from "@/lib/offline/types";
import { fieldworkDB } from "@/lib/offline/fieldwork-db";
import type { OfflineFieldEvidence, SyncStatus } from "@/lib/offline/types";
import { PhotoAnnotator } from "./photo-annotator";

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
  const [annotatingItem, setAnnotatingItem] = useState<OfflineFieldEvidence | null>(null);

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
      if (viewItem?.id === deleteTarget) setViewItem(null);
    } catch {
      toast.error(t("deleteFailed"));
    } finally {
      setDeleteTarget(null);
      setDeleting(false);
    }
  }

  async function handleAnnotationSave(annotatedBlob: Blob) {
    if (!annotatingItem) return;
    try {
      // Update the evidence blob in Dexie (keep original in annotations metadata)
      await fieldworkDB.fieldEvidence.update(annotatingItem.id, {
        blob: annotatedBlob,
        fileSize: annotatedBlob.size,
        annotations: "annotated",
        syncStatus: "pending" as SyncStatus,
      });

      // Refresh the store
      const state = useOfflineFieldworkStore.getState();
      await state.initializeForReview(annotatingItem.reviewId);

      toast.success(t("evidenceCaptured"));
      setAnnotatingItem(null);
      setViewItem(null);
    } catch {
      toast.error(t("evidenceFailed"));
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
              onAnnotate={
                viewItem.type === FieldEvidenceType.PHOTO
                  ? () => setAnnotatingItem(viewItem)
                  : undefined
              }
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

      {/* Photo annotator */}
      {annotatingItem && (
        <PhotoAnnotator
          imageBlob={annotatingItem.blob}
          onSave={(blob) => void handleAnnotationSave(blob)}
          onCancel={() => setAnnotatingItem(null)}
        />
      )}
    </>
  );
}

// =============================================================================
// Thumbnail card — differentiates PHOTO vs VOICE_NOTE
// =============================================================================

function ThumbnailCard({
  evidence,
  onClick,
}: {
  evidence: OfflineFieldEvidence;
  onClick: () => void;
}) {
  const isVoice = evidence.type === FieldEvidenceType.VOICE_NOTE;
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isVoice) return; // No image URL needed for voice notes
    const blob = evidence.thumbnailBlob ?? evidence.blob;
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [evidence.thumbnailBlob, evidence.blob, isVoice]);

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative aspect-square rounded-lg overflow-hidden border focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]",
        isVoice ? "bg-violet-50 dark:bg-violet-950/30" : "bg-muted"
      )}
    >
      {isVoice ? (
        // Voice note thumbnail
        <div className="flex flex-col items-center justify-center h-full gap-1">
          <Mic className="h-6 w-6 text-violet-500" />
          <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400">
            {evidence.annotations || "—"}
          </span>
        </div>
      ) : (
        // Photo thumbnail
        url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Evidence thumbnail"
            className="h-full w-full object-cover"
          />
        )
      )}

      {/* GPS badge */}
      {evidence.gpsLatitude !== null && (
        <span className="absolute top-1 left-1 flex items-center justify-center h-5 w-5 rounded-full bg-black/50 text-white">
          <MapPin className="h-3 w-3" />
        </span>
      )}

      {/* Annotation indicator */}
      {!isVoice && evidence.annotations === "annotated" && (
        <span className="absolute bottom-6 right-1 flex items-center justify-center h-5 w-5 rounded-full bg-blue-500/80 text-white">
          <Pen className="h-2.5 w-2.5" />
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
// Full evidence detail — PHOTO or VOICE_NOTE
// =============================================================================

function EvidenceDetail({
  evidence,
  onDelete,
  onAnnotate,
}: {
  evidence: OfflineFieldEvidence;
  onDelete: () => void;
  onAnnotate?: () => void;
}) {
  const t = useTranslations("fieldwork.checklist");
  const isVoice = evidence.type === FieldEvidenceType.VOICE_NOTE;

  return (
    <div className="space-y-4">
      {/* Media content */}
      {isVoice ? (
        <AudioPlayer blob={evidence.blob} />
      ) : (
        <ImagePreview blob={evidence.blob} />
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

        {evidence.annotations === "annotated" && !isVoice && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600">
            <Pen className="h-3.5 w-3.5" />
            {t("annotated")}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {onAnnotate && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-h-[44px] gap-1.5"
            onClick={onAnnotate}
          >
            <Pen className="h-4 w-4" />
            {t("annotate")}
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          className={cn("min-h-[44px]", onAnnotate ? "flex-1" : "w-full")}
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          {t("delete")}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// ImagePreview — full-size photo with object URL management
// =============================================================================

function ImagePreview({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  if (!url) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Evidence full size"
      className="w-full rounded-lg object-contain max-h-[400px]"
    />
  );
}

// =============================================================================
// AudioPlayer — plays voice note blob with progress bar
// =============================================================================

function AudioPlayer({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      cancelAnimationFrame(rafRef.current);
    };
  }, [blob]);

  function togglePlay() {
    if (!url) return;

    if (playing && audioRef.current) {
      audioRef.current.pause();
      cancelAnimationFrame(rafRef.current);
      setPlaying(false);
      return;
    }

    const audio = audioRef.current ?? new Audio(url);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    };

    audio.onended = () => {
      setPlaying(false);
      setProgress(0);
      cancelAnimationFrame(rafRef.current);
    };

    function tick() {
      if (audioRef.current && audioDuration > 0) {
        setProgress(audioRef.current.currentTime / audioDuration);
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    audio.play();
    setPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-violet-50/50 dark:bg-violet-950/20 p-4">
      <Button
        variant="ghost"
        size="icon"
        className="h-12 w-12 rounded-full shrink-0 bg-violet-100 hover:bg-violet-200 dark:bg-violet-900 dark:hover:bg-violet-800"
        onClick={togglePlay}
      >
        {playing ? (
          <Pause className="h-5 w-5 text-violet-700 dark:text-violet-300" />
        ) : (
          <Play className="h-5 w-5 text-violet-700 dark:text-violet-300" />
        )}
      </Button>

      <div className="flex-1 space-y-1">
        {/* Progress bar */}
        <div className="h-2 rounded-full bg-violet-200 dark:bg-violet-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-violet-500 transition-all duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
          <span>{formatMMSS(playing && audioRef.current ? audioRef.current.currentTime : 0)}</span>
          <span>{audioDuration > 0 ? formatMMSS(audioDuration) : "—"}</span>
        </div>
      </div>

      <Mic className="h-5 w-5 text-violet-400 shrink-0" />
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

function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
