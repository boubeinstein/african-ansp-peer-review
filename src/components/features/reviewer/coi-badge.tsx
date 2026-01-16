"use client";

/**
 * COI Badge Component
 *
 * Visual indicator for conflict of interest severity and status.
 */

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle, Ban, CheckCircle2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

// =============================================================================
// TYPES
// =============================================================================

export type COISeverity = "HARD" | "SOFT";
export type COIStatus = "ACTIVE" | "WAIVED" | "EXPIRED";

interface COIBadgeProps {
  severity: COISeverity;
  status: COIStatus;
  showLabel?: boolean;
  showTooltip?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function getSeverityStyles(severity: COISeverity): {
  bg: string;
  text: string;
  border: string;
} {
  if (severity === "HARD") {
    return {
      bg: "bg-red-100",
      text: "text-red-800",
      border: "border-red-300",
    };
  }
  return {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-300",
  };
}

function getStatusStyles(status: COIStatus): {
  bg: string;
  text: string;
} {
  switch (status) {
    case "ACTIVE":
      return { bg: "bg-red-500", text: "text-white" };
    case "WAIVED":
      return { bg: "bg-green-500", text: "text-white" };
    case "EXPIRED":
      return { bg: "bg-gray-400", text: "text-white" };
  }
}

function getSeverityIcon(severity: COISeverity, size: string) {
  const iconClass = cn(
    size === "sm" && "h-3 w-3",
    size === "md" && "h-4 w-4",
    size === "lg" && "h-5 w-5"
  );

  if (severity === "HARD") {
    return <Ban className={iconClass} />;
  }
  return <AlertTriangle className={iconClass} />;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function COIBadge({
  severity,
  status,
  showLabel = true,
  showTooltip = true,
  size = "md",
  className,
}: COIBadgeProps) {
  const t = useTranslations("reviewer.coi");

  const severityStyles = getSeverityStyles(severity);
  const statusStyles = getStatusStyles(status);

  const badgeContent = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium",
        severityStyles.bg,
        severityStyles.text,
        severityStyles.border,
        status === "EXPIRED" && "opacity-60",
        size === "sm" && "text-xs px-1.5 py-0.5",
        size === "md" && "text-sm px-2 py-1",
        size === "lg" && "text-base px-3 py-1.5",
        className
      )}
    >
      {getSeverityIcon(severity, size)}
      {showLabel && (
        <span>{t(`severity.${severity}`)}</span>
      )}
      {status !== "ACTIVE" && (
        <Badge
          className={cn(
            "ml-1 px-1 py-0 text-[10px]",
            statusStyles.bg,
            statusStyles.text
          )}
        >
          {t(`status.${status}`)}
        </Badge>
      )}
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{t(`severity.${severity}`)}</p>
          <p className="text-xs text-muted-foreground">
            {severity === "HARD"
              ? t("severity.hardDescription")
              : t("severity.softDescription")}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// COI STATUS INDICATOR
// =============================================================================

interface COIStatusIndicatorProps {
  hasConflict: boolean;
  severity?: COISeverity | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function COIStatusIndicator({
  hasConflict,
  severity,
  size = "md",
  className,
}: COIStatusIndicatorProps) {
  const t = useTranslations("reviewer.coi.check");

  const iconClass = cn(
    size === "sm" && "h-4 w-4",
    size === "md" && "h-5 w-5",
    size === "lg" && "h-6 w-6"
  );

  if (!hasConflict) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-1.5 text-green-600", className)}>
              <CheckCircle2 className={iconClass} />
              {size !== "sm" && <span className="text-sm">{t("noConflict")}</span>}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("noConflict")}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const isHard = severity === "HARD";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1.5",
              isHard ? "text-red-600" : "text-yellow-600",
              className
            )}
          >
            {isHard ? (
              <XCircle className={iconClass} />
            ) : (
              <AlertTriangle className={iconClass} />
            )}
            {size !== "sm" && (
              <span className="text-sm">
                {isHard ? t("cannotAssign") : t("hasConflict")}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isHard ? t("cannotAssign") : t("hasConflict")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default COIBadge;
