"use client";

/**
 * My Team Widget
 *
 * Displays team statistics and member organizations for the user's regional team.
 * Shows team composition, review activity, CAP performance, and participation score.
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Building2,
  Star,
  CheckCircle,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Crown,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import type { ParticipationScore } from "@/server/services/team-statistics";

// =============================================================================
// TYPES
// =============================================================================

interface MyTeamWidgetProps {
  locale: string;
  className?: string;
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function MyTeamWidgetSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-1">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// PARTICIPATION SCORE BADGE
// =============================================================================

interface ScoreBadgeProps {
  score: ParticipationScore;
}

function ParticipationScoreBadge({ score }: ScoreBadgeProps) {
  const getScoreColor = (s: ParticipationScore) => {
    switch (s) {
      case "A+":
        return "bg-green-100 text-green-800 border-green-300";
      case "A":
        return "bg-green-50 text-green-700 border-green-200";
      case "B+":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "B":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "C":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "D":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <Badge
      variant="outline"
      className={cn("text-sm font-semibold px-2 py-0.5", getScoreColor(score))}
    >
      {score}
    </Badge>
  );
}

// =============================================================================
// ORGANIZATION LIST ITEM
// =============================================================================

interface OrgListItemProps {
  name: string;
  icaoCode: string | null;
  isLead: boolean;
  reviewerCount: number;
  isCurrentOrg?: boolean;
}

function OrgListItem({
  name,
  icaoCode,
  isLead,
  reviewerCount,
  isCurrentOrg,
}: OrgListItemProps) {
  const t = useTranslations("dashboard.myTeam");

  return (
    <div
      className={cn(
        "flex items-center justify-between py-2 px-3 rounded-md",
        isCurrentOrg ? "bg-primary/5 border border-primary/20" : "bg-muted/30"
      )}
    >
      <div className="flex items-center gap-2">
        {isLead ? (
          <Crown className="h-4 w-4 text-amber-500" />
        ) : (
          <Building2 className="h-4 w-4 text-muted-foreground" />
        )}
        <span className={cn("text-sm", isCurrentOrg && "font-medium")}>
          {name}
          {icaoCode && (
            <span className="text-muted-foreground ml-1">({icaoCode})</span>
          )}
        </span>
        {isCurrentOrg && (
          <Badge variant="secondary" className="text-xs">
            {t("you")}
          </Badge>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {reviewerCount} {t("reviewers")}
      </span>
    </div>
  );
}

// =============================================================================
// STATS GRID
// =============================================================================

interface StatsGridProps {
  reviewsCompleted: number;
  reviewerCount: number;
  capClosureRate: number;
  participationScore: ParticipationScore;
}

function StatsGrid({
  reviewsCompleted,
  reviewerCount,
  capClosureRate,
  participationScore,
}: StatsGridProps) {
  const t = useTranslations("dashboard.myTeam");

  const stats = [
    {
      label: t("reviewsCompleted"),
      value: reviewsCompleted,
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      label: t("totalReviewers"),
      value: reviewerCount,
      icon: Users,
      color: "text-blue-600",
    },
    {
      label: t("capClosureRate"),
      value: `${capClosureRate.toFixed(0)}%`,
      icon: ClipboardList,
      color: "text-purple-600",
    },
    {
      label: t("performanceScore"),
      value: participationScore,
      icon: TrendingUp,
      color: "text-amber-600",
      isScore: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map(({ label, value, icon: Icon, color, isScore }) => (
        <div
          key={label}
          className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/50 text-center"
        >
          <Icon className={cn("h-5 w-5 mb-1", color)} />
          {isScore ? (
            <ParticipationScoreBadge score={value as ParticipationScore} />
          ) : (
            <span className="text-lg font-bold">{value}</span>
          )}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function MyTeamWidget({ locale, className }: MyTeamWidgetProps) {
  const t = useTranslations("dashboard.myTeam");

  // Fetch team statistics
  const {
    data: teamStats,
    isLoading,
    error,
  } = trpc.teamStatistics.getMyTeam.useQuery();

  // Loading state
  if (isLoading) {
    return <MyTeamWidgetSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{t("errorLoading")}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // No team assigned
  if (!teamStats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{t("noTeam")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("contactAdmin")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const teamName = locale === "fr" ? teamStats.teamNameFr : teamStats.teamName;
  const hasAlerts = teamStats.openFindings > 0 || teamStats.overdueCAPs > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("title")}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              {teamName}
              <Badge variant="secondary" className="text-xs">
                {t("teamNumber", { number: teamStats.teamNumber })}
              </Badge>
            </CardDescription>
          </div>
          <ParticipationScoreBadge score={teamStats.participationScore} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Lead Organization */}
        {teamStats.leadOrganizationName && (
          <div className="flex items-center gap-2 text-sm">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="text-muted-foreground">{t("teamLead")}:</span>
            <span className="font-medium">{teamStats.leadOrganizationName}</span>
          </div>
        )}

        {/* Organizations List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {t("memberOrganizations")} ({teamStats.organizationCount})
          </h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {teamStats.organizations
              .sort((a, b) => {
                // Lead org first, then by name
                if (a.isLead !== b.isLead) return a.isLead ? -1 : 1;
                return a.name.localeCompare(b.name);
              })
              .slice(0, 5)
              .map((org) => (
                <OrgListItem
                  key={org.id}
                  name={org.name}
                  icaoCode={org.icaoCode}
                  isLead={org.isLead}
                  reviewerCount={org.reviewerCount}
                />
              ))}
            {teamStats.organizations.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                {t("andMore", { count: teamStats.organizations.length - 5 })}
              </p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <StatsGrid
          reviewsCompleted={teamStats.reviewsCompleted}
          reviewerCount={teamStats.reviewerCount}
          capClosureRate={teamStats.capClosureRate}
          participationScore={teamStats.participationScore}
        />

        {/* Alert for open findings/overdue CAPs */}
        {hasAlerts && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {teamStats.openFindings > 0 && (
                <span>
                  {t("openFindingsAlert", { count: teamStats.openFindings })}
                </span>
              )}
              {teamStats.openFindings > 0 && teamStats.overdueCAPs > 0 && " | "}
              {teamStats.overdueCAPs > 0 && (
                <span className="text-red-600">
                  {t("overdueCAPs", { count: teamStats.overdueCAPs })}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* View Team Details Link */}
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href={`/${locale}/teams/${teamStats.teamId}`}>
            {t("viewTeamDetails")}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default MyTeamWidget;
