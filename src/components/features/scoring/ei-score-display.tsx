"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EIScoreResult, AuditAreaScore } from "@/server/services/scoring.service";
import { AUDIT_AREAS, CRITICAL_ELEMENTS } from "@/lib/constants/scoring";

// =============================================================================
// PROPS
// =============================================================================

interface EIScoreDisplayProps {
  score: EIScoreResult;
  showBreakdown?: boolean;
  previousScore?: number;
  compact?: boolean;
}

interface ScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  showTrend?: boolean;
  previousScore?: number;
}

interface ResponseBreakdownProps {
  satisfactory: number;
  notSatisfactory: number;
  notApplicable: number;
  notReviewed: number;
  total: number;
}

// =============================================================================
// HELPERS
// =============================================================================

function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-600";
  if (score >= 70) return "text-blue-600";
  if (score >= 50) return "text-yellow-600";
  if (score >= 30) return "text-orange-600";
  return "text-red-600";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Satisfactory";
  if (score >= 30) return "Needs Improvement";
  return "Critical";
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ScoreGauge({
  score,
  size = "md",
  label,
  showTrend,
  previousScore,
}: ScoreGaugeProps) {
  const sizeClasses = {
    sm: "w-24 h-24",
    md: "w-36 h-36",
    lg: "w-48 h-48",
  };

  const fontSize = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-4xl",
  };

  const strokeWidth = {
    sm: 6,
    md: 8,
    lg: 10,
  };

  const radius = size === "sm" ? 40 : size === "md" ? 60 : 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const trend = previousScore !== undefined ? score - previousScore : 0;

  return (
    <div className="relative inline-flex flex-col items-center">
      <div className={cn("relative", sizeClasses[size])}>
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth[size]}
            className="text-muted/30"
          />
          {/* Score arc */}
          <motion.circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth={strokeWidth[size]}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop
                offset="0%"
                className={cn(
                  score >= 90
                    ? "text-green-500"
                    : score >= 70
                    ? "text-blue-500"
                    : score >= 50
                    ? "text-yellow-500"
                    : score >= 30
                    ? "text-orange-500"
                    : "text-red-500"
                )}
                stopColor="currentColor"
              />
              <stop
                offset="100%"
                className={cn(
                  score >= 90
                    ? "text-green-600"
                    : score >= 70
                    ? "text-blue-600"
                    : score >= 50
                    ? "text-yellow-600"
                    : score >= 30
                    ? "text-orange-600"
                    : "text-red-600"
                )}
                stopColor="currentColor"
              />
            </linearGradient>
          </defs>
        </svg>

        {/* Score value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className={cn("font-bold", fontSize[size], getScoreColor(score))}
          >
            {score.toFixed(1)}%
          </motion.span>
          {label && (
            <span className="text-xs text-muted-foreground mt-1">{label}</span>
          )}
        </div>
      </div>

      {/* Trend indicator */}
      {showTrend && previousScore !== undefined && (
        <div
          className={cn(
            "flex items-center gap-1 mt-2 text-sm",
            trend > 0
              ? "text-green-600"
              : trend < 0
              ? "text-red-600"
              : "text-muted-foreground"
          )}
        >
          {trend > 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : trend < 0 ? (
            <TrendingDown className="h-4 w-4" />
          ) : (
            <Minus className="h-4 w-4" />
          )}
          <span>
            {trend > 0 ? "+" : ""}
            {trend.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

function ResponseBreakdown({
  satisfactory,
  notSatisfactory,
  notApplicable,
  notReviewed,
  total,
}: ResponseBreakdownProps) {
  const t = useTranslations("scoring");

  const items = [
    {
      key: "satisfactory",
      label: t("satisfactory"),
      count: satisfactory,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      key: "notSatisfactory",
      label: t("notSatisfactory"),
      count: notSatisfactory,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      key: "notApplicable",
      label: t("notApplicable"),
      count: notApplicable,
      icon: MinusCircle,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
    {
      key: "notReviewed",
      label: t("notReviewed"),
      count: notReviewed,
      icon: HelpCircle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        const percentage =
          total > 0 ? Math.round((item.count / total) * 100) : 0;

        return (
          <div
            key={item.key}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg",
              item.bgColor
            )}
          >
            <Icon className={cn("h-5 w-5", item.color)} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.label}</span>
                <span className={cn("font-bold", item.color)}>{item.count}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {percentage}% of total
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AuditAreaBreakdown({
  byAuditArea,
}: {
  byAuditArea: Record<string, AuditAreaScore>;
}) {
  const t = useTranslations("scoring");
  const locale = useLocale();

  const sortedAreas = useMemo(() => {
    return Object.values(byAuditArea)
      .filter((area) => area.total > 0)
      .sort((a, b) => b.eiScore - a.eiScore);
  }, [byAuditArea]);

  if (sortedAreas.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        {t("byAuditArea")}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">
                EI score calculated per USOAP audit area
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </h4>

      <div className="space-y-2">
        {sortedAreas.map((area) => {
          const areaInfo = AUDIT_AREAS[area.code];
          const name = locale === "fr" ? areaInfo?.nameFr : areaInfo?.nameEn;

          return (
            <div key={area.code} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {area.code}
                  </Badge>
                  <span className="truncate max-w-[200px]">{name}</span>
                </div>
                <span className={cn("font-medium", getScoreColor(area.eiScore))}>
                  {area.eiScore.toFixed(1)}%
                </span>
              </div>
              <Progress value={area.eiScore} className="h-2" />
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="text-green-600">
                  {area.satisfactory} SAT
                </span>
                <span className="text-red-600">
                  {area.notSatisfactory} NSAT
                </span>
                <span className="text-gray-600">{area.notApplicable} N/A</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CriticalElementBreakdown({
  byCriticalElement,
}: {
  byCriticalElement: Record<string, { code: string; eiScore: number; total: number }>;
}) {
  const t = useTranslations("scoring");
  const locale = useLocale();

  const sortedElements = useMemo(() => {
    return Object.values(byCriticalElement)
      .filter((ce) => ce.total > 0)
      .sort((a, b) => {
        const aNum = parseInt(a.code.replace("CE_", ""));
        const bNum = parseInt(b.code.replace("CE_", ""));
        return aNum - bNum;
      });
  }, [byCriticalElement]);

  if (sortedElements.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        {t("byCriticalElement")}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">
                EI score for each of the 8 ICAO Critical Elements
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </h4>

      <div className="grid grid-cols-4 gap-3">
        {sortedElements.map((ce) => {
          const ceInfo = CRITICAL_ELEMENTS[ce.code as keyof typeof CRITICAL_ELEMENTS];
          const name = locale === "fr" ? ceInfo?.nameFr : ceInfo?.nameEn;
          const ceNumber = ce.code.replace("CE_", "");

          return (
            <TooltipProvider key={ce.code}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-colors",
                      ce.eiScore >= 90
                        ? "border-green-500 bg-green-50"
                        : ce.eiScore >= 70
                        ? "border-blue-500 bg-blue-50"
                        : ce.eiScore >= 50
                        ? "border-yellow-500 bg-yellow-50"
                        : ce.eiScore >= 30
                        ? "border-orange-500 bg-orange-50"
                        : "border-red-500 bg-red-50"
                    )}
                  >
                    <span className="text-xs text-muted-foreground">
                      CE-{ceNumber}
                    </span>
                    <span
                      className={cn(
                        "text-xl font-bold",
                        getScoreColor(ce.eiScore)
                      )}
                    >
                      {ce.eiScore.toFixed(0)}%
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ce.eiScore.toFixed(1)}% EI Score
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function EIScoreDisplay({
  score,
  showBreakdown = true,
  previousScore,
  compact = false,
}: EIScoreDisplayProps) {
  const t = useTranslations("scoring");

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        <ScoreGauge score={score.overall} size="sm" />
        <div>
          <p className="text-sm text-muted-foreground">{t("eiScore")}</p>
          <p className={cn("text-2xl font-bold", getScoreColor(score.overall))}>
            {score.overall.toFixed(1)}%
          </p>
          <Badge
            variant="outline"
            className={cn(
              score.overall >= 90
                ? "border-green-500 text-green-600"
                : score.overall >= 70
                ? "border-blue-500 text-blue-600"
                : score.overall >= 50
                ? "border-yellow-500 text-yellow-600"
                : "border-red-500 text-red-600"
            )}
          >
            {getScoreLabel(score.overall)}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t("eiScore")}</span>
          <Badge variant="outline">
            {score.completionPercentage}% {t("complete")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main score gauge */}
        <div className="flex flex-col items-center">
          <ScoreGauge
            score={score.overall}
            size="lg"
            label={t("overallEI")}
            showTrend={!!previousScore}
            previousScore={previousScore}
          />
          <Badge
            className={cn(
              "mt-4",
              score.overall >= 90
                ? "bg-green-600"
                : score.overall >= 70
                ? "bg-blue-600"
                : score.overall >= 50
                ? "bg-yellow-600"
                : score.overall >= 30
                ? "bg-orange-600"
                : "bg-red-600"
            )}
          >
            {getScoreLabel(score.overall)}
          </Badge>
        </div>

        {/* Response breakdown */}
        {showBreakdown && (
          <>
            <div className="border-t pt-6">
              <h4 className="text-sm font-medium mb-4">
                {t("responseBreakdown")}
              </h4>
              <ResponseBreakdown
                satisfactory={score.satisfactoryCount}
                notSatisfactory={score.notSatisfactoryCount}
                notApplicable={score.notApplicableCount}
                notReviewed={score.notReviewedCount}
                total={score.totalQuestions}
              />
            </div>

            {/* Critical Elements */}
            <div className="border-t pt-6">
              <CriticalElementBreakdown
                byCriticalElement={score.byCriticalElement}
              />
            </div>

            {/* Audit Areas */}
            <div className="border-t pt-6">
              <AuditAreaBreakdown byAuditArea={score.byAuditArea} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
