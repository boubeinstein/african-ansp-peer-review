"use client";

/**
 * Programme Overview Component
 *
 * Displays programme-wide metrics for admin roles including:
 * - Regional team summary
 * - Assessment completion rates
 * - Findings by severity distribution
 */

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  AlertTriangle,
  AlertCircle,
  FileWarning,
  Eye,
} from "lucide-react";
import type { FindingSeverity } from "@/types/prisma-enums";

// =============================================================================
// TYPES
// =============================================================================

interface ProgrammeOverviewProps {
  stats: {
    totalAnsps: number;
    activeParticipants: number;
    totalAssessments: number;
    totalReviews: number;
    openFindingsBySeverity: Record<FindingSeverity, number>;
    overdueCaps: number;
    averageEIScore: number | null;
    pendingJoinRequests: number;
  };
  isLoading?: boolean;
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const REGIONS = [
  { id: "WACAF", name: "WACAF", countries: 23 },
  { id: "ESAF", name: "ESAF", countries: 27 },
  { id: "NORTHERN", name: "Northern Africa", countries: 4 },
];

const SEVERITY_CONFIG: Record<
  FindingSeverity,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  CRITICAL: {
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  MAJOR: {
    icon: AlertCircle,
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  MINOR: {
    icon: FileWarning,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  OBSERVATION: {
    icon: Eye,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
};

// =============================================================================
// LOADING SKELETON
// =============================================================================

function ProgrammeOverviewSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-32" />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// FINDINGS SEVERITY BAR
// =============================================================================

interface FindingsSeverityBarProps {
  findings: Record<FindingSeverity, number>;
}

function FindingsSeverityBar({ findings }: FindingsSeverityBarProps) {
  const t = useTranslations("dashboard.sections");
  const total = Object.values(findings).reduce((sum, count) => sum + count, 0);

  if (total === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        {t("noOpenFindings")}
      </div>
    );
  }

  const severities: FindingSeverity[] = ["CRITICAL", "MAJOR", "MINOR", "OBSERVATION"];

  return (
    <div className="space-y-3">
      <div className="flex h-4 overflow-hidden rounded-full bg-muted">
        {severities.map((severity) => {
          const count = findings[severity];
          const percentage = (count / total) * 100;
          if (percentage === 0) return null;

          const config = SEVERITY_CONFIG[severity];
          return (
            <div
              key={severity}
              className={cn(config.bgColor, "transition-all")}
              style={{ width: `${percentage}%` }}
              title={`${severity}: ${count}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 justify-center">
        {severities.map((severity) => {
          const count = findings[severity];
          const config = SEVERITY_CONFIG[severity];
          const Icon = config.icon;

          return (
            <div key={severity} className="flex items-center gap-2 text-sm">
              <Icon className={cn("h-4 w-4", config.color)} />
              <span className="text-muted-foreground">{severity}</span>
              <Badge variant="secondary" className="font-mono">
                {count}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// REGIONAL SUMMARY
// =============================================================================

function RegionalSummary() {
  const t = useTranslations("dashboard.sections");

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {REGIONS.map((region) => (
        <div
          key={region.id}
          className="flex items-center gap-3 p-3 rounded-lg border bg-card"
        >
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-sm">{region.name}</p>
            <p className="text-xs text-muted-foreground">
              {region.countries} {t("countries")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// ASSESSMENT PROGRESS
// =============================================================================

interface AssessmentProgressProps {
  totalAssessments: number;
  totalAnsps: number;
  averageEIScore: number | null;
}

function AssessmentProgress({
  totalAssessments,
  totalAnsps,
  averageEIScore,
}: AssessmentProgressProps) {
  const t = useTranslations("dashboard.sections");
  const completionRate = totalAnsps > 0 ? (totalAssessments / totalAnsps) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t("assessmentCompletion")}</span>
        <span className="font-medium">
          {totalAssessments} / {totalAnsps} ({Math.round(completionRate)}%)
        </span>
      </div>
      <Progress value={completionRate} className="h-2" />

      {averageEIScore !== null && (
        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <span className="text-muted-foreground">{t("averageEIScore")}</span>
          <Badge
            variant="outline"
            className={cn(
              averageEIScore >= 80
                ? "border-green-500 text-green-700"
                : averageEIScore >= 60
                ? "border-amber-500 text-amber-700"
                : "border-red-500 text-red-700"
            )}
          >
            {averageEIScore.toFixed(1)}%
          </Badge>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ProgrammeOverview({
  stats,
  isLoading,
  className,
}: ProgrammeOverviewProps) {
  const t = useTranslations("dashboard.sections");

  if (isLoading) {
    return <ProgrammeOverviewSkeleton />;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          {t("programmeOverview")}
        </CardTitle>
        <CardDescription>{t("programmeOverviewDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Regional Summary */}
        <RegionalSummary />

        {/* Assessment Progress */}
        <AssessmentProgress
          totalAssessments={stats.totalAssessments}
          totalAnsps={stats.totalAnsps}
          averageEIScore={stats.averageEIScore}
        />

        {/* Findings Distribution */}
        <div>
          <h4 className="text-sm font-medium mb-3">{t("findingsDistribution")}</h4>
          <FindingsSeverityBar findings={stats.openFindingsBySeverity} />
        </div>
      </CardContent>
    </Card>
  );
}

export default ProgrammeOverview;
