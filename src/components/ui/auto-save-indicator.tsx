"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Cloud, CloudOff, Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SaveStatus } from "@/hooks/useAutoSave";

// =============================================================================
// TYPES
// =============================================================================

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  lastSavedAt: Date | null;
  error?: Error | null;
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}

// =============================================================================
// RELATIVE TIME HOOK
// =============================================================================

function useRelativeTime(date: Date | null, updateInterval = 10000) {
  const [tick, setTick] = useState(0);
  const t = useTranslations("common.autoSave");

  const calculateRelativeTime = useCallback(
    (savedAt: Date | null): string => {
      if (!savedAt) return "";

      const now = new Date();
      const diffMs = now.getTime() - savedAt.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);

      if (diffSeconds < 5) {
        return t("justNow");
      } else if (diffSeconds < 60) {
        return t("secondsAgo", { count: diffSeconds });
      } else if (diffMinutes === 1) {
        return t("oneMinuteAgo");
      } else if (diffMinutes < 60) {
        return t("minutesAgo", { count: diffMinutes });
      } else if (diffHours === 1) {
        return t("oneHourAgo");
      } else {
        return t("hoursAgo", { count: diffHours });
      }
    },
    [t]
  );

  // Compute relative time during render (tick triggers re-computation)
  const relativeTime = date ? calculateRelativeTime(date) : "";
  // Use tick to avoid unused variable warning
  void tick;

  // Effect only for the interval (syncing with external timer)
  useEffect(() => {
    if (!date) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, updateInterval);

    return () => clearInterval(interval);
  }, [date, updateInterval]);

  return relativeTime;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AutoSaveIndicator({
  status,
  lastSavedAt,
  error,
  className,
  showIcon = true,
  compact = false,
}: AutoSaveIndicatorProps) {
  const t = useTranslations("common.autoSave");
  const relativeTime = useRelativeTime(lastSavedAt);

  // Determine display state
  const getDisplayState = () => {
    switch (status) {
      case "saving":
        return {
          icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
          text: t("saving"),
          color: "text-muted-foreground",
          bgColor: "bg-muted/50",
        };
      case "saved":
        return {
          icon: <Check className="h-3.5 w-3.5" />,
          text: t("saved"),
          color: "text-green-600 dark:text-green-500",
          bgColor: "bg-green-50 dark:bg-green-950/30",
        };
      case "error":
        return {
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          text: t("error"),
          color: "text-red-600 dark:text-red-500",
          bgColor: "bg-red-50 dark:bg-red-950/30",
        };
      case "idle":
      default:
        if (lastSavedAt && relativeTime) {
          return {
            icon: <Cloud className="h-3.5 w-3.5" />,
            text: t("autoSaved", { time: relativeTime }),
            color: "text-muted-foreground",
            bgColor: "bg-transparent",
          };
        }
        return {
          icon: <Cloud className="h-3.5 w-3.5" />,
          text: t("allChangesSaved"),
          color: "text-muted-foreground",
          bgColor: "bg-transparent",
        };
    }
  };

  const displayState = getDisplayState();

  // Compact mode - just icon with tooltip
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center justify-center rounded-full p-1.5",
                displayState.bgColor,
                displayState.color,
                "transition-colors duration-200",
                className
              )}
            >
              {displayState.icon}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{displayState.text}</p>
            {error && (
              <p className="text-xs text-red-500 mt-1">{error.message}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full display mode
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs transition-all duration-200",
        displayState.color,
        className
      )}
    >
      {showIcon && displayState.icon}
      <span className="whitespace-nowrap">{displayState.text}</span>
    </div>
  );
}

// =============================================================================
// CLOUD SYNC INDICATOR (Alternative Style)
// =============================================================================

interface CloudSyncIndicatorProps {
  status: SaveStatus;
  lastSavedAt: Date | null;
  className?: string;
}

export function CloudSyncIndicator({
  status,
  lastSavedAt,
  className,
}: CloudSyncIndicatorProps) {
  const t = useTranslations("common.autoSave");
  const relativeTime = useRelativeTime(lastSavedAt);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
              "transition-all duration-300",
              status === "saving" && "text-muted-foreground",
              status === "saved" && "text-green-600 dark:text-green-500",
              status === "error" && "text-red-600 dark:text-red-500",
              status === "idle" && "text-muted-foreground",
              className
            )}
          >
            {status === "saving" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{t("saving")}</span>
              </>
            ) : status === "error" ? (
              <>
                <CloudOff className="h-3.5 w-3.5" />
                <span>{t("error")}</span>
              </>
            ) : (
              <>
                <Cloud className="h-3.5 w-3.5" />
                {lastSavedAt && relativeTime ? (
                  <span>{relativeTime}</span>
                ) : (
                  <span>{t("saved")}</span>
                )}
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {lastSavedAt ? (
            <p>
              {t("lastSavedAt", {
                time: lastSavedAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
            </p>
          ) : (
            <p>{t("noChangesSaved")}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// INLINE SAVE STATUS (Minimal)
// =============================================================================

interface InlineSaveStatusProps {
  status: SaveStatus;
  className?: string;
}

export function InlineSaveStatus({ status, className }: InlineSaveStatusProps) {
  const t = useTranslations("common.autoSave");

  if (status === "idle") return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        status === "saving" && "text-muted-foreground",
        status === "saved" && "text-green-600 dark:text-green-500",
        status === "error" && "text-red-600 dark:text-red-500",
        className
      )}
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{t("saving")}</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-3 w-3" />
          <span>{t("saved")}</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-3 w-3" />
          <span>{t("error")}</span>
        </>
      )}
    </span>
  );
}

export default AutoSaveIndicator;
