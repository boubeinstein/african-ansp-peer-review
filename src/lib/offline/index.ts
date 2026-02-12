export { getDB, clearAllData } from "./db";
export type { AAProfflineDB } from "./db";

export { offlineService, OfflineService } from "./offline-service";
export type { SyncQueueItem } from "./offline-service";

export { useOfflineStore } from "./store";

export { syncService, SyncService } from "./sync-service";

// Fieldwork offline layer (Dexie)
export { FieldworkDatabase, fieldworkDB } from "./fieldwork-db";
export {
  getStorageEstimate,
  requestPersistentStorage,
  clearOldSyncedData,
  getOfflineDataSummary,
  exportReviewData,
} from "./storage-manager";
export type {
  SyncStatus,
  FieldEvidenceType,
  OfflineChecklistItem,
  OfflineFieldEvidence,
  OfflineDraftFinding,
  SyncQueueEntry,
  OfflineSession,
  OfflineDataSummary,
} from "./types";

// Fieldwork sync engine
export {
  SyncEngine,
  SyncConflictError,
  SyncRetryableError,
  syncEngine,
} from "./sync-engine";
export type { SyncEngineStatus, SyncHandler } from "./sync-engine";
export {
  syncChecklistItem,
  syncFieldEvidence,
  syncDraftFinding,
} from "./sync-handlers";
export {
  createConnectivityMonitor,
  onReconnect,
} from "./connectivity";
export type { ConnectivityMonitor } from "./connectivity";

// Cache manager
export {
  cacheReviewForOffline,
  isCachedForOffline,
  clearReviewCache,
  getCachedReviews,
} from "./cache-manager";
