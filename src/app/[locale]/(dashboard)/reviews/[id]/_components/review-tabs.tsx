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

const iconMap = {
  LayoutDashboard,
  MessageSquare,
  FileText,
  AlertTriangle,
  FileOutput,
  Settings,
};

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

export function ReviewTabs({ currentTab, onTabChange, counts }: ReviewTabsProps) {
  const t = useTranslations("reviews.detail.tabs");

  // Determine badges for each tab
  const getBadge = (tabId: ReviewTab): { count?: number; variant?: "default" | "destructive" | "secondary" | "outline" } => {
    switch (tabId) {
      case "workspace":
        // Show open discussions + tasks count
        const workspaceCount = counts.openDiscussions + counts.openTasks;
        return workspaceCount > 0 ? { count: workspaceCount, variant: "default" } : {};
      case "documents":
        return counts.documents > 0 ? { count: counts.documents } : {};
      case "findings":
        if (counts.criticalFindings > 0) {
          return { count: counts.findings, variant: "destructive" };
        }
        return counts.findings > 0 ? { count: counts.findings, variant: "outline" } : {};
      default:
        return {};
    }
  };

  return (
    <div className="sticky top-[57px] z-30 bg-background border-b">
      <nav className="flex overflow-x-auto px-4 md:px-6" aria-label="Review tabs">
        <div className="flex gap-1">
          {REVIEW_TABS.map((tab) => {
            const Icon = iconMap[tab.icon as keyof typeof iconMap];
            const badge = getBadge(tab.id);
            const isActive = currentTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{t(tab.labelKey)}</span>
                {badge.count !== undefined && badge.count > 0 && (
                  <Badge
                    variant={badge.variant || "secondary"}
                    className={cn(
                      "ml-1 h-5 min-w-[20px] px-1.5 text-xs",
                      badge.variant === "destructive" && "animate-pulse"
                    )}
                  >
                    {badge.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
