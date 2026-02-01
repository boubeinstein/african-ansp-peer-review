"use client";

/**
 * Report Summary Cards Component
 *
 * Displays key metrics in a grid of cards:
 * - Overall EI Score
 * - Overall SMS Maturity
 * - Total Findings
 * - Critical/Major Findings
 * - CAP Completion Rate
 * - Overdue CAPs
 */

import { useTranslations } from "next-intl";
import {
  TrendingUp,
  Shield,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { FindingType, FindingSeverity, MaturityLevel } from "@/types/prisma-enums";

// =============================================================================
// TYPES
// =============================================================================

interface FindingsData {
  total: number;
  byType: Record<FindingType, number>;
  bySeverity: Record<FindingSeverity, number>;
}

interface CAPsData {
  total: number;
  overdueCount: number;
  completionRate: number;
  byStatus: Record<string, number>;
}

interface ScoresData {
  ans: {
    overallEI: number;
  } | null;
  sms: {
    overallMaturity: MaturityLevel | null;
    overallScore: number;
  } | null;
}

interface ReportSummaryCardsProps {
  findings: FindingsData;
  caps: CAPsData;
  scores: ScoresData;
  className?: string;
}

// =============================================================================
// HELPERS
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

function getMaturityColor(level: MaturityLevel | null): string {
  if (!level) return "text-gray-500";
  const colors: Record<MaturityLevel, string> = {
    LEVEL_A: "text-red-600",
    LEVEL_B: "text-orange-600",
    LEVEL_C: "text-yellow-600",
    LEVEL_D: "text-blue-600",
    LEVEL_E: "text-green-600",
  };
  return colors[level];
}

function getMaturityBgColor(level: MaturityLevel | null): string {
  if (!level) return "bg-gray-100 dark:bg-gray-800";
  const colors: Record<MaturityLevel, string> = {
    LEVEL_A: "bg-red-100 dark:bg-red-900/30",
    LEVEL_B: "bg-orange-100 dark:bg-orange-900/30",
    LEVEL_C: "bg-yellow-100 dark:bg-yellow-900/30",
    LEVEL_D: "bg-blue-100 dark:bg-blue-900/30",
    LEVEL_E: "bg-green-100 dark:bg-green-900/30",
  };
  return colors[level];
}

function getMaturityLabel(level: MaturityLevel | null): string {
  if (!level) return "—";
  return level.replace("LEVEL_", "Level ");
}

// =============================================================================
// SUMMARY CARD
// =============================================================================

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconColor?: string;
  bgColor?: string;
  valueColor?: string;
  warning?: boolean;
  children?: React.ReactNode;
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-primary",
  bgColor,
  valueColor,
  warning = false,
  children,
}: SummaryCardProps) {
  return (
    <Card className={cn("transition-shadow hover:shadow-md", warning && "border-amber-500")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className={cn("text-2xl font-bold mt-1", valueColor)}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
            {children}
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

export function ReportSummaryCards({
  findings,
  caps,
  scores,
  className,
}: ReportSummaryCardsProps) {
  const t = useTranslations("report.summary");

  const criticalMajorCount =
    findings.bySeverity.CRITICAL + findings.bySeverity.MAJOR;
  const hasCriticalFindings = findings.bySeverity.CRITICAL > 0;
  const hasOverdueCAPs = caps.overdueCount > 0;

  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4",
        className
      )}
    >
      {/* Overall EI Score */}
      <SummaryCard
        title={t("eiScore")}
        value={scores.ans ? `${scores.ans.overallEI.toFixed(1)}%` : "—"}
        subtitle={scores.ans ? t("effectiveImplementation") : t("noAssessment")}
        icon={TrendingUp}
        iconColor={scores.ans ? getEIColor(scores.ans.overallEI) : "text-gray-400"}
        bgColor={scores.ans ? getEIBgColor(scores.ans.overallEI) : undefined}
        valueColor={scores.ans ? getEIColor(scores.ans.overallEI) : "text-gray-400"}
      />

      {/* SMS Maturity */}
      <SummaryCard
        title={t("smsMaturity")}
        value={getMaturityLabel(scores.sms?.overallMaturity ?? null)}
        subtitle={
          scores.sms
            ? `${t("score")}: ${scores.sms.overallScore.toFixed(1)}/5`
            : t("noAssessment")
        }
        icon={Shield}
        iconColor={getMaturityColor(scores.sms?.overallMaturity ?? null)}
        bgColor={getMaturityBgColor(scores.sms?.overallMaturity ?? null)}
        valueColor={getMaturityColor(scores.sms?.overallMaturity ?? null)}
      />

      {/* Total Findings */}
      <Popover>
        <PopoverTrigger asChild>
          <div className="cursor-pointer">
            <SummaryCard
              title={t("totalFindings")}
              value={findings.total}
              subtitle={t("clickForBreakdown")}
              icon={AlertTriangle}
              iconColor="text-amber-600"
              bgColor="bg-amber-100 dark:bg-amber-900/30"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">{t("findingsByType")}</h4>
            <div className="space-y-2">
              {Object.entries(findings.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t(`findingType.${type}`)}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
            <div className="border-t pt-3">
              <h4 className="font-medium text-sm mb-2">{t("findingsBySeverity")}</h4>
              <div className="space-y-2">
                {Object.entries(findings.bySeverity).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t(`severity.${severity}`)}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        severity === "CRITICAL" && "border-red-500 text-red-600",
                        severity === "MAJOR" && "border-orange-500 text-orange-600",
                        severity === "MINOR" && "border-yellow-500 text-yellow-600",
                        severity === "OBSERVATION" && "border-blue-500 text-blue-600"
                      )}
                    >
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Critical/Major Findings */}
      <SummaryCard
        title={t("criticalMajor")}
        value={criticalMajorCount}
        subtitle={`${findings.bySeverity.CRITICAL} ${t("critical")}, ${findings.bySeverity.MAJOR} ${t("major")}`}
        icon={AlertOctagon}
        iconColor={hasCriticalFindings ? "text-red-600" : "text-orange-600"}
        bgColor={
          hasCriticalFindings
            ? "bg-red-100 dark:bg-red-900/30"
            : criticalMajorCount > 0
            ? "bg-orange-100 dark:bg-orange-900/30"
            : "bg-green-100 dark:bg-green-900/30"
        }
        valueColor={hasCriticalFindings ? "text-red-600" : "text-orange-600"}
        warning={hasCriticalFindings}
      />

      {/* CAP Completion Rate */}
      <SummaryCard
        title={t("capCompletion")}
        value={`${caps.completionRate}%`}
        subtitle={`${caps.total} ${t("totalCAPs")}`}
        icon={CheckCircle2}
        iconColor={caps.completionRate >= 80 ? "text-green-600" : "text-blue-600"}
        bgColor={
          caps.completionRate >= 80
            ? "bg-green-100 dark:bg-green-900/30"
            : "bg-blue-100 dark:bg-blue-900/30"
        }
        valueColor={caps.completionRate >= 80 ? "text-green-600" : "text-blue-600"}
      >
        <Progress value={caps.completionRate} className="h-1.5 mt-2" />
      </SummaryCard>

      {/* Overdue CAPs */}
      <SummaryCard
        title={t("overdueCAPs")}
        value={caps.overdueCount}
        subtitle={hasOverdueCAPs ? t("requiresAttention") : t("allOnTrack")}
        icon={Clock}
        iconColor={hasOverdueCAPs ? "text-red-600" : "text-green-600"}
        bgColor={
          hasOverdueCAPs
            ? "bg-red-100 dark:bg-red-900/30"
            : "bg-green-100 dark:bg-green-900/30"
        }
        valueColor={hasOverdueCAPs ? "text-red-600" : "text-green-600"}
        warning={hasOverdueCAPs}
      />
    </div>
  );
}

export default ReportSummaryCards;
