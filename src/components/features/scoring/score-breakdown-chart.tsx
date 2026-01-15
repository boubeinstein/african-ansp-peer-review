"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  AuditAreaScore,
  ComponentScore,
} from "@/server/services/scoring.service";
import {
  AUDIT_AREAS,
  CRITICAL_ELEMENTS,
  SMS_COMPONENTS,
  MATURITY_LEVEL_VALUES,
} from "@/lib/constants/scoring";
import type { MaturityLevel, USOAPAuditArea, CriticalElement } from "@prisma/client";

// =============================================================================
// PROPS
// =============================================================================

interface EIBarChartProps {
  data: Record<string, AuditAreaScore> | Record<string, { code: string; eiScore: number; total: number }>;
  type: "auditArea" | "criticalElement";
  title?: string;
  height?: number;
}

interface SMSRadarChartProps {
  data: Record<string, ComponentScore>;
  title?: string;
  size?: number;
}

interface ScoreComparisonChartProps {
  assessments: Array<{
    id: string;
    title: string;
    score: number;
    date?: Date;
  }>;
  title?: string;
}

interface MaturityDistributionProps {
  levelCounts: Record<MaturityLevel, number>;
  title?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function getBarColor(score: number): string {
  if (score >= 90) return "#22C55E";
  if (score >= 70) return "#3B82F6";
  if (score >= 50) return "#EAB308";
  if (score >= 30) return "#F97316";
  return "#DC2626";
}

// =============================================================================
// EI BAR CHART
// =============================================================================

export function EIBarChart({
  data,
  type,
  title,
  height = 300,
}: EIBarChartProps) {
  const t = useTranslations("scoring");
  const locale = useLocale();

  const chartData = useMemo(() => {
    return Object.values(data)
      .filter((item) => item.total > 0)
      .map((item) => {
        const info =
          type === "auditArea"
            ? AUDIT_AREAS[item.code as USOAPAuditArea]
            : CRITICAL_ELEMENTS[item.code as CriticalElement];

        return {
          code: item.code,
          name: locale === "fr" ? info?.nameFr : info?.nameEn,
          score: item.eiScore,
          total: item.total,
        };
      })
      .sort((a, b) => {
        if (type === "criticalElement") {
          const aNum = parseInt(a.code.replace("CE_", ""));
          const bNum = parseInt(b.code.replace("CE_", ""));
          return aNum - bNum;
        }
        return a.code.localeCompare(b.code);
      });
  }, [data, type, locale]);

  const maxScore = 100;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {title ||
            (type === "auditArea" ? t("byAuditArea") : t("byCriticalElement"))}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3" style={{ minHeight: height }}>
          {chartData.map((item, index) => (
            <motion.div
              key={item.code}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs min-w-[50px] justify-center">
                    {type === "criticalElement"
                      ? item.code.replace("CE_", "CE-")
                      : item.code}
                  </Badge>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="truncate max-w-[180px] text-muted-foreground cursor-help">
                          {item.name}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{item.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span
                  className="font-bold"
                  style={{ color: getBarColor(item.score) }}
                >
                  {item.score.toFixed(1)}%
                </span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.score / maxScore) * 100}%` }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: getBarColor(item.score) }}
                />
              </div>
            </motion.div>
          ))}

          {chartData.length === 0 && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {t("noData")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SMS RADAR/COMPONENT CHART
// =============================================================================

export function SMSComponentChart({
  data,
  title,
  size = 300,
}: SMSRadarChartProps) {
  const t = useTranslations("scoring");
  const locale = useLocale();

  const components = useMemo(() => {
    return Object.values(data).map((comp) => {
      const info = SMS_COMPONENTS[comp.code];
      return {
        ...comp,
        name: locale === "fr" ? info?.nameFr : info?.nameEn,
        shortName: comp.code
          .replace("SAFETY_", "")
          .replace("_", " ")
          .split(" ")
          .map((w) => w.charAt(0))
          .join(""),
      };
    });
  }, [data, locale]);

  // Create a simple visual representation since we don't have a charting library
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = (size - 80) / 2;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title || t("byComponent")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          {/* Simple spider/radar chart using SVG */}
          <svg width={size} height={size} className="overflow-visible">
            {/* Background circles */}
            {[20, 40, 60, 80, 100].map((level) => (
              <circle
                key={level}
                cx={centerX}
                cy={centerY}
                r={(radius * level) / 100}
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                className="text-muted/30"
              />
            ))}

            {/* Axis lines */}
            {components.map((comp, i) => {
              const angle = (i * 2 * Math.PI) / components.length - Math.PI / 2;
              const x2 = centerX + radius * Math.cos(angle);
              const y2 = centerY + radius * Math.sin(angle);
              return (
                <line
                  key={comp.code}
                  x1={centerX}
                  y1={centerY}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeWidth={1}
                  className="text-muted/30"
                />
              );
            })}

            {/* Data polygon */}
            <motion.polygon
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              points={components
                .map((comp, i) => {
                  const angle =
                    (i * 2 * Math.PI) / components.length - Math.PI / 2;
                  const r = (radius * comp.score) / 100;
                  const x = centerX + r * Math.cos(angle);
                  const y = centerY + r * Math.sin(angle);
                  return `${x},${y}`;
                })
                .join(" ")}
              fill={MATURITY_LEVEL_VALUES[components[0]?.level || "LEVEL_A"].color}
              fillOpacity={0.3}
              stroke={MATURITY_LEVEL_VALUES[components[0]?.level || "LEVEL_A"].color}
              strokeWidth={2}
            />

            {/* Data points */}
            {components.map((comp, i) => {
              const angle = (i * 2 * Math.PI) / components.length - Math.PI / 2;
              const r = (radius * comp.score) / 100;
              const x = centerX + r * Math.cos(angle);
              const y = centerY + r * Math.sin(angle);
              const labelR = radius + 30;
              const labelX = centerX + labelR * Math.cos(angle);
              const labelY = centerY + labelR * Math.sin(angle);

              return (
                <g key={comp.code}>
                  <motion.circle
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    cx={x}
                    cy={y}
                    r={6}
                    fill={MATURITY_LEVEL_VALUES[comp.level].color}
                  />
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs fill-muted-foreground font-medium"
                  >
                    {comp.shortName}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 mt-4 w-full">
            {components.map((comp) => (
              <div
                key={comp.code}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg text-sm",
                  `bg-${comp.level === "LEVEL_A" ? "red" : comp.level === "LEVEL_B" ? "orange" : comp.level === "LEVEL_C" ? "yellow" : comp.level === "LEVEL_D" ? "green" : "blue"}-50`
                )}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: MATURITY_LEVEL_VALUES[comp.level].color,
                  }}
                />
                <span className="truncate flex-1">{comp.name}</span>
                <span
                  className="font-bold"
                  style={{ color: MATURITY_LEVEL_VALUES[comp.level].color }}
                >
                  {comp.score.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SCORE COMPARISON CHART
// =============================================================================

export function ScoreComparisonChart({
  assessments,
  title,
}: ScoreComparisonChartProps) {
  const t = useTranslations("scoring");

  const sortedAssessments = useMemo(() => {
    return [...assessments].sort((a, b) => {
      if (a.date && b.date) {
        return a.date.getTime() - b.date.getTime();
      }
      return 0;
    });
  }, [assessments]);

  const maxScore = 100;

  if (sortedAssessments.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title || t("scoreComparison")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            {t("noData")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title || t("scoreComparison")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-4 h-48">
          {sortedAssessments.map((assessment, index) => {
            const barHeight = (assessment.score / maxScore) * 100;

            return (
              <TooltipProvider key={assessment.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${barHeight}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="flex-1 min-w-[40px] rounded-t-lg cursor-pointer"
                      style={{ backgroundColor: getBarColor(assessment.score) }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{assessment.title}</p>
                    <p className="text-sm">
                      {t("score")}: {assessment.score.toFixed(1)}%
                    </p>
                    {assessment.date && (
                      <p className="text-xs text-muted-foreground">
                        {assessment.date.toLocaleDateString()}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex items-center gap-4 mt-2 border-t pt-2">
          {sortedAssessments.map((assessment) => (
            <div
              key={assessment.id}
              className="flex-1 min-w-[40px] text-center text-xs text-muted-foreground truncate"
            >
              {assessment.date
                ? assessment.date.toLocaleDateString(undefined, {
                    month: "short",
                    year: "2-digit",
                  })
                : assessment.title.substring(0, 10)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MATURITY DISTRIBUTION CHART
// =============================================================================

export function MaturityDistributionChart({
  levelCounts,
  title,
}: MaturityDistributionProps) {
  const t = useTranslations("scoring");

  const levels: MaturityLevel[] = [
    "LEVEL_A",
    "LEVEL_B",
    "LEVEL_C",
    "LEVEL_D",
    "LEVEL_E",
  ];
  const total = Object.values(levelCounts).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {title || t("maturityDistribution")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stacked bar */}
        <div className="h-8 flex rounded-lg overflow-hidden mb-4">
          {levels.map((level) => {
            const count = levelCounts[level] || 0;
            const percentage = total > 0 ? (count / total) * 100 : 0;

            if (percentage === 0) return null;

            return (
              <TooltipProvider key={level}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full cursor-pointer"
                      style={{
                        backgroundColor: MATURITY_LEVEL_VALUES[level].color,
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">
                      {t("level")} {level.replace("LEVEL_", "")}
                    </p>
                    <p className="text-sm">
                      {count} {t("questions")} ({percentage.toFixed(1)}%)
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-5 gap-2">
          {levels.map((level) => {
            const info = MATURITY_LEVEL_VALUES[level];
            const count = levelCounts[level] || 0;

            return (
              <div key={level} className="text-center">
                <div
                  className="w-full h-2 rounded-full mb-1"
                  style={{ backgroundColor: info.color }}
                />
                <div className="text-xs font-medium">
                  {level.replace("LEVEL_", "")}
                </div>
                <div className="text-xs text-muted-foreground">{count}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
