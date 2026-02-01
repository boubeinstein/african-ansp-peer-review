"use client";

/**
 * Status Transition Dialog
 *
 * Shows available status transitions with validation conditions.
 * Enforces state machine rules before allowing status changes.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@/types/prisma-enums";

// =============================================================================
// TYPES
// =============================================================================

interface StatusTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  currentStatus: ReviewStatus;
  reviewReference: string;
  onSuccess?: () => void;
}

// Status display configuration
const STATUS_CONFIG: Record<ReviewStatus, { color: string; label: string }> = {
  REQUESTED: { color: "bg-blue-100 text-blue-800", label: "Requested" },
  APPROVED: { color: "bg-green-100 text-green-800", label: "Approved" },
  PLANNING: { color: "bg-purple-100 text-purple-800", label: "Planning" },
  SCHEDULED: { color: "bg-indigo-100 text-indigo-800", label: "Scheduled" },
  IN_PROGRESS: { color: "bg-yellow-100 text-yellow-800", label: "In Progress" },
  REPORT_DRAFTING: { color: "bg-orange-100 text-orange-800", label: "Report Drafting" },
  REPORT_REVIEW: { color: "bg-pink-100 text-pink-800", label: "Report Review" },
  COMPLETED: { color: "bg-emerald-100 text-emerald-800", label: "Completed" },
  CANCELLED: { color: "bg-red-100 text-red-800", label: "Cancelled" },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function StatusTransitionDialog({
  open,
  onOpenChange,
  reviewId,
  currentStatus,
  reviewReference,
  onSuccess,
}: StatusTransitionDialogProps) {
  const t = useTranslations("reviews.statusTransition");
  const [selectedStatus, setSelectedStatus] = useState<ReviewStatus | null>(null);
  const [reason, setReason] = useState("");

  const utils = trpc.useUtils();

  // Fetch available transitions
  const { data: availableTransitions, isLoading } =
    trpc.review.getAvailableTransitions.useQuery(
      { reviewId },
      { enabled: open }
    );

  // Transition mutation
  const transitionMutation = trpc.review.transitionStatus.useMutation({
    onSuccess: (data) => {
      const statusLabel = data?.status
        ? (STATUS_CONFIG[data.status as ReviewStatus]?.label || data.status)
        : "unknown";
      toast.success(t("success"), {
        description: t("successDescription", { status: statusLabel }),
      });
      utils.review.getById.invalidate({ id: reviewId });
      utils.review.list.invalidate();
      utils.review.getAvailableTransitions.invalidate({ reviewId });
      onOpenChange(false);
      setSelectedStatus(null);
      setReason("");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(t("error"), {
        description: error.message,
      });
    },
  });

  const handleTransition = () => {
    if (!selectedStatus) return;

    transitionMutation.mutate({
      reviewId,
      targetStatus: selectedStatus,
      reason: reason || undefined,
    });
  };

  const selectedTransition = availableTransitions?.find(
    (t) => t.targetStatus === selectedStatus
  );

  const requiresReason = selectedStatus === "CANCELLED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description", { reference: reviewReference })}
          </DialogDescription>
        </DialogHeader>

        {/* Current Status */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">
              {t("currentStatus")}
            </Label>
            <div className="mt-1">
              <Badge className={cn("text-sm", STATUS_CONFIG[currentStatus]?.color)}>
                {STATUS_CONFIG[currentStatus]?.label || currentStatus}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Available Transitions */}
          <div>
            <Label className="text-sm text-muted-foreground mb-3 block">
              {t("availableTransitions")}
            </Label>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !availableTransitions || availableTransitions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t("noTransitionsAvailable")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableTransitions.map((transition) => {
                  const isSelected = selectedStatus === transition.targetStatus;
                  const statusConfig = STATUS_CONFIG[transition.targetStatus];

                  return (
                    <button
                      key={transition.targetStatus}
                      type="button"
                      onClick={() => setSelectedStatus(transition.targetStatus)}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50",
                        !transition.canTransition && "opacity-60"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <Badge className={cn("text-sm", statusConfig?.color)}>
                            {statusConfig?.label || transition.targetStatus}
                          </Badge>
                        </div>
                        {transition.canTransition ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>

                      {/* Conditions */}
                      <div className="mt-2 space-y-1">
                        {transition.conditions.map((condition, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm"
                          >
                            {condition.met ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            )}
                            <span
                              className={cn(
                                condition.met
                                  ? "text-muted-foreground"
                                  : "text-foreground"
                              )}
                            >
                              {condition.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Warnings */}
                      {transition.warnings && transition.warnings.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {transition.warnings.map((warning, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-sm text-amber-600"
                            >
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>{warning}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reason field for cancellation */}
          {requiresReason && selectedStatus && (
            <>
              <Separator />
              <div>
                <Label htmlFor="reason">{t("reasonLabel")}</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("reasonPlaceholder")}
                  className="mt-1.5"
                  rows={3}
                />
                {requiresReason && reason.length < 10 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("reasonRequired")}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSelectedStatus(null);
              setReason("");
            }}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleTransition}
            disabled={
              !selectedStatus ||
              !selectedTransition?.canTransition ||
              transitionMutation.isPending ||
              (requiresReason && reason.length < 10)
            }
          >
            {transitionMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("transitioning")}
              </>
            ) : (
              <>
                {t("confirmTransition")}
                {selectedStatus && (
                  <ArrowRight className="h-4 w-4 ml-2" />
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
