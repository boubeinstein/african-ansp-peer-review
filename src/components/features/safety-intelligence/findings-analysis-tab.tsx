"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// =============================================================================
// TYPES
// =============================================================================

interface FindingsAnalysisTabProps {
  selectedTeamId: string | null;
}

// =============================================================================
// COLORS
// =============================================================================

const SEV = {
  critical: "#ef4444",
  major: "#f59e0b",
  minor: "#06b6d4",
  observation: "#6b7280",
};

const SEV_LABELS: Record<string, string> = {
  critical: "Critical",
  major: "Major",
  minor: "Minor",
  observation: "Observation",
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function FindingsAnalysisTab({
  selectedTeamId,
}: FindingsAnalysisTabProps) {
  const t = useTranslations("safetyIntelligence");

  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  const { data: patterns, isLoading: patternsLoading } =
    trpc.safetyIntelligence.getFindingPatterns.useQuery({
      teamId: selectedTeamId,
    });

  const { data: trendData, isLoading: trendLoading } =
    trpc.safetyIntelligence.getTrendData.useQuery({
      teamId: selectedTeamId,
    });

  // Overall severity totals
  const overallSeverity = useMemo(() => {
    if (!patterns) return [];
    let critical = 0;
    let major = 0;
    let minor = 0;
    let observation = 0;
    for (const p of patterns) {
      critical += p.criticalCount;
      major += p.majorCount;
      minor += p.minorCount;
      observation += p.observationCount;
    }
    return [
      { name: "Critical", value: critical, fill: SEV.critical },
      { name: "Major", value: major, fill: SEV.major },
      { name: "Minor", value: minor, fill: SEV.minor },
      { name: "Observation", value: observation, fill: SEV.observation },
    ].filter((d) => d.value > 0);
  }, [patterns]);

  const totalFindings = overallSeverity.reduce((s, d) => s + d.value, 0);

  // Selected area detail
  const selectedAreaData = useMemo(() => {
    if (!selectedArea || !patterns) return null;
    return patterns.find((p) => p.auditArea === selectedArea) ?? null;
  }, [selectedArea, patterns]);

  return (
    <div className="space-y-6">
      {/* Top Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Stacked Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("findingsAnalysis.byAreaTitle")}</CardTitle>
            <CardDescription>
              {t("findingsAnalysis.byAreaSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {patternsLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : (
              <StackedBarChart
                data={patterns ?? []}
                selectedArea={selectedArea}
                onSelectArea={setSelectedArea}
              />
            )}
          </CardContent>
        </Card>

        {/* Right Panel: Breakdown or Pie */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedAreaData
                    ? t("findingsAnalysis.areaBreakdown", {
                        area: selectedAreaData.auditArea,
                      })
                    : t("findingsAnalysis.severityTitle")}
                </CardTitle>
                <CardDescription>
                  {selectedAreaData
                    ? t("findingsAnalysis.detailedSeverity")
                    : t("findingsAnalysis.totalFindings") +
                      `: ${totalFindings}`}
                </CardDescription>
              </div>
              {selectedAreaData && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedArea(null)}
                >
                  <X className="h-4 w-4 mr-1" />
                  {t("findingsAnalysis.clearSelection")}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {patternsLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : selectedAreaData ? (
              <AreaBreakdown data={selectedAreaData} total={totalFindings} />
            ) : (
              <SeverityPieChart data={overallSeverity} total={totalFindings} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom: Finding Trend */}
      <Card>
        <CardHeader>
          <CardTitle>{t("findingsAnalysis.trendTitle")}</CardTitle>
          <CardDescription>
            {t("findingsAnalysis.trendSubtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : (
            <FindingTrendChart data={trendData ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// STACKED BAR CHART — Findings by Audit Area
// =============================================================================

interface StackedBarChartProps {
  data: Array<{
    auditArea: string;
    criticalCount: number;
    majorCount: number;
    minorCount: number;
    observationCount: number;
  }>;
  selectedArea: string | null;
  onSelectArea: (area: string | null) => void;
}

function StackedBarChart({
  data,
  selectedArea,
  onSelectArea,
}: StackedBarChartProps) {
  const chartData = data.map((d) => ({
    area: d.auditArea,
    Critical: d.criticalCount,
    Major: d.majorCount,
    Minor: d.minorCount,
    Observation: d.observationCount,
    _selected: d.auditArea === selectedArea,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
        onClick={(state) => {
          if (state?.activeLabel) {
            const label = String(state.activeLabel);
            onSelectArea(label === selectedArea ? null : label);
          }
        }}
        className="cursor-pointer"
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="area" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend />
        <Bar
          dataKey="Critical"
          stackId="severity"
          fill={SEV.critical}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="Major"
          stackId="severity"
          fill={SEV.major}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="Minor"
          stackId="severity"
          fill={SEV.minor}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="Observation"
          stackId="severity"
          fill={SEV.observation}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// =============================================================================
// SEVERITY PIE CHART — overall distribution
// =============================================================================

interface SeverityPieChartProps {
  data: Array<{ name: string; value: number; fill: string }>;
  total: number;
}

function SeverityPieChart({ data, total }: SeverityPieChartProps) {
  const t = useTranslations("safetyIntelligence");

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent }) =>
              `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
            }
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: d.fill }}
            />
            <span>
              {d.name}: {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// AREA BREAKDOWN — severity cards + proportional bar
// =============================================================================

interface AreaBreakdownProps {
  data: {
    auditArea: string;
    criticalCount: number;
    majorCount: number;
    minorCount: number;
    observationCount: number;
    totalCount: number;
  };
  total: number;
}

function AreaBreakdown({ data, total }: AreaBreakdownProps) {
  const t = useTranslations("safetyIntelligence");

  const items = [
    { key: "critical", count: data.criticalCount, color: SEV.critical },
    { key: "major", count: data.majorCount, color: SEV.major },
    { key: "minor", count: data.minorCount, color: SEV.minor },
    { key: "observation", count: data.observationCount, color: SEV.observation },
  ];

  return (
    <div className="space-y-5">
      {/* Proportional bar */}
      <div>
        <div className="flex h-4 rounded-full overflow-hidden">
          {items
            .filter((i) => i.count > 0)
            .map((item) => (
              <div
                key={item.key}
                style={{
                  width: `${(item.count / data.totalCount) * 100}%`,
                  backgroundColor: item.color,
                }}
                className="transition-all"
                title={`${SEV_LABELS[item.key]}: ${item.count}`}
              />
            ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {t("findingsAnalysis.ofTotal", {
            pct:
              total > 0
                ? ((data.totalCount / total) * 100).toFixed(1)
                : "0",
          })}
        </p>
      </div>

      {/* Severity cards */}
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded-lg border p-3"
            style={{ borderLeftColor: item.color, borderLeftWidth: 3 }}
          >
            <p className="text-xs font-medium text-muted-foreground">
              {SEV_LABELS[item.key]}
            </p>
            <p className="text-2xl font-bold mt-0.5">{item.count}</p>
            <p className="text-[11px] text-muted-foreground">
              {data.totalCount > 0
                ? `${((item.count / data.totalCount) * 100).toFixed(0)}%`
                : "0%"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// FINDING TREND AREA CHART — quarterly
// =============================================================================

interface FindingTrendChartProps {
  data: Array<{
    period: string;
    totalFindings: number;
  }>;
}

function FindingTrendChart({ data }: FindingTrendChartProps) {
  const chartData = data.map((d) => ({
    period: d.period,
    findings: d.totalFindings,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart
        data={chartData}
        margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
      >
        <defs>
          <linearGradient id="findingsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={SEV.major} stopOpacity={0.4} />
            <stop offset="95%" stopColor={SEV.major} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="findings"
          stroke={SEV.major}
          strokeWidth={2}
          fill="url(#findingsGrad)"
          dot={{ r: 4, fill: SEV.major }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
