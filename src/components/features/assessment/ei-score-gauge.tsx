"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface EIScoreGaugeProps {
  value: number | null | undefined; // 0-100
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const SIZE_CLASSES = {
  sm: {
    container: "w-24",
    text: "text-xl",
    progress: "h-2",
  },
  md: {
    container: "w-32",
    text: "text-3xl",
    progress: "h-3",
  },
  lg: {
    container: "w-48",
    text: "text-5xl",
    progress: "h-4",
  },
};

export function getScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "text-gray-400";
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

export function getScoreProgressColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "bg-gray-200";
  if (score >= 80) return "[&>div]:bg-green-600";
  if (score >= 60) return "[&>div]:bg-yellow-500";
  if (score >= 40) return "[&>div]:bg-orange-500";
  return "[&>div]:bg-red-500";
}

export function EIScoreGauge({
  value,
  size = "md",
  showLabel = true,
}: EIScoreGaugeProps) {
  const styles = SIZE_CLASSES[size];
  const displayValue = value ?? 0;

  return (
    <div className={cn("flex flex-col items-center gap-2", styles.container)}>
      <div className={cn("font-bold", styles.text, getScoreColor(value))}>
        {value !== null && value !== undefined ? `${value.toFixed(1)}%` : "-"}
      </div>
      <Progress
        value={displayValue}
        className={cn(styles.progress, "w-full", getScoreProgressColor(value))}
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground text-center">
          {getScoreLabel(value)}
        </span>
      )}
    </div>
  );
}

function getScoreLabel(score: number | null | undefined): string {
  if (score === null || score === undefined) return "No data";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Improvement";
  return "Critical";
}

interface EIScoreDisplayProps {
  value: number | null | undefined;
  label?: string;
  className?: string;
}

export function EIScoreDisplay({ value, label, className }: EIScoreDisplayProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
      <div className="flex items-center gap-3">
        <span className={cn("text-4xl font-bold", getScoreColor(value))}>
          {value !== null && value !== undefined ? `${value.toFixed(1)}%` : "-"}
        </span>
        <div className="flex-1 max-w-32">
          <Progress
            value={value ?? 0}
            className={cn("h-3", getScoreProgressColor(value))}
          />
        </div>
      </div>
    </div>
  );
}
