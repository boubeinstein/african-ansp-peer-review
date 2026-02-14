"use client";

import { useTranslations } from "next-intl";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

// =============================================================================
// TYPES
// =============================================================================

interface OverviewTabProps {
  selectedTeamId: string | null;
}

// =============================================================================
// COLORS
// =============================================================================

const COLORS = {
  ei: "#06b6d4",       // cyan-500
  sms: "#8b5cf6",      // violet-500
  cap: "#22c55e",      // green-500
  findings: "#f59e0b", // amber-500
  critical: "#ef4444",
  major: "#f59e0b",
  minor: "#0ea5e9",
  observation: "#71717a",
};

const TEAM_COLORS = [
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#22c55e", // green
  "#ec4899", // pink
];

const MATURITY_COLORS: Record<string, string> = {
  A: "#ef4444",
  B: "#f59e0b",
  C: "#eab308",
  D: "#22c55e",
  E: "#06b6d4",
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function OverviewTab({ selectedTeamId }: OverviewTabProps) {
  const t = useTranslations("safetyIntelligence");

  const { data: kpis, isLoading: kpisLoading } =
    trpc.safetyIntelligence.getKPIs.useQuery({ teamId: selectedTeamId });

  const { data: trendData, isLoading: trendLoading } =
    trpc.safetyIntelligence.getTrendData.useQuery({ teamId: selectedTeamId });

  const { data: teams, isLoading: teamsLoading } =
    trpc.safetyIntelligence.getTeamSummaries.useQuery();

  const { data: systemicIssues, isLoading: systemicLoading } =
    trpc.safetyIntelligence.getSystemicIssues.useQuery({
      teamId: selectedTeamId,
    });

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      {kpisLoading ? (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        kpis && <KPIRow kpis={kpis} />
      )}

      {/* Main Charts Row: Trend (2/3) + Maturity Distribution (1/3) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("overview.trendTitle")}</CardTitle>
            <CardDescription>{t("overview.trendSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <TrendChart data={trendData ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("overview.maturityDistTitle")}</CardTitle>
            <CardDescription>
              {t("overview.maturityDistSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <MaturityDistribution teams={teams ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Radar (1/2) + Systemic Issues (1/2) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("overview.radarTitle")}</CardTitle>
            <CardDescription>{t("overview.radarSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {teamsLoading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : (
              <RegionalRadar teams={teams ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t("overview.systemicTitle")}
            </CardTitle>
            <CardDescription>
              {t("overview.systemicSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {systemicLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <SystemicIssuesList issues={systemicIssues ?? []} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// KPI ROW
// =============================================================================

interface KPIRowProps {
  kpis: {
    averageEIScore: number | null;
    averageSMSMaturity: number | null;
    openFindings: number;
    criticalFindings: number;
    averageCAPClosureRate: number | null;
    completedReviews: number;
    totalOrganizations: number;
    eiTrendVsPrevQuarter: number | null;
    smsTrendVsPrevQuarter: number | null;
  };
}

function KPIRow({ kpis }: KPIRowProps) {
  const t = useTranslations("safetyIntelligence");

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
      <KPICard
        label={t("kpi.avgEI")}
        value={kpis.averageEIScore !== null ? `${kpis.averageEIScore.toFixed(1)}%` : "—"}
        subtitle={t("kpi.effectiveImplementation")}
        trend={kpis.eiTrendVsPrevQuarter}
        color={COLORS.ei}
      />
      <KPICard
        label={t("kpi.avgSMS")}
        value={kpis.averageSMSMaturity !== null ? kpis.averageSMSMaturity.toFixed(1) : "—"}
        subtitle={t("kpi.cansoScale")}
        trend={kpis.smsTrendVsPrevQuarter}
        color={COLORS.sms}
      />
      <KPICard
        label={t("kpi.openFindings")}
        value={kpis.openFindings}
        subtitle={`${kpis.criticalFindings} ${t("kpi.critical")}`}
        color={COLORS.findings}
        alert={kpis.criticalFindings > 0}
      />
      <KPICard
        label={t("kpi.capClosure")}
        value={
          kpis.averageCAPClosureRate !== null
            ? `${kpis.averageCAPClosureRate.toFixed(0)}%`
            : "—"
        }
        subtitle={t("kpi.averageAcrossANSPs")}
        color={COLORS.cap}
      />
      <KPICard
        label={t("kpi.anspsReviewed")}
        value={`${kpis.completedReviews}/${kpis.totalOrganizations}`}
        subtitle={t("kpi.participating")}
        color="#6366f1"
      />
    </div>
  );
}

// =============================================================================
// KPI CARD
// =============================================================================

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle: string;
  trend?: number | null;
  color: string;
  alert?: boolean;
}

function KPICard({ label, value, subtitle, trend, color, alert }: KPICardProps) {
  const t = useTranslations("safetyIntelligence");

  return (
    <Card
      className="relative overflow-hidden"
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className={cn("text-2xl font-bold", alert && "text-red-500")}>
            {value}
          </span>
          {trend !== undefined && trend !== null && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                trend > 0 && "text-green-600",
                trend < 0 && "text-red-600",
                trend === 0 && "text-muted-foreground"
              )}
            >
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : trend < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {trend > 0 && "+"}
              {trend.toFixed(1)}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>
        {trend !== undefined && trend !== null && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {t("kpi.vsLastQuarter")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// TREND LINE CHART
// =============================================================================

interface TrendChartProps {
  data: Array<{
    period: string;
    averageEIScore: number | null;
    averageSMSMaturity: number | null;
    capClosureRate: number | null;
  }>;
}

function TrendChart({ data }: TrendChartProps) {
  const chartData = data.map((d) => ({
    period: d.period,
    ei: d.averageEIScore,
    sms: d.averageSMSMaturity,
    cap: d.capClosureRate,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
        <YAxis
          yAxisId="left"
          domain={[0, 100]}
          tick={{ fontSize: 11 }}
          label={{ value: "EI % / CAP %", angle: -90, position: "insideLeft", style: { fontSize: 10 } }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 5]}
          tick={{ fontSize: 11 }}
          label={{ value: "SMS (1-5)", angle: 90, position: "insideRight", style: { fontSize: 10 } }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value, name) => {
            if (value == null) return ["—", name];
            const num = Number(value);
            const label =
              name === "sms" ? num.toFixed(1) : `${num.toFixed(1)}%`;
            return [label, String(name).toUpperCase()];
          }}
        />
        <Legend
          formatter={(value) => {
            const labels: Record<string, string> = {
              ei: "EI Score",
              sms: "SMS Maturity",
              cap: "CAP Closure",
            };
            return labels[value] ?? value;
          }}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="ei"
          stroke={COLORS.ei}
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="sms"
          stroke={COLORS.sms}
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="cap"
          stroke={COLORS.cap}
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// =============================================================================
// SMS MATURITY DISTRIBUTION (horizontal bar chart)
// =============================================================================

interface MaturityDistributionProps {
  teams: Array<{
    smsRange: { min: number; max: number; avg: number };
    memberCount: number;
    averageSMSMaturity: number | null;
  }>;
}

function MaturityDistribution({ teams }: MaturityDistributionProps) {
  // Count how many teams fall into each maturity level bucket
  const buckets = [
    { level: "A", label: "Level A", range: "1.0-1.9", min: 0, max: 2 },
    { level: "B", label: "Level B", range: "2.0-2.9", min: 2, max: 3 },
    { level: "C", label: "Level C", range: "3.0-3.9", min: 3, max: 4 },
    { level: "D", label: "Level D", range: "4.0-4.4", min: 4, max: 4.5 },
    { level: "E", label: "Level E", range: "4.5-5.0", min: 4.5, max: 6 },
  ];

  const chartData = buckets.map((b) => ({
    level: b.label,
    count: teams.filter((team) => {
      const avg = team.averageSMSMaturity;
      return avg !== null && avg >= b.min && avg < b.max;
    }).length,
    fill: MATURITY_COLORS[b.level],
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis type="number" allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="level"
          width={70}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// =============================================================================
// REGIONAL RADAR CHART
// =============================================================================

const ANS_REVIEW_AREAS = ["ATS", "FPD", "AIS", "MAP", "MET", "CNS", "SAR"];

interface RegionalRadarProps {
  teams: Array<{
    teamNumber: number;
    teamCode: string;
    eiByReviewArea: Record<string, number>;
  }>;
}

function RegionalRadar({ teams }: RegionalRadarProps) {
  // Build radar data: one row per review area, one column per team
  const radarData = ANS_REVIEW_AREAS.map((area) => {
    const row: Record<string, string | number> = { area };
    for (const team of teams) {
      row[`team${team.teamNumber}`] = team.eiByReviewArea[area] ?? 0;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={350}>
      <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
        <PolarGrid />
        <PolarAngleAxis dataKey="area" tick={{ fontSize: 11 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
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
          formatter={(value) => [`${Number(value).toFixed(1)}%`]}
        />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// =============================================================================
// SYSTEMIC ISSUES LIST
// =============================================================================

interface SystemicIssuesListProps {
  issues: Array<{
    id: string;
    reviewArea: string | null;
    titleEn: string;
    titleFr: string;
    severity: string;
    affectedOrganizations: number;
    trend: "improving" | "stable" | "worsening";
  }>;
}

function SystemicIssuesList({ issues }: SystemicIssuesListProps) {
  const t = useTranslations("safetyIntelligence");

  if (issues.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No systemic issues identified
      </p>
    );
  }

  const severityStyles: Record<string, string> = {
    CRITICAL: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
    MAJOR: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
    MINOR: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
    OBSERVATION: "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
  };

  const trendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingDown className="h-3.5 w-3.5 text-green-600" />;
      case "worsening":
        return <TrendingUp className="h-3.5 w-3.5 text-red-600" />;
      default:
        return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const trendLabel = (trend: string) => {
    switch (trend) {
      case "improving":
        return t("overview.improving");
      case "worsening":
        return t("overview.worsening");
      default:
        return t("overview.stable");
    }
  };

  return (
    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
      {issues.map((issue) => (
        <div
          key={issue.id}
          className="flex items-start justify-between gap-3 rounded-lg border p-3"
        >
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {issue.reviewArea && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {issue.reviewArea}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0", severityStyles[issue.severity])}
              >
                {issue.severity}
              </Badge>
            </div>
            <p className="text-sm font-medium leading-tight truncate">
              {issue.titleEn}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("overview.affectedANSPs", {
                count: issue.affectedOrganizations,
              })}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0 text-xs">
            {trendIcon(issue.trend)}
            <span className="text-muted-foreground">{trendLabel(issue.trend)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
