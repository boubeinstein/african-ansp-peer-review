"use client";

import { useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";

function subscribeOnlineStatus(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getOnlineServerSnapshot() {
  return true;
}

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export function OfflineIndicator() {
  const mounted = useIsMounted();
  const isOnline = useSyncExternalStore(
    subscribeOnlineStatus,
    getOnlineSnapshot,
    getOnlineServerSnapshot
  );
  const [showReconnected, setShowReconnected] = useState(false);

  // Render nothing during SSR to avoid hydration mismatch
  if (!mounted) return null;

  // Handle reconnection notification via a wrapper
  // We track previous state via a ref-like approach in the AnimatePresence
  if (isOnline && !showReconnected) {
    // Will be triggered by AnimatePresence exit
  }

  return (
    <AnimatePresence
      onExitComplete={() => {
        if (isOnline) {
          setShowReconnected(true);
          setTimeout(() => setShowReconnected(false), 3000);
        }
      }}
    >
      {!isOnline && (
        <motion.div
          key="offline"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-2 bg-destructive py-2 text-sm text-destructive-foreground"
        >
          <WifiOff className="h-4 w-4" />
          <span>You are offline. Changes will sync when reconnected.</span>
        </motion.div>
      )}

      {showReconnected && isOnline && (
        <motion.div
          key="reconnected"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-2 bg-green-600 py-2 text-sm text-white"
        >
          <Wifi className="h-4 w-4" />
          <span>Back online!</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
