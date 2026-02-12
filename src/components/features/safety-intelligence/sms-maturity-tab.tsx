"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
// TYPES
// =============================================================================

interface SMSMaturityTabProps {
  selectedTeamId: string | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SMS_COMPONENTS = [
  { key: "SAFETY_POLICY_OBJECTIVES", short: "SPO", label: "Safety Policy & Objectives" },
  { key: "SAFETY_RISK_MANAGEMENT", short: "SRM", label: "Safety Risk Management" },
  { key: "SAFETY_ASSURANCE", short: "SA", label: "Safety Assurance" },
  { key: "SAFETY_PROMOTION", short: "SP", label: "Safety Promotion" },
] as const;

const MATURITY_LEVELS = [
  { code: "A", color: "#ef4444" },
  { code: "B", color: "#f97316" },
  { code: "C", color: "#eab308" },
  { code: "D", color: "#22c55e" },
  { code: "E", color: "#3b82f6" },
];

const TEAM_COLORS = [
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#22c55e", // green
  "#ec4899", // pink
];

function maturityColor(score: number): string {
  if (score >= 4.5) return "#3b82f6"; // E
  if (score >= 3.5) return "#22c55e"; // D
  if (score >= 2.5) return "#eab308"; // C
  if (score >= 1.5) return "#f97316"; // B
  return "#ef4444"; // A
}

function maturityLabel(score: number): string {
  if (score >= 4.5) return "E";
  if (score >= 3.5) return "D";
  if (score >= 2.5) return "C";
  if (score >= 1.5) return "B";
  return "A";
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SMSMaturityTab({ selectedTeamId }: SMSMaturityTabProps) {
  const t = useTranslations("safetyIntelligence");

  const { data: anspData, isLoading: anspLoading } =
    trpc.safetyIntelligence.getANSPPerformance.useQuery({
      teamId: selectedTeamId,
    });

  const { data: teams, isLoading: teamsLoading } =
    trpc.safetyIntelligence.getTeamSummaries.useQuery();

  // Compute programme-wide component averages from ANSP data
  const componentAverages = useMemo(() => {
    if (!anspData) return null;

    const sums: Record<string, number[]> = {};
    for (const comp of SMS_COMPONENTS) {
      sums[comp.key] = [];
    }

    for (const ansp of anspData) {
      for (const comp of SMS_COMPONENTS) {
        const score = ansp.smsScoreByComponent[comp.key];
        if (score !== undefined) {
          sums[comp.key].push(score);
        }
      }
    }

    return SMS_COMPONENTS.map((comp) => {
      const scores = sums[comp.key];
      const avg =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : null;
      return { ...comp, avg };
    });
  }, [anspData]);

  const isLoading = anspLoading || teamsLoading;

  return (
    <div className="space-y-6">
      {/* Component Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        componentAverages && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {componentAverages.map((comp) => (
              <ComponentCard
                key={comp.key}
                shortName={comp.short}
                fullName={comp.label}
                avg={comp.avg}
              />
            ))}
          </div>
        )
      )}

      {/* Main Row: Radar + Range */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("smsMaturity.spiderTitle")}</CardTitle>
            <CardDescription>
              {t("smsMaturity.spiderSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamsLoading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : (
              <ComponentRadar teams={teams ?? []} />
            )}
          </CardContent>
        </Card>

        {/* Range Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>{t("smsMaturity.rangesTitle")}</CardTitle>
            <CardDescription>
              {t("smsMaturity.rangesSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <TeamRanges teams={teams ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reference Legend */}
      <MaturityReferenceLegend />
    </div>
  );
}

// =============================================================================
// COMPONENT CARD
// =============================================================================

interface ComponentCardProps {
  shortName: string;
  fullName: string;
  avg: number | null;
}

function ComponentCard({ shortName, fullName, avg }: ComponentCardProps) {
  const color = avg !== null ? maturityColor(avg) : "#9ca3af";
  const level = avg !== null ? maturityLabel(avg) : "—";
  const pct = avg !== null ? Math.min((avg / 5) * 100, 100) : 0;

  return (
    <Card style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {shortName}
            </p>
            <p className="text-2xl font-bold mt-0.5">
              {avg !== null ? avg.toFixed(2) : "—"}
            </p>
          </div>
          <div
            className="flex items-center justify-center h-10 w-10 rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {level}
          </div>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">
          {fullName}
        </p>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// RADAR CHART — SMS Components by Regional Team
// =============================================================================

interface ComponentRadarProps {
  teams: Array<{
    teamNumber: number;
    teamCode: string;
    smsByComponent: Record<string, number>;
  }>;
}

function ComponentRadar({ teams }: ComponentRadarProps) {
  const radarData = SMS_COMPONENTS.map((comp) => {
    const row: Record<string, string | number> = { component: comp.short };
    for (const team of teams) {
      row[`team${team.teamNumber}`] = team.smsByComponent[comp.key] ?? 0;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={350}>
      <RadarChart
        data={radarData}
        margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
      >
        <PolarGrid />
        <PolarAngleAxis dataKey="component" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 9 }} />
        {teams.map((team, i) => (
          <Radar
            key={team.teamNumber}
            name={`Team ${team.teamNumber}`}
            dataKey={`team${team.teamNumber}`}
            stroke={TEAM_COLORS[i % TEAM_COLORS.length]}
            fill={TEAM_COLORS[i % TEAM_COLORS.length]}
            fillOpacity={0.1}
            strokeWidth={2}
          />
        ))}
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [Number(value).toFixed(2)]}
        />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// =============================================================================
// TEAM MATURITY RANGES
// =============================================================================

interface TeamRangesProps {
  teams: Array<{
    teamNumber: number;
    teamCode: string;
    nameEn: string;
    smsRange: { min: number; max: number; avg: number };
  }>;
}

function TeamRanges({ teams }: TeamRangesProps) {
  const maxScale = 5;

  return (
    <div className="space-y-5">
      {teams.map((team, i) => {
        const { min, max, avg } = team.smsRange;
        const minPct = (min / maxScale) * 100;
        const maxPct = (max / maxScale) * 100;
        const avgPct = (avg / maxScale) * 100;
        const rangePct = maxPct - minPct;
        const color = TEAM_COLORS[i % TEAM_COLORS.length];

        return (
          <div key={team.teamNumber}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium">
                Team {team.teamNumber}
                <span className="text-xs text-muted-foreground ml-1.5">
                  {team.teamCode}
                </span>
              </span>
              <span className="text-xs font-medium tabular-nums">
                {avg.toFixed(1)}{" "}
                <span className="text-muted-foreground">
                  ({min.toFixed(1)}–{max.toFixed(1)})
                </span>
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-muted">
              {/* Range bar */}
              <div
                className="absolute h-full rounded-full opacity-30"
                style={{
                  left: `${minPct}%`,
                  width: `${Math.max(rangePct, 1)}%`,
                  backgroundColor: color,
                }}
              />
              {/* Average dot */}
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900"
                style={{
                  left: `${avgPct}%`,
                  transform: `translate(-50%, -50%)`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}

      {/* Scale labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground pt-1 px-0.5">
        {[0, 1, 2, 3, 4, 5].map((v) => (
          <span key={v}>{v}</span>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MATURITY REFERENCE LEGEND
// =============================================================================

function MaturityReferenceLegend() {
  const t = useTranslations("safetyIntelligence");

  return (
    <Card className="bg-muted/30">
      <CardContent className="p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3">
          {t("smsMaturity.referenceTitle")}
        </p>
        <div className="flex flex-wrap gap-3">
          {MATURITY_LEVELS.map((level) => (
            <div
              key={level.code}
              className="flex items-center gap-2 rounded-md border px-3 py-1.5"
              style={{ borderLeftColor: level.color, borderLeftWidth: 3 }}
            >
              <span
                className="flex items-center justify-center h-5 w-5 rounded text-[10px] font-bold text-white"
                style={{ backgroundColor: level.color }}
              >
                {level.code}
              </span>
              <div className="text-xs">
                <span className="font-medium">
                  {t("smsMaturity.level", { code: level.code })}
                </span>
                <span className="text-muted-foreground ml-1">
                  — {t(`smsMaturity.level${level.code}`)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
