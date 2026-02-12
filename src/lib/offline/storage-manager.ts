import { fieldworkDB } from "./fieldwork-db";
import type { OfflineDataSummary } from "./types";

// =============================================================================
// Storage quota helpers
// =============================================================================

interface StorageEstimate {
  usedBytes: number;
  quotaBytes: number;
}

/**
 * Returns the device's storage usage and quota via the Storage API.
 * Falls back to zeros when the API is unavailable (e.g. SSR, older browsers).
 */
export async function getStorageEstimate(): Promise<StorageEstimate> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return { usedBytes: 0, quotaBytes: 0 };
  }
  const est = await navigator.storage.estimate();
  return {
    usedBytes: est.usage ?? 0,
    quotaBytes: est.quota ?? 0,
  };
}

/**
 * Requests persistent storage so the browser won't evict our data
 * under storage pressure.  Returns true if granted.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return false;
  }
  return navigator.storage.persist();
}

// =============================================================================
// Cleanup
// =============================================================================

/**
 * Removes records that have been successfully synced and are older than
 * `olderThanDays` days.  Keeps unsynced/failed records intact.
 */
export async function clearOldSyncedData(olderThanDays: number): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  let deleted = 0;

  await fieldworkDB.transaction(
    "rw",
    [
      fieldworkDB.checklistItems,
      fieldworkDB.fieldEvidence,
      fieldworkDB.draftFindings,
    ],
    async () => {
      // Checklist items
      const oldItems = await fieldworkDB.checklistItems
        .where("syncStatus")
        .equals("synced")
        .filter((item) => item.updatedAt < cutoff)
        .toArray();
      if (oldItems.length > 0) {
        await fieldworkDB.checklistItems.bulkDelete(oldItems.map((i) => i.id));
        deleted += oldItems.length;
      }

      // Field evidence
      const oldEvidence = await fieldworkDB.fieldEvidence
        .where("syncStatus")
        .equals("synced")
        .filter((e) => e.capturedAt < cutoff)
        .toArray();
      if (oldEvidence.length > 0) {
        await fieldworkDB.fieldEvidence.bulkDelete(oldEvidence.map((e) => e.id));
        deleted += oldEvidence.length;
      }

      // Draft findings
      const oldFindings = await fieldworkDB.draftFindings
        .where("syncStatus")
        .equals("synced")
        .filter((f) => f.updatedAt < cutoff)
        .toArray();
      if (oldFindings.length > 0) {
        await fieldworkDB.draftFindings.bulkDelete(oldFindings.map((f) => f.id));
        deleted += oldFindings.length;
      }
    }
  );

  return deleted;
}

// =============================================================================
// Data summaries
// =============================================================================

/**
 * Returns the count of pending (unsynced) records per table for a given review.
 */
export async function getOfflineDataSummary(
  reviewId: string
): Promise<OfflineDataSummary> {
  const [checklistItems, fieldEvidence, draftFindings, syncQueue] =
    await Promise.all([
      fieldworkDB.checklistItems
        .where("reviewId")
        .equals(reviewId)
        .filter((i) => i.syncStatus !== "synced")
        .count(),
      fieldworkDB.fieldEvidence
        .where("reviewId")
        .equals(reviewId)
        .filter((e) => e.syncStatus !== "synced")
        .count(),
      fieldworkDB.draftFindings
        .where("reviewId")
        .equals(reviewId)
        .filter((f) => f.syncStatus !== "synced")
        .count(),
      fieldworkDB.syncQueue.count(),
    ]);

  return { checklistItems, fieldEvidence, draftFindings, syncQueue };
}

// =============================================================================
// Emergency export
// =============================================================================

/**
 * Exports all offline data for a review as a JSON-serialisable object.
 * Blob fields in evidence are converted to base64 data-URLs.
 * Intended as an emergency backup when sync is unavailable.
 */
export async function exportReviewData(
  reviewId: string
): Promise<string> {
  const [items, evidence, findings, sessions] = await Promise.all([
    fieldworkDB.checklistItems.where("reviewId").equals(reviewId).toArray(),
    fieldworkDB.fieldEvidence.where("reviewId").equals(reviewId).toArray(),
    fieldworkDB.draftFindings.where("reviewId").equals(reviewId).toArray(),
    fieldworkDB.offlineSessions.where("reviewId").equals(reviewId).toArray(),
  ]);

  // Convert evidence blobs to base64 for JSON serialisation
  const evidenceWithBase64 = await Promise.all(
    evidence.map(async (e) => {
      const blobBase64 = await blobToBase64(e.blob);
      const thumbBase64 = e.thumbnailBlob
        ? await blobToBase64(e.thumbnailBlob)
        : null;
      return {
        ...e,
        blob: blobBase64,
        thumbnailBlob: thumbBase64,
      };
    })
  );

  const payload = {
    exportedAt: new Date().toISOString(),
    reviewId,
    checklistItems: items,
    fieldEvidence: evidenceWithBase64,
    draftFindings: findings,
    offlineSessions: sessions,
  };

  return JSON.stringify(payload, null, 2);
}

// =============================================================================
// Internal helpers
// =============================================================================

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
