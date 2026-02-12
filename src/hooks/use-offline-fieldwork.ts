"use client";

import { useEffect, useMemo } from "react";
import { useOfflineFieldworkStore } from "@/stores/offline-fieldwork-store";
import { createConnectivityMonitor } from "@/lib/offline/connectivity";
import {
  syncEngine,
  syncChecklistItem,
  syncFieldEvidence,
  syncDraftFinding,
} from "@/lib/offline";

// =============================================================================
// Handler registration (runs once per JS context)
// =============================================================================

let handlersRegistered = false;

function ensureHandlersRegistered(): void {
  if (handlersRegistered) return;
  syncEngine.registerHandler("checklistItem", syncChecklistItem);
  syncEngine.registerHandler("fieldEvidence", syncFieldEvidence);
  syncEngine.registerHandler("draftFinding", syncDraftFinding);
  handlersRegistered = true;
}

// =============================================================================
// Hook
// =============================================================================

export function useOfflineFieldwork(reviewId: string) {
  const store = useOfflineFieldworkStore();

  // Register sync handlers once
  useEffect(() => {
    ensureHandlersRegistered();
  }, []);

  // Initialize store for review + connectivity subscription
  useEffect(() => {
    void store.initializeForReview(reviewId);

    const monitor = createConnectivityMonitor();

    // Seed the store with the monitor's initial value
    store.setOnlineStatus(monitor.isOnline);

    const listener = (online: boolean) => {
      store.setOnlineStatus(online);
    };
    monitor.subscribe(listener);

    return () => {
      monitor.unsubscribe(listener);
      monitor.destroy();
    };
    // Only re-run when reviewId changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  // Stable actions object (never changes between renders)
  const actions = useMemo(
    () => ({
      updateChecklistItem: store.updateChecklistItem,
      addEvidence: store.addEvidence,
      removeEvidence: store.removeEvidence,
      saveDraftFinding: store.saveDraftFinding,
      deleteDraftFinding: store.deleteDraftFinding,
      triggerSync: store.triggerSync,
    }),
    // Zustand store functions are stable references.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return {
    isOnline: store.isOnline,
    syncStatus: store.syncStatus,
    isSyncing: store.isSyncing,
    checklistItems: store.checklistItems,
    evidence: store.evidence,
    draftFindings: store.draftFindings,
    actions,
  };
}
