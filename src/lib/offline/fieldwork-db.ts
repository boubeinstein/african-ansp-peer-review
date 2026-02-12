import Dexie, { type Table } from "dexie";
import type {
  OfflineChecklistItem,
  OfflineFieldEvidence,
  OfflineDraftFinding,
  SyncQueueEntry,
  OfflineSession,
} from "./types";

// =============================================================================
// Database definition
// =============================================================================

export class FieldworkDatabase extends Dexie {
  checklistItems!: Table<OfflineChecklistItem, string>;
  fieldEvidence!: Table<OfflineFieldEvidence, string>;
  draftFindings!: Table<OfflineDraftFinding, string>;
  syncQueue!: Table<SyncQueueEntry, string>;
  offlineSessions!: Table<OfflineSession, string>;

  constructor() {
    super("aaprp-fieldwork");

    this.version(1).stores({
      // Indexed properties — Dexie auto-creates a primary key from the first listed field.
      // Remaining entries become secondary indexes.
      checklistItems: "id, reviewId, syncStatus",
      fieldEvidence: "id, checklistItemId, reviewId, syncStatus",
      draftFindings: "id, reviewId, syncStatus",
      syncQueue: "id, entityType, createdAt",
      offlineSessions: "id, reviewId, userId",
    });
  }
}

// Singleton instance
export const fieldworkDB = new FieldworkDatabase();
