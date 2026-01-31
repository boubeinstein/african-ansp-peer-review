"use client";

import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  className?: string;
  color?: "default" | "success" | "warning" | "danger";
  height?: number;
  showDots?: boolean;
}

/**
 * Simple SVG-based sparkline chart
 * Renders a mini line chart for displaying trends
 */
export function Sparkline({
  data,
  className,
  color = "default",
  height = 24,
  showDots = false,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return null;
  }

  const width = 64;
  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Normalize data to fit in chart area
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return { x, y };
  });

  // Create SVG path
  const pathD = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  // Color variants
  const colorClasses = {
    default: "stroke-primary",
    success: "stroke-green-500",
    warning: "stroke-amber-500",
    danger: "stroke-red-500",
  };

  const dotColorClasses = {
    default: "fill-primary",
    success: "fill-green-500",
    warning: "fill-amber-500",
    danger: "fill-red-500",
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("flex-shrink-0", className)}
      aria-hidden="true"
    >
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(colorClasses[color], "opacity-80")}
      />

      {/* Optional dots */}
      {showDots && points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={1.5}
          className={dotColorClasses[color]}
        />
      ))}

      {/* End dot (always shown) */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={2}
        className={dotColorClasses[color]}
      />
    </svg>
  );
}

/**
 * Simple bar-style sparkline (alternative visualization)
 */
export function SparklineBars({
  data,
  className,
  color = "default",
  height = 24,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return null;
  }

  const width = 64;
  const barWidth = Math.max(2, (width - (data.length - 1) * 2) / data.length);
  const gap = 2;

  // Normalize data
  const max = Math.max(...data);
  const normalizedData = data.map((value) => (value / max) * height);

  const colorClasses = {
    default: "fill-primary/60",
    success: "fill-green-500/60",
    warning: "fill-amber-500/60",
    danger: "fill-red-500/60",
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("flex-shrink-0", className)}
      aria-hidden="true"
    >
      {normalizedData.map((barHeight, index) => (
        <rect
          key={index}
          x={index * (barWidth + gap)}
          y={height - barHeight}
          width={barWidth}
          height={barHeight}
          rx={1}
          className={colorClasses[color]}
        />
      ))}
    </svg>
  );
}
