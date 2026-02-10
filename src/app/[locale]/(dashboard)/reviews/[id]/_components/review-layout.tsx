"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ReviewHeader } from "./review-header";
import type { ReviewHeaderAction } from "./review-header";
import { ReviewTabs } from "./review-tabs";
import { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog";
import { useReviewKeyboard } from "../_hooks/use-review-keyboard";
import { useReviewUpdates } from "@/hooks/use-review-updates";
import type { ReviewTab } from "../_types";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { isPusherAvailable } from "@/lib/pusher/client";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ReviewLayoutProps {
  review: {
    id: string;
    reviewNumber: string;
    status: string;
    hostOrganization: { nameEn: string; nameFr: string; code: string };
    reviewType: string;
    scheduledStartDate: Date | null;
    scheduledEndDate: Date | null;
  };
  userId?: string;
  children: React.ReactNode;
  counts: {
    discussions: number;
    openDiscussions: number;
    tasks: number;
    openTasks: number;
    documents: number;
    findings: number;
    criticalFindings: number;
  };
}

export function ReviewLayout({ review, userId, children, counts }: ReviewLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("reviews.detail");
  const tCommon = useTranslations("common");

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  // Subscribe to real-time Pusher updates for this review
  useReviewUpdates({
    reviewId: review.id,
    userId,
    enabled: true,
  });

  // Check for active collaboration session
  const pusherAvailable = isPusherAvailable();
  const { data: activeSession } =
    trpc.collaboration.getActiveSession.useQuery(
      { reviewId: review.id },
      {
        enabled: !!userId,
        refetchInterval: pusherAvailable ? 30000 : 10000,
      }
    );
  const hasActiveSession = !!activeSession;

  const currentTab = (searchParams.get("tab") as ReviewTab) || "overview";

  const cancelMutation = trpc.review.cancel.useMutation({
    onSuccess: () => {
      toast.success(t("cancelSuccess"));
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.review.update.useMutation({
    onSuccess: () => {
      toast.success(t("submitSuccess"));
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleTabChange = useCallback(
    (tab: ReviewTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleHeaderAction = useCallback((action: ReviewHeaderAction) => {
    switch (action) {
      case "edit":
        handleTabChange("settings");
        break;
      case "submit":
        setShowSubmitDialog(true);
        break;
      case "download":
        window.open(`/api/reviews/${review.id}/report`, "_blank");
        break;
      case "upload":
        handleTabChange("documents");
        break;
      case "cancelReview":
        setShowCancelDialog(true);
        break;
    }
  }, [review.id, handleTabChange]);

  const handleCancelConfirm = useCallback(() => {
    if (cancelReason.length < 10) return;
    cancelMutation.mutate(
      { id: review.id, reason: cancelReason },
      {
        onSettled: () => {
          setShowCancelDialog(false);
          setCancelReason("");
        },
      }
    );
  }, [cancelMutation, review.id, cancelReason]);

  const handleSubmitConfirm = useCallback(() => {
    updateMutation.mutate(
      { id: review.id, status: "REPORT_REVIEW" },
      {
        onSettled: () => {
          setShowSubmitDialog(false);
        },
      }
    );
  }, [updateMutation, review.id]);

  const handleKeyboardAction = useCallback((action: string) => {
    switch (action) {
      case "showHelp":
        setShowShortcuts(true);
        break;
      case "escape":
        setShowShortcuts(false);
        break;
      case "new": {
        // Context-aware new action based on current tab
        const params = new URLSearchParams(searchParams.toString());
        if (currentTab === "workspace") {
          params.set("action", "discussion");
        } else if (currentTab === "documents") {
          params.set("action", "upload");
        } else if (currentTab === "findings") {
          params.set("action", "new");
        }
        router.push(`?${params.toString()}`, { scroll: false });
        break;
      }
      case "edit":
        handleTabChange("settings");
        break;
    }
  }, [currentTab, router, searchParams, handleTabChange]);

  // Initialize keyboard navigation
  useReviewKeyboard({
    reviewId: review.id,
    locale,
    onAction: handleKeyboardAction,
  });

  // Listen for custom event from header button
  useEffect(() => {
    const handleShowShortcuts = () => setShowShortcuts(true);
    window.addEventListener("show-keyboard-shortcuts", handleShowShortcuts);
    return () => window.removeEventListener("show-keyboard-shortcuts", handleShowShortcuts);
  }, []);

  return (
    <div className="flex flex-col min-h-0">
      {/* Sticky Header */}
      <ReviewHeader review={review} onAction={handleHeaderAction} />

      {/* Sticky Tab Bar */}
      <ReviewTabs
        currentTab={currentTab}
        onTabChange={handleTabChange}
        counts={counts}
        hasActiveSession={hasActiveSession}
      />

      {/* Tab Content - no nested scroll, parent main handles scrolling */}
      <div className="flex-1">{children}</div>

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
      />

      {/* Cancel Review Confirmation */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmCancel.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmCancel.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="cancel-reason">{t("confirmCancel.reasonLabel")}</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t("confirmCancel.reasonPlaceholder")}
              rows={3}
            />
            {cancelReason.length > 0 && cancelReason.length < 10 && (
              <p className="text-xs text-destructive">
                {t("confirmCancel.reasonMinLength")}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              disabled={cancelReason.length < 10 || cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("actions.cancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit Report Confirmation */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmSubmit.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmSubmit.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitConfirm}
              disabled={updateMutation.isPending}
            >
              {t("actions.submit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
