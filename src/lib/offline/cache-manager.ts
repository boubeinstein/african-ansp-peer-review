// =============================================================================
// Cache Manager — prefetch & manage review data for offline use
// =============================================================================

const REVIEW_CACHE_NAME = "review-offline-data";
const CACHED_REVIEWS_META_KEY = "aaprp-cached-reviews";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Prefetch all critical data for a review so the reviewer can work offline.
 * Sends the URL list to the service worker which caches them in a dedicated
 * Cache Storage bucket.
 */
export async function cacheReviewForOffline(reviewId: string): Promise<void> {
  const urls = getReviewDataUrls(reviewId);

  // Ask the service worker to cache these URLs
  const reg = await getRegistration();
  if (reg?.active) {
    reg.active.postMessage({
      type: "CACHE_REVIEW_DATA",
      payload: { urls },
    });
  } else {
    // Fallback: cache directly from the main thread
    const cache = await caches.open(REVIEW_CACHE_NAME);
    await Promise.all(
      urls.map(async (url) => {
        try {
          const res = await fetch(url, { credentials: "include" });
          if (res.ok) await cache.put(url, res);
        } catch {
          // Offline or network error — skip
        }
      })
    );
  }

  // Track this review in the meta list
  const existing = await getCachedReviews();
  if (!existing.includes(reviewId)) {
    existing.push(reviewId);
    localStorage.setItem(CACHED_REVIEWS_META_KEY, JSON.stringify(existing));
  }
}

/**
 * Check whether a review's data has been cached for offline use.
 * Verifies at least one URL is present in the cache.
 */
export async function isCachedForOffline(reviewId: string): Promise<boolean> {
  try {
    const cache = await caches.open(REVIEW_CACHE_NAME);
    const urls = getReviewDataUrls(reviewId);
    // Check if the main review detail URL is cached
    const match = await cache.match(urls[0]);
    return match !== undefined;
  } catch {
    return false;
  }
}

/**
 * Remove all cached data for a specific review.
 */
export async function clearReviewCache(reviewId: string): Promise<void> {
  const cache = await caches.open(REVIEW_CACHE_NAME);
  const urls = getReviewDataUrls(reviewId);

  await Promise.all(urls.map((url) => cache.delete(url)));

  // Remove from meta list
  const existing = await getCachedReviews();
  const updated = existing.filter((id) => id !== reviewId);
  localStorage.setItem(CACHED_REVIEWS_META_KEY, JSON.stringify(updated));
}

/**
 * Returns the list of review IDs that have been cached for offline use.
 */
export async function getCachedReviews(): Promise<string[]> {
  try {
    const raw = localStorage.getItem(CACHED_REVIEWS_META_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build the list of tRPC URLs that must be cached for a given review.
 * tRPC queries use GET with query-string encoded input.
 */
function getReviewDataUrls(reviewId: string): string[] {
  const base = "/api/trpc";

  // tRPC batch-style query input encoding:
  // ?input={"json":{"reviewId":"..."}}
  const input = (proc: string, data: Record<string, unknown>) =>
    `${base}/${proc}?input=${encodeURIComponent(JSON.stringify({ json: data }))}`;

  return [
    // Review details
    input("review.getById", { id: reviewId }),
    // Fieldwork checklist items for this review
    input("fieldwork.getChecklist", { reviewId }),
    // Team members assigned to this review
    input("review.getTeamMembers", { reviewId }),
    // Documents list
    input("review.getDocuments", { reviewId }),
    // Questionnaire structure (ANS + SMS)
    input("questionnaire.getByType", { type: "ANS_USOAP_CMA" }),
    input("questionnaire.getByType", { type: "SMS_CANSO_SOE" }),
  ];
}

async function getRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return undefined;
  }
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return undefined;
  }
}
