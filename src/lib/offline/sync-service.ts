import { offlineService, SyncQueueItem } from "./offline-service";
import { useOfflineStore } from "./store";

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: { id: string; error: string }[];
}

const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second

export class SyncService {
  private isSyncing = false;
  private syncPromise: Promise<SyncResult> | null = null;

  /**
   * Trigger sync if online and not already syncing
   */
  async sync(): Promise<SyncResult> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [{ id: "", error: "Offline" }],
      };
    }

    if (this.isSyncing && this.syncPromise) {
      return this.syncPromise;
    }

    this.isSyncing = true;
    useOfflineStore.getState().setSyncing(true);

    this.syncPromise = this.performSync();

    try {
      const result = await this.syncPromise;
      return result;
    } finally {
      this.isSyncing = false;
      this.syncPromise = null;
      useOfflineStore.getState().setSyncing(false);
      await useOfflineStore.getState().updatePendingCount();
    }
  }

  private async performSync(): Promise<SyncResult> {
    const queue = await offlineService.getSyncQueue();
    let synced = 0;
    let failed = 0;
    const errors: { id: string; error: string }[] = [];

    for (const item of queue) {
      if (item.attempts >= MAX_RETRIES) {
        failed++;
        errors.push({ id: item.id, error: "Max retries exceeded" });
        continue;
      }

      try {
        await this.syncItem(item);
        await offlineService.removeSyncItem(item.id);
        synced++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        await offlineService.updateSyncItemError(item.id, errorMessage);
        failed++;
        errors.push({ id: item.id, error: errorMessage });

        // Exponential backoff delay
        const delay = BASE_DELAY * Math.pow(2, item.attempts);
        await this.sleep(delay);
      }
    }

    const success = failed === 0;
    useOfflineStore
      .getState()
      .setSyncError(success ? null : `${failed} items failed to sync`);

    if (synced > 0) {
      useOfflineStore.getState().setLastSyncTime(Date.now());
    }

    return { success, synced, failed, errors };
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    const endpoint = this.getEndpoint(
      item.entityType,
      item.entityId,
      item.action
    );
    const method = this.getMethod(item.action);

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: item.action !== "DELETE" ? JSON.stringify(item.data) : undefined,
      credentials: "include",
    });

    // Handle conflict (409)
    if (response.status === 409) {
      const serverData = await response.json().catch(() => null);
      await this.handleConflict(item, serverData);
      return;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as { message?: string }).message || `HTTP ${response.status}`
      );
    }

    // Update local data with server response
    if (item.action !== "DELETE") {
      const serverData = await response.json().catch(() => null);
      const store = this.getStore(item.entityType);
      if (store && serverData) {
        await offlineService.put(store, serverData, true);
      }
    }
  }

  private async handleConflict(
    item: SyncQueueItem,
    serverData: unknown
  ): Promise<void> {
    // Default: server wins (last-write-wins)
    // Could be enhanced with merge strategies
    const store = this.getStore(item.entityType);
    if (
      store &&
      serverData &&
      typeof serverData === "object" &&
      "id" in serverData
    ) {
      await offlineService.put(
        store,
        serverData as { id: string },
        true
      );
    }

    // Log conflict for review
    console.warn(
      `Sync conflict for ${item.entityType}/${item.entityId}. Server version applied.`
    );
  }

  private getEndpoint(
    entityType: string,
    entityId: string,
    action: string
  ): string {
    const base = "/api/trpc";
    switch (entityType) {
      case "finding":
        return action === "CREATE"
          ? `${base}/finding.create`
          : `${base}/finding.update`;
      case "cap":
        return action === "CREATE" ? `${base}/cap.create` : `${base}/cap.update`;
      case "checklist":
        return `${base}/checklist.saveProgress`;
      case "review":
        return `${base}/review.update`;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  private getMethod(action: string): string {
    // tRPC uses POST for all mutations
    switch (action) {
      case "CREATE":
        return "POST";
      case "UPDATE":
        return "POST";
      case "DELETE":
        return "POST";
      default:
        return "POST";
    }
  }

  private getStore(
    entityType: string
  ): "reviews" | "findings" | "caps" | "checklists" | null {
    switch (entityType) {
      case "review":
        return "reviews";
      case "finding":
        return "findings";
      case "cap":
        return "caps";
      case "checklist":
        return "checklists";
      default:
        return null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Register for background sync (if supported)
   */
  async registerBackgroundSync(): Promise<boolean> {
    if (
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("sync" in ServiceWorkerRegistration.prototype)
    ) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      // TypeScript doesn't have types for Background Sync API
      await (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register("aaprp-sync");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): {
    isSyncing: boolean;
    pendingCount: number;
    lastError: string | null;
  } {
    const state = useOfflineStore.getState();
    return {
      isSyncing: state.isSyncing,
      pendingCount: state.pendingSyncCount,
      lastError: state.lastSyncError,
    };
  }

  /**
   * Clear all failed sync items
   */
  async clearFailedItems(): Promise<number> {
    const queue = await offlineService.getSyncQueue();
    const failedItems = queue.filter((item) => item.attempts >= MAX_RETRIES);

    for (const item of failedItems) {
      await offlineService.removeSyncItem(item.id);
    }

    await useOfflineStore.getState().updatePendingCount();
    return failedItems.length;
  }

  /**
   * Retry all failed items (reset attempt count)
   */
  async retryFailedItems(): Promise<void> {
    const queue = await offlineService.getSyncQueue();
    const db = await import("./db").then((m) => m.getDB());

    for (const item of queue) {
      if (item.attempts >= MAX_RETRIES) {
        await db.put("syncQueue", { ...item, attempts: 0, lastError: undefined });
      }
    }

    await useOfflineStore.getState().updatePendingCount();
  }
}

export const syncService = new SyncService();

// Auto-sync when coming back online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    // Small delay to ensure network is stable
    setTimeout(() => {
      syncService.sync();
    }, 1000);
  });
}
