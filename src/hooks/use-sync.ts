"use client";

import { useCallback, useEffect } from "react";
import { syncService } from "@/lib/offline/sync-service";
import { useOfflineStore } from "@/lib/offline/store";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function useSync() {
  const t = useTranslations("offline");
  const { isOnline, pendingSyncCount, isSyncing, lastSyncError } =
    useOfflineStore();

  const triggerSync = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    const result = await syncService.sync();

    if (result.synced > 0) {
      toast.success(t("syncComplete"));
    }

    if (result.failed > 0) {
      toast.error(t("syncFailed"));
    }

    return result;
  }, [isOnline, isSyncing, t]);

  const clearFailed = useCallback(async () => {
    const count = await syncService.clearFailedItems();
    if (count > 0) {
      toast.info(`Cleared ${count} failed items`);
    }
    return count;
  }, []);

  const retryFailed = useCallback(async () => {
    await syncService.retryFailedItems();
    toast.info("Retrying failed items...");
    await triggerSync();
  }, [triggerSync]);

  // Auto-sync periodically when online with pending changes
  useEffect(() => {
    if (!isOnline || pendingSyncCount === 0) return;

    // Initial sync after a short delay
    const initialTimeout = setTimeout(() => {
      syncService.sync();
    }, 5000);

    // Periodic sync every minute
    const interval = setInterval(() => {
      syncService.sync();
    }, 60000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isOnline, pendingSyncCount]);

  return {
    triggerSync,
    clearFailed,
    retryFailed,
    isSyncing,
    pendingSyncCount,
    lastSyncError,
    canSync: isOnline && pendingSyncCount > 0 && !isSyncing,
  };
}
