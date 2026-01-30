"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

interface UsePullToRefreshReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  pullDistance: number;
  isRefreshing: boolean;
  isPulling: boolean;
  shouldTrigger: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;
      if (window.scrollY > 0) return; // Only trigger at top

      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling || disabled || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      if (diff > 0) {
        // Resistance effect - makes pulling feel natural
        const resistance = 0.4;
        setPullDistance(diff * resistance);
      }
    },
    [isPulling, startY, disabled, isRefreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;

    setIsPulling(false);

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
  }, [isPulling, pullDistance, threshold, onRefresh, disabled]);

  useEffect(() => {
    const container = containerRef.current || document;

    const touchStartHandler = (e: Event) =>
      handleTouchStart(e as unknown as TouchEvent);
    const touchMoveHandler = (e: Event) =>
      handleTouchMove(e as unknown as TouchEvent);
    const touchEndHandler = () => handleTouchEnd();

    container.addEventListener("touchstart", touchStartHandler, {
      passive: true,
    });
    container.addEventListener("touchmove", touchMoveHandler, { passive: true });
    container.addEventListener("touchend", touchEndHandler, { passive: true });

    return () => {
      container.removeEventListener("touchstart", touchStartHandler);
      container.removeEventListener("touchmove", touchMoveHandler);
      container.removeEventListener("touchend", touchEndHandler);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    isPulling,
    shouldTrigger: pullDistance >= threshold,
  };
}
