// =============================================================================
// Connectivity Monitor
// =============================================================================

const HEALTH_URL = "/api/health";
const POLL_INTERVAL_MS = 30_000; // 30 s
const FETCH_TIMEOUT_MS = 5_000; // 5 s

type Listener = (online: boolean) => void;

export interface ConnectivityMonitor {
  /** Current connectivity state. */
  readonly isOnline: boolean;
  /** Register a callback for online/offline transitions. */
  subscribe(callback: Listener): void;
  /** Unregister a previously registered callback. */
  unsubscribe(callback: Listener): void;
  /** Stop polling and remove all event listeners. Call when no longer needed. */
  destroy(): void;
}

/**
 * Creates a reactive connectivity monitor that combines
 * `navigator.onLine` events with a periodic HEAD request to `/api/health`
 * (because `navigator.onLine` is unreliable on many devices).
 *
 * Only usable in a browser context.
 */
export function createConnectivityMonitor(): ConnectivityMonitor {
  if (typeof window === "undefined") {
    // SSR stub — always "online", no-op listeners
    return {
      get isOnline() {
        return true;
      },
      subscribe() {},
      unsubscribe() {},
      destroy() {},
    };
  }

  let online = navigator.onLine;
  const listeners = new Set<Listener>();

  // -- Notify helpers -------------------------------------------------------

  function setOnline(value: boolean): void {
    if (value === online) return;
    online = value;
    for (const cb of listeners) {
      try {
        cb(online);
      } catch {
        // swallow listener errors
      }
    }
  }

  // -- Browser events -------------------------------------------------------

  function handleOnline(): void {
    setOnline(true);
  }

  function handleOffline(): void {
    setOnline(false);
  }

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // -- Polling fallback -----------------------------------------------------

  async function poll(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const res = await fetch(HEALTH_URL, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setOnline(res.ok);
    } catch {
      setOnline(false);
    }
  }

  const intervalId = setInterval(poll, POLL_INTERVAL_MS);
  // Run an initial poll to establish truth
  void poll();

  // -- Public API -----------------------------------------------------------

  return {
    get isOnline() {
      return online;
    },
    subscribe(callback: Listener) {
      listeners.add(callback);
    },
    unsubscribe(callback: Listener) {
      listeners.delete(callback);
    },
    destroy() {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(intervalId);
      listeners.clear();
    },
  };
}

// =============================================================================
// onReconnect helper
// =============================================================================

/**
 * Convenience: fires `callback` exactly once when the device transitions
 * from offline → online.  Returns a cleanup function.
 */
export function onReconnect(callback: () => void): () => void {
  const monitor = createConnectivityMonitor();
  let wasOffline = !monitor.isOnline;

  const listener: Listener = (isOnline) => {
    if (isOnline && wasOffline) {
      callback();
      // Fire only once, then clean up
      monitor.unsubscribe(listener);
      monitor.destroy();
    }
    wasOffline = !isOnline;
  };

  monitor.subscribe(listener);

  return () => {
    monitor.unsubscribe(listener);
    monitor.destroy();
  };
}
