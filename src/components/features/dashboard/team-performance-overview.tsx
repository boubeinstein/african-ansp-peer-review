"use client";

/**
 * Team Performance Overview
 *
 * Dashboard widget for Programme Coordinators and Steering Committee members.
 * Displays performance metrics across all 5 Regional Peer Support Teams.
 */

import { useTranslations } from "next-intl";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Building2,
  FileCheck,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ArrowRight,
  Download,
  RefreshCw,
} from "lucide-react";
import { TeamActivityTimeline } from "./team-activity-timeline";

// =============================================================================
// TYPES
// =============================================================================

interface TeamStatistics {
  teamId: string;
  teamName: string;
  teamNumber: number;
  organizationCount: number;
  reviewerCount: number;
  reviewsCompleted: number;
  reviewsInProgress: number;
  openFindings: number;
  overdueCAPs: number;
  capClosureRate: number;
  participationScore: string;
}

interface TeamPerformanceOverviewProps {
  locale: string;
  className?: string;
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function TeamPerformanceOverviewSkeleton() {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SUMMARY CARD
// =============================================================================

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}

function SummaryCard({ icon, label, value, color }: SummaryCardProps) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    green: "bg-green-50 text-green-700 border-green-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

// =============================================================================
// SCORE BADGE
// =============================================================================

function ScoreBadge({ score }: { score: string }) {
  const variants: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    "A+": "default",
    A: "default",
    "B+": "secondary",
    B: "secondary",
    C: "outline",
    D: "destructive",
  };

  return <Badge variant={variants[score] || "outline"}>{score}</Badge>;
}

// =============================================================================
// TEAM MEMBER ORGANIZATIONS
// =============================================================================

const TEAM_MEMBERS: Record<number, string> = {
  1: "ASECNA, ATNS, CAAB, ESWACAA",
  2: "UCAA, TCAA, BCAA, RCAA, KCAA",
  3: "NAMA, GCAA, Roberts FIR",
  4: "ADM, MCAA, ACM, CAAZ, ZACL",
  5: "DGAC, OACA, ANAC",
};

function getTeamMembers(teamNumber: number): string {
  return TEAM_MEMBERS[teamNumber] || "";
}

// =============================================================================
// TEAM CARD
// =============================================================================

interface TeamCardProps {
  team: TeamStatistics;
  locale: string;
}

function TeamCard({ team, locale }: TeamCardProps) {
  const t = useTranslations("dashboard.teamPerformance");

  const getScoreColor = (score: string) => {
    if (score.startsWith("A")) return "text-green-600 bg-green-50";
    if (score.startsWith("B")) return "text-blue-600 bg-blue-50";
    if (score.startsWith("C")) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-1">
          <Badge variant="default" className="text-sm font-bold px-3 py-1">
            Team {team.teamNumber}
          </Badge>
          <span
            className={`text-lg font-bold px-2 py-1 rounded ${getScoreColor(team.participationScore)}`}
          >
            {team.participationScore}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {getTeamMembers(team.teamNumber)}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <div className="text-xl font-bold">{team.organizationCount}</div>
            <div className="text-xs text-muted-foreground">{t("orgs")}</div>
          </div>
          <div>
            <div className="text-xl font-bold">{team.reviewerCount}</div>
            <div className="text-xs text-muted-foreground">{t("reviewers")}</div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{t("capClosure")}</span>
            <span>{team.capClosureRate}%</span>
          </div>
          <Progress value={team.capClosureRate} className="h-1.5" />
        </div>

        {(team.openFindings > 0 || team.overdueCAPs > 0) && (
          <div className="flex items-center gap-1 text-xs text-orange-600">
            <AlertTriangle className="h-3 w-3" />
            {team.openFindings > 0 && <span>{team.openFindings} open</span>}
            {team.overdueCAPs > 0 && <span>{team.overdueCAPs} overdue</span>}
          </div>
        )}

        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href={`/${locale}/teams/${team.teamId}`}>{t("viewDetails")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// TEAMS WITH ISSUES
// =============================================================================

interface TeamsWithIssuesProps {
  teams: TeamStatistics[];
  locale: string;
}

function TeamsWithIssues({ teams, locale }: TeamsWithIssuesProps) {
  const t = useTranslations("dashboard.teamPerformance");

  const teamsWithIssues = teams.filter(
    (team) => team.openFindings > 0 || team.overdueCAPs > 0
  );

  if (teamsWithIssues.length === 0) {
    return (
      <div className="text-center py-8 text-green-600">
        <FileCheck className="h-8 w-8 mx-auto mb-2" />
        <p>{t("noIssues")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {teamsWithIssues.map((team) => (
        <div
          key={team.teamId}
          className="flex items-center justify-between p-4 border rounded-lg bg-orange-50/50"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <div>
              <p className="font-medium">
                Team {team.teamNumber}: {team.teamName}
              </p>
              <p className="text-sm text-muted-foreground">
                {team.openFindings} {t("openFindingsCount")}, {team.overdueCAPs}{" "}
                {t("overdueCAPsCount")}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${locale}/teams/${team.teamId}?tab=issues`}>
              {t("reviewIssues")}
            </Link>
          </Button>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TeamPerformanceOverview({
  locale,
  className,
}: TeamPerformanceOverviewProps) {
  const t = useTranslations("dashboard.teamPerformance");
  const {
    data: teamsStats,
    isLoading,
    refetch,
    isFetching,
  } = trpc.teamStatistics.getAll.useQuery();

  const handleExportReport = () => {
    if (!teamsStats || teamsStats.length === 0) return;

    // Prepare CSV data
    const headers = [
      "Team",
      "Team Name",
      "Organizations",
      "Reviewers",
      "Reviews Completed",
      "Reviews In Progress",
      "Open Findings",
      "Overdue CAPs",
      "CAP Closure Rate",
      "Performance Score",
    ];

    const rows = teamsStats.map((team) => [
      `Team ${team.teamNumber}`,
      team.teamName,
      team.organizationCount,
      team.reviewerCount,
      team.reviewsCompleted,
      team.reviewsInProgress,
      team.openFindings,
      team.overdueCAPs,
      `${team.capClosureRate}%`,
      team.participationScore,
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `team-performance-report-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <TeamPerformanceOverviewSkeleton />;
  }

  if (!teamsStats || teamsStats.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate programme-wide totals
  const totals = teamsStats.reduce(
    (acc, team) => ({
      organizations: acc.organizations + team.organizationCount,
      reviewers: acc.reviewers + team.reviewerCount,
      reviewsCompleted: acc.reviewsCompleted + team.reviewsCompleted,
      reviewsInProgress: acc.reviewsInProgress + team.reviewsInProgress,
      openFindings: acc.openFindings + team.openFindings,
      overdueCAPs: acc.overdueCAPs + team.overdueCAPs,
    }),
    {
      organizations: 0,
      reviewers: 0,
      reviewsCompleted: 0,
      reviewsInProgress: 0,
      openFindings: 0,
      overdueCAPs: 0,
    }
  );

  const avgCapClosureRate = Math.round(
    teamsStats.reduce((sum, team) => sum + team.capClosureRate, 0) /
      teamsStats.length
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {t("title")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
              />
              {t("refresh")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportReport}
              disabled={!teamsStats || teamsStats.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              {t("exportReport")}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Programme-Wide Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <SummaryCard
            icon={<Users className="h-4 w-4" />}
            label={t("totalTeams")}
            value={teamsStats.length}
            color="blue"
          />
          <SummaryCard
            icon={<Building2 className="h-4 w-4" />}
            label={t("totalOrganizations")}
            value={totals.organizations}
            color="purple"
          />
          <SummaryCard
            icon={<Users className="h-4 w-4" />}
            label={t("totalReviewers")}
            value={totals.reviewers}
            color="green"
          />
          <SummaryCard
            icon={<FileCheck className="h-4 w-4" />}
            label={t("reviewsCompleted")}
            value={totals.reviewsCompleted}
            color="emerald"
          />
          <SummaryCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label={t("openFindings")}
            value={totals.openFindings}
            color="orange"
          />
          <SummaryCard
            icon={<TrendingUp className="h-4 w-4" />}
            label={t("avgCapClosure")}
            value={`${avgCapClosureRate}%`}
            color="cyan"
          />
        </div>

        {/* Team Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {teamsStats.map((team) => (
            <TeamCard key={team.teamId} team={team} locale={locale} />
          ))}
        </div>

        {/* Detailed Table */}
        <Tabs defaultValue="performance" className="w-full">
          <TabsList>
            <TabsTrigger value="performance">{t("performanceTab")}</TabsTrigger>
            <TabsTrigger value="activity">{t("activityTab")}</TabsTrigger>
            <TabsTrigger value="issues">{t("issuesTab")}</TabsTrigger>
          </TabsList>

          <TabsContent value="performance">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("team")}</TableHead>
                  <TableHead className="text-center">
                    {t("organizations")}
                  </TableHead>
                  <TableHead className="text-center">{t("reviewers")}</TableHead>
                  <TableHead className="text-center">
                    {t("reviewsCompleted")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("capClosureRate")}
                  </TableHead>
                  <TableHead className="text-center">{t("score")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamsStats.map((team) => (
                  <TableRow key={team.teamId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Team {team.teamNumber}</Badge>
                        <span>{team.teamName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {team.organizationCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {team.reviewerCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {team.reviewsCompleted}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Progress
                          value={team.capClosureRate}
                          className="w-16 h-2"
                        />
                        <span className="text-sm">{team.capClosureRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <ScoreBadge score={team.participationScore} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/${locale}/teams/${team.teamId}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="activity">
            <TeamActivityTimeline maxHeight="500px" />
          </TabsContent>

          <TabsContent value="issues">
            <TeamsWithIssues teams={teamsStats} locale={locale} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default TeamPerformanceOverview;
