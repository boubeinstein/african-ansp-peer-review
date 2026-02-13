"use client";

/**
 * My Action Items Widget
 *
 * Surfaces pending findings and CAPs requiring user attention directly
 * on the dashboard. Each item links into its review context for quick
 * action — ensuring users don't need standalone /findings or /caps pages.
 */

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ClipboardList,
  ExternalLink,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface ActionItemsWidgetProps {
  locale: string;
  className?: string;
}

// =============================================================================
// SEVERITY/STATUS BADGE HELPERS
// =============================================================================

function severityColor(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "MAJOR":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "MINOR":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
  }
}

function isOverdue(dateStr: string | Date | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

// =============================================================================
// SKELETON
// =============================================================================

function ActionItemsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ActionItemsWidget({
  locale,
  className,
}: ActionItemsWidgetProps) {
  const t = useTranslations("dashboard.actionItems");
  const currentLocale = useLocale();

  // Fetch open/in-progress findings (limited to 5 most recent)
  const { data: findingsData, isLoading: findingsLoading } =
    trpc.finding.list.useQuery({
      status: "OPEN",
      pageSize: 5,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

  // Fetch active CAPs (not yet closed/verified)
  const { data: capsData, isLoading: capsLoading } =
    trpc.cap.list.useQuery({
      status: "SUBMITTED",
      pageSize: 5,
      sortBy: "dueDate",
      sortOrder: "asc",
    });

  // Also fetch overdue CAPs
  const { data: overdueData, isLoading: overdueLoading } =
    trpc.cap.list.useQuery({
      overdue: true,
      pageSize: 5,
      sortBy: "dueDate",
      sortOrder: "asc",
    });

  const isLoading = findingsLoading || capsLoading || overdueLoading;

  if (isLoading) {
    return <ActionItemsSkeleton />;
  }

  const findings = findingsData?.findings ?? [];
  const caps = capsData?.caps ?? [];
  const overdueCaps = overdueData?.caps ?? [];
  const totalFindings = findingsData?.pagination?.total ?? 0;
  const totalCaps = (capsData?.pagination?.total ?? 0) + (overdueData?.pagination?.total ?? 0);

  // Combine and check if there are any items
  const hasItems = findings.length > 0 || caps.length > 0 || overdueCaps.length > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasItems ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-center">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <p className="text-sm text-muted-foreground">{t("noItems")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overdue CAPs — highest priority */}
            {overdueCaps.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    {t("overdue")}
                  </span>
                  <Badge variant="destructive" className="text-xs">
                    {overdueCaps.length}
                  </Badge>
                </div>
                {overdueCaps.map((cap) => (
                  <ActionItemRow
                    key={`cap-overdue-${cap.id}`}
                    type="cap"
                    title={
                      currentLocale === "fr"
                        ? cap.finding.titleFr || cap.finding.titleEn
                        : cap.finding.titleEn
                    }
                    reference={cap.finding.referenceNumber}
                    severity={cap.finding.severity}
                    reviewId={cap.finding.review?.id}

                    locale={locale}
                    overdue
                    dueDate={cap.dueDate}
                  />
                ))}
              </div>
            )}

            {/* Open Findings */}
            {findings.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">
                    {t("findingsCount", { count: totalFindings })}
                  </span>
                </div>
                {findings.map((finding) => (
                  <ActionItemRow
                    key={`finding-${finding.id}`}
                    type="finding"
                    title={
                      currentLocale === "fr"
                        ? (finding as { titleFr?: string }).titleFr || (finding as { titleEn: string }).titleEn
                        : (finding as { titleEn: string }).titleEn
                    }
                    reference={finding.referenceNumber}
                    severity={finding.severity}
                    reviewId={finding.review?.id}

                    locale={locale}
                    dueDate={(finding as { targetCloseDate?: string | Date | null }).targetCloseDate}
                  />
                ))}
              </div>
            )}

            {/* Active CAPs */}
            {caps.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">
                    {t("capsCount", { count: totalCaps })}
                  </span>
                </div>
                {caps.map((cap) => (
                  <ActionItemRow
                    key={`cap-${cap.id}`}
                    type="cap"
                    title={
                      currentLocale === "fr"
                        ? cap.finding.titleFr || cap.finding.titleEn
                        : cap.finding.titleEn
                    }
                    reference={cap.finding.referenceNumber}
                    severity={cap.finding.severity}
                    reviewId={cap.finding.review?.id}

                    locale={locale}
                    dueDate={cap.dueDate}
                  />
                ))}
              </div>
            )}

            {/* View all link */}
            {(totalFindings > 5 || totalCaps > 5) && (
              <div className="flex gap-2 pt-2">
                {totalFindings > 5 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/${locale}/findings`}>
                      {t("viewAllFindings")}
                    </Link>
                  </Button>
                )}
                {totalCaps > 5 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/${locale}/caps`}>
                      {t("viewAllCAPs")}
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// ACTION ITEM ROW
// =============================================================================

interface ActionItemRowProps {
  type: "finding" | "cap";
  title: string;
  reference: string | null;
  severity: string;
  reviewId?: string;
  locale: string;
  overdue?: boolean;
  dueDate?: string | Date | null;
}

function ActionItemRow({
  type,
  title,
  reference,
  severity,
  reviewId,
  locale,
  overdue,
  dueDate,
}: ActionItemRowProps) {
  const t = useTranslations("dashboard.actionItems");

  // Link into the review context if available, otherwise to standalone page
  const href = reviewId
    ? `/${locale}/reviews/${reviewId}?tab=${type === "finding" ? "findings" : "caps"}`
    : `/${locale}/${type === "finding" ? "findings" : "caps"}`;

  // Capture current time once (stable across re-renders)
  const [now] = useState(() => Date.now());
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const dueSoon =
    !overdue && dueDate && !isOverdue(dueDate) &&
    new Date(dueDate).getTime() - now < sevenDaysMs;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between rounded-lg border p-3",
        "hover:bg-muted/50 hover:border-primary/30 transition-all group",
        overdue && "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Badge
          variant="outline"
          className={cn("shrink-0 text-xs", severityColor(severity))}
        >
          {severity}
        </Badge>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {title || reference || "—"}
          </p>
          <div className="flex items-center gap-2">
            {reference && (
              <span className="text-xs text-muted-foreground">{reference}</span>
            )}
            {overdue && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {t("overdue")}
              </Badge>
            )}
            {dueSoon && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600">
                {t("dueSoon")}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
    </Link>
  );
}

export default ActionItemsWidget;
