"use client";

/**
 * Match Score Card Component
 *
 * Visual display of reviewer match score with breakdown,
 * warnings, and COI indicators.
 */

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Star,
  XCircle,
} from "lucide-react";
import type { MatchResult } from "@/lib/reviewer/matching";
import { EXPERTISE_AREA_ABBREV } from "@/lib/reviewer/labels";
import {
  ScoreBadge,
  CircularScoreBadge,
  ReviewerScoreBreakdown,
  ExpertiseBadgeWithTooltip,
} from "@/components/features/matching";

// =============================================================================
// TYPES
// =============================================================================

export interface MatchScoreCardProps {
  result: MatchResult;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  onViewProfile?: () => void;
  compact?: boolean;
  showDetails?: boolean;
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function MatchScoreCard({
  result,
  isSelected = false,
  onSelect,
  onViewProfile,
  compact = false,
  showDetails = true,
  className,
}: MatchScoreCardProps) {
  const t = useTranslations("reviewer.matching");
  const locale = useLocale() as "en" | "fr";

  const hasWarnings = result.warnings.length > 0;
  const hasCOI = result.coiStatus.hasConflict;

  // Get the appropriate ineligibility reason based on locale
  const ineligibilityReason = locale === "fr"
    ? result.ineligibilityReasonFr
    : result.ineligibilityReason;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border",
          isSelected && "border-primary bg-primary/5",
          !result.isEligible && "opacity-60",
          className
        )}
      >
        {onSelect && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            disabled={!result.isEligible && !isSelected}
          />
        )}

        <Avatar className="h-9 w-9">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getInitials(result.fullName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="font-medium text-sm truncate cursor-default">{result.fullName}</span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{result.fullName}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {result.isLeadQualified && (
              <Star className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
            )}
            {hasCOI && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Ban className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>
                    {result.coiStatus.severity === "HARD" ? t("warnings.coiConflict") : "Soft COI"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {!result.isEligible && ineligibilityReason && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-red-600 border-red-300 gap-1 shrink-0">
                      <XCircle className="h-3 w-3" />
                      {t("ineligible")}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{ineligibilityReason}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xs text-muted-foreground truncate cursor-default">{result.organization}</p>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="max-w-xs">{result.organization}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          <ScoreBadge
            score={result.percentage}
            size="sm"
            variant={result.isEligible ? "solid" : "subtle"}
            showTooltip={false}
            className="shrink-0"
          />
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "transition-all",
        isSelected && "border-primary ring-1 ring-primary",
        !result.isEligible && "opacity-75",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          {onSelect && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              disabled={!result.isEligible && !isSelected}
              className="mt-1"
            />
          )}

          <Avatar className="h-12 w-12">
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {getInitials(result.fullName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{result.fullName}</h3>
              {result.isLeadQualified && (
                <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-600">
                  <Star className="h-3 w-3" />
                  {t("leadQualified")}
                </Badge>
              )}
              {!result.isEligible && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="destructive" className="gap-1 cursor-help">
                        <XCircle className="h-3 w-3" />
                        {t("notEligible")}
                      </Badge>
                    </TooltipTrigger>
                    {ineligibilityReason && (
                      <TooltipContent>
                        <p>{ineligibilityReason}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{result.organization}</p>
            <p className="text-xs text-muted-foreground">
              {result.reviewsCompleted} {t("reviewsCompleted")}
            </p>
          </div>

          <CircularScoreBadge score={result.percentage} size="md" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score Breakdown */}
        {showDetails && (
          <ReviewerScoreBreakdown
            expertiseScore={result.breakdown.expertiseScore}
            languageScore={result.breakdown.languageScore}
            availabilityScore={result.breakdown.availabilityScore}
            experienceScore={result.breakdown.experienceScore}
          />
        )}

        {/* Expertise & Language Tags */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {result.expertiseDetails.matchedRequired.map((exp) => (
              <ExpertiseBadgeWithTooltip
                key={exp}
                area={exp}
                abbreviation={EXPERTISE_AREA_ABBREV[exp]}
                variant="secondary"
                className="text-xs"
              />
            ))}
            {result.expertiseDetails.missingRequired.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                      -{result.expertiseDetails.missingRequired.length} missing
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Missing: {result.expertiseDetails.missingRequired.join(", ")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            {result.languageDetails.matchedLanguages.map((lang) => (
              <Badge key={lang} variant="outline" className="text-xs">
                {lang}
              </Badge>
            ))}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex flex-wrap gap-2">
          {/* Availability */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1",
                    result.availabilityStatus.isAvailable
                      ? "text-green-600 border-green-600"
                      : "text-orange-600 border-orange-600"
                  )}
                >
                  {result.availabilityStatus.isAvailable ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  {Math.round(result.availabilityStatus.coverage * 100)}% {t("available")}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {result.availabilityStatus.availableDays} / {result.availabilityStatus.totalDays}{" "}
                days available
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* COI Status */}
          {hasCOI && (
            <Badge
              variant={result.coiStatus.severity === "HARD" ? "destructive" : "outline"}
              className={cn(
                "gap-1",
                result.coiStatus.severity === "SOFT" && "text-orange-600 border-orange-600"
              )}
            >
              <Ban className="h-3 w-3" />
              {result.coiStatus.severity} COI
            </Badge>
          )}
        </div>

        {/* Warnings */}
        {hasWarnings && showDetails && (
          <div className="space-y-1">
            {result.warnings.slice(0, 3).map((warning, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-orange-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{warning}</span>
              </div>
            ))}
            {result.warnings.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{result.warnings.length - 3} more warnings
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        {onViewProfile && (
          <div className="flex justify-end pt-2">
            <Button variant="ghost" size="sm" onClick={onViewProfile}>
              {t("viewProfile")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MatchScoreCard;
