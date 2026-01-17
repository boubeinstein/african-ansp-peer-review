"use client";

/**
 * Score Badge Component
 *
 * A visually distinctive badge for displaying match scores
 * with color coding based on score level.
 */

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getScoreLevel,
  getScoreBadgeColor,
  getScoreColor,
  formatScore,
  type ScoreLevel,
} from "@/lib/utils/score-colors";

// =============================================================================
// TYPES
// =============================================================================

export interface ScoreBadgeProps {
  score: number;
  maxScore?: number;
  showLabel?: boolean;
  showTooltip?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "outline" | "subtle";
  className?: string;
}

// =============================================================================
// SIZE CONFIGURATIONS
// =============================================================================

const SIZE_CLASSES = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-sm px-2 py-1",
  lg: "text-base px-3 py-1.5 font-semibold",
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ScoreBadge({
  score,
  maxScore = 100,
  showLabel = false,
  showTooltip = true,
  size = "md",
  variant = "solid",
  className,
}: ScoreBadgeProps) {
  const t = useTranslations("reviewer.matching.score");

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const level = getScoreLevel(percentage);
  const colors = getScoreColor(percentage);

  const getVariantClasses = (): string => {
    switch (variant) {
      case "solid":
        return getScoreBadgeColor(percentage);
      case "outline":
        return cn(colors.text, colors.border, "border bg-transparent");
      case "subtle":
        return cn(colors.bg, colors.text);
      default:
        return getScoreBadgeColor(percentage);
    }
  };

  const getLevelLabel = (level: ScoreLevel): string => {
    const labels: Record<ScoreLevel, string> = {
      excellent: t("levels.excellent"),
      good: t("levels.good"),
      fair: t("levels.fair"),
      poor: t("levels.poor"),
    };
    return labels[level];
  };

  const badge = (
    <Badge
      className={cn(
        SIZE_CLASSES[size],
        getVariantClasses(),
        "tabular-nums",
        className
      )}
    >
      {formatScore(percentage)}%
      {showLabel && <span className="ml-1">({getLevelLabel(level)})</span>}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{getLevelLabel(level)}</p>
          <p className="text-xs text-muted-foreground">
            {t("tooltipScore", { score: formatScore(score, 1), max: maxScore })}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// CIRCULAR SCORE VARIANT
// =============================================================================

export interface CircularScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const CIRCULAR_SIZE_CONFIG = {
  sm: { container: "h-12 w-12", text: "text-sm", stroke: 3, radius: 20 },
  md: { container: "h-16 w-16", text: "text-lg", stroke: 4, radius: 28 },
  lg: { container: "h-20 w-20", text: "text-xl", stroke: 5, radius: 36 },
};

export function CircularScoreBadge({
  score,
  size = "md",
  showLabel = false,
  className,
}: CircularScoreBadgeProps) {
  const t = useTranslations("reviewer.matching.score");
  const config = CIRCULAR_SIZE_CONFIG[size];
  const level = getScoreLevel(score);
  const colors = getScoreColor(score);

  const circumference = 2 * Math.PI * config.radius;
  const offset = circumference - (score / 100) * circumference;

  const getLevelLabel = (level: ScoreLevel): string => {
    const labels: Record<ScoreLevel, string> = {
      excellent: t("levels.excellent"),
      good: t("levels.good"),
      fair: t("levels.fair"),
      poor: t("levels.poor"),
    };
    return labels[level];
  };

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center",
          config.container
        )}
      >
        <svg className="absolute transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={config.radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            className="text-muted"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={config.radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={colors.text}
            style={{
              transition: "stroke-dashoffset 0.5s ease-in-out",
            }}
          />
        </svg>
        <span className={cn("font-bold tabular-nums", config.text, colors.text)}>
          {formatScore(score)}%
        </span>
      </div>
      {showLabel && (
        <span className={cn("text-xs font-medium", colors.text)}>
          {getLevelLabel(level)}
        </span>
      )}
    </div>
  );
}

export default ScoreBadge;
