"use client";

import { useEffect } from "react";
import { useOfflineStore } from "@/lib/offline/store";

export function useNetworkStatus() {
  const {
    isOnline,
    pendingSyncCount,
    isSyncing,
    lastSyncError,
    lastSyncTime,
    updatePendingCount,
  } = useOfflineStore();

  useEffect(() => {
    // Initial count update
    updatePendingCount();

    // Poll pending count periodically (every 30 seconds)
    const interval = setInterval(updatePendingCount, 30000);
    return () => clearInterval(interval);
  }, [updatePendingCount]);

  return {
    isOnline,
    pendingSyncCount,
    isSyncing,
    lastSyncError,
    lastSyncTime,
    hasUnsyncedChanges: pendingSyncCount > 0,
  };
}
