"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Rocket,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  runPreflightCheck,
  type PreflightCheckResult,
  type CheckStatus,
} from "@/lib/offline/preflight-check";

// =============================================================================
// Props
// =============================================================================

interface PreflightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  onReady: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function PreflightDialog({
  open,
  onOpenChange,
  reviewId,
  onReady,
}: PreflightDialogProps) {
  const t = useTranslations("fieldwork.preflight");
  const [checks, setChecks] = useState<PreflightCheckResult[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [allPassed, setAllPassed] = useState(false);
  const [hasFailure, setHasFailure] = useState(false);

  // ---------------------------------------------------------------------------
  // Run checks when dialog opens
  // ---------------------------------------------------------------------------

  const runChecks = useCallback(async () => {
    setChecks([]);
    setDone(false);
    setAllPassed(false);
    setHasFailure(false);
    setRunning(true);

    const result = await runPreflightCheck(reviewId, (check) => {
      setChecks((prev) => [...prev, check]);
    });

    setRunning(false);
    setDone(true);
    setAllPassed(result.ready && result.checks.every((c) => c.status === "pass"));
    setHasFailure(!result.ready);

    // Auto-proceed after 1s if all checks pass
    if (result.ready && result.checks.every((c) => c.status === "pass")) {
      setTimeout(() => {
        onReady();
        onOpenChange(false);
      }, 1000);
    }
  }, [reviewId, onReady, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    // Async preflight checks need to set state as results arrive
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runChecks();
  }, [open, runChecks]);

  // ---------------------------------------------------------------------------
  // Check names map
  // ---------------------------------------------------------------------------

  const checkLabels: Record<string, string> = {
    indexeddb: t("checks.indexeddb"),
    camera: t("checks.camera"),
    microphone: t("checks.microphone"),
    gps: t("checks.gps"),
    reviewData: t("checks.reviewData"),
    storage: t("checks.storage"),
  };

  // Total expected checks
  const totalChecks = 6;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {/* Checks list */}
        <div className="space-y-2">
          {checks.map((check, i) => (
            <CheckRow
              key={check.name}
              label={checkLabels[check.name] ?? check.name}
              status={check.status}
              message={check.message}
              delay={i * 50}
            />
          ))}

          {/* Pending checks (not yet run) */}
          {running &&
            Array.from({ length: totalChecks - checks.length }).map((_, i) => (
              <CheckRow
                key={`pending-${i}`}
                label="..."
                status="running"
                message=""
                delay={0}
              />
            ))}
        </div>

        {/* Result message */}
        {done && (
          <div
            className={cn(
              "rounded-lg p-3 text-sm text-center animate-in fade-in-50 duration-300",
              allPassed
                ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                : hasFailure
                  ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
            )}
          >
            {allPassed
              ? t("allPassed")
              : hasFailure
                ? t("hasFailed")
                : t("hasWarnings")}
          </div>
        )}

        {/* Actions */}
        {done && !allPassed && (
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t("close")}
            </Button>
            {!hasFailure && (
              <Button
                className="flex-1"
                onClick={() => {
                  onReady();
                  onOpenChange(false);
                }}
              >
                {t("proceed")}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Check row
// =============================================================================

function CheckRow({
  label,
  status,
  message,
  delay,
}: {
  label: string;
  status: CheckStatus | "running";
  message: string;
  delay: number;
}) {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border p-2.5 animate-in fade-in-50 slide-in-from-left-2"
      style={{ animationDelay: `${delay}ms` }}
    >
      <StatusIcon status={status} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {message && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Status icon
// =============================================================================

function StatusIcon({ status }: { status: CheckStatus | "running" }) {
  switch (status) {
    case "pass":
      return <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />;
    case "fail":
      return <XCircle className="h-5 w-5 text-red-500 shrink-0" />;
    case "running":
      return <Loader2 className="h-5 w-5 text-muted-foreground animate-spin shrink-0" />;
  }
}
