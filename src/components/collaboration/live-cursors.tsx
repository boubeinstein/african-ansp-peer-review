"use client";

import { useMemo, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PresenceMember } from "@/hooks/use-presence";


interface LiveCursorsProps {
  members: PresenceMember[];
  userId?: string;
  className?: string;
}

export function LiveCursors({
  members,
  userId,
  className,
}: LiveCursorsProps) {
  // Filter out current user and only show members with cursor positions
  const otherMembersWithCursors = useMemo(
    () => members.filter((m: PresenceMember) => m.id !== userId && m.cursorPosition),
    [members, userId]
  );

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <AnimatePresence>
        {otherMembersWithCursors.map((member: PresenceMember) => (
          <Cursor
            key={member.id}
            x={member.cursorPosition!.x}
            y={member.cursorPosition!.y}
            color={member.color}
            name={member.name}
          />
        ))}
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
      className="absolute pointer-events-none"
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
