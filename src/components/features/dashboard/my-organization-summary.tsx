"use client";

/**
 * My Organization Summary Component
 *
 * Displays organization-specific metrics for ANSP roles including:
 * - Organization info
 * - Current assessment status
 * - EI score gauge
 * - Next scheduled review
 */

import { useTranslations } from "next-intl";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import {
  Building2,
  FileText,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface MyOrganizationSummaryProps {
  organization: {
    id: string;
    nameEn: string;
    nameFr?: string | null;
    icaoCode: string | null;
  };
  stats: {
    assessments: {
      draft: number;
      submitted: number;
      underReview: number;
      completed: number;
    };
    latestEIScore: number | null;
    eiScoreTrend: number | null;
    eiStatus?: "preliminary" | "validated" | null;
    eiAssessmentTitle?: string | null;
    peerReviews: {
      asHost: number;
      findingsCount: number;
      openCaps: number;
    };
    capsByStatus: Record<string, number>;
    overdueCaps: number;
  };
  locale: string;
  isLoading?: boolean;
  className?: string;
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function MyOrganizationSummarySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-20" />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// EI SCORE GAUGE
// =============================================================================

interface EIScoreGaugeProps {
  score: number | null;
  trend: number | null;
  status?: "preliminary" | "validated" | null;
  assessmentTitle?: string | null;
}

function EIScoreGauge({ score, trend, status, assessmentTitle }: EIScoreGaugeProps) {
  const t = useTranslations("dashboard.sections");

  if (score === null) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">{t("noEIScoreYet")}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t("completeAssessment")}
        </p>
      </div>
    );
  }

  // Determine color based on score
  const getScoreColor = (value: number) => {
    if (value >= 80) return "text-green-600 dark:text-green-400";
    if (value >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getProgressColor = (value: number) => {
    if (value >= 80) return "bg-green-500";
    if (value >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  const TrendIcon =
    trend === null ? Minus : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor =
    trend === null
      ? "text-muted-foreground"
      : trend > 0
      ? "text-green-600"
      : trend < 0
      ? "text-red-600"
      : "text-muted-foreground";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("effectivenessIndex")}</span>
          {status === "preliminary" && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
              {t("preliminary")}
            </Badge>
          )}
          {status === "validated" && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-300">
              {t("validated")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-2xl font-bold", getScoreColor(score))}>
            {score.toFixed(1)}%
          </span>
          {trend !== null && (
            <div className={cn("flex items-center text-xs", trendColor)}>
              <TrendIcon className="h-3 w-3 mr-0.5" />
              {Math.abs(trend).toFixed(1)}
            </div>
          )}
        </div>
      </div>
      <div className="relative">
        <Progress
          value={score}
          className="h-3"
        />
        <div
          className={cn(
            "absolute top-0 left-0 h-3 rounded-full transition-all",
            getProgressColor(score)
          )}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>100%</span>
      </div>
      {assessmentTitle && (
        <p className="text-xs text-muted-foreground text-center">
          {t("fromAssessment", { title: assessmentTitle })}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// ASSESSMENT STATUS
// =============================================================================

interface AssessmentStatusProps {
  assessments: {
    draft: number;
    submitted: number;
    underReview: number;
    completed: number;
  };
}

function AssessmentStatus({ assessments }: AssessmentStatusProps) {
  const t = useTranslations("dashboard.sections");
  const total =
    assessments.draft +
    assessments.submitted +
    assessments.underReview +
    assessments.completed;

  const statuses = [
    { key: "draft", count: assessments.draft, color: "bg-slate-200" },
    { key: "submitted", count: assessments.submitted, color: "bg-blue-400" },
    { key: "underReview", count: assessments.underReview, color: "bg-purple-400" },
    { key: "completed", count: assessments.completed, color: "bg-green-400" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t("assessmentStatus")}</span>
        <span className="font-medium">{total} {t("total")}</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {statuses.map(({ key, count, color }) => {
          if (count === 0 || total === 0) return null;
          const width = (count / total) * 100;
          return (
            <div
              key={key}
              className={cn(color, "transition-all")}
              style={{ width: `${width}%` }}
              title={`${t(key)}: ${count}`}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {statuses.map(({ key, count, color }) => (
          <div key={key} className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", color)} />
            <span className="text-muted-foreground">{t(key)}</span>
            <span className="font-medium ml-auto">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// PEER REVIEW SUMMARY
// =============================================================================

interface PeerReviewSummaryProps {
  peerReviews: {
    asHost: number;
    findingsCount: number;
    openCaps: number;
  };
  overdueCaps: number;
}

function PeerReviewSummary({ peerReviews, overdueCaps }: PeerReviewSummaryProps) {
  const t = useTranslations("dashboard.sections");

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="text-center p-3 rounded-lg bg-muted/50">
        <ClipboardList className="h-5 w-5 mx-auto text-blue-600 mb-1" />
        <p className="text-lg font-bold">{peerReviews.asHost}</p>
        <p className="text-xs text-muted-foreground">{t("reviewsReceived")}</p>
      </div>
      <div className="text-center p-3 rounded-lg bg-muted/50">
        <AlertTriangle className="h-5 w-5 mx-auto text-amber-600 mb-1" />
        <p className="text-lg font-bold">{peerReviews.findingsCount}</p>
        <p className="text-xs text-muted-foreground">{t("totalFindings")}</p>
      </div>
      <div className="text-center p-3 rounded-lg bg-muted/50">
        <Calendar
          className={cn(
            "h-5 w-5 mx-auto mb-1",
            overdueCaps > 0 ? "text-red-600" : "text-green-600"
          )}
        />
        <p className="text-lg font-bold">{overdueCaps}</p>
        <p className="text-xs text-muted-foreground">{t("overdueCaps")}</p>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function MyOrganizationSummary({
  organization,
  stats,
  locale,
  isLoading,
  className,
}: MyOrganizationSummaryProps) {
  const t = useTranslations("dashboard.sections");

  if (isLoading) {
    return <MyOrganizationSummarySkeleton />;
  }

  const orgName = locale === "fr" && organization.nameFr
    ? organization.nameFr
    : organization.nameEn;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t("myOrganization")}
            </CardTitle>
            <CardDescription>
              {orgName}{organization.icaoCode ? ` (${organization.icaoCode})` : ""}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${locale}/organization`}>
              {t("viewProfile")}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Two-column layout for EI Score and Assessment Status */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="p-4 rounded-lg border">
            <EIScoreGauge
              score={stats.latestEIScore}
              trend={stats.eiScoreTrend}
              status={stats.eiStatus}
              assessmentTitle={stats.eiAssessmentTitle}
            />
          </div>
          <div className="p-4 rounded-lg border">
            <AssessmentStatus assessments={stats.assessments} />
          </div>
        </div>

        {/* Peer Review Summary */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("peerReviewSummary")}
          </h4>
          <PeerReviewSummary
            peerReviews={stats.peerReviews}
            overdueCaps={stats.overdueCaps}
          />
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link href={`/${locale}/assessments`}>
              <FileText className="h-4 w-4 mr-1" />
              {t("viewAssessments")}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link href={`/${locale}/caps`}>
              <ClipboardList className="h-4 w-4 mr-1" />
              {t("manageCAPs")}
              {stats.overdueCaps > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1">
                  {stats.overdueCaps}
                </Badge>
              )}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default MyOrganizationSummary;
