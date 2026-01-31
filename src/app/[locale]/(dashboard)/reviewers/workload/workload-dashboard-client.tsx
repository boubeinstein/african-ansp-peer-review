"use client";

/**
 * Reviewer Workload Dashboard
 *
 * Displays workload metrics for all reviewers to:
 * - Prevent reviewer burnout
 * - Enable fair assignment distribution
 * - Support capacity planning
 */

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Briefcase,
  TrendingUp,
  CalendarDays,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// =============================================================================
// TYPES
// =============================================================================

type WorkloadIndicator = "available" | "moderate" | "overloaded";
type FilterType = "all" | "available" | "moderate" | "overloaded";

interface WorkloadDashboardClientProps {
  locale: string;
}

// =============================================================================
// WORKLOAD INDICATOR COMPONENT
// =============================================================================

function WorkloadIndicatorBadge({
  indicator,
  size = "default",
}: {
  indicator: WorkloadIndicator;
  size?: "default" | "sm";
}) {
  const t = useTranslations("reviewers.workload.indicators");

  const config = {
    available: {
      label: t("available"),
      icon: CheckCircle2,
      variant: "success" as const,
      emoji: "🟢",
    },
    moderate: {
      label: t("moderate"),
      icon: MinusCircle,
      variant: "warning" as const,
      emoji: "🟡",
    },
    overloaded: {
      label: t("overloaded"),
      icon: AlertTriangle,
      variant: "destructive" as const,
      emoji: "🔴",
    },
  };

  const { label, icon: Icon, variant, emoji } = config[indicator];

  return (
    <Badge variant={variant} className={cn(size === "sm" && "text-xs px-1.5")}>
      <span className="mr-1">{emoji}</span>
      {size !== "sm" && <Icon className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );
}

// =============================================================================
// SUMMARY CARDS
// =============================================================================

interface SummaryCardsProps {
  summary: {
    totalReviewers: number;
    available: number;
    moderate: number;
    overloaded: number;
    totalActiveAssignments: number;
    totalUpcoming30Days: number;
    averageHistoricalReviews: number;
  };
}

function SummaryCards({ summary }: SummaryCardsProps) {
  const t = useTranslations("reviewers.workload.summary");

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {t("totalReviewers")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-2xl font-bold">{summary.totalReviewers}</span>
        </CardContent>
      </Card>

      <Card className="border-green-200 dark:border-green-800">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1">
            <span>🟢</span>
            {t("available")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-2xl font-bold text-green-600">
            {summary.available}
          </span>
        </CardContent>
      </Card>

      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1">
            <span>🟡</span>
            {t("moderate")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-2xl font-bold text-amber-600">
            {summary.moderate}
          </span>
        </CardContent>
      </Card>

      <Card className="border-red-200 dark:border-red-800">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1">
            <span>🔴</span>
            {t("overloaded")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-2xl font-bold text-red-600">
            {summary.overloaded}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1">
            <Briefcase className="h-4 w-4" />
            {t("activeAssignments")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-2xl font-bold">
            {summary.totalActiveAssignments}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            {t("upcoming30Days")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-2xl font-bold">{summary.totalUpcoming30Days}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            {t("avgReviews12m")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-2xl font-bold">
            {summary.averageHistoricalReviews}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// REVIEWER ROW
// =============================================================================

interface ReviewerRowProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  locale: string;
}

function ReviewerRow({ data, locale }: ReviewerRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = useTranslations("reviewers.workload");
  const tCommon = useTranslations("common");

  const { reviewer, workload, availability } = data;

  const totalUpcoming =
    workload.upcomingAssignments.next30Days.length +
    workload.upcomingAssignments.next60Days.length +
    workload.upcomingAssignments.next90Days.length;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <TableRow className="group">
        <TableCell>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </TableCell>
        <TableCell>
          <Link
            href={`/${locale}/reviewers/${reviewer.id}`}
            className="font-medium hover:underline"
          >
            {reviewer.firstName} {reviewer.lastName}
          </Link>
          <div className="text-xs text-muted-foreground">
            {reviewer.organization}
          </div>
        </TableCell>
        <TableCell>
          <WorkloadIndicatorBadge indicator={workload.indicator} />
        </TableCell>
        <TableCell className="text-center">
          <span className="font-medium">
            {workload.currentAssignments.length}
          </span>
        </TableCell>
        <TableCell className="text-center">
          <Tooltip>
            <TooltipTrigger>
              <span className="font-medium">{totalUpcoming}</span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1">
                <div>30d: {workload.upcomingAssignments.next30Days.length}</div>
                <div>60d: {workload.upcomingAssignments.next60Days.length}</div>
                <div>90d: {workload.upcomingAssignments.next90Days.length}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TableCell>
        <TableCell className="text-center">
          <span className="font-medium">{workload.historicalReviewCount}</span>
        </TableCell>
        <TableCell>
          {availability.isCurrentlyAvailable ? (
            <Badge variant="success" className="text-xs">
              {t("availableNow")}
            </Badge>
          ) : availability.nextAvailableDate ? (
            <span className="text-xs text-muted-foreground">
              {format(new Date(availability.nextAvailableDate), "MMM d")}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell>
          {reviewer.isLeadQualified && (
            <Badge variant="outline" className="text-xs">
              {t("leadQualified")}
            </Badge>
          )}
        </TableCell>
      </TableRow>

      <CollapsibleContent asChild>
        <TableRow className="bg-muted/30">
          <TableCell colSpan={8} className="p-4">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Current Assignments */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {t("currentAssignments")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {workload.currentAssignments.length > 0 ? (
                    <ul className="space-y-2">
                      {workload.currentAssignments.map(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (assignment: any, idx: number) => (
                          <li key={idx} className="text-sm">
                            <Link
                              href={`/${locale}/reviews/${assignment.reviewId}`}
                              className="font-medium hover:underline"
                            >
                              {assignment.referenceNumber}
                            </Link>
                            <div className="text-xs text-muted-foreground">
                              {assignment.hostOrganization} &bull;{" "}
                              {assignment.role}
                            </div>
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("noCurrentAssignments")}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Assignments */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {t("upcomingAssignments")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {workload.upcomingAssignments.next30Days.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          {t("next30Days")}
                        </div>
                        <ul className="space-y-1">
                          {workload.upcomingAssignments.next30Days.map(
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (a: any, idx: number) => (
                              <li key={idx} className="text-sm">
                                {a.referenceNumber} - {a.hostOrganization}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                    {workload.upcomingAssignments.next60Days.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          {t("next60Days")}
                        </div>
                        <ul className="space-y-1">
                          {workload.upcomingAssignments.next60Days.map(
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (a: any, idx: number) => (
                              <li key={idx} className="text-sm">
                                {a.referenceNumber} - {a.hostOrganization}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                    {workload.upcomingAssignments.next90Days.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          {t("next90Days")}
                        </div>
                        <ul className="space-y-1">
                          {workload.upcomingAssignments.next90Days.map(
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (a: any, idx: number) => (
                              <li key={idx} className="text-sm">
                                {a.referenceNumber} - {a.hostOrganization}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                    {totalUpcoming === 0 && (
                      <p className="text-sm text-muted-foreground">
                        {t("noUpcomingAssignments")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Availability */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t("availability")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{t("currentStatus")}:</span>
                      {availability.isCurrentlyAvailable ? (
                        <Badge variant="success" className="text-xs">
                          {t("availableNow")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {t("notAvailable")}
                        </Badge>
                      )}
                    </div>

                    {availability.availableSlots.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          {t("availableSlots")}
                        </div>
                        <ul className="space-y-1">
                          {availability.availableSlots.map(
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (slot: any) => (
                              <li key={slot.id} className="text-xs">
                                {format(new Date(slot.startDate), "MMM d")} -{" "}
                                {format(new Date(slot.endDate), "MMM d, yyyy")}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                    <div className="pt-2">
                      <div className="text-xs text-muted-foreground">
                        {t("totalCompleted")}: {reviewer.reviewsCompleted}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("asLead")}: {reviewer.reviewsAsLead}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TableCell>
        </TableRow>
      </CollapsibleContent>
    </Collapsible>
  );
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-96" />
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function WorkloadDashboardClient({ locale }: WorkloadDashboardClientProps) {
  const t = useTranslations("reviewers.workload");
  const [filter, setFilter] = useState<FilterType>("all");

  const { data, isLoading } = trpc.reviewer.getWorkloadDashboard.useQuery(
    { includeInactive: false },
    { refetchInterval: 60000 } // Refresh every minute
  );

  // Filter reviewers
  const filteredReviewers = useMemo(() => {
    if (!data?.reviewers) return [];
    if (filter === "all") return data.reviewers;
    return data.reviewers.filter((r) => r.workload.indicator === filter);
  }, [data?.reviewers, filter]);

  if (isLoading) {
    return (
      <div className="container py-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("noData")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/${locale}/reviewers`}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t("backToReviewers")}
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards summary={data.summary} />

      {/* Filter */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">{t("filterByStatus")}:</span>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all")}</SelectItem>
            <SelectItem value="available">
              🟢 {t("filters.available")}
            </SelectItem>
            <SelectItem value="moderate">🟡 {t("filters.moderate")}</SelectItem>
            <SelectItem value="overloaded">
              🔴 {t("filters.overloaded")}
            </SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {t("showingCount", { count: filteredReviewers.length })}
        </span>
      </div>

      {/* Reviewers Table */}
      <Card>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>{t("table.reviewer")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead className="text-center">{t("table.active")}</TableHead>
                <TableHead className="text-center">{t("table.upcoming")}</TableHead>
                <TableHead className="text-center">{t("table.historical")}</TableHead>
                <TableHead>{t("table.availability")}</TableHead>
                <TableHead>{t("table.qualifications")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviewers.map((reviewerData) => (
                <ReviewerRow
                  key={reviewerData.reviewer.id}
                  data={reviewerData}
                  locale={locale}
                />
              ))}
              {filteredReviewers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-muted-foreground">{t("noReviewersFound")}</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Benefits Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("benefits.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">{t("benefits.preventBurnout")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("benefits.preventBurnoutDesc")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">{t("benefits.fairDistribution")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("benefits.fairDistributionDesc")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium">{t("benefits.capacityPlanning")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("benefits.capacityPlanningDesc")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last updated */}
      <div className="text-xs text-muted-foreground text-center">
        {t("lastUpdated")}: {format(new Date(data.generatedAt), "PPpp")}
      </div>
    </div>
  );
}

export default WorkloadDashboardClient;
