"use client";

import { useSyncExternalStore } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WifiOff, CloudOff, RefreshCw } from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export function OfflineIndicator() {
  const t = useTranslations("offline");
  const mounted = useIsMounted();
  const { isOnline, pendingSyncCount, isSyncing, hasUnsyncedChanges } =
    useNetworkStatus();

  // Render nothing during SSR to avoid hydration mismatch
  if (!mounted) return null;

  // Don't render if online and nothing pending
  if (isOnline && !hasUnsyncedChanges) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium cursor-default",
              isOnline
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            {!isOnline ? (
              <WifiOff className="h-3.5 w-3.5" />
            ) : isSyncing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CloudOff className="h-3.5 w-3.5" />
            )}
            <span>
              {!isOnline
                ? t("offline")
                : pendingSyncCount > 0
                  ? `${pendingSyncCount} ${t("pending")}`
                  : null}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {!isOnline ? (
            <p>{t("offlineTooltip")}</p>
          ) : (
            <p>{t("pendingTooltip", { count: pendingSyncCount })}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
