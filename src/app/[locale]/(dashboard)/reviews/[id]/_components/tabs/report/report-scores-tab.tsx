"use client";

/**
 * Report Scores Tab
 *
 * Professional display of:
 * - ANS Protocol Effective Implementation (EI) scores by review area
 * - CANSO SoE SMS Maturity levels by component with spider/radar chart
 *
 * Data sourced from ReportContent.sections.ansAssessment / smsAssessment.
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
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Target,
  Shield,
  BarChart3,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ReportContent,
  ANSAssessmentSection,
  SMSAssessmentSection,
} from "@/types/report";

// =============================================================================
// PROPS
// =============================================================================

interface ReportScoresTabProps {
  content: ReportContent;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** EI score thresholds */
function getEIColor(score: number): string {
  if (score >= 80) return "#22c55e"; // green
  if (score >= 60) return "#eab308"; // amber
  return "#ef4444"; // red
}

function getEITextColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

function getEIStatusIcon(score: number) {
  if (score >= 80) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (score >= 60) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
  return <XCircle className="h-4 w-4 text-red-600" />;
}

/** Maturity level hex colors (for recharts) */
const MATURITY_HEX: Record<string, string> = {
  A: "#ef4444",
  B: "#f97316",
  C: "#eab308",
  D: "#3b82f6",
  E: "#22c55e",
};

/** Maturity level tailwind bg classes */
const MATURITY_BG: Record<string, string> = {
  A: "bg-red-500",
  B: "bg-orange-500",
  C: "bg-yellow-500",
  D: "bg-blue-500",
  E: "bg-green-500",
};

/** Maturity level descriptive names */
const MATURITY_NAMES: Record<string, { en: string; fr: string }> = {
  A: { en: "Initial / Ad-hoc", fr: "Initial / Ad hoc" },
  B: { en: "Defined / Documented", fr: "Défini / Documenté" },
  C: { en: "Implemented / Measured", fr: "Mis en œuvre / Mesuré" },
  D: { en: "Managed / Controlled", fr: "Géré / Contrôlé" },
  E: { en: "Optimizing / Leading", fr: "Optimisation / Leader" },
};

/** Maturity level score ranges */
const MATURITY_RANGES: Record<string, string> = {
  A: "0–20%",
  B: "21–40%",
  C: "41–60%",
  D: "61–80%",
  E: "81–100%",
};

// =============================================================================
// ANS ASSESSMENT SECTION
// =============================================================================

function ANSAssessmentPanel({ ans, locale }: { ans: ANSAssessmentSection; locale: string }) {
  const t = useTranslations("report.scores");

  // Prepare chart data sorted by score descending
  const chartData = useMemo(() => {
    return [...ans.byReviewArea]
      .filter((area) => area.totalPQs > 0)
      .sort((a, b) => b.eiScore - a.eiScore)
      .map((area) => ({
        code: area.code,
        name: area.name,
        score: area.eiScore,
        totalPQs: area.totalPQs,
        satisfactory: area.satisfactoryPQs,
        notImplemented: area.notImplementedPQs,
        notApplicable: area.notApplicablePQs,
        applicable: area.totalPQs - area.notApplicablePQs,
      }));
  }, [ans.byReviewArea]);

  // CE bar data
  const ceData = useMemo(() => {
    return ans.byCriticalElement.map((ce) => ({
      code: ce.code,
      name: ce.name,
      score: ce.eiScore,
    }));
  }, [ans.byCriticalElement]);

  return (
    <div className="space-y-6">
      {/* Overall EI Score Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">{t("ansTitle")}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{t("overallEI")}</p>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  "text-4xl font-bold tracking-tight",
                  ans.overallEIScore !== null
                    ? getEITextColor(ans.overallEIScore)
                    : "text-gray-400"
                )}
              >
                {ans.overallEIScore !== null ? `${ans.overallEIScore.toFixed(1)}%` : "—"}
              </p>
              {/* Delta from previous */}
              {ans.eiDelta !== null && ans.eiDelta !== 0 && (
                <div
                  className={cn(
                    "flex items-center justify-end gap-1 text-sm font-medium mt-1",
                    ans.eiDelta > 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {ans.eiDelta > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>
                    {ans.eiDelta > 0 ? "+" : ""}
                    {ans.eiDelta.toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    {t("deltaFromPrevious")}
                  </span>
                </div>
              )}
              {/* Abuja Target reference */}
              <div className="flex items-center justify-end gap-1 mt-2 text-xs text-muted-foreground">
                <Target className="h-3 w-3" />
                <span>{t("eiTarget")}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EI by Review Area — Horizontal Bar Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("byReviewArea")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis
                    type="category"
                    dataKey="code"
                    width={50}
                    tick={{ fontSize: 12, fontFamily: "monospace" }}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, t("eiScore")]}
                    labelFormatter={(label: string) => {
                      const item = chartData.find((d) => d.code === label);
                      return item?.name || String(label);
                    }}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={getEIColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("auditArea")}</TableHead>
                    <TableHead className="w-[60px] text-center">{t("code")}</TableHead>
                    <TableHead className="w-[60px] text-right">{t("pqs")}</TableHead>
                    <TableHead className="w-[80px] text-right">{t("satisfactory")}</TableHead>
                    <TableHead className="w-[90px] text-right">{t("eiScore")}</TableHead>
                    <TableHead className="w-[60px] text-center">{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartData.map((area) => (
                    <TableRow key={area.code}>
                      <TableCell className="font-medium">{area.name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono text-xs">
                          {area.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {area.applicable}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {area.satisfactory}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn("font-semibold", getEITextColor(area.score))}>
                          {area.score.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {getEIStatusIcon(area.score)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* EI by Critical Element */}
      {ceData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("criticalElements")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ceData.map((ce) => (
                <div key={ce.code} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="font-mono text-xs min-w-[48px] justify-center"
                      >
                        {ce.code}
                      </Badge>
                      <span className="text-muted-foreground">{ce.name}</span>
                    </div>
                    <span className={cn("font-semibold tabular-nums", getEITextColor(ce.score))}>
                      {ce.score.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(ce.score, 100)}%`,
                          backgroundColor: getEIColor(ce.score),
                        }}
                      />
                    </div>
                    {getEIStatusIcon(ce.score)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-generated Narrative */}
      {(ans.narrativeEn || ans.narrativeFr) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t("narrative")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
              {locale === "fr" ? ans.narrativeFr : ans.narrativeEn}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// SMS ASSESSMENT SECTION
// =============================================================================

function SMSAssessmentPanel({ sms, locale }: { sms: SMSAssessmentSection; locale: string }) {
  const t = useTranslations("report.scores");

  // Radar chart data
  const radarData = useMemo(() => {
    return sms.byComponent.map((comp) => ({
      component: comp.code,
      name: comp.name,
      // Convert percentage (0-100) to 0-5 scale for radar
      score: comp.score / 20,
      level: comp.maturityLevel,
      studyAreas: comp.studyAreas,
      fullMark: 5,
    }));
  }, [sms.byComponent]);

  const overallMaturityHex = sms.overallMaturityLevel
    ? MATURITY_HEX[sms.overallMaturityLevel] || "#9ca3af"
    : "#9ca3af";

  return (
    <div className="space-y-6">
      {/* Overall Maturity Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">{t("smsTitle")}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{t("overallMaturity")}</p>
            </div>
            <div className="text-right">
              {sms.overallMaturityLevel ? (
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    className="text-3xl px-4 py-1 font-bold text-white"
                    style={{ backgroundColor: overallMaturityHex }}
                  >
                    {sms.overallMaturityLevel}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {locale === "fr"
                      ? MATURITY_NAMES[sms.overallMaturityLevel]?.fr
                      : MATURITY_NAMES[sms.overallMaturityLevel]?.en}
                  </span>
                  {sms.overallScore !== null && (
                    <span className="text-sm font-medium">
                      {sms.overallScore.toFixed(0)}%
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-4xl font-bold text-gray-400">—</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Radar Chart */}
      {radarData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("byComponent")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                  <PolarGrid />
                  <PolarAngleAxis
                    dataKey="component"
                    tick={{ fontSize: 12, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 5]}
                    tick={{ fontSize: 10 }}
                    tickCount={6}
                  />
                  <Radar
                    name={t("maturityScore")}
                    dataKey="score"
                    stroke={overallMaturityHex}
                    fill={overallMaturityHex}
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [
                      `${(value ?? 0).toFixed(2)} / 5.0`,
                      t("maturityScore"),
                    ]}
                    labelFormatter={(label: string) => {
                      const item = radarData.find((d) => d.component === label);
                      return item?.name || String(label);
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Maturity Legend with descriptions */}
            <div className="grid grid-cols-5 gap-2 border-t pt-4">
              {(["A", "B", "C", "D", "E"] as const).map((level) => (
                <div key={level} className="text-center">
                  <div
                    className={cn("w-6 h-6 rounded-full mx-auto mb-1 text-white text-xs font-bold flex items-center justify-center", MATURITY_BG[level])}
                  >
                    {level}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {locale === "fr" ? MATURITY_NAMES[level].fr : MATURITY_NAMES[level].en}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">{MATURITY_RANGES[level]}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Component Breakdown with Study Areas */}
      {sms.byComponent.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("componentBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {sms.byComponent.map((comp) => {
              const levelHex = MATURITY_HEX[comp.maturityLevel] || "#9ca3af";

              return (
                <div key={comp.code} className="space-y-2">
                  {/* Component Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {comp.code}
                      </Badge>
                      <span className="text-sm font-medium">{comp.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className="text-xs font-bold text-white"
                        style={{ backgroundColor: levelHex }}
                      >
                        {comp.maturityLevel}
                      </Badge>
                      <span className="text-sm font-semibold tabular-nums">
                        {comp.score.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(comp.score, 100)}%`,
                        backgroundColor: levelHex,
                      }}
                    />
                  </div>

                  {/* Study Areas */}
                  {comp.studyAreas.length > 0 && (
                    <div className="ml-4 border-l-2 border-muted pl-4 space-y-1.5">
                      {comp.studyAreas.map((sa) => {
                        const saHex = MATURITY_HEX[sa.maturityLevel] || "#9ca3af";
                        return (
                          <div
                            key={sa.code}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <span className="font-mono text-xs">{sa.code}</span>
                              <span className="truncate max-w-[200px]">{sa.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded text-[10px] font-bold text-white flex items-center justify-center"
                                style={{ backgroundColor: saHex }}
                              >
                                {sa.maturityLevel}
                              </div>
                              <span className="text-xs font-medium tabular-nums w-10 text-right">
                                {sa.score.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {comp !== sms.byComponent[sms.byComponent.length - 1] && (
                    <Separator className="mt-3" />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Auto-generated Narrative */}
      {(sms.narrativeEn || sms.narrativeFr) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t("narrative")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
              {locale === "fr" ? sms.narrativeFr : sms.narrativeEn}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyAssessmentPanel({ type }: { type: "ANS" | "SMS" }) {
  const t = useTranslations("report.scores");

  return (
    <Card className="flex items-center justify-center min-h-[300px]">
      <div className="text-center p-8 space-y-3">
        {type === "ANS" ? (
          <BarChart3 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
        ) : (
          <Shield className="h-10 w-10 text-muted-foreground/40 mx-auto" />
        )}
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

export function ReportScoresTab({ content }: ReportScoresTabProps) {
  const locale = useLocale();

  const ans = content.sections.ansAssessment;
  const sms = content.sections.smsAssessment;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ANS Protocol — Left Column */}
      <div>
        {ans.available ? (
          <ANSAssessmentPanel ans={ans} locale={locale} />
        ) : (
          <EmptyAssessmentPanel type="ANS" />
        )}
      </div>

      {/* SMS CANSO SoE — Right Column */}
      <div>
        {sms.available ? (
          <SMSAssessmentPanel sms={sms} locale={locale} />
        ) : (
          <EmptyAssessmentPanel type="SMS" />
        )}
      </div>
    </div>
  );
}
