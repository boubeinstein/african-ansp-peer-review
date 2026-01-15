"use client";

import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  labelPosition?: "inside" | "outside" | "none";
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "danger";
  animated?: boolean;
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function getColorClass(value: number, variant?: string): string {
  if (variant === "success") return "bg-green-500";
  if (variant === "warning") return "bg-yellow-500";
  if (variant === "danger") return "bg-red-500";

  // Default: gradient based on value
  if (value >= 80) return "bg-green-500";
  if (value >= 60) return "bg-blue-500";
  if (value >= 40) return "bg-yellow-500";
  if (value >= 20) return "bg-orange-500";
  return "bg-red-500";
}

function getSizeClass(size: string): { bar: string; text: string } {
  switch (size) {
    case "sm":
      return { bar: "h-1.5", text: "text-[10px]" };
    case "lg":
      return { bar: "h-4", text: "text-sm" };
    default:
      return { bar: "h-2.5", text: "text-xs" };
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ProgressBar({
  value,
  max = 100,
  showLabel = true,
  labelPosition = "outside",
  size = "md",
  variant,
  animated = false,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const sizeClass = getSizeClass(size);
  const colorClass = getColorClass(percentage, variant);

  return (
    <div className={cn("w-full", className)}>
      {showLabel && labelPosition === "outside" && (
        <div className="flex justify-between mb-1">
          <span className={cn("font-medium text-foreground", sizeClass.text)}>
            Progress
          </span>
          <span className={cn("text-muted-foreground", sizeClass.text)}>
            {Math.round(percentage)}%
          </span>
        </div>
      )}

      <div
        className={cn(
          "w-full bg-muted rounded-full overflow-hidden",
          sizeClass.bar
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            colorClass,
            animated && "animate-pulse",
            labelPosition === "inside" &&
              "flex items-center justify-end pr-2 min-w-[2rem]"
          )}
          style={{ width: `${percentage}%` }}
        >
          {showLabel && labelPosition === "inside" && percentage > 15 && (
            <span
              className={cn(
                "font-medium text-white",
                size === "lg" ? "text-xs" : "text-[10px]"
              )}
            >
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CIRCULAR PROGRESS
// =============================================================================

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

export function CircularProgress({
  value,
  max = 100,
  size = 100,
  strokeWidth = 8,
  showLabel = true,
  className,
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const colorClass =
    percentage >= 80
      ? "text-green-500"
      : percentage >= 60
        ? "text-blue-500"
        : percentage >= 40
          ? "text-yellow-500"
          : percentage >= 20
            ? "text-orange-500"
            : "text-red-500";

  return (
    <div className={cn("relative inline-flex", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-500 ease-out", colorClass)}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-semibold">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
}

export default ProgressBar;
