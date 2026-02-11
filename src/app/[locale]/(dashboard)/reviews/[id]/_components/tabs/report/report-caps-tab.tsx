"use client";

/**
 * Report CAPs Tab
 *
 * Professional corrective action plan tracking with:
 * - Overview stat cards (total, submitted, accepted, completed, overdue)
 * - Completion progress bar
 * - Visual status distribution
 * - CAP detail table with overdue highlighting and days remaining
 *
 * Data sourced from ReportContent.sections.correctiveActions.
 */

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReportContent, CAPSummary } from "@/types/report";

// =============================================================================
// CONSTANTS
// =============================================================================

const CAP_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-indigo-100 text-indigo-700",
  REJECTED: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  IMPLEMENTED: "bg-teal-100 text-teal-700",
  VERIFIED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-green-100 text-green-700",
};

const CAP_STATUS_ORDER = [
  "DRAFT",
  "SUBMITTED",
  "ACCEPTED",
  "REJECTED",
  "IN_PROGRESS",
  "IMPLEMENTED",
  "VERIFIED",
  "CLOSED",
];

/** Calculate days remaining from today to a due date. Negative = overdue. */
function getDaysRemaining(dueDate: string): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Check if a CAP is in a terminal (completed) status */
function isTerminalStatus(status: string): boolean {
  return ["IMPLEMENTED", "VERIFIED", "CLOSED"].includes(status);
}

// =============================================================================
// STAT CARD
// =============================================================================

function StatCard({
  label,
  value,
  icon,
  warning,
  highlight,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  warning?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg",
        warning
          ? "bg-red-100 dark:bg-red-900/30"
          : highlight
          ? "bg-blue-100 dark:bg-blue-900/30"
          : "bg-muted/30"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p
        className={cn(
          "text-2xl font-bold",
          warning ? "text-red-600" : highlight ? "text-blue-600" : ""
        )}
      >
        {value}
      </p>
    </div>
  );
}

// =============================================================================
// STATUS DISTRIBUTION BAR
// =============================================================================

function StatusDistribution({ caps }: { caps: CAPSummary[] }) {
  const t = useTranslations("report.caps");

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cap of caps) {
      counts[cap.status] = (counts[cap.status] || 0) + 1;
    }
    return counts;
  }, [caps]);

  if (caps.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("statusBreakdown")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stacked bar */}
        <div className="flex h-6 rounded-full overflow-hidden">
          {CAP_STATUS_ORDER.filter((s) => statusCounts[s]).map((status) => {
            const count = statusCounts[status] || 0;
            const pct = (count / caps.length) * 100;
            return (
              <div
                key={status}
                className={cn("h-full transition-all", CAP_STATUS_STYLES[status])}
                style={{ width: `${pct}%` }}
                title={`${status.replace(/_/g, " ")}: ${count}`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {CAP_STATUS_ORDER.filter((s) => statusCounts[s]).map((status) => (
            <div key={status} className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={cn("text-xs", CAP_STATUS_STYLES[status])}
              >
                {status.replace(/_/g, " ")}
              </Badge>
              <span className="text-sm font-medium">{statusCounts[status]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ReportCAPsTab({ content }: { content: ReportContent }) {
  const t = useTranslations("report.caps");
  const caps = content.sections.correctiveActions;

  // Enrich caps with days remaining
  const enrichedCaps = useMemo(() => {
    return caps.caps.map((cap) => ({
      ...cap,
      daysRemaining: getDaysRemaining(cap.dueDate),
      isOverdue:
        !isTerminalStatus(cap.status) &&
        getDaysRemaining(cap.dueDate) !== null &&
        (getDaysRemaining(cap.dueDate) ?? 0) < 0,
    }));
  }, [caps.caps]);

  // Count completed for stat card
  const completedCount = useMemo(
    () => caps.caps.filter((c) => isTerminalStatus(c.status)).length,
    [caps.caps]
  );

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label={t("total")}
          value={caps.totalCAPs}
          icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          label={t("submitted")}
          value={caps.submitted}
          icon={<Clock className="h-4 w-4 text-blue-500" />}
        />
        <StatCard
          label={t("accepted")}
          value={caps.accepted}
          icon={<CheckCircle2 className="h-4 w-4 text-indigo-500" />}
        />
        <StatCard
          label={t("completed")}
          value={completedCount}
          icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
          highlight
        />
        <StatCard
          label={t("overdue")}
          value={caps.overdue}
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          warning={caps.overdue > 0}
        />
      </div>

      {/* Completion Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">{t("completionProgress")}</span>
            <span className="font-semibold">{caps.completionRate}%</span>
          </div>
          <Progress value={caps.completionRate} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {completedCount} / {caps.totalCAPs} {t("totalCAPs")}
          </p>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <StatusDistribution caps={caps.caps} />

      {/* CAPs Detail Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {t("title")}
            <Badge variant="secondary">{caps.totalCAPs}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enrichedCaps.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t("noCAPs")}
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">{t("reference")}</TableHead>
                    <TableHead className="w-[110px]">{t("finding")}</TableHead>
                    <TableHead>{t("rootCause")}</TableHead>
                    <TableHead>{t("correctiveAction")}</TableHead>
                    <TableHead className="w-[110px]">{t("dueDate")}</TableHead>
                    <TableHead className="w-[110px]">{t("capStatus")}</TableHead>
                    <TableHead className="w-[100px] text-right">{t("daysRemaining")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrichedCaps.map((cap) => (
                    <TableRow
                      key={cap.reference}
                      className={cn(
                        cap.isOverdue && "bg-red-50 dark:bg-red-900/10 hover:bg-red-100/70 dark:hover:bg-red-900/20"
                      )}
                    >
                      <TableCell className="font-mono text-sm">
                        {cap.reference}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {cap.findingReference}
                      </TableCell>
                      <TableCell>
                        <span
                          className="truncate block max-w-[180px]"
                          title={cap.rootCause}
                        >
                          {cap.rootCause || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="truncate block max-w-[200px]"
                          title={cap.correctiveAction}
                        >
                          {cap.correctiveAction}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {cap.dueDate || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", CAP_STATUS_STYLES[cap.status] || "")}
                        >
                          {cap.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {cap.daysRemaining !== null ? (
                          isTerminalStatus(cap.status) ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                          ) : cap.isOverdue ? (
                            <div className="flex items-center justify-end gap-1 text-red-600">
                              <XCircle className="h-4 w-4" />
                              <span className="text-xs font-medium">
                                {Math.abs(cap.daysRemaining)}d
                              </span>
                            </div>
                          ) : (
                            <span
                              className={cn(
                                "text-xs font-medium",
                                cap.daysRemaining <= 7
                                  ? "text-amber-600"
                                  : "text-muted-foreground"
                              )}
                            >
                              {cap.daysRemaining}d
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Overdue summary */}
          {caps.overdue > 0 && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {caps.overdue} {t("overdueCAPs")}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
