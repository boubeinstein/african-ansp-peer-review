"use client";

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
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// =============================================================================
// TYPES
// =============================================================================

interface CAPAnalyticsTabProps {
  selectedTeamId: string | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TEAM_COLORS = [
  "#06b6d4",
  "#8b5cf6",
  "#f59e0b",
  "#22c55e",
  "#ec4899",
];

const DISTRIBUTION_COLORS: Record<string, string> = {
  "90-100%": "#22c55e",
  "75-89%": "#3b82f6",
  "50-74%": "#eab308",
  "25-49%": "#f97316",
  "0-24%": "#ef4444",
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CAPAnalyticsTab({ selectedTeamId }: CAPAnalyticsTabProps) {
  const t = useTranslations("safetyIntelligence");

  const { data: capData, isLoading: capLoading } =
    trpc.safetyIntelligence.getCAPAnalytics.useQuery({
      teamId: selectedTeamId,
    });

  const { data: trendData, isLoading: trendLoading } =
    trpc.safetyIntelligence.getTrendData.useQuery({
      teamId: selectedTeamId,
    });

  return (
    <div className="space-y-6">
      {/* Top Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Distribution Histogram */}
        <Card>
          <CardHeader>
            <CardTitle>{t("capAnalytics.distributionTitle")}</CardTitle>
            <CardDescription>
              {t("capAnalytics.distributionSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {capLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : (
              <DistributionChart
                data={capData?.closureRateDistribution ?? []}
              />
            )}
          </CardContent>
        </Card>

        {/* Team Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>{t("capAnalytics.teamTitle")}</CardTitle>
            <CardDescription>
              {t("capAnalytics.teamSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {capLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : (
              <TeamComparisonChart
                data={capData?.closureRateByTeam ?? []}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom: Trend */}
      <Card>
        <CardHeader>
          <CardTitle>{t("capAnalytics.trendTitle")}</CardTitle>
          <CardDescription>
            {t("capAnalytics.trendSubtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : (
            <CAPTrendChart data={trendData ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// DISTRIBUTION CHART — CAP Closure Rate Distribution
// =============================================================================

interface DistributionChartProps {
  data: Array<{ range: string; count: number }>;
}

function DistributionChart({ data }: DistributionChartProps) {
  const chartData = data.map((d) => ({
    range: d.range,
    count: d.count,
    fill: DISTRIBUTION_COLORS[d.range] ?? "#6b7280",
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="range" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [
            `${Number(value)} ANSPs`,
          ]}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <rect key={index} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// =============================================================================
// TEAM COMPARISON CHART — CAP Closure by Regional Team
// =============================================================================

interface TeamComparisonChartProps {
  data: Array<{
    teamId: string;
    teamNumber: number;
    teamName: string;
    closureRate: number;
    totalCAPs: number;
  }>;
}

function TeamComparisonChart({ data }: TeamComparisonChartProps) {
  const chartData = data.map((d, i) => ({
    name: `Team ${d.teamNumber}`,
    closureRate: Math.round(d.closureRate * 100) / 100,
    totalCAPs: d.totalCAPs,
    fill: TEAM_COLORS[i % TEAM_COLORS.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value, name) => {
            if (name === "closureRate") {
              return [`${Number(value).toFixed(1)}%`, "Closure Rate"];
            }
            return [value];
          }}
        />
        <Bar dataKey="closureRate" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <rect key={index} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// =============================================================================
// CAP TREND CHART — Quarterly CAP Closure Rate Trend
// =============================================================================

interface CAPTrendChartProps {
  data: Array<{
    period: string;
    capClosureRate: number | null;
  }>;
}

function CAPTrendChart({ data }: CAPTrendChartProps) {
  const chartData = data.map((d) => ({
    period: d.period,
    closureRate: d.capClosureRate ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart
        data={chartData}
        margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
      >
        <defs>
          <linearGradient id="capTrendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [`${Number(value).toFixed(1)}%`]}
        />
        <Area
          type="monotone"
          dataKey="closureRate"
          stroke="#22c55e"
          strokeWidth={2}
          fill="url(#capTrendGrad)"
          dot={{ r: 4, fill: "#22c55e" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
