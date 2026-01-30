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

export function ReviewTabs({ currentTab, onTabChange, counts }: ReviewTabsProps) {
  const t = useTranslations("reviews.detail.tabs");

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

  return (
    <div className="sticky top-[73px] z-30 bg-background border-b">
      <div className="px-4 md:px-6">
        <nav className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px" role="tablist">
          {REVIEW_TABS.map((tab) => {
            const Icon = iconMap[tab.icon];
            const badge = getTabBadge(tab.id);
            const isActive = currentTab === tab.id;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
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
