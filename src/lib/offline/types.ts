// =============================================================================
// Offline Fieldwork Types
// =============================================================================

/**
 * Sync status for locally-stored records.
 * Tracks each record's position in the offline → server pipeline.
 */
export type SyncStatus = "pending" | "syncing" | "synced" | "failed" | "conflict";

/**
 * Types of evidence captured during fieldwork.
 */
export enum FieldEvidenceType {
  PHOTO = "PHOTO",
  VOICE_NOTE = "VOICE_NOTE",
  DOCUMENT = "DOCUMENT",
}

// =============================================================================
// Offline entity interfaces
// =============================================================================

/** A single checklist item stored locally for offline fieldwork. */
export interface OfflineChecklistItem {
  id: string;
  reviewId: string;
  itemCode: string;
  phase: "PRE_VISIT" | "ON_SITE" | "POST_VISIT";
  isCompleted: boolean;
  completedAt: Date | null;
  completedById: string | null;
  notes: string;
  updatedAt: Date;
  syncStatus: SyncStatus;
}

/** Evidence blob (photo, voice note, document) captured in the field. */
export interface OfflineFieldEvidence {
  id: string;
  checklistItemId: string;
  reviewId: string;
  type: FieldEvidenceType;
  blob: Blob;
  thumbnailBlob: Blob | null;
  mimeType: string;
  fileName: string;
  fileSize: number;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  gpsAccuracy: number | null;
  capturedAt: Date;
  annotations: string;
  syncStatus: SyncStatus;
}

/** A draft finding created offline, pending sync to server. */
export interface OfflineDraftFinding {
  id: string;
  reviewId: string;
  title: string;
  description: string;
  severity: "CRITICAL" | "MAJOR" | "MINOR" | "OBSERVATION";
  areaCode: string;
  questionId: string | null;
  evidenceIds: string[];
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  createdAt: Date;
  updatedAt: Date;
  syncStatus: SyncStatus;
}

/** Queued sync operation, retried with exponential backoff. */
export interface SyncQueueEntry {
  id: string;
  entityType: "checklistItem" | "fieldEvidence" | "draftFinding" | "offlineSession";
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  payload: string; // JSON-serialised entity snapshot
  retryCount: number;
  maxRetries: number;
  lastAttempt: Date | null;
  error: string | null;
  createdAt: Date;
}

/** Tracks a reviewer's offline working session for audit trail. */
export interface OfflineSession {
  id: string;
  reviewId: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  deviceInfo: string;
  syncedAt: Date | null;
}

// =============================================================================
// Summary helpers
// =============================================================================

/** Counts returned by getOfflineDataSummary(). */
export interface OfflineDataSummary {
  checklistItems: number;
  fieldEvidence: number;
  draftFindings: number;
  syncQueue: number;
}
