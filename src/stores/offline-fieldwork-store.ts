"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { fieldworkDB } from "@/lib/offline/fieldwork-db";
import { syncEngine } from "@/lib/offline/sync-engine";
import type {
  OfflineChecklistItem,
  OfflineFieldEvidence,
  OfflineDraftFinding,
  SyncStatus,
} from "@/lib/offline/types";
import type { SyncEngineStatus } from "@/lib/offline/sync-engine";

// =============================================================================
// Constants
// =============================================================================

const MAX_RETRIES = 3;
const RECONNECT_SYNC_DELAY_MS = 2_000;

// =============================================================================
// State shape
// =============================================================================

interface OfflineFieldworkState {
  isOnline: boolean;
  syncStatus: SyncEngineStatus;
  isSyncing: boolean;
  activeReviewId: string | null;
  checklistItems: Map<string, OfflineChecklistItem>;
  evidence: Map<string, OfflineFieldEvidence[]>;
  draftFindings: OfflineDraftFinding[];
  storageUsed: number;
}

interface OfflineFieldworkActions {
  initializeForReview: (reviewId: string) => Promise<void>;
  updateChecklistItem: (
    itemId: string,
    updates: Partial<OfflineChecklistItem>
  ) => Promise<void>;
  addEvidence: (
    checklistItemId: string,
    evidence: Omit<OfflineFieldEvidence, "id" | "syncStatus">
  ) => Promise<void>;
  removeEvidence: (evidenceId: string) => Promise<void>;
  saveDraftFinding: (finding: Partial<OfflineDraftFinding> & { reviewId: string }) => Promise<void>;
  deleteDraftFinding: (findingId: string) => Promise<void>;
  triggerSync: () => Promise<void>;
  refreshSyncStatus: () => Promise<void>;
  setOnlineStatus: (online: boolean) => void;
}

export type OfflineFieldworkStore = OfflineFieldworkState & OfflineFieldworkActions;

// =============================================================================
// Initial state
// =============================================================================

const initialState: OfflineFieldworkState = {
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  syncStatus: { pending: 0, failed: 0, conflicts: 0, lastSyncAt: null },
  isSyncing: false,
  activeReviewId: null,
  checklistItems: new Map(),
  evidence: new Map(),
  draftFindings: [],
  storageUsed: 0,
};

// =============================================================================
// Store
// =============================================================================

export const useOfflineFieldworkStore = create<OfflineFieldworkStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // -------------------------------------------------------------------
      // initializeForReview
      // -------------------------------------------------------------------

      async initializeForReview(reviewId: string) {
        const [items, evidenceRows, findings] = await Promise.all([
          fieldworkDB.checklistItems.where("reviewId").equals(reviewId).toArray(),
          fieldworkDB.fieldEvidence.where("reviewId").equals(reviewId).toArray(),
          fieldworkDB.draftFindings.where("reviewId").equals(reviewId).toArray(),
        ]);

        // Build maps
        const checklistItems = new Map<string, OfflineChecklistItem>();
        for (const item of items) {
          checklistItems.set(item.id, item);
        }

        const evidence = new Map<string, OfflineFieldEvidence[]>();
        for (const row of evidenceRows) {
          const existing = evidence.get(row.checklistItemId) ?? [];
          existing.push(row);
          evidence.set(row.checklistItemId, existing);
        }

        // Storage estimate
        let storageUsed = 0;
        if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
          const est = await navigator.storage.estimate();
          storageUsed = est.usage ?? 0;
        }

        const syncStatus = await syncEngine.getSyncStatus();

        set({
          activeReviewId: reviewId,
          checklistItems,
          evidence,
          draftFindings: findings,
          storageUsed,
          syncStatus,
        });
      },

      // -------------------------------------------------------------------
      // updateChecklistItem
      // -------------------------------------------------------------------

      async updateChecklistItem(itemId, updates) {
        const state = get();
        const existing = state.checklistItems.get(itemId);
        if (!existing) return;

        const updated: OfflineChecklistItem = {
          ...existing,
          ...updates,
          updatedAt: new Date(),
          syncStatus: "pending" as SyncStatus,
        };

        // Persist to Dexie
        await fieldworkDB.checklistItems.put(updated);

        // Enqueue sync
        await syncEngine.enqueue({
          entityType: "checklistItem",
          entityId: itemId,
          action: "UPDATE",
          payload: JSON.stringify(updated),
          maxRetries: MAX_RETRIES,
        });

        // Update in-memory state
        const newMap = new Map(state.checklistItems);
        newMap.set(itemId, updated);
        set({ checklistItems: newMap });
        await get().refreshSyncStatus();
      },

      // -------------------------------------------------------------------
      // addEvidence
      // -------------------------------------------------------------------

      async addEvidence(checklistItemId, evidenceData) {
        const id = crypto.randomUUID();
        const record: OfflineFieldEvidence = {
          ...evidenceData,
          id,
          syncStatus: "pending",
        };

        // Persist to Dexie
        await fieldworkDB.fieldEvidence.add(record);

        // Enqueue sync (payload excludes blob — handler reads from Dexie)
        await syncEngine.enqueue({
          entityType: "fieldEvidence",
          entityId: id,
          action: "CREATE",
          payload: JSON.stringify({ id, checklistItemId, reviewId: record.reviewId }),
          maxRetries: MAX_RETRIES,
        });

        // Update in-memory state
        const state = get();
        const newMap = new Map(state.evidence);
        const list = [...(newMap.get(checklistItemId) ?? []), record];
        newMap.set(checklistItemId, list);
        set({ evidence: newMap });
        await get().refreshSyncStatus();
      },

      // -------------------------------------------------------------------
      // removeEvidence
      // -------------------------------------------------------------------

      async removeEvidence(evidenceId) {
        // Find the record to get its checklistItemId
        const record = await fieldworkDB.fieldEvidence.get(evidenceId);
        if (!record) return;

        // Soft-delete: mark as pending deletion in Dexie
        await fieldworkDB.fieldEvidence.update(evidenceId, {
          syncStatus: "pending" as SyncStatus,
        });

        // Enqueue DELETE sync
        await syncEngine.enqueue({
          entityType: "fieldEvidence",
          entityId: evidenceId,
          action: "DELETE",
          payload: JSON.stringify({ id: evidenceId }),
          maxRetries: MAX_RETRIES,
        });

        // Remove from in-memory state
        const state = get();
        const newMap = new Map(state.evidence);
        const list = (newMap.get(record.checklistItemId) ?? []).filter(
          (e) => e.id !== evidenceId
        );
        if (list.length > 0) {
          newMap.set(record.checklistItemId, list);
        } else {
          newMap.delete(record.checklistItemId);
        }
        set({ evidence: newMap });
        await get().refreshSyncStatus();
      },

      // -------------------------------------------------------------------
      // saveDraftFinding
      // -------------------------------------------------------------------

      async saveDraftFinding(finding) {
        const state = get();
        const now = new Date();

        // Upsert: check if we already have this finding
        const existingIdx = finding.id
          ? state.draftFindings.findIndex((f) => f.id === finding.id)
          : -1;

        let record: OfflineDraftFinding;
        let action: "CREATE" | "UPDATE";

        if (existingIdx >= 0) {
          // Update existing
          const existing = state.draftFindings[existingIdx];
          record = {
            ...existing,
            ...finding,
            updatedAt: now,
            syncStatus: "pending" as SyncStatus,
          };
          action = "UPDATE";
        } else {
          // Create new
          record = {
            id: crypto.randomUUID(),
            reviewId: finding.reviewId,
            title: finding.title ?? "",
            description: finding.description ?? "",
            severity: finding.severity ?? "OBSERVATION",
            areaCode: finding.areaCode ?? "",
            questionId: finding.questionId ?? null,
            evidenceIds: finding.evidenceIds ?? [],
            gpsLatitude: finding.gpsLatitude ?? null,
            gpsLongitude: finding.gpsLongitude ?? null,
            createdAt: now,
            updatedAt: now,
            syncStatus: "pending",
          };
          action = "CREATE";
        }

        // Persist to Dexie
        await fieldworkDB.draftFindings.put(record);

        // Enqueue sync
        await syncEngine.enqueue({
          entityType: "draftFinding",
          entityId: record.id,
          action,
          payload: JSON.stringify(record),
          maxRetries: MAX_RETRIES,
        });

        // Update in-memory state
        const newFindings = [...state.draftFindings];
        if (existingIdx >= 0) {
          newFindings[existingIdx] = record;
        } else {
          newFindings.push(record);
        }
        set({ draftFindings: newFindings });
        await get().refreshSyncStatus();
      },

      // -------------------------------------------------------------------
      // deleteDraftFinding
      // -------------------------------------------------------------------

      async deleteDraftFinding(findingId) {
        await fieldworkDB.draftFindings.delete(findingId);

        const state = get();
        set({
          draftFindings: state.draftFindings.filter((f) => f.id !== findingId),
        });
        await get().refreshSyncStatus();
      },

      // -------------------------------------------------------------------
      // triggerSync
      // -------------------------------------------------------------------

      async triggerSync() {
        const state = get();
        if (state.isSyncing || !state.isOnline) return;

        set({ isSyncing: true });
        try {
          await syncEngine.processQueue();
        } finally {
          set({ isSyncing: false });
          await get().refreshSyncStatus();
        }
      },

      // -------------------------------------------------------------------
      // refreshSyncStatus
      // -------------------------------------------------------------------

      async refreshSyncStatus() {
        const syncStatus = await syncEngine.getSyncStatus();
        set({ syncStatus });
      },

      // -------------------------------------------------------------------
      // setOnlineStatus
      // -------------------------------------------------------------------

      setOnlineStatus(online) {
        const wasOffline = !get().isOnline;
        set({ isOnline: online });

        // Auto-trigger sync when coming back online
        if (online && wasOffline) {
          setTimeout(() => {
            void get().triggerSync();
          }, RECONNECT_SYNC_DELAY_MS);
        }
      },
    }),
    { name: "offline-fieldwork" }
  )
);
