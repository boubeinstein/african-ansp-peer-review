"use client";

/**
 * Findings & CAP Trends Tab
 *
 * Programme-level findings pattern analysis, CAP closure performance,
 * severity distribution, and recurring ICAO reference detection.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, FileSearch, Clock, CheckCircle2, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
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

interface FindingsCapTrendsTabProps {
  locale: string;
}

type RegionFilter = "ALL" | "WACAF" | "ESAF" | "NORTHERN";
type PeriodFilter = "6" | "12" | "all";

// =============================================================================
// COLORS
// =============================================================================

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#ef4444",
  MAJOR: "#f97316",
  MINOR: "#eab308",
  OBSERVATION: "#3b82f6",
};

const CAP_STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  SUBMITTED: "#3b82f6",
  UNDER_REVIEW: "#8b5cf6",
  ACCEPTED: "#06b6d4",
  REJECTED: "#ef4444",
  IN_PROGRESS: "#f59e0b",
  COMPLETED: "#22c55e",
  VERIFIED: "#10b981",
  CLOSED: "#6b7280",
};

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function FindingsCapTrendsTab({ locale }: FindingsCapTrendsTabProps) {
  const t = useTranslations("analytics");
  const ft = (key: string) => t(`programmeIntelligence.findingsAndCAP.${key}`);

  // Filter state
  const [region, setRegion] = useState<RegionFilter>("ALL");
  const [team, setTeam] = useState<string>("ALL");
  const [period, setPeriod] = useState<PeriodFilter>("12");

  // Build tRPC input
  const queryInput = {
    region: region !== "ALL" ? (region as "WACAF" | "ESAF" | "NORTHERN") : undefined,
    teamNumber: team !== "ALL" ? Number(team) : undefined,
    months: period !== "all" ? Number(period) : undefined,
  };

  const { data, isLoading } = trpc.intelligence.getFindingsAndCAPTrends.useQuery(queryInput);

  const summary = data?.summary;
  const findingsBySeverity = data?.findingsBySeverity ?? [];
  const findingsByReviewArea = data?.findingsByReviewArea ?? [];
  const monthlyTrend = data?.monthlyTrend ?? [];
  const capsByStatus = data?.capsByStatus ?? [];
  const capClosurePerformance = data?.capClosurePerformance ?? [];
  const topOrgs = data?.topOrganizationsByFindings ?? [];
  const patterns = data?.recurringPatterns ?? [];

  const isEmpty =
    !isLoading && (!summary || summary.totalFindings === 0);

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Region */}
            <Select value={region} onValueChange={(v) => setRegion(v as RegionFilter)}>
              <SelectTrigger size="sm" className="w-[160px]">
                <SelectValue placeholder={ft("filters.region")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{ft("filters.allRegions")}</SelectItem>
                <SelectItem value="WACAF">WACAF</SelectItem>
                <SelectItem value="ESAF">ESAF</SelectItem>
                <SelectItem value="NORTHERN">NORTHERN</SelectItem>
              </SelectContent>
            </Select>

            {/* Team */}
            <Select value={team} onValueChange={setTeam}>
              <SelectTrigger size="sm" className="w-[150px]">
                <SelectValue placeholder={ft("filters.team")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{ft("filters.allTeams")}</SelectItem>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {ft("filters.team")} {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Period */}
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
              <SelectTrigger size="sm" className="w-[170px]">
                <SelectValue placeholder={ft("filters.period")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">{ft("filters.last6Months")}</SelectItem>
                <SelectItem value="12">{ft("filters.last12Months")}</SelectItem>
                <SelectItem value="all">{ft("filters.allTime")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {isEmpty && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <FileSearch className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">{ft("tables.noFindings")}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
              {ft("tables.noFindingsDescription")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPI Summary Cards */}
      {!isEmpty && (
        <>
          {isLoading ? (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            summary && <KPISummary summary={summary} ft={ft} />
          )}

          {/* Charts Row 1: Severity Donut + Monthly Trend */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{ft("charts.severityDistribution")}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <SeverityDonut data={findingsBySeverity} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{ft("charts.monthlyTrend")}</CardTitle>
                <CardDescription>
                  {ft("charts.monthlyTrendDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <MonthlyTrendChart data={monthlyTrend} ft={ft} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2: Review Area Stacked Bar + CAP Status Donut */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{ft("charts.byReviewArea")}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ReviewAreaChart data={findingsByReviewArea} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{ft("charts.capStatus")}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <CAPStatusDonut data={capsByStatus} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 3: CAP Closure Performance (full width) */}
          <Card>
            <CardHeader>
              <CardTitle>{ft("charts.capClosurePerformance")}</CardTitle>
              <CardDescription>
                {ft("charts.capClosureDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <CAPClosureChart data={capClosurePerformance} ft={ft} />
              )}
            </CardContent>
          </Card>

          {/* Tables: Top Orgs + Recurring Patterns */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{ft("tables.topOrganizations")}</CardTitle>
                <CardDescription>
                  {ft("tables.topOrganizationsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <TopOrganizationsTable data={topOrgs} locale={locale} ft={ft} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{ft("tables.recurringPatterns")}</CardTitle>
                <CardDescription>
                  {ft("tables.recurringPatternsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <RecurringPatternsTable data={patterns} ft={ft} />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// KPI SUMMARY
// =============================================================================

interface KPISummaryProps {
  summary: {
    totalFindings: number;
    openFindings: number;
    closedFindings: number;
    criticalOpen: number;
    avgResolutionDays: number | null;
    totalCAPs: number;
    capsOnTime: number;
    capsOverdue: number;
    capCompletionRate: number;
  };
  ft: (key: string) => string;
}

function KPISummary({ summary, ft }: KPISummaryProps) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {/* Total Findings */}
      <KPICard
        label={ft("summary.totalFindings")}
        value={summary.totalFindings}
        subtitle={`${summary.openFindings} ${ft("summary.openFindings").toLowerCase()} / ${summary.closedFindings} ${ft("summary.closedFindings").toLowerCase()}`}
        icon={<FileSearch className="h-4 w-4" />}
        color="#3b82f6"
      />
      {/* Critical Open */}
      <KPICard
        label={ft("summary.criticalOpen")}
        value={summary.criticalOpen}
        icon={<AlertTriangle className="h-4 w-4" />}
        color="#ef4444"
        alert={summary.criticalOpen > 0}
      />
      {/* Avg Resolution */}
      <KPICard
        label={ft("summary.avgResolution")}
        value={summary.avgResolutionDays !== null ? `${summary.avgResolutionDays}` : "—"}
        subtitle={summary.avgResolutionDays !== null ? ft("summary.days") : undefined}
        icon={<Clock className="h-4 w-4" />}
        color="#f59e0b"
      />
      {/* CAP Completion Rate */}
      <KPICard
        label={ft("summary.completionRate")}
        value={`${summary.capCompletionRate}%`}
        icon={<CheckCircle2 className="h-4 w-4" />}
        color="#22c55e"
      />
      {/* Total CAPs */}
      <KPICard
        label={ft("summary.totalCAPs")}
        value={summary.totalCAPs}
        color="#8b5cf6"
      />
      {/* On Time */}
      <KPICard
        label={ft("summary.onTime")}
        value={summary.capsOnTime}
        color="#22c55e"
      />
      {/* Overdue */}
      <KPICard
        label={ft("summary.overdue")}
        value={summary.capsOverdue}
        color="#ef4444"
        alert={summary.capsOverdue > 0}
        icon={<XCircle className="h-4 w-4" />}
      />
      {/* Avg Resolution Days (from CAPs) */}
      <KPICard
        label={ft("summary.avgResolution")}
        value={summary.avgResolutionDays !== null ? `${summary.avgResolutionDays}` : "—"}
        subtitle={summary.avgResolutionDays !== null ? ft("summary.days") : undefined}
        color="#06b6d4"
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
  subtitle?: string;
  icon?: React.ReactNode;
  color: string;
  alert?: boolean;
}

function KPICard({ label, value, subtitle, icon, color, alert }: KPICardProps) {
  return (
    <Card
      className="relative overflow-hidden"
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {icon && (
            <span className={cn("text-muted-foreground", alert && "text-red-500")}>
              {icon}
            </span>
          )}
        </div>
        <div className="mt-1">
          <span className={cn("text-2xl font-bold", alert && "text-red-500")}>
            {value}
          </span>
        </div>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SEVERITY DONUT CHART
// =============================================================================

interface SeverityDonutProps {
  data: Array<{ severity?: string; count: number; percentage: number }>;
}

function SeverityDonut({ data }: SeverityDonutProps) {
  const chartData = data.map((d) => ({
    name: d.severity ?? "Unknown",
    value: d.count,
    fill: SEVERITY_COLORS[d.severity ?? ""] ?? "#94a3b8",
  }));

  if (chartData.length === 0) {
    return <EmptyChartPlaceholder />;
  }

  return (
    <div style={{ width: "100%", minHeight: 300 }}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
            }
            labelLine={{ strokeWidth: 1 }}
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// =============================================================================
// MONTHLY TREND CHART
// =============================================================================

interface MonthlyTrendChartProps {
  data: Array<{ month: string; opened: number; closed: number; netOpen: number }>;
  ft: (key: string) => string;
}

function MonthlyTrendChart({ data, ft }: MonthlyTrendChartProps) {
  if (data.length === 0) {
    return <EmptyChartPlaceholder />;
  }

  return (
    <div style={{ width: "100%", minHeight: 300 }}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="openedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="closedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend />
          <Area
            type="monotone"
            dataKey="opened"
            name={ft("charts.opened")}
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#openedGrad)"
          />
          <Area
            type="monotone"
            dataKey="closed"
            name={ft("charts.closed")}
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#closedGrad)"
          />
          <Area
            type="monotone"
            dataKey="netOpen"
            name={ft("charts.netOpen")}
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="none"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// =============================================================================
// REVIEW AREA STACKED BAR
// =============================================================================

interface ReviewAreaChartProps {
  data: Array<{
    area: string;
    total: number;
    critical: number;
    major: number;
    minor: number;
    observation: number;
  }>;
}

function ReviewAreaChart({ data }: ReviewAreaChartProps) {
  if (data.length === 0) {
    return <EmptyChartPlaceholder />;
  }

  return (
    <div style={{ width: "100%", minHeight: 300 }}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="area"
            width={50}
            tick={{ fontSize: 11 }}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend />
          <Bar dataKey="critical" name="Critical" stackId="a" fill={SEVERITY_COLORS.CRITICAL} />
          <Bar dataKey="major" name="Major" stackId="a" fill={SEVERITY_COLORS.MAJOR} />
          <Bar dataKey="minor" name="Minor" stackId="a" fill={SEVERITY_COLORS.MINOR} />
          <Bar dataKey="observation" name="Observation" stackId="a" fill={SEVERITY_COLORS.OBSERVATION} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// =============================================================================
// CAP STATUS DONUT
// =============================================================================

interface CAPStatusDonutProps {
  data: Array<{ status?: string; count: number; percentage: number }>;
}

function CAPStatusDonut({ data }: CAPStatusDonutProps) {
  const chartData = data.map((d) => ({
    name: d.status ?? "Unknown",
    value: d.count,
    fill: CAP_STATUS_COLORS[d.status ?? ""] ?? "#94a3b8",
  }));

  if (chartData.length === 0) {
    return <EmptyChartPlaceholder />;
  }

  return (
    <div style={{ width: "100%", minHeight: 300 }}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
            }
            labelLine={{ strokeWidth: 1 }}
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// =============================================================================
// CAP CLOSURE PERFORMANCE BAR CHART
// =============================================================================

interface CAPClosureChartProps {
  data: Array<{ severity: string; avgDays: number; count: number }>;
  ft: (key: string) => string;
}

function CAPClosureChart({ data, ft }: CAPClosureChartProps) {
  if (data.length === 0) {
    return <EmptyChartPlaceholder />;
  }

  const chartData = data.map((d) => ({
    ...d,
    fill: SEVERITY_COLORS[d.severity] ?? "#94a3b8",
  }));

  return (
    <div style={{ width: "100%", minHeight: 300 }}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="severity" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number | undefined, name?: string) => {
              const v = value ?? 0;
              if (name === "avgDays") return [`${v} ${ft("summary.days")}`, ft("charts.avgDays")];
              return [v, ft("charts.count")];
            }}
          />
          <Legend />
          <Bar
            dataKey="avgDays"
            name={ft("charts.avgDays")}
            radius={[4, 4, 0, 0]}
            label={{ position: "top", fontSize: 11 }}
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// =============================================================================
// TOP ORGANIZATIONS TABLE
// =============================================================================

interface TopOrganizationsTableProps {
  data: Array<{
    organizationId: string;
    nameEn: string;
    nameFr: string;
    total: number;
    critical: number;
    open: number;
  }>;
  locale: string;
  ft: (key: string) => string;
}

function TopOrganizationsTable({ data, locale, ft }: TopOrganizationsTableProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        {ft("tables.noFindings")}
      </p>
    );
  }

  return (
    <div className="max-h-[400px] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{ft("tables.organization")}</TableHead>
            <TableHead className="text-right">{ft("tables.total")}</TableHead>
            <TableHead className="text-right">{ft("tables.critical")}</TableHead>
            <TableHead className="text-right">{ft("tables.open")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((org) => (
            <TableRow key={org.organizationId}>
              <TableCell className="font-medium">
                {locale === "fr" ? org.nameFr : org.nameEn}
              </TableCell>
              <TableCell className="text-right">{org.total}</TableCell>
              <TableCell className="text-right">
                {org.critical > 0 ? (
                  <Badge
                    variant="outline"
                    className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
                  >
                    {org.critical}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {org.open > 0 ? (
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {org.open}
                  </span>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// =============================================================================
// RECURRING PATTERNS TABLE
// =============================================================================

interface RecurringPatternsTableProps {
  data: Array<{
    icaoReference: string;
    count: number;
    organizations: number;
  }>;
  ft: (key: string) => string;
}

function RecurringPatternsTable({ data, ft }: RecurringPatternsTableProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        {ft("tables.noFindings")}
      </p>
    );
  }

  return (
    <div className="max-h-[400px] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{ft("tables.icaoReference")}</TableHead>
            <TableHead className="text-right">{ft("tables.occurrences")}</TableHead>
            <TableHead className="text-right">{ft("tables.affectedOrgs")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((pattern) => (
            <TableRow key={pattern.icaoReference}>
              <TableCell className="font-mono text-sm">
                {pattern.icaoReference}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="secondary">{pattern.count}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {pattern.organizations}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// =============================================================================
// EMPTY CHART PLACEHOLDER
// =============================================================================

function EmptyChartPlaceholder() {
  return (
    <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
      <FileSearch className="h-5 w-5 mr-2" />
      No data available
    </div>
  );
}

export default FindingsCapTrendsTab;
