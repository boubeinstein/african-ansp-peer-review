// =============================================================================
// Preflight Check — validates readiness for offline fieldwork
// =============================================================================

import { fieldworkDB } from "./fieldwork-db";
import { isCachedForOffline, cacheReviewForOffline } from "./cache-manager";

// =============================================================================
// Types
// =============================================================================

export type CheckStatus = "pass" | "fail" | "warning";

export interface PreflightCheckResult {
  name: string;
  status: CheckStatus;
  message: string;
}

export interface PreflightResult {
  ready: boolean;
  checks: PreflightCheckResult[];
}

// =============================================================================
// Individual checks
// =============================================================================

async function checkIndexedDB(): Promise<PreflightCheckResult> {
  const name = "indexeddb";
  try {
    // Verify we can open and write to Dexie
    await fieldworkDB.open();
    const testId = `__preflight_${Date.now()}`;
    await fieldworkDB.offlineSessions.put({
      id: testId,
      reviewId: "__test__",
      userId: "__test__",
      startedAt: new Date(),
      endedAt: null,
      deviceInfo: "",
      syncedAt: null,
    });
    await fieldworkDB.offlineSessions.delete(testId);
    return { name, status: "pass", message: "IndexedDB is available and writable" };
  } catch {
    return { name, status: "fail", message: "IndexedDB is not available. Offline mode cannot function." };
  }
}

async function checkCameraPermission(): Promise<PreflightCheckResult> {
  const name = "camera";
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      return { name, status: "warning", message: "Camera API not available on this device" };
    }
    const permission = await navigator.permissions.query({
      name: "camera" as PermissionName,
    });
    if (permission.state === "granted") {
      return { name, status: "pass", message: "Camera permission granted" };
    }
    if (permission.state === "prompt") {
      return { name, status: "warning", message: "Camera permission will be requested when needed" };
    }
    return { name, status: "warning", message: "Camera permission denied. You can still use gallery photos." };
  } catch {
    // permissions.query may not support "camera" on all browsers
    return { name, status: "warning", message: "Camera permission status unknown" };
  }
}

async function checkMicrophonePermission(): Promise<PreflightCheckResult> {
  const name = "microphone";
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      return { name, status: "warning", message: "Microphone API not available on this device" };
    }
    const permission = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    if (permission.state === "granted") {
      return { name, status: "pass", message: "Microphone permission granted" };
    }
    if (permission.state === "prompt") {
      return { name, status: "warning", message: "Microphone permission will be requested when needed" };
    }
    return { name, status: "warning", message: "Microphone permission denied. Voice notes unavailable." };
  } catch {
    return { name, status: "warning", message: "Microphone permission status unknown" };
  }
}

async function checkGPSPermission(): Promise<PreflightCheckResult> {
  const name = "gps";
  try {
    if (!navigator.geolocation) {
      return { name, status: "warning", message: "Geolocation not available on this device" };
    }
    const permission = await navigator.permissions.query({
      name: "geolocation",
    });
    if (permission.state === "granted") {
      return { name, status: "pass", message: "GPS permission granted" };
    }
    if (permission.state === "prompt") {
      return { name, status: "warning", message: "GPS permission will be requested when needed" };
    }
    return { name, status: "warning", message: "GPS permission denied. Location tagging unavailable." };
  } catch {
    return { name, status: "warning", message: "GPS permission status unknown" };
  }
}

async function checkReviewDataCached(
  reviewId: string
): Promise<PreflightCheckResult> {
  const name = "reviewData";
  try {
    const cached = await isCachedForOffline(reviewId);
    if (cached) {
      return { name, status: "pass", message: "Review data cached for offline use" };
    }
    // Try to cache it now
    try {
      await cacheReviewForOffline(reviewId);
      return { name, status: "pass", message: "Review data has been cached for offline use" };
    } catch {
      return { name, status: "warning", message: "Could not cache review data. Some features may not work offline." };
    }
  } catch {
    return { name, status: "warning", message: "Unable to verify cache status" };
  }
}

async function checkStorageQuota(): Promise<PreflightCheckResult> {
  const name = "storage";
  try {
    if (!navigator.storage?.estimate) {
      return { name, status: "warning", message: "Storage API not available. Cannot verify free space." };
    }
    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota ?? 0;
    const usage = estimate.usage ?? 0;
    const free = quota - usage;
    const freeMB = Math.round(free / (1024 * 1024));
    const MIN_FREE_MB = 100;

    if (freeMB >= MIN_FREE_MB) {
      return { name, status: "pass", message: `${freeMB} MB free storage available` };
    }
    if (freeMB >= 50) {
      return {
        name,
        status: "warning",
        message: `Only ${freeMB} MB free. Consider clearing old data for best experience.`,
      };
    }
    return {
      name,
      status: "fail",
      message: `Only ${freeMB} MB free. At least ${MIN_FREE_MB} MB recommended. Clear browser data or old reviews.`,
    };
  } catch {
    return { name, status: "warning", message: "Unable to check storage quota" };
  }
}

// =============================================================================
// Main preflight runner
// =============================================================================

export async function runPreflightCheck(
  reviewId: string,
  onProgress?: (check: PreflightCheckResult) => void
): Promise<PreflightResult> {
  const checks: PreflightCheckResult[] = [];

  const runners = [
    checkIndexedDB,
    () => checkCameraPermission(),
    () => checkMicrophonePermission(),
    () => checkGPSPermission(),
    () => checkReviewDataCached(reviewId),
    checkStorageQuota,
  ];

  // Run sequentially for animated display
  for (const runner of runners) {
    const result = await runner();
    checks.push(result);
    onProgress?.(result);
  }

  const hasFailure = checks.some((c) => c.status === "fail");

  return {
    ready: !hasFailure,
    checks,
  };
}
