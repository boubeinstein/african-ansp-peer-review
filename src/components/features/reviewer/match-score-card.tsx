"use client";

/**
 * Match Score Card Component
 *
 * Visual display of reviewer match score with breakdown,
 * warnings, and COI indicators.
 */

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
  Briefcase,
  Calendar,
  CheckCircle2,
  Globe,
  Star,
  User,
  XCircle,
} from "lucide-react";
import type { MatchResult } from "@/lib/reviewer/matching";
import { EXPERTISE_AREA_ABBREV } from "@/lib/reviewer/labels";

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

function getScoreColor(percentage: number): string {
  if (percentage >= 80) return "text-green-600";
  if (percentage >= 60) return "text-yellow-600";
  if (percentage >= 40) return "text-orange-600";
  return "text-red-600";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ScoreBreakdownBarProps {
  label: string;
  score: number;
  maxScore: number;
  icon: React.ReactNode;
}

function ScoreBreakdownBar({ label, score, maxScore, icon }: ScoreBreakdownBarProps) {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="font-medium">
          {score.toFixed(1)}/{maxScore}
        </span>
      </div>
      <Progress value={percentage} className="h-1.5" />
    </div>
  );
}

interface CircularScoreProps {
  percentage: number;
  size?: "sm" | "md" | "lg";
}

function CircularScore({ percentage, size = "md" }: CircularScoreProps) {
  const sizeClasses = {
    sm: "h-12 w-12 text-sm",
    md: "h-16 w-16 text-lg",
    lg: "h-20 w-20 text-xl",
  };

  const strokeWidth = size === "sm" ? 3 : size === "md" ? 4 : 5;
  const radius = size === "sm" ? 20 : size === "md" ? 28 : 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses[size])}>
      <svg className="absolute transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={getScoreColor(percentage)}
        />
      </svg>
      <span className={cn("font-bold", getScoreColor(percentage))}>{percentage}%</span>
    </div>
  );
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

  const hasWarnings = result.warnings.length > 0;
  const hasCOI = result.coiStatus.hasConflict;

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
            <span className="font-medium text-sm truncate">{result.fullName}</span>
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
          </div>
          <p className="text-xs text-muted-foreground truncate">{result.organization}</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={result.isEligible ? "default" : "secondary"}
            className={cn(
              "shrink-0",
              result.percentage >= 80 && "bg-green-500",
              result.percentage >= 60 && result.percentage < 80 && "bg-yellow-500",
              result.percentage < 60 && "bg-orange-500"
            )}
          >
            {result.percentage}%
          </Badge>
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
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {t("notEligible")}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{result.organization}</p>
            <p className="text-xs text-muted-foreground">
              {result.reviewsCompleted} {t("reviewsCompleted")}
            </p>
          </div>

          <CircularScore percentage={result.percentage} size="md" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score Breakdown */}
        {showDetails && (
          <div className="space-y-2">
            <ScoreBreakdownBar
              label={t("breakdown.expertise")}
              score={result.breakdown.expertiseScore}
              maxScore={40}
              icon={<Briefcase className="h-3.5 w-3.5" />}
            />
            <ScoreBreakdownBar
              label={t("breakdown.language")}
              score={result.breakdown.languageScore}
              maxScore={25}
              icon={<Globe className="h-3.5 w-3.5" />}
            />
            <ScoreBreakdownBar
              label={t("breakdown.availability")}
              score={result.breakdown.availabilityScore}
              maxScore={25}
              icon={<Calendar className="h-3.5 w-3.5" />}
            />
            <ScoreBreakdownBar
              label={t("breakdown.experience")}
              score={result.breakdown.experienceScore}
              maxScore={10}
              icon={<User className="h-3.5 w-3.5" />}
            />
          </div>
        )}

        {/* Expertise & Language Tags */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {result.expertiseDetails.matchedRequired.map((exp) => (
              <Badge key={exp} variant="secondary" className="text-xs">
                {EXPERTISE_AREA_ABBREV[exp]}
              </Badge>
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
