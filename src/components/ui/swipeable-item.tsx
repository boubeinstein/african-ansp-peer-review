"use client";

import {
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type TouchEvent,
} from "react";
import { cn } from "@/lib/utils";

interface SwipeAction {
  content: ReactNode;
  onSwipe: () => void;
  className?: string;
}

interface SwipeableItemProps {
  children: ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  threshold?: number;
  className?: string;
}

export function SwipeableItem({
  children,
  leftAction,
  rightAction,
  threshold = 80,
  className,
}: SwipeableItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;

      const currentX = e.touches[0].clientX;
      const diff = currentX - startX;

      // Limit swipe distance
      const maxSwipe = 120;
      const limitedDiff = Math.max(-maxSwipe, Math.min(maxSwipe, diff));

      // Only allow swipe in directions with actions
      if (limitedDiff > 0 && !leftAction) return;
      if (limitedDiff < 0 && !rightAction) return;

      setTranslateX(limitedDiff);
    },
    [isDragging, startX, leftAction, rightAction]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);

    if (translateX > threshold && leftAction) {
      leftAction.onSwipe();
    } else if (translateX < -threshold && rightAction) {
      rightAction.onSwipe();
    }

    setTranslateX(0);
  }, [translateX, threshold, leftAction, rightAction]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Left action background */}
      {leftAction && (
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex items-center justify-start pl-4 w-24",
            leftAction.className || "bg-green-500 text-white"
          )}
        >
          {leftAction.content}
        </div>
      )}

      {/* Right action background */}
      {rightAction && (
        <div
          className={cn(
            "absolute inset-y-0 right-0 flex items-center justify-end pr-4 w-24",
            rightAction.className || "bg-red-500 text-white"
          )}
        >
          {rightAction.content}
        </div>
      )}

      {/* Main content */}
      <div
        ref={containerRef}
        className="relative bg-background transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(${translateX}px)`,
          transitionDuration: isDragging ? "0ms" : "200ms",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
