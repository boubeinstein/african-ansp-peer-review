"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getPusherClient } from "@/lib/pusher/client";
import { CHANNELS } from "@/lib/pusher/server";

export interface FocusedUser {
  userId: string;
  name: string;
  color: string;
  initials: string;
  focusKey: string;
  timestamp: number;
}

interface UseFocusTrackerOptions {
  reviewId: string;
  userId: string;
  userName: string;
  userColor?: string;
}

interface UseFocusTrackerReturn {
  /** Map of focusKey -> array of users focused on that item */
  focusMap: Record<string, FocusedUser[]>;
  /** Set focus on a content item */
  setFocus: (focusKey: string) => void;
  /** Clear focus (when leaving a page/section) */
  clearFocus: () => void;
  /** Get users focused on a specific item */
  getViewers: (focusKey: string) => FocusedUser[];
}

function getUserColor(userId: string): string {
  const colors = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16",
    "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
    "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function useFocusTracker({
  reviewId,
  userId,
  userName,
  userColor,
}: UseFocusTrackerOptions): UseFocusTrackerReturn {
  const [focusMap, setFocusMap] = useState<Record<string, FocusedUser[]>>({});
  const currentFocusRef = useRef<string | null>(null);
  const color = userColor ?? getUserColor(userId);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Listen for focus changes from other users
  useEffect(() => {
    const pusher = getPusherClient();
    const channel =
      pusher.channel(CHANNELS.reviewPresence(reviewId)) ||
      pusher.subscribe(CHANNELS.reviewPresence(reviewId));

    const handleFocusChange = (data: {
      userId: string;
      name?: string;
      color?: string;
      initials?: string;
      focusKey: string | null;
    }) => {
      if (data.userId === userId) return;

      setFocusMap((prev) => {
        const next = { ...prev };

        // Remove user from all previous focus keys
        Object.keys(next).forEach((key) => {
          next[key] = next[key].filter((u) => u.userId !== data.userId);
          if (next[key].length === 0) delete next[key];
        });

        // Add user to new focus key (if not clearing)
        if (data.focusKey) {
          const user: FocusedUser = {
            userId: data.userId,
            name: data.name ?? "",
            color: data.color ?? getUserColor(data.userId),
            initials: data.initials ?? "",
            focusKey: data.focusKey,
            timestamp: Date.now(),
          };
          next[data.focusKey] = [...(next[data.focusKey] || []), user];
        }

        return next;
      });
    };

    channel.bind("client-focus-change", handleFocusChange);

    return () => {
      channel.unbind("client-focus-change", handleFocusChange);
    };
  }, [reviewId, userId]);

  // Clean up stale focus entries (no update in 60s)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setFocusMap((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach((key) => {
          const before = next[key].length;
          next[key] = next[key].filter((u) => now - u.timestamp < 60000);
          if (next[key].length === 0) {
            delete next[key];
            changed = true;
          } else if (next[key].length !== before) {
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Broadcast focus change
  const setFocus = useCallback(
    (focusKey: string) => {
      if (currentFocusRef.current === focusKey) return;
      currentFocusRef.current = focusKey;

      try {
        const pusher = getPusherClient();
        const channel = pusher.channel(CHANNELS.reviewPresence(reviewId));
        channel?.trigger("client-focus-change", {
          userId,
          name: userName,
          color,
          initials,
          focusKey,
        });
      } catch {
        /* ignore */
      }
    },
    [reviewId, userId, userName, color, initials]
  );

  const clearFocus = useCallback(() => {
    if (!currentFocusRef.current) return;
    currentFocusRef.current = null;

    try {
      const pusher = getPusherClient();
      const channel = pusher.channel(CHANNELS.reviewPresence(reviewId));
      channel?.trigger("client-focus-change", {
        userId,
        focusKey: null,
      });
    } catch {
      /* ignore */
    }
  }, [reviewId, userId]);

  const getViewers = useCallback(
    (focusKey: string) => focusMap[focusKey] || [],
    [focusMap]
  );

  // Clear focus on unmount
  useEffect(() => {
    return () => {
      if (currentFocusRef.current) {
        try {
          const pusher = getPusherClient();
          const channel = pusher.channel(CHANNELS.reviewPresence(reviewId));
          channel?.trigger("client-focus-change", {
            userId,
            focusKey: null,
          });
        } catch {
          /* ignore */
        }
      }
    };
  }, [reviewId, userId]);

  return { focusMap, setFocus, clearFocus, getViewers };
}
