"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { ReviewHeader } from "./review-header";
import { ReviewTabs } from "./review-tabs";
import { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog";
import { useReviewKeyboard } from "../_hooks/use-review-keyboard";
import type { ReviewTab } from "../_types";

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

export function ReviewLayout({ review, children, counts }: ReviewLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();

  const [showShortcuts, setShowShortcuts] = useState(false);

  const currentTab = (searchParams.get("tab") as ReviewTab) || "overview";

  const handleTabChange = useCallback(
    (tab: ReviewTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleKeyboardAction = useCallback((action: string) => {
    switch (action) {
      case "showHelp":
        setShowShortcuts(true);
        break;
      case "escape":
        setShowShortcuts(false);
        break;
      case "new":
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
      case "edit":
        router.push(`/${locale}/reviews/${review.id}/edit`);
        break;
    }
  }, [currentTab, router, searchParams, locale, review.id]);

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
      <ReviewHeader review={review} />

      {/* Sticky Tab Bar */}
      <ReviewTabs
        currentTab={currentTab}
        onTabChange={handleTabChange}
        counts={counts}
      />

      {/* Tab Content - no nested scroll, parent main handles scrolling */}
      <div className="flex-1">{children}</div>

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
      />
    </div>
  );
}
