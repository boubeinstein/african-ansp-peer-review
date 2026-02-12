"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  AlertCircle,
  Eye,
  Info,
  Plus,
  Camera,
  Loader2,
  Check,
  X,
  Trash2,
  ClipboardList,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { OfflineDraftFinding, SyncStatus } from "@/lib/offline/types";

// =============================================================================
// Props
// =============================================================================

interface DraftFindingsListProps {
  reviewId: string;
  onAdd: () => void;
  onEdit: (finding: OfflineDraftFinding) => void;
}

// =============================================================================
// Component
// =============================================================================

export function DraftFindingsList({
  reviewId,
  onAdd,
  onEdit,
}: DraftFindingsListProps) {
  const t = useTranslations("fieldwork.findings");
  const findings = useOfflineFieldworkStore((s) => s.draftFindings);
  const deleteDraftFinding = useOfflineFieldworkStore(
    (s) => s.deleteDraftFinding
  );

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filter to current review
  const reviewFindings = findings.filter((f) => f.reviewId === reviewId);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDraftFinding(deleteTarget);
      toast.success(t("deleted"));
    } catch {
      toast.error(t("deleteFailed"));
    } finally {
      setDeleteTarget(null);
      setDeleting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (reviewFindings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {t("empty")}
          </p>
          <p className="text-xs text-muted-foreground/70">
            {t("emptyDescription")}
          </p>
        </div>
        <Button onClick={onAdd} className="min-h-[44px]">
          <Plus className="h-4 w-4 mr-1.5" />
          {t("addNew")}
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // List
  // ---------------------------------------------------------------------------

  return (
    <div className="relative">
      <div className="space-y-2">
        {reviewFindings.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            onTap={() => onEdit(finding)}
            onDelete={() => setDeleteTarget(finding.id)}
          />
        ))}
      </div>

      {/* FAB */}
      <div className="sticky bottom-4 flex justify-end mt-4 pointer-events-none">
        <Button
          onClick={onAdd}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg pointer-events-auto"
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">{t("addNew")}</span>
        </Button>
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription")}
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
              {deleting && (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              )}
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =============================================================================
// Finding card with swipe-to-delete
// =============================================================================

function FindingCard({
  finding,
  onTap,
  onDelete,
}: {
  finding: OfflineDraftFinding;
  onTap: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("fieldwork.findings");
  const cardRef = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const committedRef = useRef(false);

  const SWIPE_THRESHOLD = 80;

  // Touch handlers for swipe-to-delete
  function onTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    committedRef.current = false;
    setSwiping(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!swiping) return;
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;

    // If vertical scroll is dominant, abort swipe
    if (!committedRef.current && Math.abs(dy) > Math.abs(dx)) {
      setSwiping(false);
      setOffsetX(0);
      return;
    }
    committedRef.current = true;

    // Only allow left swipe (negative)
    if (dx < 0) {
      setOffsetX(dx);
    }
  }

  function onTouchEnd() {
    if (offsetX < -SWIPE_THRESHOLD) {
      onDelete();
    }
    setOffsetX(0);
    setSwiping(false);
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Delete backdrop */}
      <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center">
        <Trash2 className="h-5 w-5 text-white" />
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        className="relative bg-card border rounded-lg p-3 transition-transform cursor-pointer active:bg-muted/50"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? "none" : "transform 200ms ease-out",
        }}
        onClick={onTap}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-start gap-3">
          {/* Severity icon */}
          <SeverityIcon severity={finding.severity} />

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-medium leading-snug truncate">
              {finding.title}
            </p>

            <div className="flex items-center gap-1.5 flex-wrap">
              <SeverityBadge severity={finding.severity} />

              {finding.areaCode && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {finding.areaCode}
                </Badge>
              )}

              {finding.evidenceIds.length > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Camera className="h-3 w-3" />
                  {finding.evidenceIds.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{formatRelativeTime(finding.createdAt)}</span>
              <SyncDot status={finding.syncStatus} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Severity icon
// =============================================================================

function SeverityIcon({
  severity,
}: {
  severity: OfflineDraftFinding["severity"];
}) {
  const config = {
    CRITICAL: { icon: AlertTriangle, color: "text-red-500" },
    MAJOR: { icon: AlertCircle, color: "text-orange-500" },
    MINOR: { icon: Info, color: "text-yellow-600" },
    OBSERVATION: { icon: Eye, color: "text-blue-500" },
  };
  const { icon: Icon, color } = config[severity];
  return <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", color)} />;
}

// =============================================================================
// Severity badge
// =============================================================================

function SeverityBadge({
  severity,
}: {
  severity: OfflineDraftFinding["severity"];
}) {
  const t = useTranslations("fieldwork.findings");
  const variants: Record<string, string> = {
    CRITICAL:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    MAJOR:
      "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
    MINOR:
      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    OBSERVATION:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  };

  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] px-1.5 py-0", variants[severity])}
    >
      {t(`severity.${severity}`)}
    </Badge>
  );
}

// =============================================================================
// Sync dot
// =============================================================================

function SyncDot({ status }: { status: SyncStatus }) {
  const colors: Record<SyncStatus, string> = {
    synced: "bg-green-500",
    pending: "bg-amber-400",
    syncing: "bg-amber-400 animate-pulse",
    failed: "bg-red-500",
    conflict: "bg-red-500",
  };

  const labels: Record<SyncStatus, string> = {
    synced: "Synced",
    pending: "Pending",
    syncing: "Syncing",
    failed: "Failed",
    conflict: "Conflict",
  };

  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("h-1.5 w-1.5 rounded-full", colors[status])} />
      <span>{labels[status]}</span>
    </span>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffS = Math.floor((now - then) / 1000);

  if (diffS < 60) return "just now";
  if (diffS < 3600) return `${Math.floor(diffS / 60)}m ago`;
  if (diffS < 86400) return `${Math.floor(diffS / 3600)}h ago`;
  return `${Math.floor(diffS / 86400)}d ago`;
}
