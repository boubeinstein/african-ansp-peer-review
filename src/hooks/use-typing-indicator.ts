"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getPusherClient } from "@/lib/pusher/client";

interface TypingUser {
  userId: string;
  name: string;
  timestamp: number;
}

interface UseTypingIndicatorOptions {
  channelName: string;
  userId: string;
  userName: string;
  /** Context key to scope typing (e.g., "discussion:123", "finding:456") */
  contextKey: string;
}

interface UseTypingIndicatorReturn {
  typingUsers: TypingUser[];
  startTyping: () => void;
  stopTyping: () => void;
}

export function useTypingIndicator({
  channelName,
  userId,
  userName,
  contextKey,
}: UseTypingIndicatorOptions): UseTypingIndicatorReturn {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Listen for typing events from others
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.channel(channelName) || pusher.subscribe(channelName);

    const handleTypingStart = (data: {
      userId: string;
      name: string;
      contextKey: string;
    }) => {
      if (data.userId === userId) return;
      if (data.contextKey !== contextKey) return;

      setTypingUsers((prev) => {
        const existing = prev.find((u) => u.userId === data.userId);
        if (existing) {
          return prev.map((u) =>
            u.userId === data.userId ? { ...u, timestamp: Date.now() } : u
          );
        }
        return [
          ...prev,
          { userId: data.userId, name: data.name, timestamp: Date.now() },
        ];
      });
    };

    const handleTypingStop = (data: {
      userId: string;
      contextKey: string;
    }) => {
      if (data.userId === userId) return;
      if (data.contextKey !== contextKey) return;
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    };

    channel.bind("client-typing-start", handleTypingStart);
    channel.bind("client-typing-stop", handleTypingStop);

    return () => {
      channel.unbind("client-typing-start", handleTypingStart);
      channel.unbind("client-typing-stop", handleTypingStop);
    };
  }, [channelName, userId, contextKey]);

  // Auto-clear stale typing indicators (no update in 4s)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => prev.filter((u) => now - u.timestamp < 4000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Broadcast typing stop
  const stopTyping = useCallback(() => {
    if (!isTypingRef.current) return;
    isTypingRef.current = false;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    try {
      const pusher = getPusherClient();
      const channel = pusher.channel(channelName);
      channel?.trigger("client-typing-stop", {
        userId,
        contextKey,
      });
    } catch {
      /* ignore */
    }
  }, [channelName, userId, contextKey]);

  // Broadcast typing start
  const startTyping = useCallback(() => {
    if (isTypingRef.current) {
      // Already typing — just reset the auto-stop timer
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 3000);
      return;
    }
    isTypingRef.current = true;

    try {
      const pusher = getPusherClient();
      const channel = pusher.channel(channelName);
      channel?.trigger("client-typing-start", {
        userId,
        name: userName,
        contextKey,
      });
    } catch {
      /* ignore */
    }

    // Auto-stop after 3s of no activity
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [channelName, userId, userName, contextKey, stopTyping]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isTypingRef.current) stopTyping();
    };
  }, [stopTyping]);

  return { typingUsers, startTyping, stopTyping };
}
