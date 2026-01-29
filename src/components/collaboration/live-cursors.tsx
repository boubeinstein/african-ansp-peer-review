"use client";

import { useEffect, useMemo, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PresenceMember } from "@/hooks/use-presence";

interface LiveCursorsProps {
  members: PresenceMember[];
  containerRef: React.RefObject<HTMLElement | null>;
  className?: string;
}

export function LiveCursors({
  members,
  className,
}: LiveCursorsProps) {
  const { data: session } = useSession();

  // Derive cursors from members - no useState needed
  const cursors = useMemo(() => {
    const result: Record<string, { x: number; y: number }> = {};
    members.forEach((member) => {
      if (member.cursorPosition && member.id !== session?.user?.id) {
        result[member.id] = member.cursorPosition;
      }
    });
    return result;
  }, [members, session?.user?.id]);

  const otherMembers = members.filter((m) => m.id !== session?.user?.id);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <AnimatePresence>
        {otherMembers.map((member) => {
          const cursor = cursors[member.id];
          if (!cursor) return null;

          return (
            <Cursor
              key={member.id}
              x={cursor.x}
              y={cursor.y}
              color={member.color}
              name={member.name}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}

interface CursorProps {
  x: number;
  y: number;
  color: string;
  name: string;
}

function Cursor({ x, y, color, name }: CursorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.15 }}
      className="pointer-events-none absolute"
      style={{
        left: x,
        top: y,
        zIndex: 9999,
      }}
    >
      {/* Cursor SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="relative -left-1 -top-1"
      >
        <path
          d="M5.65376 12.4563L5.65378 12.4563L12.4563 5.65376L12.4563 5.65378L5.65376 12.4563ZM5.65376 12.4563L12.4563 19.2589L12.4563 19.2589L5.65376 12.4563ZM5.65376 12.4563L5.65378 12.4563L12.4563 5.65376L12.4563 5.65378L5.65376 12.4563Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
        />
        <path
          d="M3 3L10 21L12.5 13.5L21 10L3 3Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Name label */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute left-4 top-4 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        {name.split(" ")[0]}
      </motion.div>
    </motion.div>
  );
}

// Hook to track and broadcast cursor position
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

      const now = Date.now();
      if (now - lastUpdate.current < throttleMs) return;
      lastUpdate.current = now;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Only send if within container bounds
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

// Selection highlight component
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
  const highlightRef = useRef<HTMLDivElement>(null);

  // Use layout effect to measure and position synchronously
  useEffect(() => {
    const element = document.getElementById(elementId);
    const highlight = highlightRef.current;
    if (element && highlight) {
      const rect = element.getBoundingClientRect();
      highlight.style.left = `${rect.left - 2}px`;
      highlight.style.top = `${rect.top - 2}px`;
      highlight.style.width = `${rect.width + 4}px`;
      highlight.style.height = `${rect.height + 4}px`;
      highlight.style.display = "block";
    } else if (highlight) {
      highlight.style.display = "none";
    }
  }, [elementId]);

  return (
    <motion.div
      ref={highlightRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none fixed"
      style={{
        border: `2px solid ${color}`,
        borderRadius: 4,
        zIndex: 9998,
        display: "none",
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
