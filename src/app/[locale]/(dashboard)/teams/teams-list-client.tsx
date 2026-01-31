"use client";

/**
 * Teams List Client Component
 *
 * Displays all 5 Regional Peer Support Teams with their statistics.
 * Includes filter chips and sorting functionality.
 */

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Building2,
  Crown,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

type FilterType = "all" | "needsAttention" | "onTrack";
type SortType = "performance" | "capClosure" | "name";

interface TeamData {
  teamId: string;
  teamName: string;
  teamNumber: number;
  leadOrganizationName: string | null;
  organizationCount: number;
  reviewerCount: number;
  reviewsCompleted: number;
  capClosureRate: number;
  participationScore: string;
}

// =============================================================================
// TEAM MEMBER ORGANIZATIONS
// =============================================================================

const TEAM_MEMBERS: Record<number, string> = {
  1: "ASECNA, ATNS, CAAB, ESWACAA",
  2: "UCAA, TCAA, BCAA, RCAA, KCAA",
  3: "NAMA, GCAA, RFIR",
  4: "ADM, MCAA, ACM, CAAZ, ZACL",
  5: "DGAC, OACA, ANAC",
};

function getTeamMembers(teamNumber: number): string {
  return TEAM_MEMBERS[teamNumber] || "";
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if a team needs attention (D grade or 0% CAP closure)
 */
function needsAttention(team: TeamData): boolean {
  const score = team.participationScore;
  const isDGrade = score.startsWith("D") || score.startsWith("E") || score.startsWith("F");
  const zeroClosure = team.capClosureRate === 0;
  return isDGrade || zeroClosure;
}

/**
 * Check if a team is on track (A or B grade)
 */
function isOnTrack(team: TeamData): boolean {
  const score = team.participationScore;
  return score.startsWith("A") || score.startsWith("B");
}

/**
 * Get numeric value from participation score for sorting
 */
function getScoreValue(score: string): number {
  const firstChar = score.charAt(0).toUpperCase();
  const scoreMap: Record<string, number> = {
    "A": 5,
    "B": 4,
    "C": 3,
    "D": 2,
    "E": 1,
    "F": 0,
  };
  return scoreMap[firstChar] ?? 0;
}

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
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-28" />
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
// FILTER CHIPS
// =============================================================================

interface FilterChipsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts: {
    all: number;
    needsAttention: number;
    onTrack: number;
  };
}

function FilterChips({ activeFilter, onFilterChange, counts }: FilterChipsProps) {
  const t = useTranslations("teams.filters");

  const filters: { key: FilterType; icon?: React.ReactNode; variant: "default" | "destructive" | "secondary" }[] = [
    { key: "all", variant: "secondary" },
    { key: "needsAttention", icon: <AlertTriangle className="h-3.5 w-3.5" />, variant: "destructive" },
    { key: "onTrack", icon: <CheckCircle2 className="h-3.5 w-3.5" />, variant: "default" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => {
        const count = counts[filter.key];
        const isActive = activeFilter === filter.key;

        return (
          <Button
            key={filter.key}
            variant={isActive ? filter.variant : "outline"}
            size="sm"
            onClick={() => onFilterChange(filter.key)}
            className={cn(
              "gap-1.5",
              !isActive && "text-muted-foreground"
            )}
          >
            {filter.icon}
            {t(filter.key)}
            <Badge
              variant={isActive ? "secondary" : "outline"}
              className={cn(
                "ml-1 h-5 min-w-5 px-1.5 text-xs",
                isActive && filter.variant === "destructive" && "bg-destructive-foreground/20 text-destructive-foreground",
                isActive && filter.variant === "default" && "bg-primary-foreground/20 text-primary-foreground"
              )}
            >
              {count}
            </Badge>
          </Button>
        );
      })}
    </div>
  );
}

// =============================================================================
// SORT SELECT
// =============================================================================

interface SortSelectProps {
  value: SortType;
  onChange: (value: SortType) => void;
}

function SortSelect({ value, onChange }: SortSelectProps) {
  const t = useTranslations("teams.sort");

  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={(v) => onChange(v as SortType)}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder={t("label")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="performance">{t("performance")}</SelectItem>
          <SelectItem value="capClosure">{t("capClosure")}</SelectItem>
          <SelectItem value="name">{t("name")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// =============================================================================
// TEAM CARD
// =============================================================================

interface TeamCardProps {
  team: TeamData;
  onClick: () => void;
}

function TeamCard({ team, onClick }: TeamCardProps) {
  const t = useTranslations("teams");

  const getScoreVariant = (score: string): "default" | "secondary" | "outline" | "destructive" => {
    if (score.startsWith("A")) return "default";
    if (score.startsWith("B")) return "secondary";
    if (score.startsWith("D") || score.startsWith("E") || score.startsWith("F")) return "destructive";
    return "outline";
  };

  const showsNeedsAttention = needsAttention(team);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5",
        showsNeedsAttention && "border-destructive/50"
      )}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-center justify-between mb-1">
          <Badge variant="default" className="text-sm font-bold px-3 py-1.5">
            Team {team.teamNumber}
          </Badge>
          <div className="flex items-center gap-2">
            {showsNeedsAttention && (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
            <Badge variant={getScoreVariant(team.participationScore)}>
              {team.participationScore}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {getTeamMembers(team.teamNumber)}
        </p>
        {team.leadOrganizationName && (
          <CardDescription className="flex items-center gap-1 mt-2">
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
            <span className={cn(
              "font-medium",
              team.capClosureRate === 0 && "text-destructive"
            )}>
              {team.capClosureRate}%
            </span>
          </div>
          <Progress
            value={team.capClosureRate}
            className={cn(
              "h-2",
              team.capClosureRate === 0 && "[&>div]:bg-destructive"
            )}
          />
        </div>
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
  const router = useRouter();
  const locale = (params.locale as string) || "en";

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("performance");

  const { data: teams, isLoading } = trpc.teamStatistics.getAll.useQuery(
    undefined,
    {
      retry: false,
    }
  );

  // Calculate filter counts
  const counts = useMemo(() => {
    if (!teams) return { all: 0, needsAttention: 0, onTrack: 0 };
    return {
      all: teams.length,
      needsAttention: teams.filter(needsAttention).length,
      onTrack: teams.filter(isOnTrack).length,
    };
  }, [teams]);

  // Filter and sort teams
  const filteredAndSortedTeams = useMemo(() => {
    if (!teams) return [];

    // Apply filter
    let filtered = [...teams];
    if (activeFilter === "needsAttention") {
      filtered = filtered.filter(needsAttention);
    } else if (activeFilter === "onTrack") {
      filtered = filtered.filter(isOnTrack);
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "performance":
          return getScoreValue(b.participationScore) - getScoreValue(a.participationScore);
        case "capClosure":
          return b.capClosureRate - a.capClosureRate;
        case "name":
          return a.teamNumber - b.teamNumber;
        default:
          return 0;
      }
    });

    return filtered;
  }, [teams, activeFilter, sortBy]);

  const handleTeamClick = (teamId: string) => {
    router.push(`/${locale}/teams/${teamId}`);
  };

  if (isLoading) {
    return <TeamsListSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <FilterChips
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={counts}
        />
        <SortSelect value={sortBy} onChange={setSortBy} />
      </div>

      {/* Teams Grid */}
      {filteredAndSortedTeams.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedTeams.map((team) => (
            <TeamCard
              key={team.teamId}
              team={team}
              onClick={() => handleTeamClick(team.teamId)}
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
