"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";

// Get initial online state safely (default to true for SSR)
function getInitialOnlineState(): boolean {
  if (typeof navigator !== "undefined") {
    return navigator.onLine;
  }
  return true;
}

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(getInitialOnlineState);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
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
