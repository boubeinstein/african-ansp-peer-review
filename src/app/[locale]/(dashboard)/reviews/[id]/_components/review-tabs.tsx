"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  AlertTriangle,
  FileOutput,
  Settings,
} from "lucide-react";
import type { ReviewTab } from "../_types";
import { REVIEW_TABS } from "../_types";

interface ReviewTabsProps {
  currentTab: ReviewTab;
  onTabChange: (tab: ReviewTab) => void;
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

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  MessageSquare,
  FileText,
  AlertTriangle,
  FileOutput,
  Settings,
};

const TAB_ORDER: ReviewTab[] = ["overview", "workspace", "documents", "findings", "report", "settings"];

export function ReviewTabs({ currentTab, onTabChange, counts }: ReviewTabsProps) {
  const t = useTranslations("reviews.detail.tabs");
  const tA11y = useTranslations("reviews.detail.accessibility");

  const getTabBadge = (tabId: ReviewTab): { count: number; variant: "default" | "destructive" | "secondary" } | null => {
    switch (tabId) {
      case "workspace":
        const workspaceCount = counts.openDiscussions + counts.openTasks;
        return workspaceCount > 0 ? { count: workspaceCount, variant: "default" } : null;
      case "documents":
        return counts.documents > 0 ? { count: counts.documents, variant: "secondary" } : null;
      case "findings":
        if (counts.criticalFindings > 0) {
          return { count: counts.findings, variant: "destructive" };
        }
        return counts.findings > 0 ? { count: counts.findings, variant: "default" } : null;
      default:
        return null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, tabId: ReviewTab) => {
    const currentIndex = TAB_ORDER.indexOf(tabId);

    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextTab = TAB_ORDER[(currentIndex + 1) % TAB_ORDER.length];
      onTabChange(nextTab);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevTab = TAB_ORDER[(currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length];
      onTabChange(prevTab);
    } else if (e.key === "Home") {
      e.preventDefault();
      onTabChange(TAB_ORDER[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      onTabChange(TAB_ORDER[TAB_ORDER.length - 1]);
    }
  };

  return (
    <div className="sticky top-[73px] z-30 bg-background border-b">
      <div className="px-4 md:px-6">
        <nav
          className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px"
          role="tablist"
          aria-label={tA11y("tabNavigation")}
        >
          {REVIEW_TABS.map((tab) => {
            const Icon = iconMap[tab.icon];
            const badge = getTabBadge(tab.id);
            const isActive = currentTab === tab.id;

            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onTabChange(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span className="hidden sm:inline">{t(tab.labelKey)}</span>
                {badge && (
                  <Badge
                    variant={badge.variant}
                    className={cn(
                      "ml-1 h-5 min-w-5 px-1.5 text-xs",
                      badge.variant === "destructive" && "animate-pulse"
                    )}
                  >
                    {badge.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
