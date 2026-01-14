"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  RefreshCw,
  GitMerge,
  Trash2,
  FileEdit,
} from "lucide-react";
import type { PQAmendmentStatus } from "@prisma/client";

interface AmendmentBadgeProps {
  status: PQAmendmentStatus;
  previousPQNumber?: string | null;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const statusConfig: Record<
  PQAmendmentStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    colorClasses: string;
    show: boolean;
  }
> = {
  NO_CHANGE: {
    icon: () => null,
    colorClasses: "",
    show: false,
  },
  NEW: {
    icon: Sparkles,
    colorClasses:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-800",
    show: true,
  },
  REVISED: {
    icon: RefreshCw,
    colorClasses:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-400 dark:border-amber-800",
    show: true,
  },
  MERGED: {
    icon: GitMerge,
    colorClasses:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-800",
    show: true,
  },
  DELETED: {
    icon: Trash2,
    colorClasses:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-400 dark:border-red-800",
    show: true,
  },
  REFERENCE_REVISED: {
    icon: FileEdit,
    colorClasses:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    show: true,
  },
};

export function AmendmentBadge({
  status,
  previousPQNumber,
  showLabel = true,
  size = "sm",
  className,
}: AmendmentBadgeProps) {
  const t = useTranslations("questionDetail.amendment");

  const config = statusConfig[status];

  if (!config.show) {
    return null;
  }

  const Icon = config.icon;
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium gap-1",
        config.colorClasses,
        textSize,
        className
      )}
    >
      <Icon className={iconSize} />
      {showLabel && (
        <span>
          {t(status)}
          {previousPQNumber && status === "MERGED" && (
            <span className="ml-1 opacity-75">
              ({t("from")} {previousPQNumber})
            </span>
          )}
          {previousPQNumber && status === "REVISED" && (
            <span className="ml-1 opacity-75">
              ({t("was")} {previousPQNumber})
            </span>
          )}
        </span>
      )}
    </Badge>
  );
}

// Utility component for displaying multiple amendment indicators
interface AmendmentIndicatorsProps {
  status: PQAmendmentStatus;
  previousPQNumber?: string | null;
  isNewIn2024?: boolean;
  className?: string;
}

export function AmendmentIndicators({
  status,
  previousPQNumber,
  isNewIn2024,
  className,
}: AmendmentIndicatorsProps) {
  const t = useTranslations("questionDetail.amendment");

  // If status is NEW and isNewIn2024 is also true, only show NEW badge
  if (status === "NEW" || (status === "NO_CHANGE" && isNewIn2024)) {
    return (
      <div className={cn("flex flex-wrap gap-1", className)}>
        <Badge
          variant="outline"
          className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-800 text-xs font-medium gap-1"
        >
          <Sparkles className="h-3 w-3" />
          {t("NEW")}
        </Badge>
      </div>
    );
  }

  // Show the regular amendment badge
  if (status !== "NO_CHANGE") {
    return (
      <div className={cn("flex flex-wrap gap-1", className)}>
        <AmendmentBadge
          status={status}
          previousPQNumber={previousPQNumber}
          size="sm"
        />
      </div>
    );
  }

  return null;
}
