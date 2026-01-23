"use client";

/**
 * Teams List Client Component
 *
 * Displays all 5 Regional Peer Support Teams with their statistics.
 * Highlights the current user's team if they belong to one.
 */

import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
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
import { Users, Building2, ArrowRight, Crown, FileCheck } from "lucide-react";

// =============================================================================
// LOADING SKELETON
// =============================================================================

function TeamsListSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// TEAM CARD
// =============================================================================

interface TeamCardProps {
  team: {
    teamId: string;
    teamName: string;
    teamNumber: number;
    leadOrganizationName: string | null;
    organizationCount: number;
    reviewerCount: number;
    reviewsCompleted: number;
    capClosureRate: number;
    participationScore: string;
  };
  isMyTeam?: boolean;
  locale: string;
}

function TeamCard({ team, isMyTeam, locale }: TeamCardProps) {
  const t = useTranslations("teams");

  const getScoreVariant = (score: string) => {
    if (score.startsWith("A")) return "default";
    if (score.startsWith("B")) return "secondary";
    return "outline";
  };

  return (
    <Card
      className={`hover:shadow-lg transition-shadow ${isMyTeam ? "border-primary ring-1 ring-primary/20" : ""}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-lg font-semibold">
              Team {team.teamNumber}
            </Badge>
            {isMyTeam && (
              <Badge variant="default" className="text-xs">
                {t("yourTeam")}
              </Badge>
            )}
          </div>
          <Badge variant={getScoreVariant(team.participationScore)}>
            {team.participationScore}
          </Badge>
        </div>
        <CardTitle className="text-lg">{team.teamName}</CardTitle>
        {team.leadOrganizationName && (
          <CardDescription className="flex items-center gap-1">
            <Crown className="h-3 w-3 text-amber-500" />
            {t("leadBy")}: {team.leadOrganizationName}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <Building2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-xl font-bold">{team.organizationCount}</div>
            <div className="text-xs text-muted-foreground">
              {t("organizations")}
            </div>
          </div>
          <div>
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-xl font-bold">{team.reviewerCount}</div>
            <div className="text-xs text-muted-foreground">
              {t("reviewers")}
            </div>
          </div>
          <div>
            <FileCheck className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-xl font-bold">{team.reviewsCompleted}</div>
            <div className="text-xs text-muted-foreground">{t("reviews")}</div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{t("capClosureRate")}</span>
            <span className="font-medium">{team.capClosureRate}%</span>
          </div>
          <Progress value={team.capClosureRate} className="h-2" />
        </div>

        <Button variant="outline" className="w-full" asChild>
          <Link href={`/${locale}/teams/${team.teamId}`}>
            {t("viewTeam")}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TeamsListClient() {
  const t = useTranslations("teams");
  const params = useParams();
  const locale = (params.locale as string) || "en";

  const { data: teams, isLoading } = trpc.teamStatistics.getAll.useQuery(
    undefined,
    {
      retry: false,
    }
  );
  const { data: myTeam } = trpc.teamStatistics.getMyTeam.useQuery();

  if (isLoading) {
    return <TeamsListSkeleton />;
  }

  // Sort teams: user's team first, then by team number
  const sortedTeams = teams
    ? [...teams].sort((a, b) => {
        if (myTeam) {
          if (a.teamId === myTeam.teamId) return -1;
          if (b.teamId === myTeam.teamId) return 1;
        }
        return a.teamNumber - b.teamNumber;
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Teams Grid */}
      {sortedTeams.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedTeams.map((team) => (
            <TeamCard
              key={team.teamId}
              team={team}
              isMyTeam={myTeam?.teamId === team.teamId}
              locale={locale}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("noTeams")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TeamsListClient;
