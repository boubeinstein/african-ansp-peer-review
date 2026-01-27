"use client";

/**
 * Team Detail Client Component
 *
 * Displays comprehensive statistics and member organizations for a specific team.
 */

import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Users,
  Building2,
  ArrowLeft,
  Crown,
  FileCheck,
  AlertTriangle,
  ClipboardList,
  TrendingUp,
  Globe,
  Award,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface TeamDetailClientProps {
  teamId: string;
  /** Whether user can navigate to /teams list (true for admins, false for ANSP users) */
  canAccessTeamsList?: boolean;
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function TeamDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

// =============================================================================
// STAT CARD
// =============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  description?: string;
  color?: string;
}

function StatCard({ icon, label, value, description, color = "blue" }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
  };

  return (
    <Card className={`border ${colorClasses[color]}`}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// PARTICIPATION SCORE DISPLAY
// =============================================================================

function ParticipationScoreCard({ score }: { score: string }) {
  const t = useTranslations("teams.detail");

  const getScoreInfo = (s: string) => {
    const scoreMap: Record<string, { color: string; label: string }> = {
      "A+": { color: "text-green-600 bg-green-100", label: t("scoreExcellent") },
      A: { color: "text-green-500 bg-green-50", label: t("scoreVeryGood") },
      "B+": { color: "text-blue-600 bg-blue-100", label: t("scoreGood") },
      B: { color: "text-blue-500 bg-blue-50", label: t("scoreAboveAverage") },
      C: { color: "text-amber-600 bg-amber-100", label: t("scoreAverage") },
      D: { color: "text-red-600 bg-red-100", label: t("scoreNeedsImprovement") },
    };
    return scoreMap[s] || { color: "text-gray-600 bg-gray-100", label: t("scoreUnknown") };
  };

  const { color, label } = getScoreInfo(score);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Award className="h-4 w-4" />
          {t("participationScore")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className={`text-4xl font-bold px-4 py-2 rounded-lg ${color}`}>
            {score}
          </div>
          <div>
            <p className="font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{t("scoreDescription")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// ORGANIZATIONS TABLE
// =============================================================================

interface OrganizationsTableProps {
  organizations: Array<{
    id: string;
    name: string;
    organizationCode: string | null;
    country: string;
    isLead: boolean;
    reviewerCount: number;
    reviewsHosted: number;
    reviewsParticipated: number;
  }>;
  locale: string;
}

function OrganizationsTable({ organizations, locale }: OrganizationsTableProps) {
  const t = useTranslations("teams.detail");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {t("memberOrganizations")}
        </CardTitle>
        <CardDescription>
          {t("memberOrganizationsDesc", { count: organizations.length })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("organization")}</TableHead>
              <TableHead>{t("country")}</TableHead>
              <TableHead className="text-center">{t("reviewers")}</TableHead>
              <TableHead className="text-center">{t("reviewsHosted")}</TableHead>
              <TableHead className="text-center">{t("reviewsParticipated")}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations
              .sort((a, b) => {
                if (a.isLead !== b.isLead) return a.isLead ? -1 : 1;
                return a.name.localeCompare(b.name);
              })
              .map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {org.isLead && (
                        <Crown className="h-4 w-4 text-amber-500" />
                      )}
                      <div>
                        <p className="font-medium">{org.name}</p>
                        {org.organizationCode && (
                          <p className="text-xs text-muted-foreground">
                            {org.organizationCode}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      {org.country}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{org.reviewerCount}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{org.reviewsHosted}</TableCell>
                  <TableCell className="text-center">{org.reviewsParticipated}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/${locale}/organizations/${org.id}`}>
                        {t("view")}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// FINDINGS & CAPS SUMMARY
// =============================================================================

interface FindingsCapsSummaryProps {
  totalFindings: number;
  openFindings: number;
  closedFindings: number;
  findingsBySeverity: {
    critical: number;
    major: number;
    minor: number;
    observation: number;
  };
  totalCAPs: number;
  openCAPs: number;
  closedCAPs: number;
  overdueCAPs: number;
  capClosureRate: number;
}

function FindingsCapsSummary({
  totalFindings,
  openFindings,
  closedFindings,
  findingsBySeverity,
  totalCAPs,
  openCAPs,
  closedCAPs,
  overdueCAPs,
  capClosureRate,
}: FindingsCapsSummaryProps) {
  const t = useTranslations("teams.detail");

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Findings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t("findingsSummary")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{totalFindings}</div>
              <div className="text-xs text-muted-foreground">{t("total")}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{openFindings}</div>
              <div className="text-xs text-muted-foreground">{t("open")}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{closedFindings}</div>
              <div className="text-xs text-muted-foreground">{t("closed")}</div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("bySeverity")}</p>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 rounded bg-red-50">
                <div className="text-lg font-bold text-red-600">
                  {findingsBySeverity.critical}
                </div>
                <div className="text-xs text-red-600">{t("critical")}</div>
              </div>
              <div className="text-center p-2 rounded bg-orange-50">
                <div className="text-lg font-bold text-orange-600">
                  {findingsBySeverity.major}
                </div>
                <div className="text-xs text-orange-600">{t("major")}</div>
              </div>
              <div className="text-center p-2 rounded bg-amber-50">
                <div className="text-lg font-bold text-amber-600">
                  {findingsBySeverity.minor}
                </div>
                <div className="text-xs text-amber-600">{t("minor")}</div>
              </div>
              <div className="text-center p-2 rounded bg-blue-50">
                <div className="text-lg font-bold text-blue-600">
                  {findingsBySeverity.observation}
                </div>
                <div className="text-xs text-blue-600">{t("observation")}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CAPs Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {t("capsSummary")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{totalCAPs}</div>
              <div className="text-xs text-muted-foreground">{t("total")}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{openCAPs}</div>
              <div className="text-xs text-muted-foreground">{t("open")}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{closedCAPs}</div>
              <div className="text-xs text-muted-foreground">{t("closed")}</div>
            </div>
          </div>

          {overdueCAPs > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("overdueAlert")}</AlertTitle>
              <AlertDescription>
                {t("overdueAlertDesc", { count: overdueCAPs })}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t("closureRate")}</span>
              <span className="font-medium">{capClosureRate}%</span>
            </div>
            <Progress value={capClosureRate} className="h-3" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TeamDetailClient({ teamId, canAccessTeamsList = true }: TeamDetailClientProps) {
  const t = useTranslations("teams.detail");
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";

  // Back destination: /teams for admins, /dashboard for ANSP users
  const backHref = canAccessTeamsList ? `/${locale}/teams` : `/${locale}/dashboard`;

  const {
    data: team,
    isLoading,
    error,
  } = trpc.teamStatistics.getByTeamId.useQuery({ teamId });

  if (isLoading) {
    return <TeamDetailSkeleton />;
  }

  if (error || !team) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("back")}
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("error")}</AlertTitle>
          <AlertDescription>{t("errorDescription")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const teamName = locale === "fr" ? team.teamNameFr : team.teamName;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-lg font-semibold">
              Team {team.teamNumber}
            </Badge>
            <h1 className="text-2xl font-bold">{teamName}</h1>
          </div>
          {team.leadOrganizationName && (
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <Crown className="h-4 w-4 text-amber-500" />
              {t("leadBy")}: {team.leadOrganizationName}
            </p>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Building2 className="h-4 w-4" />}
          label={t("organizations")}
          value={team.organizationCount}
          color="purple"
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label={t("reviewers")}
          value={team.reviewerCount}
          description={`${team.leadQualifiedCount} ${t("leadQualified")}, ${team.availableReviewerCount} ${t("available")}`}
          color="blue"
        />
        <StatCard
          icon={<FileCheck className="h-4 w-4" />}
          label={t("totalReviews")}
          value={team.totalReviews}
          description={`${team.reviewsCompleted} ${t("completed")}, ${team.reviewsInProgress} ${t("inProgress")}`}
          color="green"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label={t("capClosureRate")}
          value={`${team.capClosureRate}%`}
          color="cyan"
        />
      </div>

      {/* Participation Score */}
      <ParticipationScoreCard score={team.participationScore} />

      {/* Tabs for Details */}
      <Tabs defaultValue="organizations">
        <TabsList>
          <TabsTrigger value="organizations">{t("tabOrganizations")}</TabsTrigger>
          <TabsTrigger value="findings">{t("tabFindings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="mt-4">
          <OrganizationsTable organizations={team.organizations} locale={locale} />
        </TabsContent>

        <TabsContent value="findings" className="mt-4">
          <FindingsCapsSummary
            totalFindings={team.totalFindings}
            openFindings={team.openFindings}
            closedFindings={team.closedFindings}
            findingsBySeverity={team.findingsBySeverity}
            totalCAPs={team.totalCAPs}
            openCAPs={team.openCAPs}
            closedCAPs={team.closedCAPs}
            overdueCAPs={team.overdueCAPs}
            capClosureRate={team.capClosureRate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TeamDetailClient;
