"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getPusherClient } from "@/lib/pusher/client";
import { CHANNELS } from "@/lib/pusher/server";

export interface EditLock {
  userId: string;
  userName: string;
  entityKey: string;
  acquiredAt: number;
}

interface UseEditLockOptions {
  reviewId: string;
  userId: string;
  userName: string;
}

interface UseEditLockReturn {
  locks: Record<string, EditLock>;
  acquireLock: (entityKey: string) => boolean;
  releaseLock: (entityKey: string) => void;
  isLockedByOther: (entityKey: string) => EditLock | null;
  isLockedByMe: (entityKey: string) => boolean;
}

export function useEditLock({
  reviewId,
  userId,
  userName,
}: UseEditLockOptions): UseEditLockReturn {
  const [locks, setLocks] = useState<Record<string, EditLock>>({});
  const myLocksRef = useRef<Set<string>>(new Set());

  // Listen for lock events
  useEffect(() => {
    const pusher = getPusherClient();
    const channel =
      pusher.channel(CHANNELS.reviewPresence(reviewId)) ||
      pusher.subscribe(CHANNELS.reviewPresence(reviewId));

    const handleAcquire = (data: EditLock) => {
      setLocks((prev) => ({ ...prev, [data.entityKey]: data }));
    };

    const handleRelease = (data: { entityKey: string; userId: string }) => {
      setLocks((prev) => {
        const next = { ...prev };
        if (next[data.entityKey]?.userId === data.userId) {
          delete next[data.entityKey];
        }
        return next;
      });
    };

    channel.bind("client-lock-acquire", handleAcquire);
    channel.bind("client-lock-release", handleRelease);

    return () => {
      channel.unbind("client-lock-acquire", handleAcquire);
      channel.unbind("client-lock-release", handleRelease);
    };
  }, [reviewId]);

  // Auto-expire locks after 5 minutes (safety net)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setLocks((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach((key) => {
          if (now - next[key].acquiredAt > 5 * 60 * 1000) {
            delete next[key];
            myLocksRef.current.delete(key);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const acquireLock = useCallback(
    (entityKey: string): boolean => {
      const existing = locks[entityKey];
      if (existing && existing.userId !== userId) {
        return false;
      }

      const lock: EditLock = {
        userId,
        userName,
        entityKey,
        acquiredAt: Date.now(),
      };

      setLocks((prev) => ({ ...prev, [entityKey]: lock }));
      myLocksRef.current.add(entityKey);

      try {
        const pusher = getPusherClient();
        const channel = pusher.channel(CHANNELS.reviewPresence(reviewId));
        channel?.trigger("client-lock-acquire", lock);
      } catch {
        /* ignore */
      }

      return true;
    },
    [reviewId, userId, userName, locks]
  );

  const releaseLock = useCallback(
    (entityKey: string) => {
      myLocksRef.current.delete(entityKey);

      setLocks((prev) => {
        const next = { ...prev };
        if (next[entityKey]?.userId === userId) {
          delete next[entityKey];
        }
        return next;
      });

      try {
        const pusher = getPusherClient();
        const channel = pusher.channel(CHANNELS.reviewPresence(reviewId));
        channel?.trigger("client-lock-release", { entityKey, userId });
      } catch {
        /* ignore */
      }
    },
    [reviewId, userId]
  );

  // Release all my locks on unmount
  useEffect(() => {
    const currentReviewId = reviewId;
    const currentUserId = userId;
    const currentLocks = myLocksRef.current;
    return () => {
      currentLocks.forEach((key) => {
        try {
          const pusher = getPusherClient();
          const channel = pusher.channel(
            CHANNELS.reviewPresence(currentReviewId)
          );
          channel?.trigger("client-lock-release", {
            entityKey: key,
            userId: currentUserId,
          });
        } catch {
          /* ignore */
        }
      });
    };
  }, [reviewId, userId]);

  const isLockedByOther = useCallback(
    (entityKey: string): EditLock | null => {
      const lock = locks[entityKey];
      return lock && lock.userId !== userId ? lock : null;
    },
    [locks, userId]
  );

  const isLockedByMe = useCallback(
    (entityKey: string): boolean => {
      return locks[entityKey]?.userId === userId || false;
    },
    [locks, userId]
  );

  return { locks, acquireLock, releaseLock, isLockedByOther, isLockedByMe };
}
