"use client";

import { useRef, useCallback } from "react";
import { LiveCursors, useCursorTracking } from "./live-cursors";
import { usePresence } from "@/hooks/use-presence";
import { cn } from "@/lib/utils";

interface CollaborativeContainerProps {
  reviewId: string;
  userId?: string;
  showCursors?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CollaborativeContainer({
  reviewId,
  userId,
  showCursors = true,
  children,
  className,
}: CollaborativeContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { members, updateCursor, updateFocus } = usePresence({
    reviewId,
    userId,
  });

  // Track cursor movement
  useCursorTracking({
    containerRef,
    onCursorMove: updateCursor,
    enabled: showCursors,
  });

  // Track focus on interactive elements
  const handleFocusCapture = useCallback(
    (e: React.FocusEvent) => {
      const target = e.target as HTMLElement;
      const focusId = target.dataset.focusId;
      if (focusId) {
        updateFocus(focusId);
      }
    },
    [updateFocus]
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onFocusCapture={handleFocusCapture}
    >
      {children}
      {showCursors && (
        <LiveCursors members={members} userId={userId} />
      )}
    </div>
  );
}
