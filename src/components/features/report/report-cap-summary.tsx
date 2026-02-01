"use client";

/**
 * Report CAP Summary Component
 *
 * Displays CAP statistics, progress, and overdue items.
 */

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { format, differenceInDays } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CAPStatus } from "@/types/prisma-enums";

// =============================================================================
// TYPES
// =============================================================================

interface CAPData {
  id: string;
  findingRef: string;
  status: CAPStatus;
  dueDate: Date;
  isOverdue: boolean;
  completedAt: Date | null;
  verifiedAt: Date | null;
}

interface CAPsData {
  total: number;
  byStatus: Record<CAPStatus, number>;
  overdueCount: number;
  completionRate: number;
  caps: CAPData[];
}

interface ReportCAPSummaryProps {
  caps: CAPsData;
  onViewCAP?: (findingRef: string) => void;
  className?: string;
}

// =============================================================================
// STATUS CONFIGURATION
// =============================================================================

const STATUS_CONFIG: Record<CAPStatus, { color: string; bgColor: string }> = {
  DRAFT: {
    color: "text-slate-600",
    bgColor: "bg-slate-100 dark:bg-slate-800",
  },
  SUBMITTED: {
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  UNDER_REVIEW: {
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  ACCEPTED: {
    color: "text-indigo-600",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
  },
  REJECTED: {
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  IN_PROGRESS: {
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  COMPLETED: {
    color: "text-teal-600",
    bgColor: "bg-teal-100 dark:bg-teal-900/30",
  },
  VERIFIED: {
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  CLOSED: {
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
};

// Status groups for summary
const STATUS_GROUPS = {
  pending: ["DRAFT", "SUBMITTED", "UNDER_REVIEW"] as CAPStatus[],
  inProgress: ["ACCEPTED", "IN_PROGRESS"] as CAPStatus[],
  completed: ["COMPLETED", "VERIFIED", "CLOSED"] as CAPStatus[],
  rejected: ["REJECTED"] as CAPStatus[],
};

// =============================================================================
// STATS CARD
// =============================================================================

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-lg", bgColor)}>
      <Icon className={cn("h-5 w-5", color)} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-bold", color)}>{value}</p>
      </div>
    </div>
  );
}

// =============================================================================
// STATUS BREAKDOWN
// =============================================================================

function StatusBreakdown({
  byStatus,
  total,
}: {
  byStatus: Record<CAPStatus, number>;
  total: number;
}) {
  const t = useTranslations("cap.status");

  const statuses = Object.entries(byStatus).filter(([, count]) => count > 0);

  if (statuses.length === 0) return null;

  return (
    <div className="space-y-2">
      {statuses.map(([status, count]) => {
        const config = STATUS_CONFIG[status as CAPStatus];
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

        return (
          <div key={status} className="flex items-center gap-2">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className={config.color}>{t(status)}</span>
                <span className="text-muted-foreground">
                  {count} ({percentage}%)
                </span>
              </div>
              <Progress value={percentage} className="h-1.5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// OVERDUE TABLE
// =============================================================================

function OverdueTable({
  caps,
  locale,
  onViewCAP,
}: {
  caps: CAPData[];
  locale: string;
  onViewCAP?: (findingRef: string) => void;
}) {
  const t = useTranslations("report.caps");
  const tStatus = useTranslations("cap.status");
  const dateLocale = locale === "fr" ? fr : enUS;

  const overdueCaps = useMemo(() => {
    return caps
      .filter((cap) => cap.isOverdue)
      .sort((a, b) => {
        const daysA = differenceInDays(new Date(), new Date(a.dueDate));
        const daysB = differenceInDays(new Date(), new Date(b.dueDate));
        return daysB - daysA;
      });
  }, [caps]);

  if (overdueCaps.length === 0) {
    return (
      <div className="flex items-center justify-center p-6 text-center border rounded-lg bg-green-50 dark:bg-green-900/10">
        <div>
          <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-green-700 dark:text-green-400 font-medium">
            {t("noOverdueCAPs")}
          </p>
          <p className="text-sm text-muted-foreground">{t("allOnTrack")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden border-amber-200 dark:border-amber-800">
      <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-2 border-b border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">
            {t("overdueCAPs")} ({overdueCaps.length})
          </span>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">{t("finding")}</TableHead>
            <TableHead className="w-[120px]">{t("status")}</TableHead>
            <TableHead className="w-[120px]">{t("dueDate")}</TableHead>
            <TableHead className="w-[100px]">{t("daysOverdue")}</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {overdueCaps.map((cap) => {
            const daysOverdue = differenceInDays(new Date(), new Date(cap.dueDate));
            const statusConfig = STATUS_CONFIG[cap.status];

            return (
              <TableRow key={cap.id} className="bg-amber-50/50 dark:bg-amber-900/10">
                <TableCell className="font-mono text-sm">
                  {cap.findingRef}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusConfig.bgColor}>
                    <span className={statusConfig.color}>
                      {tStatus(cap.status)}
                    </span>
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(cap.dueDate), "dd MMM yyyy", { locale: dateLocale })}
                </TableCell>
                <TableCell>
                  <Badge variant="destructive" className="font-mono">
                    +{daysOverdue}d
                  </Badge>
                </TableCell>
                <TableCell>
                  {onViewCAP && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onViewCAP(cap.findingRef)}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ReportCAPSummary({
  caps,
  onViewCAP,
  className,
}: ReportCAPSummaryProps) {
  const t = useTranslations("report.caps");
  const locale = useLocale();

  // Calculate group counts
  const pendingCount = STATUS_GROUPS.pending.reduce(
    (sum, status) => sum + (caps.byStatus[status] || 0),
    0
  );
  const inProgressCount = STATUS_GROUPS.inProgress.reduce(
    (sum, status) => sum + (caps.byStatus[status] || 0),
    0
  );
  const completedCount = STATUS_GROUPS.completed.reduce(
    (sum, status) => sum + (caps.byStatus[status] || 0),
    0
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <Badge variant="secondary">{caps.total} {t("totalCAPs")}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label={t("pending")}
            value={pendingCount}
            icon={Clock}
            color="text-amber-600"
            bgColor="bg-amber-100 dark:bg-amber-900/30"
          />
          <StatCard
            label={t("inProgress")}
            value={inProgressCount}
            icon={ArrowRight}
            color="text-blue-600"
            bgColor="bg-blue-100 dark:bg-blue-900/30"
          />
          <StatCard
            label={t("completed")}
            value={completedCount}
            icon={CheckCircle2}
            color="text-green-600"
            bgColor="bg-green-100 dark:bg-green-900/30"
          />
          <StatCard
            label={t("overdue")}
            value={caps.overdueCount}
            icon={AlertTriangle}
            color={caps.overdueCount > 0 ? "text-red-600" : "text-green-600"}
            bgColor={
              caps.overdueCount > 0
                ? "bg-red-100 dark:bg-red-900/30"
                : "bg-green-100 dark:bg-green-900/30"
            }
          />
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("completionProgress")}</span>
            <span className="font-medium">{caps.completionRate}%</span>
          </div>
          <Progress value={caps.completionRate} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>
              {completedCount} / {caps.total} {t("closed")}
            </span>
            <span>100%</span>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">{t("statusBreakdown")}</h4>
          <StatusBreakdown byStatus={caps.byStatus} total={caps.total} />
        </div>

        {/* Overdue CAPs Table */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">{t("overdueItems")}</h4>
          <OverdueTable caps={caps.caps} locale={locale} onViewCAP={onViewCAP} />
        </div>
      </CardContent>
    </Card>
  );
}

export default ReportCAPSummary;
