"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// =============================================================================
// CONSTANTS
// =============================================================================

const ANS_REVIEW_AREAS = ["ATS", "FPD", "AIS", "MAP", "MET", "CNS", "SAR"];

const TEAM_COLORS = [
  "#06b6d4",
  "#8b5cf6",
  "#f59e0b",
  "#22c55e",
  "#ec4899",
];

function eiBarColor(score: number): string {
  if (score >= 80) return "bg-blue-500";
  if (score >= 65) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  if (score >= 35) return "bg-orange-500";
  return "bg-red-500";
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RegionalTeamsTab() {
  const { data: teams, isLoading: teamsLoading } =
    trpc.safetyIntelligence.getTeamSummaries.useQuery();

  const { data: anspData, isLoading: anspLoading } =
    trpc.safetyIntelligence.getANSPPerformance.useQuery({});

  // Programme-wide audit area averages for radar comparison
  const programmeAvgByArea = useMemo(() => {
    if (!anspData) return {} as Record<string, number>;
    const sums: Record<string, number[]> = {};
    for (const ansp of anspData) {
      for (const [area, score] of Object.entries(ansp.eiScoreByArea)) {
        if (!sums[area]) sums[area] = [];
        sums[area].push(score);
      }
    }
    const avgs: Record<string, number> = {};
    for (const [area, scores] of Object.entries(sums)) {
      avgs[area] =
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
          : 0;
    }
    return avgs;
  }, [anspData]);

  // Group ANSPs by team
  const anspsByTeam = useMemo(() => {
    if (!anspData) return new Map<string, typeof anspData>();
    const map = new Map<string, typeof anspData>();
    for (const ansp of anspData) {
      if (ansp.teamId) {
        if (!map.has(ansp.teamId)) map.set(ansp.teamId, []);
        map.get(ansp.teamId)!.push(ansp);
      }
    }
    // Sort each team's ANSPs by EI score descending
    for (const [, members] of map) {
      members.sort((a, b) => (b.latestEIScore ?? 0) - (a.latestEIScore ?? 0));
    }
    return map;
  }, [anspData]);

  const isLoading = teamsLoading || anspLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {teams?.map((team, i) => (
        <TeamCard
          key={team.teamId}
          team={team}
          members={anspsByTeam.get(team.teamId) ?? []}
          programmeAvgByArea={programmeAvgByArea}
          color={TEAM_COLORS[i % TEAM_COLORS.length]}
        />
      ))}
    </div>
  );
}

// =============================================================================
// TEAM CARD
// =============================================================================

interface TeamCardProps {
  team: {
    teamId: string;
    teamNumber: number;
    teamCode: string;
    nameEn: string;
    leadOrganizationName: string;
    memberCount: number;
    averageEIScore: number | null;
    averageSMSMaturity: number | null;
    totalFindings: number;
    criticalFindings: number;
    averageCAPClosureRate: number | null;
    eiByReviewArea: Record<string, number>;
  };
  members: Array<{
    organizationId: string;
    organizationCode: string | null;
    nameEn: string;
    country: string;
    latestEIScore: number | null;
    latestSMSMaturity: number | null;
    totalFindings: number;
    criticalFindings: number;
  }>;
  programmeAvgByArea: Record<string, number>;
  color: string;
}

function TeamCard({ team, members, programmeAvgByArea, color }: TeamCardProps) {
  const t = useTranslations("safetyIntelligence");
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Team badge */}
            <div
              className="flex items-center justify-center h-10 w-10 rounded-lg text-white font-bold text-sm"
              style={{ backgroundColor: color }}
            >
              {team.teamNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {team.nameEn}
                </span>
                <Badge variant="outline" className="text-xs">
                  {team.teamCode}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("teams.ledBy", { name: team.leadOrganizationName })} ·{" "}
                {t("teams.members", { count: team.memberCount })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Key metrics */}
            <div className="hidden sm:flex items-center gap-4 text-xs">
              <MetricPill
                label="EI"
                value={
                  team.averageEIScore !== null
                    ? `${team.averageEIScore.toFixed(1)}%`
                    : "—"
                }
              />
              <MetricPill
                label="SMS"
                value={
                  team.averageSMSMaturity !== null
                    ? team.averageSMSMaturity.toFixed(1)
                    : "—"
                }
              />
              <MetricPill
                label="Findings"
                value={String(team.totalFindings)}
                alert={team.criticalFindings > 0}
              />
              <MetricPill
                label="CAP%"
                value={
                  team.averageCAPClosureRate !== null
                    ? `${team.averageCAPClosureRate.toFixed(0)}%`
                    : "—"
                }
              />
            </div>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-4">
          <div className="grid gap-4 lg:grid-cols-2 border-t pt-4">
            {/* Radar: team vs programme average */}
            <div>
              <p className="text-sm font-medium mb-2">
                {t("teams.eiByArea")}
              </p>
              <TeamVsProgrammeRadar
                teamAreas={team.eiByReviewArea}
                programmeAreas={programmeAvgByArea}
                teamNumber={team.teamNumber}
                color={color}
              />
            </div>

            {/* Member list */}
            <div>
              <p className="text-sm font-medium mb-2">
                {t("teams.memberPerformance")}
              </p>
              <div className="space-y-2">
                {members.map((m) => (
                  <MemberRow key={m.organizationId} member={m} />
                ))}
                {members.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No members
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// =============================================================================
// METRIC PILL
// =============================================================================

function MetricPill({
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border px-2.5 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", alert && "text-red-600")}>
        {value}
      </span>
    </div>
  );
}

// =============================================================================
// TEAM VS PROGRAMME RADAR
// =============================================================================

interface TeamVsProgrammeRadarProps {
  teamAreas: Record<string, number>;
  programmeAreas: Record<string, number>;
  teamNumber: number;
  color: string;
}

function TeamVsProgrammeRadar({
  teamAreas,
  programmeAreas,
  teamNumber,
  color,
}: TeamVsProgrammeRadarProps) {
  const t = useTranslations("safetyIntelligence");

  const radarData = ANS_REVIEW_AREAS.map((area) => ({
    area,
    team: teamAreas[area] ?? 0,
    programme: programmeAreas[area] ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart
        data={radarData}
        margin={{ top: 10, right: 25, bottom: 10, left: 25 }}
      >
        <PolarGrid />
        <PolarAngleAxis dataKey="area" tick={{ fontSize: 10 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8 }} />
        <Radar
          name={t("teams.programmeAvg")}
          dataKey="programme"
          stroke="#9ca3af"
          fill="#9ca3af"
          fillOpacity={0.1}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <Radar
          name={`Team ${teamNumber}`}
          dataKey="team"
          stroke={color}
          fill={color}
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [`${Number(value).toFixed(1)}%`]}
        />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// =============================================================================
// MEMBER ROW
// =============================================================================

interface MemberRowProps {
  member: {
    organizationCode: string | null;
    nameEn: string;
    country: string;
    latestEIScore: number | null;
    latestSMSMaturity: number | null;
    totalFindings: number;
    criticalFindings: number;
  };
}

function MemberRow({ member }: MemberRowProps) {
  const ei = member.latestEIScore;

  return (
    <div className="flex items-center gap-3 rounded-lg border p-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {member.organizationCode ?? member.nameEn}
        </p>
        <p className="text-[11px] text-muted-foreground">{member.country}</p>
      </div>

      {/* EI mini bar */}
      <div className="flex items-center gap-1.5 w-28 shrink-0">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full",
              ei !== null ? eiBarColor(ei) : "bg-muted"
            )}
            style={{ width: `${ei !== null ? Math.min(ei, 100) : 0}%` }}
          />
        </div>
        <span className="text-xs font-medium tabular-nums w-10 text-right">
          {ei !== null ? `${ei.toFixed(0)}%` : "—"}
        </span>
      </div>

      {/* Findings count */}
      {member.totalFindings > 0 && (
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] shrink-0",
            member.criticalFindings > 0 &&
              "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
          )}
        >
          {member.totalFindings}f
          {member.criticalFindings > 0 && ` / ${member.criticalFindings}c`}
        </Badge>
      )}
    </div>
  );
}
