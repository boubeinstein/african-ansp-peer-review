"use client";

/**
 * Report Scores Section Component
 *
 * Two-column layout displaying:
 * - Left: ANS USOAP CMA EI Scores by audit area
 * - Right: SMS CANSO SoE Maturity by component
 */

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MaturityLevel } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

interface AuditAreaScore {
  score: number;
  total: number;
  satisfactory: number;
}

interface ComponentScore {
  level: MaturityLevel | null;
  avgScore: number;
  count: number;
}

interface ANSScores {
  overallEI: number;
  byAuditArea: Record<string, AuditAreaScore>;
}

interface SMSScores {
  overallMaturity: MaturityLevel | null;
  overallScore: number;
  byComponent: Record<string, ComponentScore>;
}

interface ReportScoresSectionProps {
  ansScores: ANSScores | null;
  smsScores: SMSScores | null;
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const AUDIT_AREA_LABELS: Record<string, { en: string; fr: string; abbrev: string }> = {
  ANS: { en: "Air Navigation Services", fr: "Services de Navigation Aérienne", abbrev: "ANS" },
  AGA: { en: "Aerodromes", fr: "Aérodromes", abbrev: "AGA" },
  AIG: { en: "Aircraft Accident Investigation", fr: "Enquêtes sur les Accidents", abbrev: "AIG" },
  AIR: { en: "Airworthiness", fr: "Navigabilité", abbrev: "AIR" },
  OPS: { en: "Air Operations", fr: "Opérations Aériennes", abbrev: "OPS" },
  PEL: { en: "Personnel Licensing", fr: "Licences du Personnel", abbrev: "PEL" },
  LEG: { en: "Legislation", fr: "Législation", abbrev: "LEG" },
  ORG: { en: "Organization", fr: "Organisation", abbrev: "ORG" },
};

const SMS_COMPONENT_LABELS: Record<string, { en: string; fr: string; abbrev: string }> = {
  SAFETY_POLICY_OBJECTIVES: {
    en: "Safety Policy & Objectives",
    fr: "Politique et Objectifs de Sécurité",
    abbrev: "C1",
  },
  SAFETY_RISK_MANAGEMENT: {
    en: "Safety Risk Management",
    fr: "Gestion des Risques de Sécurité",
    abbrev: "C2",
  },
  SAFETY_ASSURANCE: {
    en: "Safety Assurance",
    fr: "Assurance de la Sécurité",
    abbrev: "C3",
  },
  SAFETY_PROMOTION: {
    en: "Safety Promotion",
    fr: "Promotion de la Sécurité",
    abbrev: "C4",
  },
};

const MATURITY_COLORS: Record<MaturityLevel, string> = {
  LEVEL_A: "#ef4444",
  LEVEL_B: "#f97316",
  LEVEL_C: "#eab308",
  LEVEL_D: "#3b82f6",
  LEVEL_E: "#22c55e",
};

// =============================================================================
// HELPERS
// =============================================================================

function getEIColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  return "#ef4444";
}

function getEITextColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

function getMaturityLabel(level: MaturityLevel | null): string {
  if (!level) return "—";
  return level.replace("LEVEL_", "");
}

// =============================================================================
// ANS SCORES PANEL
// =============================================================================

function ANSScoresPanel({
  scores,
  locale,
}: {
  scores: ANSScores;
  locale: string;
}) {
  const t = useTranslations("report.scores");

  const chartData = useMemo(() => {
    return Object.entries(scores.byAuditArea)
      .filter(([, data]) => data.total > 0)
      .map(([area, data]) => {
        const label = AUDIT_AREA_LABELS[area];
        return {
          area: label?.abbrev || area,
          name: locale === "fr" ? label?.fr : label?.en || area,
          score: data.score,
          total: data.total,
          satisfactory: data.satisfactory,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [scores.byAuditArea, locale]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t("ansTitle")}</CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t("overallEI")}</p>
            <p className={cn("text-2xl font-bold", getEITextColor(scores.overallEI))}>
              {scores.overallEI.toFixed(1)}%
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bar Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis
                type="category"
                dataKey="area"
                width={50}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => [`${Number(value).toFixed(1)}%`, t("eiScore")]}
                labelFormatter={(label) => {
                  const item = chartData.find((d) => d.area === label);
                  return item?.name || String(label);
                }}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getEIColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-3 border-t pt-4">
          <h4 className="text-sm font-medium">{t("detailedBreakdown")}</h4>
          <div className="space-y-2">
            {chartData.map((item) => (
              <div key={item.area} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {item.area}
                    </Badge>
                    <span className="text-muted-foreground truncate max-w-[200px]">
                      {item.name}
                    </span>
                  </div>
                  <span className={cn("font-medium", getEITextColor(item.score))}>
                    {item.score.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={item.score}
                  className="h-1.5"
                />
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="text-green-600">{item.satisfactory} SAT</span>
                  <span className="text-red-600">
                    {item.total - item.satisfactory} NSAT
                  </span>
                  <span>{item.total} {t("total")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SMS SCORES PANEL
// =============================================================================

function SMSScoresPanel({
  scores,
  locale,
}: {
  scores: SMSScores;
  locale: string;
}) {
  const t = useTranslations("report.scores");

  const chartData = useMemo(() => {
    return Object.entries(scores.byComponent)
      .filter(([, data]) => data.count > 0)
      .map(([component, data]) => {
        const label = SMS_COMPONENT_LABELS[component];
        return {
          component: label?.abbrev || component,
          name: locale === "fr" ? label?.fr : label?.en || component,
          score: data.avgScore,
          level: data.level,
          count: data.count,
          fullMark: 5,
        };
      });
  }, [scores.byComponent, locale]);

  const maturityColor = scores.overallMaturity
    ? MATURITY_COLORS[scores.overallMaturity]
    : "#9ca3af";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t("smsTitle")}</CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t("overallMaturity")}</p>
            <div className="flex items-center gap-2">
              <Badge
                className="text-lg px-3"
                style={{ backgroundColor: maturityColor, color: "white" }}
              >
                {getMaturityLabel(scores.overallMaturity)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ({scores.overallScore.toFixed(1)}/5)
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Radar Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid />
              <PolarAngleAxis
                dataKey="component"
                tick={{ fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 5]}
                tick={{ fontSize: 10 }}
              />
              <Radar
                name={t("maturityScore")}
                dataKey="score"
                stroke={maturityColor}
                fill={maturityColor}
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip
                formatter={(value) => [Number(value).toFixed(2), t("maturityScore")]}
                labelFormatter={(label) => {
                  const item = chartData.find((d) => d.component === label);
                  return item?.name || String(label);
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Maturity Legend */}
        <div className="flex items-center justify-center gap-2 border-t pt-4">
          {(["LEVEL_A", "LEVEL_B", "LEVEL_C", "LEVEL_D", "LEVEL_E"] as MaturityLevel[]).map(
            (level) => (
              <div key={level} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: MATURITY_COLORS[level] }}
                />
                <span className="text-xs">{level.replace("LEVEL_", "")}</span>
              </div>
            )
          )}
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-3 border-t pt-4">
          <h4 className="text-sm font-medium">{t("componentBreakdown")}</h4>
          <div className="space-y-3">
            {chartData.map((item) => (
              <div key={item.component} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {item.component}
                    </Badge>
                    <span className="text-sm text-muted-foreground truncate max-w-[180px]">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.level && (
                      <Badge
                        className="text-xs"
                        style={{
                          backgroundColor: MATURITY_COLORS[item.level],
                          color: "white",
                        }}
                      >
                        {getMaturityLabel(item.level)}
                      </Badge>
                    )}
                    <span className="text-sm font-medium">
                      {item.score.toFixed(1)}/5
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={(item.score / 5) * 100}
                    className="h-1.5 flex-1"
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.count} {t("questions")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyScoresPanel({ type }: { type: "ANS" | "SMS" }) {
  const t = useTranslations("report.scores");

  return (
    <Card className="flex items-center justify-center min-h-[400px]">
      <div className="text-center p-8">
        <p className="text-muted-foreground">
          {type === "ANS" ? t("noANSAssessment") : t("noSMSAssessment")}
        </p>
      </div>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ReportScoresSection({
  ansScores,
  smsScores,
  className,
}: ReportScoresSectionProps) {
  const locale = useLocale();

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", className)}>
      {/* ANS USOAP CMA Scores */}
      {ansScores ? (
        <ANSScoresPanel scores={ansScores} locale={locale} />
      ) : (
        <EmptyScoresPanel type="ANS" />
      )}

      {/* SMS CANSO SoE Scores */}
      {smsScores ? (
        <SMSScoresPanel scores={smsScores} locale={locale} />
      ) : (
        <EmptyScoresPanel type="SMS" />
      )}
    </div>
  );
}

export default ReportScoresSection;
