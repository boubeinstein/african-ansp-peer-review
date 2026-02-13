import { fieldworkDB } from "./fieldwork-db";
import type { SyncQueueEntry, SyncStatus } from "./types";

// =============================================================================
// Constants
// =============================================================================

const _MAX_RETRIES = 3;
/** Exponential backoff base — delays: 5 s, 15 s, 45 s */
const BACKOFF_BASE_MS = 5_000;
const BACKOFF_MULTIPLIER = 3;
/** Completed entries older than this are eligible for clearCompleted(). */
const COMPLETED_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

// =============================================================================
// Types
// =============================================================================

export interface SyncEngineStatus {
  pending: number;
  failed: number;
  conflicts: number;
  lastSyncAt: Date | null;
}

export type SyncHandler = (entry: SyncQueueEntry) => Promise<void>;

/** Thrown by a handler to signal a 409 conflict. */
export class SyncConflictError extends Error {
  constructor(message = "Conflict") {
    super(message);
    this.name = "SyncConflictError";
  }
}

/** Thrown by a handler to signal a retryable server error (5xx). */
export class SyncRetryableError extends Error {
  constructor(message = "Server error") {
    super(message);
    this.name = "SyncRetryableError";
  }
}

// =============================================================================
// Sync Engine
// =============================================================================

export class SyncEngine {
  private handlers = new Map<string, SyncHandler>();
  private processing = false;
  private lastSyncAt: Date | null = null;

  // ---------------------------------------------------------------------------
  // Handler registration
  // ---------------------------------------------------------------------------

  /** Register a handler that knows how to push a given entityType to the server. */
  registerHandler(entityType: string, handler: SyncHandler): void {
    this.handlers.set(entityType, handler);
  }

  // ---------------------------------------------------------------------------
  // Enqueue
  // ---------------------------------------------------------------------------

  /**
   * Add an operation to the sync queue.
   * Returns the generated queue entry id.
   */
  async enqueue(
    entry: Omit<SyncQueueEntry, "id" | "createdAt" | "retryCount" | "lastAttempt" | "error">
  ): Promise<string> {
    const id = crypto.randomUUID();
    const queueEntry: SyncQueueEntry = {
      ...entry,
      id,
      retryCount: 0,
      lastAttempt: null,
      error: null,
      createdAt: new Date(),
    };
    await fieldworkDB.syncQueue.add(queueEntry);
    return id;
  }

  // ---------------------------------------------------------------------------
  // Process queue (FIFO, sequential)
  // ---------------------------------------------------------------------------

  /**
   * Process all pending entries in FIFO order.
   * Skips entries that have exhausted retries.
   * Returns the number of entries successfully synced.
   */
  async processQueue(): Promise<number> {
    if (this.processing) return 0;
    this.processing = true;

    let synced = 0;

    try {
      const entries = await fieldworkDB.syncQueue
        .orderBy("createdAt")
        .filter((e) => e.retryCount < e.maxRetries)
        .toArray();

      for (const entry of entries) {
        const handler = this.handlers.get(entry.entityType);
        if (!handler) {
          await this.markFailed(entry, `No handler for entityType "${entry.entityType}"`);
          continue;
        }

        try {
          await handler(entry);
          // Success — remove from queue and mark entity synced
          await fieldworkDB.syncQueue.delete(entry.id);
          await this.updateEntitySyncStatus(entry.entityType, entry.entityId, "synced");
          synced++;
        } catch (err) {
          if (err instanceof SyncConflictError) {
            await this.markConflict(entry, err.message);
            // Stop processing this entity but continue with others
          } else {
            await this.markRetry(entry, err instanceof Error ? err.message : "Unknown error");
            // Exponential backoff before next entry
            const delay = BACKOFF_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, entry.retryCount);
            await sleep(delay);
          }
        }
      }

      if (synced > 0) {
        this.lastSyncAt = new Date();
      }
    } finally {
      this.processing = false;
    }

    return synced;
  }

  // ---------------------------------------------------------------------------
  // Status / maintenance
  // ---------------------------------------------------------------------------

  /** Snapshot of the queue state. */
  async getSyncStatus(): Promise<SyncEngineStatus> {
    const all = await fieldworkDB.syncQueue.toArray();

    let pending = 0;
    let failed = 0;
    let conflicts = 0;

    for (const entry of all) {
      if (entry.retryCount >= entry.maxRetries) {
        failed++;
      } else {
        pending++;
      }
    }

    // Count conflict-status entities across the three data tables
    const [ciConflicts, feConflicts, dfConflicts] = await Promise.all([
      fieldworkDB.checklistItems.where("syncStatus").equals("conflict").count(),
      fieldworkDB.fieldEvidence.where("syncStatus").equals("conflict").count(),
      fieldworkDB.draftFindings.where("syncStatus").equals("conflict").count(),
    ]);
    conflicts = ciConflicts + feConflicts + dfConflicts;

    return { pending, failed, conflicts, lastSyncAt: this.lastSyncAt };
  }

  /** Reset retryCount for all failed entries so they'll be retried. */
  async retryFailed(): Promise<number> {
    const failed = await fieldworkDB.syncQueue
      .filter((e) => e.retryCount >= e.maxRetries)
      .toArray();

    if (failed.length === 0) return 0;

    await fieldworkDB.syncQueue.bulkPut(
      failed.map((e) => ({
        ...e,
        retryCount: 0,
        error: null,
        lastAttempt: null,
      }))
    );

    // Also reset the entity syncStatus from 'failed' back to 'pending'
    for (const entry of failed) {
      await this.updateEntitySyncStatus(entry.entityType, entry.entityId, "pending");
    }

    return failed.length;
  }

  /** Remove queue entries that were synced more than 24 h ago. */
  async clearCompleted(): Promise<number> {
    const cutoff = new Date(Date.now() - COMPLETED_TTL_MS);
    // Synced entries have already been removed in processQueue,
    // but clean up any orphans created by earlier sessions.
    const old = await fieldworkDB.syncQueue
      .filter((e) => e.retryCount >= e.maxRetries && e.lastAttempt !== null && e.lastAttempt < cutoff)
      .toArray();

    if (old.length === 0) return 0;
    await fieldworkDB.syncQueue.bulkDelete(old.map((e) => e.id));
    return old.length;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async markFailed(entry: SyncQueueEntry, errorMsg: string): Promise<void> {
    await fieldworkDB.syncQueue.update(entry.id, {
      retryCount: entry.maxRetries, // exhaust retries immediately
      lastAttempt: new Date(),
      error: errorMsg,
    });
    await this.updateEntitySyncStatus(entry.entityType, entry.entityId, "failed");
  }

  private async markConflict(entry: SyncQueueEntry, errorMsg: string): Promise<void> {
    await fieldworkDB.syncQueue.update(entry.id, {
      retryCount: entry.maxRetries, // don't auto-retry conflicts
      lastAttempt: new Date(),
      error: errorMsg,
    });
    await this.updateEntitySyncStatus(entry.entityType, entry.entityId, "conflict");
  }

  private async markRetry(entry: SyncQueueEntry, errorMsg: string): Promise<void> {
    await fieldworkDB.syncQueue.update(entry.id, {
      retryCount: entry.retryCount + 1,
      lastAttempt: new Date(),
      error: errorMsg,
    });
    // Keep entity in 'syncing' or reset to 'pending' — we use 'pending' so the
    // UI doesn't show a stale "syncing" spinner between retries.
    await this.updateEntitySyncStatus(entry.entityType, entry.entityId, "pending");
  }

  /** Update syncStatus on the source entity table. */
  private async updateEntitySyncStatus(
    entityType: string,
    entityId: string,
    status: SyncStatus
  ): Promise<void> {
    switch (entityType) {
      case "checklistItem":
        await fieldworkDB.checklistItems.update(entityId, { syncStatus: status });
        break;
      case "fieldEvidence":
        await fieldworkDB.fieldEvidence.update(entityId, { syncStatus: status });
        break;
      case "draftFinding":
        await fieldworkDB.draftFindings.update(entityId, { syncStatus: status });
        break;
      // offlineSession has no syncStatus field — skip
    }
  }
}

// =============================================================================
// Singleton
// =============================================================================

export const syncEngine = new SyncEngine();

// =============================================================================
// Helpers
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
