"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

// =============================================================================
// TYPES
// =============================================================================

interface BenchmarkingTabProps {
  selectedTeamId: string | null;
  anonymized: boolean;
}

type SortField = "eiScore" | "smsMaturity" | "capClosure";
type SortDir = "asc" | "desc";

// =============================================================================
// HELPERS
// =============================================================================

function eiBarColor(score: number): string {
  if (score >= 80) return "bg-blue-500";
  if (score >= 65) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  if (score >= 35) return "bg-orange-500";
  return "bg-red-500";
}

function smsBarColor(score: number): string {
  if (score >= 4) return "bg-blue-500";
  if (score >= 3) return "bg-green-500";
  if (score >= 2) return "bg-yellow-500";
  if (score >= 1.5) return "bg-orange-500";
  return "bg-red-500";
}

function capBarColor(rate: number): string {
  if (rate >= 80) return "bg-green-500";
  if (rate >= 60) return "bg-yellow-500";
  if (rate >= 40) return "bg-orange-500";
  return "bg-red-500";
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BenchmarkingTab({
  selectedTeamId,
  anonymized,
}: BenchmarkingTabProps) {
  const t = useTranslations("safetyIntelligence");

  const [sortField, setSortField] = useState<SortField>("eiScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: records, isLoading } =
    trpc.safetyIntelligence.getANSPPerformance.useQuery({
      teamId: selectedTeamId,
    });

  // Compute programme averages
  const averages = useMemo(() => {
    if (!records || records.length === 0) return null;

    const eiScores = records
      .map((r) => r.latestEIScore)
      .filter((s): s is number => s !== null);
    const smsScores = records
      .map((r) => r.latestSMSMaturity)
      .filter((s): s is number => s !== null);
    const capRates = records
      .map((r) => r.capClosureRate)
      .filter((r): r is number => r !== null);

    return {
      ei:
        eiScores.length > 0
          ? eiScores.reduce((a, b) => a + b, 0) / eiScores.length
          : null,
      sms:
        smsScores.length > 0
          ? smsScores.reduce((a, b) => a + b, 0) / smsScores.length
          : null,
      cap:
        capRates.length > 0
          ? capRates.reduce((a, b) => a + b, 0) / capRates.length
          : null,
    };
  }, [records]);

  // Sort records
  const sorted = useMemo(() => {
    if (!records) return [];
    const copy = [...records];
    copy.sort((a, b) => {
      let aVal: number;
      let bVal: number;
      switch (sortField) {
        case "eiScore":
          aVal = a.latestEIScore ?? -1;
          bVal = b.latestEIScore ?? -1;
          break;
        case "smsMaturity":
          aVal = a.latestSMSMaturity ?? -1;
          bVal = b.latestSMSMaturity ?? -1;
          break;
        case "capClosure":
          aVal = a.capClosureRate ?? -1;
          bVal = b.capClosureRate ?? -1;
          break;
      }
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });
    return copy;
  }, [records, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle>{t("benchmarking.sortBy")}</CardTitle>
          <div className="flex items-center gap-1">
            {(["eiScore", "smsMaturity", "capClosure"] as SortField[]).map(
              (field) => (
                <Button
                  key={field}
                  variant={sortField === field ? "default" : "outline"}
                  size="sm"
                  className="text-xs rounded-full px-3 h-7"
                  onClick={() => toggleSort(field)}
                >
                  {t(`benchmarking.${field}`)}
                  {sortField === field &&
                    (sortDir === "desc" ? (
                      <ChevronDown className="h-3 w-3 ml-1" />
                    ) : (
                      <ChevronUp className="h-3 w-3 ml-1" />
                    ))}
                </Button>
              )
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">
                  {t("benchmarking.rank")}
                </TableHead>
                <TableHead>{t("benchmarking.ansp")}</TableHead>
                <TableHead className="text-center">
                  {t("benchmarking.team")}
                </TableHead>
                <TableHead className="min-w-[160px]">
                  <button
                    onClick={() => toggleSort("eiScore")}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    {t("benchmarking.eiScore")}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="min-w-[140px]">
                  <button
                    onClick={() => toggleSort("smsMaturity")}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    {t("benchmarking.smsMaturity")}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  {t("benchmarking.findings")}
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <button
                    onClick={() => toggleSort("capClosure")}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    {t("benchmarking.capClosure")}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  {t("benchmarking.trend")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((record, index) => {
                const aboveAvgEI =
                  averages?.ei !== null &&
                  averages?.ei !== undefined &&
                  record.latestEIScore !== null &&
                  record.latestEIScore >= averages.ei;

                return (
                  <TableRow key={record.organizationId}>
                    {/* Rank */}
                    <TableCell className="text-center font-mono text-sm">
                      {index + 1}
                    </TableCell>

                    {/* ANSP Name */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {anonymized
                            ? `ANSP-${String(index + 1).padStart(2, "0")}`
                            : record.organizationCode ?? record.nameEn}
                        </span>
                        {aboveAvgEI && (
                          <span
                            className="text-green-600 text-xs"
                            title={t("benchmarking.aboveAverage")}
                          >
                            ▲
                          </span>
                        )}
                      </div>
                      {!anonymized && (
                        <p className="text-xs text-muted-foreground">
                          {record.country}
                        </p>
                      )}
                    </TableCell>

                    {/* Team */}
                    <TableCell className="text-center">
                      {record.teamNumber !== null ? (
                        <Badge variant="outline" className="text-xs">
                          {record.teamNumber}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    {/* EI Score */}
                    <TableCell>
                      <ScoreBar
                        value={record.latestEIScore}
                        max={100}
                        format={(v) => `${v.toFixed(1)}%`}
                        colorFn={eiBarColor}
                      />
                    </TableCell>

                    {/* SMS Maturity */}
                    <TableCell>
                      <ScoreBar
                        value={record.latestSMSMaturity}
                        max={5}
                        format={(v) => v.toFixed(1)}
                        colorFn={smsBarColor}
                      />
                    </TableCell>

                    {/* Findings */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-sm font-medium">
                          {record.totalFindings}
                        </span>
                        {record.criticalFindings > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0 bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
                          >
                            {record.criticalFindings} crit
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* CAP Closure */}
                    <TableCell>
                      <ScoreBar
                        value={record.capClosureRate}
                        max={100}
                        format={(v) => `${v.toFixed(0)}%`}
                        colorFn={capBarColor}
                      />
                    </TableCell>

                    {/* Trend */}
                    <TableCell className="text-center">
                      <TrendIndicator value={record.eiTrend} />
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Programme Average Footer */}
              {averages && (
                <TableRow className="border-t-2 bg-muted/50 font-medium">
                  <TableCell />
                  <TableCell className="text-sm">
                    {t("benchmarking.programmeAverage")}
                  </TableCell>
                  <TableCell />
                  <TableCell>
                    <ScoreBar
                      value={averages.ei}
                      max={100}
                      format={(v) => `${v.toFixed(1)}%`}
                      colorFn={eiBarColor}
                    />
                  </TableCell>
                  <TableCell>
                    <ScoreBar
                      value={averages.sms}
                      max={5}
                      format={(v) => v.toFixed(1)}
                      colorFn={smsBarColor}
                    />
                  </TableCell>
                  <TableCell />
                  <TableCell>
                    <ScoreBar
                      value={averages.cap}
                      max={100}
                      format={(v) => `${v.toFixed(0)}%`}
                      colorFn={capBarColor}
                    />
                  </TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SCORE BAR — inline bar with value label
// =============================================================================

interface ScoreBarProps {
  value: number | null;
  max: number;
  format: (v: number) => string;
  colorFn: (v: number) => string;
}

function ScoreBar({ value, max, format, colorFn }: ScoreBarProps) {
  if (value === null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const pct = Math.min((value / max) * 100, 100);

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden min-w-[60px]">
        <div
          className={cn("h-full rounded-full transition-all", colorFn(value))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums w-12 text-right">
        {format(value)}
      </span>
    </div>
  );
}

// =============================================================================
// TREND INDICATOR
// =============================================================================

function TrendIndicator({ value }: { value: number | null }) {
  if (value === null) {
    return <Minus className="h-4 w-4 mx-auto text-muted-foreground" />;
  }

  if (value > 0) {
    return (
      <div className="flex items-center justify-center gap-0.5 text-green-600">
        <TrendingUp className="h-4 w-4" />
        <span className="text-xs font-medium">+{value.toFixed(1)}</span>
      </div>
    );
  }

  if (value < 0) {
    return (
      <div className="flex items-center justify-center gap-0.5 text-red-600">
        <TrendingDown className="h-4 w-4" />
        <span className="text-xs font-medium">{value.toFixed(1)}</span>
      </div>
    );
  }

  return <Minus className="h-4 w-4 mx-auto text-muted-foreground" />;
}
