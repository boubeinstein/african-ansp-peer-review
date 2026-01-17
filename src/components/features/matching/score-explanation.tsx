"use client";

/**
 * Score Explanation Components
 *
 * Provides contextual help and tooltips explaining how
 * scores are calculated in the reviewer matching system.
 */

import { useTranslations } from "next-intl";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// =============================================================================
// SCORE HELP TOOLTIP
// =============================================================================

export interface ScoreHelpTooltipProps {
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

/**
 * Tooltip explaining how overall match scores are calculated
 */
export function ScoreHelpTooltip({ side = "top", className }: ScoreHelpTooltipProps) {
  const t = useTranslations("reviewer.matching.scoreHelp");

  return (
    <InfoTooltip
      side={side}
      className={className}
      content={
        <div className="space-y-2">
          <p className="font-medium">{t("title")}</p>
          <ul className="text-sm space-y-1">
            <li>• {t("expertise")}</li>
            <li>• {t("language")}</li>
            <li>• {t("availability")}</li>
            <li>• {t("experience")}</li>
          </ul>
        </div>
      }
    />
  );
}

// =============================================================================
// COVERAGE HELP TOOLTIP
// =============================================================================

export type CoverageType = "expertise" | "language";

export interface CoverageHelpTooltipProps {
  type: CoverageType;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

/**
 * Tooltip explaining what coverage percentages mean
 */
export function CoverageHelpTooltip({
  type,
  side = "top",
  className,
}: CoverageHelpTooltipProps) {
  const t = useTranslations("reviewer.matching.coverageHelp");

  return (
    <InfoTooltip
      side={side}
      className={className}
      content={<p>{t(type)}</p>}
    />
  );
}

// =============================================================================
// EXPERTISE AREA TOOLTIP
// =============================================================================

export interface ExpertiseAreaTooltipProps {
  area: string;
  abbreviation: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Tooltip showing full name and description of an expertise area
 */
export function ExpertiseAreaTooltip({
  area,
  abbreviation,
  children,
  className,
}: ExpertiseAreaTooltipProps) {
  const t = useTranslations("reviewer.matching.expertiseHelp");

  // Try to get the translation, fallback to area code if not found
  let description: string;
  try {
    description = t(area);
  } catch {
    description = area;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild className={className}>
          {children}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium">{abbreviation}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// EXPERTISE BADGE WITH TOOLTIP
// =============================================================================

export interface ExpertiseBadgeWithTooltipProps {
  area: string;
  abbreviation: string;
  variant?: "default" | "secondary" | "outline" | "destructive";
  className?: string;
}

/**
 * Badge showing expertise area with tooltip on hover
 */
export function ExpertiseBadgeWithTooltip({
  area,
  abbreviation,
  variant = "secondary",
  className,
}: ExpertiseBadgeWithTooltipProps) {
  const t = useTranslations("reviewer.matching.expertiseHelp");

  let description: string;
  try {
    description = t(area);
  } catch {
    description = area;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Badge variant={variant} className={cn("cursor-help", className)}>
            {abbreviation}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium">{abbreviation}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// ELIGIBILITY HELP
// =============================================================================

export interface EligibilityHelpTooltipProps {
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

/**
 * Tooltip explaining reviewer eligibility criteria
 */
export function EligibilityHelpTooltip({
  side = "top",
  className,
}: EligibilityHelpTooltipProps) {
  const t = useTranslations("reviewer.matching.eligibilityHelp");

  return (
    <InfoTooltip
      side={side}
      className={className}
      content={
        <div className="space-y-2">
          <p className="font-medium">{t("title")}</p>
          <ul className="text-sm space-y-1">
            <li>• {t("noCOI")}</li>
            <li>• {t("available")}</li>
            <li>• {t("expertise")}</li>
            <li>• {t("languages")}</li>
          </ul>
        </div>
      }
    />
  );
}

export default ScoreHelpTooltip;
