"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
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
import type {
  SMSScoreResult,
  ComponentScore,
  StudyAreaScore,
} from "@/server/services/scoring.service";
import {
  MATURITY_LEVEL_VALUES,
  SMS_COMPONENTS,
  SMS_STUDY_AREAS,
} from "@/lib/constants/scoring";
import type { MaturityLevel, SMSComponent } from "@prisma/client";

// =============================================================================
// PROPS
// =============================================================================

interface SMSMaturityDisplayProps {
  score: SMSScoreResult;
  showBreakdown?: boolean;
  previousLevel?: MaturityLevel;
  compact?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function getMaturityBgColor(level: MaturityLevel): string {
  const colorMap: Record<MaturityLevel, string> = {
    LEVEL_A: "bg-red-50",
    LEVEL_B: "bg-orange-50",
    LEVEL_C: "bg-yellow-50",
    LEVEL_D: "bg-green-50",
    LEVEL_E: "bg-blue-50",
  };
  return colorMap[level];
}

function getMaturityBorderColor(level: MaturityLevel): string {
  const colorMap: Record<MaturityLevel, string> = {
    LEVEL_A: "border-red-500",
    LEVEL_B: "border-orange-500",
    LEVEL_C: "border-yellow-500",
    LEVEL_D: "border-green-500",
    LEVEL_E: "border-blue-500",
  };
  return colorMap[level];
}

function getMaturityTextColor(level: MaturityLevel): string {
  const colorMap: Record<MaturityLevel, string> = {
    LEVEL_A: "text-red-600",
    LEVEL_B: "text-orange-600",
    LEVEL_C: "text-yellow-600",
    LEVEL_D: "text-green-600",
    LEVEL_E: "text-blue-600",
  };
  return colorMap[level];
}

function getLevelLetter(level: MaturityLevel): string {
  return level.replace("LEVEL_", "");
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function MaturityLevelBadge({
  level,
  size = "md",
  showName = true,
}: {
  level: MaturityLevel;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}) {
  const levelInfo = MATURITY_LEVEL_VALUES[level];

  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-12 h-12 text-lg",
    lg: "w-16 h-16 text-2xl",
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-bold text-white",
          sizeClasses[size]
        )}
        style={{ backgroundColor: levelInfo.color }}
      >
        {getLevelLetter(level)}
      </div>
      {showName && (
        <div>
          <p className="font-medium">{levelInfo.nameEn}</p>
          <p className="text-xs text-muted-foreground">
            {levelInfo.minScore}-{levelInfo.maxScore}%
          </p>
        </div>
      )}
    </div>
  );
}

function MaturityScale({
  currentLevel,
  score,
}: {
  currentLevel: MaturityLevel;
  score: number;
}) {
  const levels: MaturityLevel[] = [
    "LEVEL_A",
    "LEVEL_B",
    "LEVEL_C",
    "LEVEL_D",
    "LEVEL_E",
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {levels.map((level, index) => {
          const levelInfo = MATURITY_LEVEL_VALUES[level];
          const isActive = level === currentLevel;
          const isPassed =
            levels.indexOf(currentLevel) > index ||
            (isActive && score > levelInfo.midpoint);

          return (
            <div key={level} className="flex-1 flex items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "w-full h-3 rounded-sm transition-all",
                        isActive
                          ? "ring-2 ring-offset-2"
                          : isPassed
                          ? "opacity-100"
                          : "opacity-30"
                      )}
                      style={{
                        backgroundColor: levelInfo.color,
                        // @ts-expect-error CSS custom property for ring color
                        "--tw-ring-color": levelInfo.color,
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">Level {getLevelLetter(level)}</p>
                    <p className="text-xs">{levelInfo.nameEn}</p>
                    <p className="text-xs text-muted-foreground">
                      {levelInfo.minScore}-{levelInfo.maxScore}%
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {index < levels.length - 1 && (
                <div className="w-1 h-3 bg-muted" />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>A - Initial</span>
        <span>E - Excellence</span>
      </div>
    </div>
  );
}

function ComponentScoreCard({
  component,
}: {
  component: ComponentScore;
}) {
  const t = useTranslations("scoring");
  const locale = useLocale();

  const componentInfo = SMS_COMPONENTS[component.code];
  const name = locale === "fr" ? componentInfo?.nameFr : componentInfo?.nameEn;

  return (
    <Card className={cn("border-2", getMaturityBorderColor(component.level))}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">
              {t("weight")}: {(component.weight * 100).toFixed(0)}%
            </p>
          </div>
          <MaturityLevelBadge level={component.level} size="sm" showName={false} />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("score")}</span>
            <span className={cn("font-bold", getMaturityTextColor(component.level))}>
              {component.score.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={component.score}
            className="h-2"
            style={
              {
                "--progress-background": MATURITY_LEVEL_VALUES[component.level].color,
              } as React.CSSProperties
            }
          />
        </div>

        <div className="text-xs text-muted-foreground">
          {component.answeredCount}/{component.questionCount} {t("questionsAnswered")}
        </div>
      </CardContent>
    </Card>
  );
}

function StudyAreasList({
  byStudyArea,
  componentCode,
}: {
  byStudyArea: Record<string, StudyAreaScore>;
  componentCode: SMSComponent;
}) {
  const locale = useLocale();

  const studyAreas = useMemo(() => {
    return Object.values(byStudyArea)
      .filter((sa) => sa.componentCode === componentCode && sa.questionCount > 0)
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [byStudyArea, componentCode]);

  if (studyAreas.length === 0) return null;

  return (
    <div className="space-y-2">
      {studyAreas.map((sa) => {
        const saInfo = SMS_STUDY_AREAS[sa.code];
        const name = locale === "fr" ? saInfo?.nameFr : saInfo?.nameEn;
        const saCode = sa.code.replace("SA_", "").replace("_", ".");

        return (
          <div
            key={sa.code}
            className={cn(
              "flex items-center justify-between p-2 rounded-lg",
              getMaturityBgColor(sa.level)
            )}
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {saCode}
              </Badge>
              <span className="text-sm truncate max-w-[200px]">{name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-medium", getMaturityTextColor(sa.level))}>
                {sa.score.toFixed(0)}%
              </span>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: MATURITY_LEVEL_VALUES[sa.level].color }}
              >
                {getLevelLetter(sa.level)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RadarChartPlaceholder({
  byComponent,
}: {
  byComponent: Record<string, ComponentScore>;
}) {
  const t = useTranslations("scoring");

  // Simple visual representation of component scores
  const components = Object.values(byComponent);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">{t("componentOverview")}</h4>
      <div className="grid grid-cols-2 gap-3">
        {components.map((comp) => (
          <ComponentScoreCard key={comp.code} component={comp} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SMSMaturityDisplay({
  score,
  showBreakdown = true,
  previousLevel,
  compact = false,
}: SMSMaturityDisplayProps) {
  const t = useTranslations("scoring");
  const levelInfo = MATURITY_LEVEL_VALUES[score.overallLevel];

  // Calculate trend
  const previousLevelNumeric = previousLevel
    ? MATURITY_LEVEL_VALUES[previousLevel].numeric
    : null;
  const currentLevelNumeric = MATURITY_LEVEL_VALUES[score.overallLevel].numeric;
  const trend =
    previousLevelNumeric !== null
      ? currentLevelNumeric - previousLevelNumeric
      : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        <MaturityLevelBadge level={score.overallLevel} size="md" showName={false} />
        <div>
          <p className="text-sm text-muted-foreground">{t("smsMaturity")}</p>
          <p
            className="text-2xl font-bold"
            style={{ color: levelInfo.color }}
          >
            {t("level")} {getLevelLetter(score.overallLevel)}
          </p>
          <p className="text-sm text-muted-foreground">{levelInfo.nameEn}</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t("smsMaturity")}</span>
          <Badge variant="outline">
            {score.completionPercentage}% {t("complete")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall maturity level */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold mb-4"
            style={{ backgroundColor: levelInfo.color }}
          >
            {getLevelLetter(score.overallLevel)}
          </motion.div>

          <h3 className="text-2xl font-bold" style={{ color: levelInfo.color }}>
            {t("level")} {getLevelLetter(score.overallLevel)} - {levelInfo.nameEn}
          </h3>

          <p className="text-sm text-muted-foreground mt-1">
            {t("overallScore")}: {score.overallScore.toFixed(1)}%
          </p>

          {/* Trend indicator */}
          {previousLevel && (
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
                {trend} {t("levels")}
              </span>
            </div>
          )}
        </div>

        {/* Maturity scale */}
        <MaturityScale currentLevel={score.overallLevel} score={score.overallScore} />

        {showBreakdown && (
          <>
            {/* Component scores */}
            <div className="border-t pt-6">
              <RadarChartPlaceholder byComponent={score.byComponent} />
            </div>

            {/* Study areas by component */}
            <div className="border-t pt-6 space-y-6">
              <h4 className="text-sm font-medium flex items-center gap-2">
                {t("byStudyArea")}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Maturity levels per CANSO SoE study area
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h4>

              {Object.values(SMS_COMPONENTS).map((comp) => (
                <div key={comp.code} className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {comp.nameEn}
                  </p>
                  <StudyAreasList
                    byStudyArea={score.byStudyArea}
                    componentCode={comp.code}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Completion info */}
        <div className="border-t pt-4 text-center text-sm text-muted-foreground">
          {score.answeredCount}/{score.questionCount} {t("questionsAnswered")}
        </div>
      </CardContent>
    </Card>
  );
}
