"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180;
  const opacity = Math.min(progress * 1.5, 1);

  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-all duration-200"
      style={{ height: isRefreshing ? 48 : pullDistance }}
    >
      <div
        className="flex items-center justify-center"
        style={{ opacity: isRefreshing ? 1 : opacity }}
      >
        <RefreshCw
          className={cn(
            "h-6 w-6 text-primary transition-transform",
            isRefreshing && "animate-spin"
          )}
          style={{
            transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
          }}
        />
      </div>
    </div>
  );
}

interface PullToRefreshContainerProps {
  children: React.ReactNode;
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
  className?: string;
}

export function PullToRefreshContainer({
  children,
  pullDistance,
  isRefreshing,
  threshold = 80,
  className,
}: PullToRefreshContainerProps) {
  return (
    <div className={cn("relative", className)}>
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        threshold={threshold}
      />
      <div
        className="transition-transform duration-200"
        style={{
          transform:
            pullDistance > 0 && !isRefreshing
              ? `translateY(${pullDistance * 0.3}px)`
              : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
