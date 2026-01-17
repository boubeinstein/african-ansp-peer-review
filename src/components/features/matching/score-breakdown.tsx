"use client";

/**
 * Score Breakdown Component
 *
 * Visual breakdown of match score components with
 * progress bars and detailed tooltips.
 */

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Briefcase, Globe, Calendar, User, type LucideIcon } from "lucide-react";
import {
  getScoreProgressColor,
  getScoreTextColor,
  calculatePercentage,
  formatScore,
} from "@/lib/utils/score-colors";

// =============================================================================
// TYPES
// =============================================================================

export interface ScoreBreakdownItem {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  icon?: LucideIcon;
  description?: string;
}

export interface ScoreBreakdownProps {
  items: ScoreBreakdownItem[];
  showPercentages?: boolean;
  showIcons?: boolean;
  compact?: boolean;
  className?: string;
}

// Default breakdown configuration for reviewer matching
export const DEFAULT_BREAKDOWN_CONFIG = {
  expertise: { maxScore: 40, icon: Briefcase },
  language: { maxScore: 25, icon: Globe },
  availability: { maxScore: 25, icon: Calendar },
  experience: { maxScore: 10, icon: User },
} as const;

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface BreakdownBarProps {
  item: ScoreBreakdownItem;
  showPercentage?: boolean;
  showIcon?: boolean;
  compact?: boolean;
}

function BreakdownBar({
  item,
  showPercentage = true,
  showIcon = true,
  compact = false,
}: BreakdownBarProps) {
  const percentage = calculatePercentage(item.score, item.maxScore);
  const progressColor = getScoreProgressColor(percentage);
  const textColor = getScoreTextColor(percentage);
  const Icon = item.icon;

  const content = (
    <div className={cn("space-y-1", compact ? "space-y-0.5" : "space-y-1")}>
      <div
        className={cn(
          "flex items-center justify-between",
          compact ? "text-xs" : "text-sm"
        )}
      >
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {showIcon && Icon && (
            <Icon className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          )}
          {item.label}
        </span>
        <span className={cn("font-medium tabular-nums", textColor)}>
          {formatScore(item.score, 1)}/{item.maxScore}
          {showPercentage && (
            <span className="ml-1 text-muted-foreground">({percentage}%)</span>
          )}
        </span>
      </div>
      <div className="relative">
        <Progress
          value={percentage}
          className={cn(compact ? "h-1" : "h-1.5")}
        />
        {/* Colored overlay for the filled portion */}
        <div
          className={cn(
            "absolute top-0 left-0 h-full rounded-full transition-all",
            progressColor,
            compact ? "h-1" : "h-1.5"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );

  if (item.description) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">{content}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{item.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ScoreBreakdown({
  items,
  showPercentages = true,
  showIcons = true,
  compact = false,
  className,
}: ScoreBreakdownProps) {
  return (
    <div className={cn("space-y-2", compact && "space-y-1.5", className)}>
      {items.map((item) => (
        <BreakdownBar
          key={item.key}
          item={item}
          showPercentage={showPercentages}
          showIcon={showIcons}
          compact={compact}
        />
      ))}
    </div>
  );
}

// =============================================================================
// SPECIALIZED VARIANT: Reviewer Match Breakdown
// =============================================================================

export interface ReviewerScoreBreakdownProps {
  expertiseScore: number;
  languageScore: number;
  availabilityScore: number;
  experienceScore: number;
  showPercentages?: boolean;
  compact?: boolean;
  className?: string;
}

export function ReviewerScoreBreakdown({
  expertiseScore,
  languageScore,
  availabilityScore,
  experienceScore,
  showPercentages = true,
  compact = false,
  className,
}: ReviewerScoreBreakdownProps) {
  const t = useTranslations("reviewer.matching.breakdown");

  const items: ScoreBreakdownItem[] = [
    {
      key: "expertise",
      label: t("expertise"),
      score: expertiseScore,
      maxScore: DEFAULT_BREAKDOWN_CONFIG.expertise.maxScore,
      icon: DEFAULT_BREAKDOWN_CONFIG.expertise.icon,
      description: t("expertiseDesc"),
    },
    {
      key: "language",
      label: t("language"),
      score: languageScore,
      maxScore: DEFAULT_BREAKDOWN_CONFIG.language.maxScore,
      icon: DEFAULT_BREAKDOWN_CONFIG.language.icon,
      description: t("languageDesc"),
    },
    {
      key: "availability",
      label: t("availability"),
      score: availabilityScore,
      maxScore: DEFAULT_BREAKDOWN_CONFIG.availability.maxScore,
      icon: DEFAULT_BREAKDOWN_CONFIG.availability.icon,
      description: t("availabilityDesc"),
    },
    {
      key: "experience",
      label: t("experience"),
      score: experienceScore,
      maxScore: DEFAULT_BREAKDOWN_CONFIG.experience.maxScore,
      icon: DEFAULT_BREAKDOWN_CONFIG.experience.icon,
      description: t("experienceDesc"),
    },
  ];

  return (
    <ScoreBreakdown
      items={items}
      showPercentages={showPercentages}
      showIcons={true}
      compact={compact}
      className={className}
    />
  );
}

// =============================================================================
// HORIZONTAL COMPACT VARIANT
// =============================================================================

export interface HorizontalScoreBreakdownProps {
  expertiseScore: number;
  languageScore: number;
  availabilityScore: number;
  experienceScore: number;
  className?: string;
}

export function HorizontalScoreBreakdown({
  expertiseScore,
  languageScore,
  availabilityScore,
  experienceScore,
  className,
}: HorizontalScoreBreakdownProps) {
  const t = useTranslations("reviewer.matching.breakdown");

  const items = [
    {
      label: t("expertiseShort"),
      score: expertiseScore,
      max: DEFAULT_BREAKDOWN_CONFIG.expertise.maxScore,
      icon: Briefcase,
    },
    {
      label: t("languageShort"),
      score: languageScore,
      max: DEFAULT_BREAKDOWN_CONFIG.language.maxScore,
      icon: Globe,
    },
    {
      label: t("availabilityShort"),
      score: availabilityScore,
      max: DEFAULT_BREAKDOWN_CONFIG.availability.maxScore,
      icon: Calendar,
    },
    {
      label: t("experienceShort"),
      score: experienceScore,
      max: DEFAULT_BREAKDOWN_CONFIG.experience.maxScore,
      icon: User,
    },
  ];

  return (
    <div className={cn("flex items-center gap-3 flex-wrap", className)}>
      {items.map((item) => {
        const percentage = calculatePercentage(item.score, item.max);
        const textColor = getScoreTextColor(percentage);
        const Icon = item.icon;

        return (
          <TooltipProvider key={item.label}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <span className={cn("font-medium tabular-nums", textColor)}>
                    {formatScore(item.score, 1)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {item.label}: {formatScore(item.score, 1)}/{item.max} (
                  {percentage}%)
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

export default ScoreBreakdown;
