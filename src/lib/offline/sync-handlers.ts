import { fieldworkDB } from "./fieldwork-db";
import { SyncConflictError, SyncRetryableError } from "./sync-engine";
import type { SyncQueueEntry } from "./types";

// =============================================================================
// Constants
// =============================================================================

const TRPC_BASE = "/api/trpc";
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024; // 10 MB

// =============================================================================
// Checklist item handler
// =============================================================================

/**
 * Push a checklist-item change to the server via
 * POST /api/trpc/fieldwork.syncChecklistItem
 */
export async function syncChecklistItem(entry: SyncQueueEntry): Promise<void> {
  const payload = JSON.parse(entry.payload);
  await trpcMutation("fieldwork.syncChecklistItem", {
    ...payload,
    action: entry.action,
  });
}

// =============================================================================
// Field evidence handler
// =============================================================================

/**
 * Upload evidence (binary blob) via
 * POST /api/trpc/fieldwork.uploadEvidence
 *
 * Uses multipart/form-data since the payload includes a Blob.
 * Skips items larger than 10 MB — marks them failed with a user-facing message.
 */
export async function syncFieldEvidence(entry: SyncQueueEntry): Promise<void> {
  if (entry.action === "DELETE") {
    await trpcMutation("fieldwork.deleteEvidence", {
      id: entry.entityId,
    });
    return;
  }

  // Retrieve the actual evidence record from Dexie (it holds the Blob)
  const evidence = await fieldworkDB.fieldEvidence.get(entry.entityId);
  if (!evidence) {
    throw new Error(`Evidence ${entry.entityId} not found in local database`);
  }

  if (evidence.fileSize > MAX_EVIDENCE_BYTES) {
    throw new Error(
      `Evidence file "${evidence.fileName}" exceeds 10 MB limit (${(evidence.fileSize / 1024 / 1024).toFixed(1)} MB). ` +
        "Please reduce the file size before syncing."
    );
  }

  const form = new FormData();
  form.append("file", evidence.blob, evidence.fileName);
  form.append(
    "metadata",
    JSON.stringify({
      id: evidence.id,
      checklistItemId: evidence.checklistItemId,
      reviewId: evidence.reviewId,
      type: evidence.type,
      mimeType: evidence.mimeType,
      fileName: evidence.fileName,
      fileSize: evidence.fileSize,
      gpsLatitude: evidence.gpsLatitude,
      gpsLongitude: evidence.gpsLongitude,
      gpsAccuracy: evidence.gpsAccuracy,
      capturedAt: evidence.capturedAt.toISOString(),
      annotations: evidence.annotations,
    })
  );

  const res = await fetch(`${TRPC_BASE}/fieldwork.uploadEvidence`, {
    method: "POST",
    body: form,
    credentials: "include",
  });

  handleResponse(res);
}

// =============================================================================
// Draft finding handler
// =============================================================================

/**
 * Push a draft finding to the server via
 * POST /api/trpc/fieldwork.syncDraftFinding
 */
export async function syncDraftFinding(entry: SyncQueueEntry): Promise<void> {
  const payload = JSON.parse(entry.payload);
  await trpcMutation("fieldwork.syncDraftFinding", {
    ...payload,
    action: entry.action,
  });
}

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Perform a tRPC-style POST mutation using raw fetch.
 * tRPC batch endpoint expects `{ 0: { json: <input> } }` for a single call.
 */
async function trpcMutation(procedure: string, input: unknown): Promise<unknown> {
  const res = await fetch(`${TRPC_BASE}/${procedure}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: input }),
    credentials: "include",
  });

  return handleResponse(res);
}

/**
 * Interpret the HTTP response:
 * - 2xx → parse and return JSON body
 * - 409 → throw SyncConflictError
 * - 5xx → throw SyncRetryableError (will be retried)
 * - 4xx → throw plain Error (permanent failure, no retry)
 */
async function handleResponse(res: Response): Promise<unknown> {
  if (res.ok) {
    return res.json().catch(() => null);
  }

  const body = await res.text().catch(() => "");

  if (res.status === 409) {
    throw new SyncConflictError(`Conflict: ${body}`);
  }

  if (res.status >= 500) {
    throw new SyncRetryableError(`Server error ${res.status}: ${body}`);
  }

  // 4xx — non-retryable
  throw new Error(`Request failed ${res.status}: ${body}`);
}
