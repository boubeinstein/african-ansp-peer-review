"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getPusherClient } from "@/lib/pusher/client";
import { CHANNELS } from "@/lib/pusher/server";
import { useThrottle } from "@/hooks/use-throttle";

// ─── Self-contained LiveCursors ──────────────────────────────────────────────

interface CursorData {
  x: number;
  y: number;
  name: string;
  color: string;
  timestamp: number;
}

interface LiveCursorsProps {
  reviewId: string;
  userId: string;
  userName: string;
  userColor?: string;
  enabled?: boolean;
  className?: string;
}

export function LiveCursors({
  reviewId,
  userId,
  userName,
  userColor,
  enabled = true,
  className,
}: LiveCursorsProps) {
  const [cursors, setCursors] = useState<Record<string, CursorData>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const color = useMemo(() => userColor ?? getUserColor(userId), [userColor, userId]);

  // Broadcast own cursor movement (throttled to ~20fps)
  const broadcastCursor = useThrottle(
    useCallback(
      (x: number, y: number) => {
        try {
          const pusher = getPusherClient();
          const channel = pusher.channel(CHANNELS.reviewPresence(reviewId));
          if (channel) {
            channel.trigger("client-cursor-move", {
              userId,
              x,
              y,
              name: userName,
              color,
            });
          }
        } catch {
          // Pusher not available — silently ignore
        }
      },
      [reviewId, userId, userName, color]
    ),
    50
  );

  // Track own mouse movement relative to container's parent
  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current?.parentElement;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      broadcastCursor(x, y);
    };

    container.addEventListener("mousemove", handleMouseMove);
    return () => container.removeEventListener("mousemove", handleMouseMove);
  }, [enabled, broadcastCursor]);

  // Listen for other users' cursor movements
  useEffect(() => {
    if (!enabled) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(CHANNELS.reviewPresence(reviewId));

    const handler = (data: {
      userId: string;
      x: number;
      y: number;
      name: string;
      color: string;
    }) => {
      if (data.userId === userId) return;
      setCursors((prev) => ({
        ...prev,
        [data.userId]: {
          x: data.x,
          y: data.y,
          name: data.name,
          color: data.color,
          timestamp: Date.now(),
        },
      }));
    };

    channel.bind("client-cursor-move", handler);

    return () => {
      channel.unbind("client-cursor-move", handler);
    };
  }, [reviewId, userId, enabled]);

  // Clean up stale cursors (no update in 5s)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        const updated = { ...prev };
        let changed = false;
        Object.keys(updated).forEach((id) => {
          if (now - updated[id].timestamp > 5000) {
            delete updated[id];
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden z-50",
        className
      )}
    >
      <AnimatePresence>
        {Object.entries(cursors).map(([id, cursor]) => (
          <RemoteCursor
            key={id}
            x={cursor.x}
            y={cursor.y}
            name={cursor.name}
            color={cursor.color}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function RemoteCursor({
  x,
  y,
  name,
  color,
}: {
  x: number;
  y: number;
  name: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: "spring", damping: 30, stiffness: 200 }}
      className="absolute pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        zIndex: 9999,
      }}
    >
      {/* Cursor arrow SVG */}
      <svg
        width="16"
        height="20"
        viewBox="0 0 16 20"
        fill="none"
        className="-translate-x-[2px] -translate-y-[2px]"
      >
        <path
          d="M0 0L16 12L8 12L4 20L0 0Z"
          fill={color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>

      {/* Name label */}
      <div
        className="absolute left-4 top-3 px-1.5 py-0.5 rounded text-[10px] font-medium text-white whitespace-nowrap shadow-sm"
        style={{ backgroundColor: color }}
      >
        {name.split(" ")[0]}
      </div>
    </motion.div>
  );
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

// ─── Legacy exports (used by collaborative-container.tsx) ────────────────────

interface UseCursorTrackingOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  onCursorMove: (position: { x: number; y: number }) => void;
  throttleMs?: number;
  enabled?: boolean;
}

export function useCursorTracking({
  containerRef,
  onCursorMove,
  throttleMs = 50,
  enabled = true,
}: UseCursorTrackingOptions) {
  const lastUpdate = useRef(0);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!enabled || !containerRef.current) return;

      const now = performance.now();
      if (now - lastUpdate.current < throttleMs) return;
      lastUpdate.current = now;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        onCursorMove({ x, y });
      }
    },
    [containerRef, onCursorMove, throttleMs, enabled]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener("mousemove", handleMouseMove);
    return () => container.removeEventListener("mousemove", handleMouseMove);
  }, [containerRef, handleMouseMove, enabled]);
}

interface SelectionHighlightProps {
  color: string;
  elementId: string;
  label?: string;
}

export function SelectionHighlight({
  color,
  elementId,
  label,
}: SelectionHighlightProps) {
  const position = useMemo(() => {
    if (typeof document === "undefined") return null;
    const element = document.getElementById(elementId);
    if (element) {
      return element.getBoundingClientRect();
    }
    return null;
  }, [elementId]);

  if (!position) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none fixed"
      style={{
        left: position.left - 2,
        top: position.top - 2,
        width: position.width + 4,
        height: position.height + 4,
        border: `2px solid ${color}`,
        borderRadius: 4,
        zIndex: 9998,
      }}
    >
      {label && (
        <span
          className="absolute -top-5 left-0 whitespace-nowrap rounded px-1 text-xs text-white"
          style={{ backgroundColor: color }}
        >
          {label}
        </span>
      )}
    </motion.div>
  );
}
