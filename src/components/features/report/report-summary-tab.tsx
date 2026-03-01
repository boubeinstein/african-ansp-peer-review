"use client";

/**
 * Report Summary Tab Component
 *
 * Displays key metrics (EI Score, SMS Maturity, Findings, CAP Completion)
 * and editable sections (Executive Summary, Recommendations, Conclusion).
 * Data sourced from the structured ReportContent JSON.
 */

import { useTranslations } from "next-intl";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EditableSection } from "./editable-section";
import type { ReportContent } from "@/types/report";

// =============================================================================
// TYPES
// =============================================================================

interface ReportSummaryTabProps {
  content: ReportContent;
  reviewId: string;
  readOnly?: boolean;
  onSectionSaved?: () => void;
}

// =============================================================================
// COLOR HELPERS
// =============================================================================

function getEIColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

function getEIBgColor(score: number): string {
  if (score >= 80) return "bg-green-100 dark:bg-green-900/30";
  if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/30";
  return "bg-red-100 dark:bg-red-900/30";
}

function getMaturityColor(level: string | null): string {
  if (!level) return "text-gray-500";
  const colors: Record<string, string> = {
    A: "text-red-600",
    B: "text-orange-600",
    C: "text-yellow-600",
    D: "text-blue-600",
    E: "text-green-600",
  };
  return colors[level] || "text-gray-500";
}

function getMaturityBgColor(level: string | null): string {
  if (!level) return "bg-gray-100 dark:bg-gray-800";
  const colors: Record<string, string> = {
    A: "bg-red-100 dark:bg-red-900/30",
    B: "bg-orange-100 dark:bg-orange-900/30",
    C: "bg-yellow-100 dark:bg-yellow-900/30",
    D: "bg-blue-100 dark:bg-blue-900/30",
    E: "bg-green-100 dark:bg-green-900/30",
  };
  return colors[level] || "bg-gray-100 dark:bg-gray-800";
}

// =============================================================================
// METRIC CARD
// =============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconColor?: string;
  bgColor?: string;
  valueColor?: string;
  delta?: number | null;
  progress?: number;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-primary",
  bgColor,
  valueColor,
  delta,
  progress,
}: MetricCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className={cn("text-2xl font-bold", valueColor)}>{value}</p>
              {delta !== undefined && delta !== null && delta !== 0 && (
                <span
                  className={cn(
                    "flex items-center text-xs font-medium",
                    delta > 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {delta > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-0.5" />
                  )}
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(1)}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
            {progress !== undefined && (
              <Progress value={progress} className="h-1.5 mt-2" />
            )}
          </div>
          <div className={cn("p-2.5 rounded-lg", bgColor || "bg-muted/50")}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ReportSummaryTab({
  content,
  reviewId,
  readOnly = false,
  onSectionSaved,
}: ReportSummaryTabProps) {
  const t = useTranslations("report");
  const tSummary = useTranslations("report.summary");

  const sections = content?.sections;
  const ans = sections?.ansAssessment;
  const sms = sections?.smsAssessment;
  const findings = sections?.findingsSummary;
  const caps = sections?.correctiveActions;

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* EI Score */}
        <MetricCard
          title={tSummary("eiScore")}
          value={
            ans?.available && ans.overallEIScore !== null
              ? `${ans.overallEIScore.toFixed(1)}%`
              : "—"
          }
          subtitle={
            ans?.available
              ? tSummary("effectiveImplementation")
              : tSummary("noAssessment")
          }
          icon={TrendingUp}
          iconColor={
            ans?.available && ans.overallEIScore !== null
              ? getEIColor(ans.overallEIScore)
              : "text-gray-400"
          }
          bgColor={
            ans?.available && ans.overallEIScore !== null
              ? getEIBgColor(ans.overallEIScore)
              : undefined
          }
          valueColor={
            ans?.available && ans.overallEIScore !== null
              ? getEIColor(ans.overallEIScore)
              : "text-gray-400"
          }
          delta={ans?.eiDelta ?? null}
        />

        {/* SMS Maturity */}
        <MetricCard
          title={tSummary("smsMaturity")}
          value={
            sms?.available && sms.overallMaturityLevel
              ? `Level ${sms.overallMaturityLevel}`
              : "—"
          }
          subtitle={
            sms?.available && sms.overallScore !== null
              ? `${tSummary("score")}: ${sms.overallScore.toFixed(0)}%`
              : tSummary("noAssessment")
          }
          icon={Shield}
          iconColor={getMaturityColor(sms?.overallMaturityLevel ?? null)}
          bgColor={getMaturityBgColor(sms?.overallMaturityLevel ?? null)}
          valueColor={getMaturityColor(sms?.overallMaturityLevel ?? null)}
        />

        {/* Total Findings */}
        <MetricCard
          title={tSummary("totalFindings")}
          value={findings?.totalFindings ?? 0}
          subtitle={`${findings?.criticalAndMajorCount ?? 0} ${tSummary("criticalMajor")}`}
          icon={AlertTriangle}
          iconColor={
            (findings?.criticalAndMajorCount ?? 0) > 0
              ? "text-amber-600"
              : "text-green-600"
          }
          bgColor={
            (findings?.criticalAndMajorCount ?? 0) > 0
              ? "bg-amber-100 dark:bg-amber-900/30"
              : "bg-green-100 dark:bg-green-900/30"
          }
        />

        {/* CAP Completion */}
        <MetricCard
          title={tSummary("capCompletion")}
          value={`${caps?.completionRate ?? 0}%`}
          subtitle={`${caps?.totalCAPs ?? 0} ${tSummary("totalCAPs")}`}
          icon={CheckCircle2}
          iconColor={
            (caps?.completionRate ?? 0) >= 80 ? "text-green-600" : "text-blue-600"
          }
          bgColor={
            (caps?.completionRate ?? 0) >= 80
              ? "bg-green-100 dark:bg-green-900/30"
              : "bg-blue-100 dark:bg-blue-900/30"
          }
          valueColor={
            (caps?.completionRate ?? 0) >= 80 ? "text-green-600" : "text-blue-600"
          }
          progress={caps?.completionRate ?? 0}
        />
      </div>

      {/* Editable Sections */}
      <EditableSection
        reviewId={reviewId}
        sectionKey="executiveSummary"
        title={t("executiveSummary")}
        contentEn={sections?.executiveSummary?.contentEn ?? ""}
        contentFr={sections?.executiveSummary?.contentFr ?? ""}
        readOnly={readOnly}
        onSaved={onSectionSaved}
      />

      <EditableSection
        reviewId={reviewId}
        sectionKey="recommendations"
        title={t("recommendations")}
        contentEn={sections?.recommendations?.contentEn ?? ""}
        contentFr={sections?.recommendations?.contentFr ?? ""}
        readOnly={readOnly}
        onSaved={onSectionSaved}
      />

      <EditableSection
        reviewId={reviewId}
        sectionKey="conclusion"
        title={t("conclusion")}
        contentEn={sections?.conclusion?.contentEn ?? ""}
        contentFr={sections?.conclusion?.contentFr ?? ""}
        readOnly={readOnly}
        onSaved={onSectionSaved}
      />
    </div>
  );
}
