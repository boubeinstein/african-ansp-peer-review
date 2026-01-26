"use client";

/**
 * Review Action Button Component
 *
 * Smart action button that adapts based on review state and user permissions.
 * Shows the primary next action for the review workflow with confirmation dialogs.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import type { ReviewStatus } from "@prisma/client";

// UI Components
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Icons
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileCheck,
  FileText,
  Loader2,
  Play,
  Send,
  UserPlus,
  XCircle,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface ReviewActionButtonProps {
  reviewId: string;
  onAssignTeam?: () => void;
  onSetDates?: () => void;
  onSuccess?: () => void;
  className?: string;
}

// Button variant type
type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";

// Action icon mapping
const ACTION_ICONS: Record<string, typeof ArrowRight> = {
  approveRequest: CheckCircle2,
  cancelRequest: XCircle,
  assignTeam: UserPlus,
  startPlanning: ArrowRight,
  setDates: Calendar,
  scheduleReview: Calendar,
  startReview: Play,
  completeFieldwork: FileCheck,
  submitForReview: Send,
  finalizeReport: CheckCircle2,
  requestRevisions: FileText,
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewActionButton({
  reviewId,
  onAssignTeam,
  onSetDates,
  onSuccess,
  className,
}: ReviewActionButtonProps) {
  const t = useTranslations("review.workflow");
  const utils = trpc.useUtils();

  // State
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{
    action: string;
    targetStatus: string | null;
    variant: string;
  } | null>(null);
  const [notes, setNotes] = useState("");

  // Fetch next actions - only when reviewId is valid
  const { data: actionsData, isLoading: isLoadingActions } =
    trpc.review.getNextActions.useQuery(
      { reviewId },
      { enabled: !!reviewId && reviewId.length > 0 }
    );

  // Transition mutation
  const transitionMutation = trpc.review.transitionStatus.useMutation({
    onSuccess: (data) => {
      const statusKey = data?.status ? data.status.toLowerCase() : "unknown";
      toast.success(t("transitionSuccess", { status: t(`status.${statusKey}`) }));
      utils.review.getById.invalidate({ id: reviewId });
      utils.review.getNextActions.invalidate({ reviewId });
      setConfirmDialogOpen(false);
      setSelectedAction(null);
      setNotes("");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || t("transitionError"));
    },
  });

  // Handle action click
  const handleActionClick = (action: {
    action: string;
    targetStatus: string | null;
    requiresConfirmation: boolean;
    variant: string;
  }) => {
    // Handle special actions that open dialogs/wizards
    if (action.action === "assignTeam") {
      onAssignTeam?.();
      return;
    }
    if (action.action === "setDates") {
      onSetDates?.();
      return;
    }

    // Handle status transitions
    if (action.targetStatus) {
      if (action.requiresConfirmation) {
        setSelectedAction(action);
        setConfirmDialogOpen(true);
      } else {
        executeTransition(action.targetStatus);
      }
    }
  };

  // Execute the transition
  const executeTransition = (targetStatus: string) => {
    transitionMutation.mutate({
      reviewId,
      targetStatus: targetStatus as ReviewStatus,
      notes: notes || undefined,
    });
  };

  // Loading state
  if (isLoadingActions) {
    return (
      <Button disabled className={className}>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        {t("loading")}
      </Button>
    );
  }

  // No actions data
  if (!actionsData) {
    return null;
  }

  const { primaryAction, secondaryActions, review: reviewContext } = actionsData;

  // No primary action available
  if (!primaryAction || !primaryAction.canPerform) {
    // Show status-only indicator for non-actionable states
    if (reviewContext.status === "COMPLETED") {
      return (
        <Button variant="outline" disabled className={className}>
          <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
          {t("completed")}
        </Button>
      );
    }
    if (reviewContext.status === "CANCELLED") {
      return (
        <Button variant="outline" disabled className={className}>
          <XCircle className="h-4 w-4 mr-2 text-red-500" />
          {t("cancelled")}
        </Button>
      );
    }
    // User doesn't have permission for current action
    return (
      <Button variant="outline" disabled className={className}>
        <Clock className="h-4 w-4 mr-2" />
        {t("awaitingAction")}
      </Button>
    );
  }

  const PrimaryIcon = ACTION_ICONS[primaryAction.action] || ArrowRight;
  // Filter out any null values and type-safe the array
  const validSecondaryActions = secondaryActions.filter(
    (action): action is NonNullable<typeof action> => action !== null
  );
  const hasSecondaryActions = validSecondaryActions.length > 0;

  return (
    <>
      {/* Main Button with optional dropdown */}
      <div className="flex">
        <Button
          variant={primaryAction.variant as ButtonVariant}
          onClick={() => handleActionClick(primaryAction)}
          disabled={transitionMutation.isPending}
          className={`${hasSecondaryActions ? "rounded-r-none" : ""} ${className}`}
        >
          {transitionMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <PrimaryIcon className="h-4 w-4 mr-2" />
          )}
          {t(`actions.${primaryAction.action}`)}
        </Button>

        {hasSecondaryActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={primaryAction.variant as ButtonVariant}
                className="rounded-l-none border-l-0 px-2"
                disabled={transitionMutation.isPending}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {validSecondaryActions.map((action) => {
                const Icon = ACTION_ICONS[action.action] || ArrowRight;
                return (
                  <DropdownMenuItem
                    key={action.action}
                    onClick={() => handleActionClick(action)}
                    className={
                      action.variant === "destructive" ? "text-destructive" : ""
                    }
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {t(`actions.${action.action}`)}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedAction && t(`confirmTitle.${selectedAction.action}`)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAction && t(`confirmDescription.${selectedAction.action}`)}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Optional notes field for some actions */}
          {selectedAction &&
            ["cancelRequest", "requestRevisions"].includes(selectedAction.action) && (
              <div className="space-y-2 py-2">
                <Label htmlFor="notes">
                  {selectedAction.action === "cancelRequest"
                    ? t("cancellationReason")
                    : t("revisionNotes")}
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("notesPlaceholder")}
                  rows={3}
                />
              </div>
            )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={transitionMutation.isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedAction?.targetStatus &&
                executeTransition(selectedAction.targetStatus)
              }
              disabled={transitionMutation.isPending}
              className={
                selectedAction?.variant === "destructive"
                  ? "bg-destructive hover:bg-destructive/90"
                  : ""
              }
            >
              {transitionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("processing")}
                </>
              ) : (
                t("confirm")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ReviewActionButton;
