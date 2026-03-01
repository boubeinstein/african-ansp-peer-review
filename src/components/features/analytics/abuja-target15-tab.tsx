"use client";

/**
 * Abuja Safety Target #15 Tab
 *
 * ICAO/AFCAC executive-quality KPI tracker for AST #15:
 *   1. Header banner with overall progress ring
 *   2. Timeline — 4 milestones on a horizontal bar
 *   3. AST 15.1 — Programme Participation (2 KPIs + regional + enrollment trend)
 *   4. AST 15.2 — SMS Maturity (2 milestones + distribution chart + regional)
 *   5. AST 15.3 — Certification Readiness (4-level gauge cards)
 *   6. Organization detail table (search, sort, paginate)
 *
 * Data source: trpc.intelligence.getAbujaTarget15
 */

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Target,
  Users,
  ShieldCheck,
  Award,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  FileSearch,
  CalendarClock,
  CheckCircle2,
  Clock,
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
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface AbujaTarget15TabProps {
  locale: string;
}

type SortField =
  | "name"
  | "country"
  | "region"
  | "status"
  | "smsMaturity"
  | "eiScore"
  | "reviewCount";
type SortDir = "asc" | "desc";

// =============================================================================
// CONSTANTS
// =============================================================================

const MATURITY_COLORS: Record<string, string> = {
  A: "#EF4444",
  B: "#F97316",
  C: "#EAB308",
  D: "#84CC16",
  E: "#22C55E",
};

const MATURITY_BG: Record<string, string> = {
  A: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  B: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  C: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  D: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
  E: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const MATURITY_ORDER: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
};

const ROWS_PER_PAGE = 20;

// =============================================================================
// HELPERS
// =============================================================================

function useNumberFormatter(locale: string) {
  return useMemo(
    () => new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US"),
    [locale]
  );
}

/** Days between today and a target date. Negative = overdue. */
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
}

// =============================================================================
// RADIAL PROGRESS (SVG circle for KPI gauges)
// =============================================================================

function RadialProgress({
  value,
  size = 120,
  strokeWidth = 10,
  color = "#22C55E",
  label,
  sublabel,
  ariaLabel,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label: string;
  sublabel?: string;
  ariaLabel?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative flex flex-col items-center gap-1"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel || `${label} progress`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{label}</span>
        {sublabel && (
          <span className="text-xs text-muted-foreground text-center leading-tight max-w-[80%]">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SECTION 1: HEADER BANNER
// =============================================================================

function HeaderBanner({
  overallProgress,
  t,
}: {
  overallProgress: number;
  t: (key: string) => string;
}) {
  const progressColor =
    overallProgress >= 70
      ? "#22C55E"
      : overallProgress >= 40
        ? "#EAB308"
        : "#EF4444";

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-primary/5">
      <CardContent className="pt-6 pb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          {/* Text content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  {t("title")}
                </h2>
                <Badge
                  variant="outline"
                  className="mt-1 text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                >
                  AFCAC / ICAO
                </Badge>
              </div>
            </div>
            <blockquote className="mt-3 pl-4 border-l-2 border-primary/30 italic text-sm text-muted-foreground">
              &ldquo;{t("description")}&rdquo;
            </blockquote>
            <p className="mt-2 text-xs text-muted-foreground">
              — {t("source")}
            </p>
          </div>

          {/* Overall progress ring */}
          <div className="flex-shrink-0">
            <RadialProgress
              value={overallProgress}
              size={130}
              strokeWidth={12}
              color={progressColor}
              label={`${Math.round(overallProgress)}%`}
              sublabel={t("overallProgress")}
              ariaLabel={`${t("overallProgress")}: ${Math.round(overallProgress)}%`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SECTION 2: TIMELINE
// =============================================================================

interface MilestoneData {
  id: string;
  label: string;
  date: string;
  status: "past" | "current" | "future";
  /** Achievement percentage for past milestones (0-100), used for red/amber/green coloring */
  achievement?: number;
}

/** Color a past milestone dot based on achievement percentage */
function pastDotClasses(achievement: number | undefined): string {
  const pct = achievement ?? 0;
  if (pct >= 80) return "bg-green-500 border-green-600 text-white";
  if (pct >= 50) return "bg-amber-500 border-amber-600 text-white";
  return "bg-red-500 border-red-600 text-white";
}

function TimelineSection({
  milestones,
  t,
}: {
  milestones: MilestoneData[];
  t: (key: string) => string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          {t("timeline.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <nav aria-label={t("timeline.title")}>
          <div className="relative">
            {/* Track line */}
            <div className="absolute top-4 left-0 right-0 h-1 bg-muted rounded-full" aria-hidden="true" />

            {/* Milestones */}
            <div className="relative flex justify-between">
              {milestones.map((m) => {
                const days = daysUntil(m.date);
                const isPast = m.status === "past";
                const isCurrent = m.status === "current";

                return (
                  <div
                    key={m.id}
                    className="flex flex-col items-center gap-1.5 w-1/4"
                    aria-label={`${m.label}: ${m.date}, ${isPast ? t("timeline.past") : isCurrent ? t("timeline.upcoming") : t("timeline.future")}`}
                  >
                    {/* Dot */}
                    <div
                      className={cn(
                        "relative z-10 h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all",
                        isPast
                          ? pastDotClasses(m.achievement)
                          : isCurrent
                            ? "bg-blue-500 border-blue-600 text-white ring-4 ring-blue-200 dark:ring-blue-900"
                            : "bg-muted border-muted-foreground/30 text-muted-foreground"
                      )}
                      aria-hidden="true"
                    >
                      {isPast ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isCurrent ? (
                        <Clock className="h-4 w-4" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-current" />
                      )}
                    </div>

                    {/* Label */}
                    <p className="text-xs font-semibold text-center leading-tight">
                      {m.label}
                    </p>

                    {/* Date */}
                    <p className="text-[10px] text-muted-foreground text-center">
                      {m.date}
                    </p>

                    {/* Status badge */}
                    {isPast && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          (m.achievement ?? 0) >= 80
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                            : (m.achievement ?? 0) >= 50
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                              : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                        )}
                      >
                        {t("timeline.past")} — {(m.achievement ?? 0).toFixed(0)}%
                      </Badge>
                    )}
                    {isCurrent && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {Math.abs(days)}d — {t("timeline.upcoming")}
                      </Badge>
                    )}
                    {!isPast && !isCurrent && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {t("timeline.future")}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </nav>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SECTION 3: AST 15.1 — PROGRAMME PARTICIPATION
// =============================================================================

function KPICard({
  title,
  description,
  current,
  target,
  percentage,
  color,
}: {
  title: string;
  description: string;
  current: number;
  target: number;
  percentage: number;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <RadialProgress
              value={percentage}
              size={100}
              strokeWidth={8}
              color={color}
              label={`${current}`}
              sublabel={`/ ${target}`}
              ariaLabel={`${title}: ${current} / ${target}`}
            />
          </div>
          <div className="flex-1 min-w-0 pt-2">
            <h4 className="font-semibold text-sm">{title}</h4>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">
                  {percentage.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={percentage}
                className="h-1.5"
                aria-label={`${title}: ${percentage.toFixed(1)}%`}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AST151Section({
  data,
  t,
  nf,
}: {
  data: {
    targetDate: string;
    kpi01: {
      label: string;
      target: number;
      current: number;
      percentage: number;
      trend?: { month: string; count: number }[];
    };
    kpi02: {
      label: string;
      target: number;
      current: number;
      percentage: number;
    };
    byRegion: { region: string; total: number; joined: number; reviewed: number }[];
  };
  t: (key: string) => string;
  nf: Intl.NumberFormat;
}) {
  const trendData = useMemo(
    () => data.kpi01.trend || [],
    [data.kpi01.trend]
  );

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">{t("ast151.title")}</h3>
        <Badge variant="outline" className="text-xs">
          {t("ast151.targetDate")}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{t("ast151.description")}</p>

      {/* 2 KPI cards side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KPICard
          title={t("ast151.kpi01.title")}
          description={t("ast151.kpi01.description")}
          current={data.kpi01.current}
          target={data.kpi01.target}
          percentage={data.kpi01.percentage}
          color="#3B82F6"
        />
        <KPICard
          title={t("ast151.kpi02.title")}
          description={t("ast151.kpi02.description")}
          current={data.kpi02.current}
          target={data.kpi02.target}
          percentage={data.kpi02.percentage}
          color="#22C55E"
        />
      </div>

      {/* Regional breakdown table */}
      {(data.byRegion || []).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {t("regional.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">{t("regional.region")}</TableHead>
                    <TableHead scope="col" className="text-center">
                      {t("regional.total")}
                    </TableHead>
                    <TableHead scope="col" className="text-center">
                      {t("regional.joined")}
                    </TableHead>
                    <TableHead scope="col" className="text-center">
                      {t("regional.reviewed")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.byRegion || []).map((row) => (
                    <TableRow key={row.region}>
                      <TableCell className="font-medium">
                        {t(`regional.regions.${row.region}`)}
                      </TableCell>
                      <TableCell className="text-center">
                        {nf.format(row.total)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className="text-xs"
                        >
                          {nf.format(row.joined)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className="text-xs"
                        >
                          {nf.format(row.reviewed)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enrollment trend chart */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {t("ast151.enrollmentTrend")}
            </CardTitle>
            <CardDescription>{t("ast151.cumulativeEnrollment")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ minHeight: 250 }} role="img" aria-label={t("ast151.enrollmentTrend")}>
              <ResponsiveContainer width="100%" height={250} minWidth={1} minHeight={1}>
                <AreaChart
                  data={trendData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => {
                      if (!v) return "";
                      const parts = String(v).split("-");
                      return parts.length >= 2 ? `${parts[1]}/${parts[0]?.slice(2)}` : String(v);
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number | undefined) => [
                      nf.format(value ?? 0),
                      t("ast151.cumulativeEnrollment"),
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// SECTION 4: AST 15.2 — SMS MATURITY
// =============================================================================

function MilestoneCard({
  title,
  targetDate,
  description,
  achieved,
  inProgress,
  notStarted,
  total,
  t,
}: {
  title: string;
  targetDate: string;
  description: string;
  achieved: number;
  inProgress?: number;
  notStarted?: number;
  total: number;
  t: (key: string) => string;
}) {
  const pct = total > 0 ? (achieved / total) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription>
          {targetDate} — {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-lg">{achieved}</span>
          <span className="text-muted-foreground">/ {total}</span>
        </div>
        <Progress value={pct} className="h-2.5" aria-label={`${title}: ${achieved} / ${total}`} />

        {/* Stacked breakdown */}
        {(inProgress !== undefined || notStarted !== undefined) && (
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span>
                {t("ast152.achieved")}: {achieved}
              </span>
            </div>
            {inProgress !== undefined && (
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span>
                  {t("ast152.inProgress")}: {inProgress}
                </span>
              </div>
            )}
            {notStarted !== undefined && (
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span>
                  {t("ast152.notStarted")}: {notStarted}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AST152Section({
  data,
  registeredANSPs,
  t,
  nf,
}: {
  data: {
    milestone2025: {
      targetDate: string;
      target: number;
      label: string;
      achieved: number;
      inProgress?: number;
      notStarted?: number;
      percentage: number;
    };
    milestone2028: {
      targetDate: string;
      target: number;
      label: string;
      achieved: number;
      percentage: number;
    };
    maturityDistribution: { level: string; count: number; percentage: number }[];
    byRegion: {
      region: string;
      avgMaturity: string;
      achieved50: number;
      total: number;
    }[];
  };
  registeredANSPs: number;
  t: (key: string) => string;
  nf: Intl.NumberFormat;
}) {
  const distData = useMemo(
    () => (data.maturityDistribution || []).map((d) => ({
      ...d,
      name: t(`ast152.levels.${d.level}`),
      fill: MATURITY_COLORS[d.level] || "#94a3b8",
    })),
    [data.maturityDistribution, t]
  );

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-emerald-600" />
        <h3 className="text-lg font-semibold">{t("ast152.title")}</h3>
      </div>

      {/* 2 milestone cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MilestoneCard
          title={t("ast152.milestone2025.title")}
          targetDate={t("ast152.milestone2025.targetDate")}
          description={t("ast152.milestone2025.description")}
          achieved={data.milestone2025.achieved}
          inProgress={data.milestone2025.inProgress}
          notStarted={data.milestone2025.notStarted}
          total={registeredANSPs}
          t={t}
        />
        <MilestoneCard
          title={t("ast152.milestone2028.title")}
          targetDate={t("ast152.milestone2028.targetDate")}
          description={t("ast152.milestone2028.description")}
          achieved={data.milestone2028.achieved}
          total={registeredANSPs}
          t={t}
        />
      </div>

      {/* Maturity distribution bar chart */}
      {distData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {t("ast152.maturityDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ minHeight: 220 }} role="img" aria-label={t("ast152.maturityDistribution")}>
              <ResponsiveContainer width="100%" height={220} minWidth={1} minHeight={1}>
                <BarChart
                  data={distData}
                  layout="vertical"
                  margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={180}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [nf.format(value ?? 0), "ANSPs"]}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                    {distData.map((entry) => (
                      <Cell key={entry.level} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regional maturity table */}
      {(data.byRegion || []).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t("regional.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">{t("regional.region")}</TableHead>
                    <TableHead scope="col" className="text-center">
                      {t("regional.total")}
                    </TableHead>
                    <TableHead scope="col" className="text-center">
                      {t("regional.avgMaturity")}
                    </TableHead>
                    <TableHead scope="col" className="text-center">
                      ≥ Level C
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.byRegion || []).map((row) => (
                    <TableRow key={row.region}>
                      <TableCell className="font-medium">
                        {t(`regional.regions.${row.region}`)}
                      </TableCell>
                      <TableCell className="text-center">
                        {nf.format(row.total)}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.avgMaturity && row.avgMaturity !== "-" ? (
                          <Badge
                            className={cn(
                              "text-xs font-mono",
                              MATURITY_BG[row.avgMaturity] || ""
                            )}
                          >
                            {row.avgMaturity}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {nf.format(row.achieved50)} / {nf.format(row.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// SECTION 5: AST 15.3 — CERTIFICATION READINESS
// =============================================================================

function ReadinessCard({
  count,
  title,
  description,
  color,
  icon,
}: {
  count: number;
  title: string;
  description: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className={cn("border-l-4", color)}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-muted rounded-full flex-shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{title}</p>
              <span className="text-2xl font-bold">{count}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AST153Section({
  data,
  t,
}: {
  data: {
    targetDate: string;
    label: string;
    readinessLevels: {
      high: number;
      medium: number;
      low: number;
      notStarted: number;
    };
  };
  t: (key: string) => string;
}) {
  const levels = data.readinessLevels || { high: 0, medium: 0, low: 0, notStarted: 0 };
  const total = levels.high + levels.medium + levels.low + levels.notStarted;

  // Stacked readiness bar segments
  const segments = [
    { key: "high", count: levels.high, color: "bg-green-500" },
    { key: "medium", count: levels.medium, color: "bg-amber-500" },
    { key: "low", count: levels.low, color: "bg-orange-400" },
    { key: "notStarted", count: levels.notStarted, color: "bg-slate-300 dark:bg-slate-600" },
  ];

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Award className="h-5 w-5 text-amber-600" />
        <h3 className="text-lg font-semibold">{t("ast153.title")}</h3>
        <Badge variant="outline" className="text-xs">
          {t("ast153.targetDate")}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{t("ast153.description")}</p>

      {/* Readiness gauge bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t("ast153.readiness")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className="flex h-4 rounded-full overflow-hidden"
            role="img"
            aria-label={`${t("ast153.readiness")}: ${segments.map((s) => `${t(`ast153.readinessLevels.${s.key}`)} ${s.count}`).join(", ")}`}
          >
            {segments.map((seg) => {
              const pct = total > 0 ? (seg.count / total) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={seg.key}
                  className={cn("h-full transition-all", seg.color)}
                  style={{ width: `${pct}%` }}
                  title={`${t(`ast153.readinessLevels.${seg.key}`)}: ${seg.count}`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs">
            {segments.map((seg) => (
              <div key={seg.key} className="flex items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-full", seg.color)} />
                <span className="text-muted-foreground">
                  {t(`ast153.readinessLevels.${seg.key}`)}: {seg.count}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4 readiness level cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ReadinessCard
          count={levels.high}
          title={t("ast153.readinessLevels.high")}
          description={t("ast153.readinessLevels.highDescription")}
          color="border-green-500"
          icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
        />
        <ReadinessCard
          count={levels.medium}
          title={t("ast153.readinessLevels.medium")}
          description={t("ast153.readinessLevels.mediumDescription")}
          color="border-amber-500"
          icon={<Clock className="h-4 w-4 text-amber-600" />}
        />
        <ReadinessCard
          count={levels.low}
          title={t("ast153.readinessLevels.low")}
          description={t("ast153.readinessLevels.lowDescription")}
          color="border-orange-400"
          icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
        />
        <ReadinessCard
          count={levels.notStarted}
          title={t("ast153.readinessLevels.notStarted")}
          description={t("ast153.readinessLevels.notStartedDescription")}
          color="border-slate-300 dark:border-slate-600"
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
        />
      </div>
    </div>
  );
}

// =============================================================================
// SECTION 6: ORGANIZATION DETAIL TABLE
// =============================================================================

interface OrgRow {
  id: string;
  nameEn: string;
  nameFr: string;
  country: string;
  region: string;
  participationStatus: string;
  joinedAt: string | null;
  hasCompletedReview: boolean;
  latestSMSMaturity: string | null;
  latestEIScore: number | null;
  reviewCount: number;
}

function SortableHeader({
  field,
  activeField,
  sortDirection,
  onSort,
  children,
}: {
  field: SortField;
  activeField: SortField;
  sortDirection: SortDir;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
}) {
  const isActive = activeField === field;
  const dirLabel = isActive
    ? sortDirection === "asc"
      ? "sorted ascending"
      : "sorted descending"
    : "sortable";
  return (
    <button
      type="button"
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => onSort(field)}
      aria-label={`${typeof children === "string" ? children : field}, ${dirLabel}`}
    >
      {children}
      <ArrowUpDown
        className={cn(
          "h-3 w-3",
          isActive ? "text-foreground" : "text-muted-foreground/50"
        )}
      />
    </button>
  );
}

function OrganizationDetailTable({
  organizations,
  locale,
  t,
}: {
  organizations: OrgRow[];
  locale: string;
  t: (key: string) => string;
}) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(0);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return organizations;
    return organizations.filter(
      (o) =>
        o.nameEn.toLowerCase().includes(q) ||
        o.nameFr.toLowerCase().includes(q) ||
        o.country.toLowerCase().includes(q) ||
        o.region.toLowerCase().includes(q)
    );
  }, [organizations, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "name": {
          const na = locale === "fr" ? a.nameFr : a.nameEn;
          const nb = locale === "fr" ? b.nameFr : b.nameEn;
          return na.localeCompare(nb) * dir;
        }
        case "country":
          return a.country.localeCompare(b.country) * dir;
        case "region":
          return a.region.localeCompare(b.region) * dir;
        case "status":
          return a.participationStatus.localeCompare(b.participationStatus) * dir;
        case "smsMaturity": {
          const ma = MATURITY_ORDER[a.latestSMSMaturity || ""] ?? 0;
          const mb = MATURITY_ORDER[b.latestSMSMaturity || ""] ?? 0;
          return (ma - mb) * dir;
        }
        case "eiScore":
          return ((a.latestEIScore ?? -1) - (b.latestEIScore ?? -1)) * dir;
        case "reviewCount":
          return (a.reviewCount - b.reviewCount) * dir;
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, sortField, sortDir, locale]);

  const totalPages = Math.ceil(sorted.length / ROWS_PER_PAGE);
  const paginated = useMemo(
    () => sorted.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE),
    [sorted, page]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {t("organizationTable.title")}
              <Badge variant="secondary">{organizations.length}</Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              {t("organizationTable.description")}
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse table" : "Expand table"}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("organizationTable.search")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-9"
              aria-label={t("organizationTable.search")}
            />
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">
                    <SortableHeader activeField={sortField} sortDirection={sortDir} onSort={toggleSort} field="name">
                      {t("organizationTable.organization")}
                    </SortableHeader>
                  </TableHead>
                  <TableHead scope="col">
                    <SortableHeader activeField={sortField} sortDirection={sortDir} onSort={toggleSort} field="country">
                      {t("organizationTable.country")}
                    </SortableHeader>
                  </TableHead>
                  <TableHead scope="col">
                    <SortableHeader activeField={sortField} sortDirection={sortDir} onSort={toggleSort} field="region">
                      {t("regional.region")}
                    </SortableHeader>
                  </TableHead>
                  <TableHead scope="col">
                    <SortableHeader activeField={sortField} sortDirection={sortDir} onSort={toggleSort} field="status">
                      {t("organizationTable.status")}
                    </SortableHeader>
                  </TableHead>
                  <TableHead scope="col">
                    <SortableHeader activeField={sortField} sortDirection={sortDir} onSort={toggleSort} field="smsMaturity">
                      {t("organizationTable.smsMaturity")}
                    </SortableHeader>
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    <SortableHeader activeField={sortField} sortDirection={sortDir} onSort={toggleSort} field="eiScore">
                      {t("organizationTable.eiScore")}
                    </SortableHeader>
                  </TableHead>
                  <TableHead scope="col" className="text-center">
                    <SortableHeader activeField={sortField} sortDirection={sortDir} onSort={toggleSort} field="reviewCount">
                      {t("organizationTable.reviews")}
                    </SortableHeader>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t("empty.title")}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((org) => {
                    const name = locale === "fr" ? org.nameFr : org.nameEn;
                    const maturity = org.latestSMSMaturity;

                    return (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell>{org.country}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {org.region}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {org.participationStatus === "ACTIVE" ||
                          org.participationStatus === "APPROVED" ? (
                            <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              {t("organizationTable.joined")}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs text-muted-foreground"
                            >
                              {t("organizationTable.notJoined")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {maturity ? (
                            <Badge
                              className={cn(
                                "text-xs font-mono",
                                MATURITY_BG[maturity] || ""
                              )}
                            >
                              {maturity}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {t("organizationTable.noAssessment")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {org.latestEIScore !== null &&
                          org.latestEIScore !== undefined ? (
                            <span
                              className={cn(
                                "text-sm font-medium",
                                org.latestEIScore >= 80
                                  ? "text-green-600"
                                  : org.latestEIScore >= 60
                                    ? "text-amber-600"
                                    : "text-red-600"
                              )}
                            >
                              {org.latestEIScore.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {org.reviewCount > 0 ? (
                            <Badge variant="secondary" className="text-xs">
                              {org.reviewCount}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {page * ROWS_PER_PAGE + 1}–
                {Math.min((page + 1) * ROWS_PER_PAGE, sorted.length)}{" "}
                / {sorted.length}
              </span>
              <div className="flex gap-2" role="navigation" aria-label="Pagination">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 text-xs rounded-md border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  ←
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 text-xs rounded-md border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function AbujaTarget15Skeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <Skeleton className="h-48 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <Skeleton className="h-56 w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState({ t }: { t: (key: string) => string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-16 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <FileSearch className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">{t("empty.title")}</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
          {t("empty.description")}
        </p>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AbujaTarget15Tab({ locale }: AbujaTarget15TabProps) {
  const t = useTranslations("analytics");
  const at = (key: string) => t(`programmeIntelligence.abujaTarget15.${key}`);

  const nf = useNumberFormatter(locale);

  const { data, isLoading } = trpc.intelligence.getAbujaTarget15.useQuery(
    undefined,
    { refetchOnWindowFocus: false }
  );

  // Build timeline milestones
  const milestones = useMemo((): MilestoneData[] => {
    if (!data) return [];
    const now = new Date();
    const toStatus = (dateStr: string): "past" | "current" | "future" => {
      const d = new Date(dateStr);
      if (d < now) return "past";
      // "current" = the next upcoming milestone
      return "future";
    };

    const items: MilestoneData[] = [
      {
        id: "ast151",
        label: "AST 15.1",
        date: data.ast151?.targetDate || "2024-12-31",
        status: toStatus(data.ast151?.targetDate || "2024-12-31"),
        achievement: data.ast151?.kpi01?.percentage ?? 0,
      },
      {
        id: "ast152a",
        label: "AST 15.2 (50%)",
        date: data.ast152?.milestone2025?.targetDate || "2025-12-31",
        status: toStatus(data.ast152?.milestone2025?.targetDate || "2025-12-31"),
        achievement: data.ast152?.milestone2025?.percentage ?? 0,
      },
      {
        id: "ast152b",
        label: "AST 15.2 (100%)",
        date: data.ast152?.milestone2028?.targetDate || "2028-12-31",
        status: toStatus(data.ast152?.milestone2028?.targetDate || "2028-12-31"),
        achievement: data.ast152?.milestone2028?.percentage ?? 0,
      },
      {
        id: "ast153",
        label: "AST 15.3",
        date: data.ast153?.targetDate || "2036-12-31",
        status: toStatus(data.ast153?.targetDate || "2036-12-31"),
        achievement: 0,
      },
    ];

    // Mark the first "future" as "current"
    const firstFuture = items.findIndex((m) => m.status === "future");
    if (firstFuture >= 0) {
      items[firstFuture].status = "current";
    }

    return items;
  }, [data]);

  // Calculate overall progress (weighted average of the 3 sub-targets)
  const overallProgress = useMemo(() => {
    if (!data) return 0;
    const p1 = data.ast151?.kpi01?.percentage ?? 0;
    const p2 = data.ast152?.milestone2025?.percentage ?? 0;
    const p3high = data.ast153?.readinessLevels
      ? ((data.ast153.readinessLevels.high + data.ast153.readinessLevels.medium) /
          Math.max(
            1,
            data.ast153.readinessLevels.high +
              data.ast153.readinessLevels.medium +
              data.ast153.readinessLevels.low +
              data.ast153.readinessLevels.notStarted
          )) *
        100
      : 0;
    // Weighted: 30% participation, 40% maturity, 30% readiness
    return p1 * 0.3 + p2 * 0.4 + p3high * 0.3;
  }, [data]);

  if (isLoading) {
    return <AbujaTarget15Skeleton />;
  }

  if (!data) {
    return <EmptyState t={at} />;
  }

  const isEmpty =
    (data.registeredANSPs ?? 0) === 0 &&
    (data.organizationDetails || []).length === 0;

  if (isEmpty) {
    return <EmptyState t={at} />;
  }

  return (
    <div className="space-y-8">
      {/* 1. Header Banner */}
      <HeaderBanner overallProgress={overallProgress} t={at} />

      {/* 2. Timeline */}
      {milestones.length > 0 && (
        <TimelineSection milestones={milestones} t={at} />
      )}

      {/* 3. AST 15.1 — Programme Participation */}
      {data.ast151 && (
        <AST151Section
          data={data.ast151}
          t={at}
          nf={nf}
        />
      )}

      {/* 4. AST 15.2 — SMS Maturity */}
      {data.ast152 && (
        <AST152Section
          data={data.ast152}
          registeredANSPs={data.registeredANSPs ?? 0}
          t={at}
          nf={nf}
        />
      )}

      {/* 5. AST 15.3 — Certification Readiness */}
      {data.ast153 && <AST153Section data={data.ast153} t={at} />}

      {/* 6. Organization Detail Table */}
      <OrganizationDetailTable
        organizations={data.organizationDetails || []}
        locale={locale}
        t={at}
      />
    </div>
  );
}

export default AbujaTarget15Tab;
