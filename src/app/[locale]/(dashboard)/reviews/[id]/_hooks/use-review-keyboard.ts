"use client";

import { useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReviewTab } from "../_types";

interface UseReviewKeyboardOptions {
  reviewId: string;
  locale: string;
  onAction?: (action: string) => void;
}

const TAB_SHORTCUTS: Record<string, ReviewTab> = {
  "1": "overview",
  "2": "workspace",
  "3": "documents",
  "4": "findings",
  "5": "report",
  "6": "settings",
};

export function useReviewKeyboard({ reviewId, locale, onAction }: UseReviewKeyboardOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigateToTab = useCallback(
    (tab: ReviewTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.push(`/${locale}/reviews/${reviewId}?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, locale, reviewId]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Tab navigation with g + number (GitHub style)
      if (event.key === "g") {
        // Set up listener for next key
        const handleNextKey = (e: KeyboardEvent) => {
          const tab = TAB_SHORTCUTS[e.key];
          if (tab) {
            e.preventDefault();
            navigateToTab(tab);
          }
          document.removeEventListener("keydown", handleNextKey);
        };

        // Remove listener after timeout
        setTimeout(() => {
          document.removeEventListener("keydown", handleNextKey);
        }, 1000);

        document.addEventListener("keydown", handleNextKey);
        return;
      }

      // Direct number shortcuts with Alt/Option key
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const tab = TAB_SHORTCUTS[event.key];
        if (tab) {
          event.preventDefault();
          navigateToTab(tab);
          return;
        }
      }

      // Action shortcuts
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        switch (event.key) {
          case "?":
            // Show keyboard shortcuts help
            event.preventDefault();
            onAction?.("showHelp");
            break;
          case "n":
            // New item (context-dependent)
            event.preventDefault();
            onAction?.("new");
            break;
          case "e":
            // Edit
            event.preventDefault();
            onAction?.("edit");
            break;
          case "Escape":
            // Close dialogs/panels
            onAction?.("escape");
            break;
        }
      }

      // Cmd/Ctrl shortcuts
      if ((event.metaKey || event.ctrlKey) && !event.altKey) {
        switch (event.key) {
          case "s":
            // Save
            event.preventDefault();
            onAction?.("save");
            break;
          case "k":
            // Quick search/command palette
            event.preventDefault();
            onAction?.("search");
            break;
        }
      }
    },
    [navigateToTab, onAction]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { navigateToTab };
}
