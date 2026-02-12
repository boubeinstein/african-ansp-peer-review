/// <reference lib="webworker" />
import {
  Serwist,
  type SerwistGlobalConfig,
  type PrecacheEntry,
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
  ExpirationPlugin,
} from "serwist";
import { defaultCache } from "@serwist/next/worker";

// ---------------------------------------------------------------------------
// Type augmentation — Serwist injects __SW_MANIFEST at build time
// ---------------------------------------------------------------------------

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

// ---------------------------------------------------------------------------
// Background sync queue name (Chromium-only; Safari/Firefox use fallback)
// ---------------------------------------------------------------------------

const BG_SYNC_TAG = "aaprp-fieldwork-sync";

// ---------------------------------------------------------------------------
// Custom runtime caching rules
// ---------------------------------------------------------------------------

const fieldworkCaching = [
  // Static assets — long-lived cache
  {
    matcher: ({ request }: { request: Request }) =>
      request.destination === "image" ||
      request.destination === "font" ||
      /\/_next\/static/.test(request.url),
    handler: new CacheFirst({
      cacheName: "static-assets",
      plugins: [
        new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      ],
    }),
  },
  // Health check — always try network, cache as fallback for polling
  {
    matcher: ({ url }: { url: URL }) => url.pathname === "/api/health",
    handler: new StaleWhileRevalidate({
      cacheName: "health-check",
      plugins: [
        new ExpirationPlugin({ maxEntries: 1, maxAgeSeconds: 60 }),
      ],
    }),
  },
  // tRPC fieldwork.sync* — NEVER cache (must hit server)
  {
    matcher: ({ url }: { url: URL }) =>
      /\/api\/trpc\/fieldwork\.sync/.test(url.pathname) ||
      /\/api\/trpc\/fieldwork\.upload/.test(url.pathname) ||
      /\/api\/trpc\/fieldwork\.delete/.test(url.pathname),
    handler: new NetworkFirst({
      cacheName: "fieldwork-mutations",
      networkTimeoutSeconds: 30,
      plugins: [
        new ExpirationPlugin({ maxEntries: 0, maxAgeSeconds: 1 }),
      ],
    }),
  },
  // Other tRPC routes — network-first with offline fallback
  {
    matcher: ({ url }: { url: URL }) => url.pathname.startsWith("/api/trpc/"),
    handler: new NetworkFirst({
      cacheName: "api-cache",
      networkTimeoutSeconds: 10,
      plugins: [
        new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 60 * 5 }),
      ],
    }),
  },
];

// ---------------------------------------------------------------------------
// Instantiate Serwist
// ---------------------------------------------------------------------------

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,
    concurrency: 10,
    ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...defaultCache, ...fieldworkCaching],
});

// ---------------------------------------------------------------------------
// Background Sync event — Chromium only
// ---------------------------------------------------------------------------

self.addEventListener("sync", (event: SyncEvent) => {
  if (event.tag === BG_SYNC_TAG) {
    event.waitUntil(notifyClientsToSync());
  }
});

/**
 * Post a message to all controlled clients telling them to run the
 * SyncEngine.processQueue() via the Zustand store.
 */
async function notifyClientsToSync(): Promise<void> {
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage({ type: "SYNC_REQUESTED" });
  }
}

// ---------------------------------------------------------------------------
// Message handler — main thread → service worker
// ---------------------------------------------------------------------------

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data = event.data as { type: string; payload?: unknown } | undefined;
  if (!data) return;

  switch (data.type) {
    case "SKIP_WAITING":
      self.skipWaiting();
      break;

    case "CACHE_REVIEW_DATA": {
      const urls = (data.payload as { urls: string[] })?.urls;
      if (urls && Array.isArray(urls)) {
        event.waitUntil(cacheUrls(urls));
      }
      break;
    }
  }
});

async function cacheUrls(urls: string[]): Promise<void> {
  const cache = await caches.open("review-offline-data");
  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { credentials: "include" });
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch {
        // Network error — skip this URL silently
      }
    })
  );
}

// ---------------------------------------------------------------------------
// Push notification placeholder
// ---------------------------------------------------------------------------

self.addEventListener("push", (event: PushEvent) => {
  const payload = event.data?.json() as { title?: string; body?: string } | undefined;
  event.waitUntil(
    self.registration.showNotification(payload?.title ?? "AAPRP", {
      body: payload?.body ?? "You have a new notification",
      icon: "/images/logos/blue-on-white/aaprp-logo-192.png",
      badge: "/images/logos/blue-on-white/aaprp-logo-96.png",
    })
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow("/");
      }
    })
  );
});

// ---------------------------------------------------------------------------
// Activate Serwist event listeners (install, activate, fetch, etc.)
// ---------------------------------------------------------------------------

serwist.addEventListeners();
