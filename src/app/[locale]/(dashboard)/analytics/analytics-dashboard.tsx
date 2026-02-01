"use client";

/**
 * Analytics Dashboard - Programme Coordinator View
 *
 * Comprehensive analytics with visualizations for:
 * - Review statistics and trends
 * - Finding statistics and distribution
 * - CAP statistics and tracking
 * - Team performance metrics
 */

import { useTranslations } from "next-intl";
import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

// Import chart components
import {
  ReviewStatusChart,
  ReviewTrendChart,
  FindingSeverityChart,
  FindingTrendChart,
  CAPStatusChart,
  ReviewerPerformanceChart,
} from "./charts";

// =============================================================================
// TYPES
// =============================================================================

interface AnalyticsDashboardProps {
  locale: string;
}

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "warning" | "danger" | "success";
}

function StatCard({ title, value, subtitle, icon, trend, variant = "default" }: StatCardProps) {
  const variantStyles = {
    default: "border-l-primary",
    warning: "border-l-yellow-500",
    danger: "border-l-red-500",
    success: "border-l-green-500",
  };

  return (
    <Card className={cn("border-l-4", variantStyles[variant])}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {trend && (
                <span
                  className={cn(
                    "text-xs font-medium",
                    trend.isPositive ? "text-green-600" : "text-red-600"
                  )}
                >
                  {trend.isPositive ? "+" : ""}
                  {trend.value}%
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// OVERDUE ITEMS TABLE
// =============================================================================

interface OverdueItem {
  id: string;
  type: "CAP" | "REVIEW" | "FINDING";
  reference: string;
  title: string;
  organizationName: string;
  dueDate: Date | null;
  daysOverdue: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
}

function OverdueItemsTable({
  items,
  locale,
}: {
  items: OverdueItem[];
  locale: string;
}) {
  const t = useTranslations("analytics");

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      CRITICAL: "bg-red-100 text-red-800 border-red-200",
      HIGH: "bg-orange-100 text-orange-800 border-orange-200",
      MEDIUM: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return (
      <Badge variant="outline" className={styles[severity] || styles.MEDIUM}>
        {severity}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "CAP":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "REVIEW":
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case "FINDING":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getItemLink = (item: OverdueItem) => {
    switch (item.type) {
      case "CAP":
        return `/${locale}/caps`;
      case "REVIEW":
        return `/${locale}/reviews/${item.id}`;
      case "FINDING":
        return `/${locale}/findings/${item.id}`;
      default:
        return "#";
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <CheckCircle2 className="h-12 w-12 mb-2 text-green-500" />
        <p>{t("noOverdueItems")}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">{t("type")}</TableHead>
          <TableHead>{t("reference")}</TableHead>
          <TableHead>{t("organization")}</TableHead>
          <TableHead className="text-right">{t("daysOverdue")}</TableHead>
          <TableHead>{t("severity")}</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.slice(0, 10).map((item) => (
          <TableRow key={`${item.type}-${item.id}`}>
            <TableCell>{getTypeIcon(item.type)}</TableCell>
            <TableCell className="font-medium">{item.reference}</TableCell>
            <TableCell>{item.organizationName}</TableCell>
            <TableCell className="text-right">
              <span className="text-red-600 font-medium">{item.daysOverdue}</span>
            </TableCell>
            <TableCell>{getSeverityBadge(item.severity)}</TableCell>
            <TableCell>
              <Link href={getItemLink(item)}>
                <Button variant="ghost" size="icon">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// =============================================================================
// MAIN DASHBOARD COMPONENT
// =============================================================================

export function AnalyticsDashboard({ locale }: AnalyticsDashboardProps) {
  const t = useTranslations("analytics");
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch all analytics data
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } =
    trpc.analytics.getSummary.useQuery();

  const { data: reviewStats, isLoading: reviewStatsLoading } =
    trpc.analytics.getReviewStatistics.useQuery({ months: 12 });

  const { data: findingStats, isLoading: findingStatsLoading } =
    trpc.analytics.getFindingStatistics.useQuery({ months: 12 });

  const { data: capStats, isLoading: capStatsLoading } =
    trpc.analytics.getCAPStatistics.useQuery();

  const { data: teamPerformance, isLoading: teamLoading } =
    trpc.analytics.getTeamPerformance.useQuery();

  const { data: overdueItems, isLoading: overdueLoading } =
    trpc.analytics.getOverdueItems.useQuery();

  // Combined loading state
  const isLoading =
    summaryLoading ||
    reviewStatsLoading ||
    findingStatsLoading ||
    capStatsLoading ||
    teamLoading ||
    overdueLoading;

  // Combine all overdue items
  const allOverdueItems: OverdueItem[] = [
    ...(overdueItems?.overdueCaps || []).map((item: any) => ({
      ...item,
      type: "CAP" as const,
    })),
    ...(overdueItems?.overdueReviews || []).map((item: any) => ({
      ...item,
      type: "REVIEW" as const,
    })),
    ...(overdueItems?.findingsWithoutCap || []).map((item: any) => ({
      ...item,
      type: "FINDING" as const,
    })),
  ].sort((a, b) => b.daysOverdue - a.daysOverdue);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchSummary()}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          {t("refresh")}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title={t("totalReviews")}
              value={summary?.reviews.total || 0}
              subtitle={t("activeReviews", { count: summary?.reviews.active || 0 })}
              icon={<BarChart3 className="h-5 w-5 text-blue-500" />}
            />
            <StatCard
              title={t("totalFindings")}
              value={summary?.findings.total || 0}
              subtitle={t("openFindings", { count: summary?.findings.open || 0 })}
              icon={<AlertTriangle className="h-5 w-5 text-yellow-500" />}
              variant={
                (summary?.findings.open || 0) > 10 ? "warning" : "default"
              }
            />
            <StatCard
              title={t("totalCAPs")}
              value={summary?.caps.total || 0}
              subtitle={t("overdueCAPs", { count: summary?.caps.overdue || 0 })}
              icon={<Clock className="h-5 w-5 text-orange-500" />}
              variant={
                (summary?.caps.overdue || 0) > 0 ? "danger" : "default"
              }
            />
            <StatCard
              title={t("totalReviewers")}
              value={summary?.reviewers.total || 0}
              subtitle={t("availableReviewers", {
                count: summary?.reviewers.available || 0,
              })}
              icon={<Users className="h-5 w-5 text-green-500" />}
              variant={
                (summary?.reviewers.available || 0) < 5 ? "warning" : "success"
              }
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="reviews">{t("tabs.reviews")}</TabsTrigger>
          <TabsTrigger value="findings">{t("tabs.findings")}</TabsTrigger>
          <TabsTrigger value="caps">{t("tabs.caps")}</TabsTrigger>
          <TabsTrigger value="team">{t("tabs.team")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Overdue Items */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  {t("overdueItems")}
                </CardTitle>
                <CardDescription>{t("overdueItemsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                {overdueLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <OverdueItemsTable items={allOverdueItems} locale={locale} />
                )}
              </CardContent>
            </Card>

            {/* Review Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  {t("reviewTrend")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviewStatsLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (
                  <ReviewTrendChart data={reviewStats?.reviewsByMonth || []} />
                )}
              </CardContent>
            </Card>

            {/* Finding Severity Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  {t("findingsBySeverity")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {findingStatsLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (
                  <FindingSeverityChart data={findingStats?.bySeverity || []} />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Review Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>{t("reviewsByStatus")}</CardTitle>
                <CardDescription>
                  {t("totalReviewsCount", { count: reviewStats?.total || 0 })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reviewStatsLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ReviewStatusChart data={reviewStats?.byStatus || []} />
                )}
              </CardContent>
            </Card>

            {/* Review Trend */}
            <Card>
              <CardHeader>
                <CardTitle>{t("reviewsPerMonth")}</CardTitle>
                <CardDescription>{t("last12Months")}</CardDescription>
              </CardHeader>
              <CardContent>
                {reviewStatsLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ReviewTrendChart data={reviewStats?.reviewsByMonth || []} />
                )}
              </CardContent>
            </Card>

            {/* Average Duration */}
            <Card>
              <CardHeader>
                <CardTitle>{t("reviewMetrics")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("averageReviewDuration")}
                    </p>
                    <p className="text-2xl font-bold">
                      {reviewStats?.averageDurationDays || "N/A"}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        {t("days")}
                      </span>
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            {/* Reviews by Organization */}
            <Card>
              <CardHeader>
                <CardTitle>{t("topOrganizations")}</CardTitle>
                <CardDescription>{t("byReviewCount")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reviewStats?.byOrganization.slice(0, 5).map((org, index) => (
                    <div
                      key={org.organizationId}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          {index + 1}.
                        </span>
                        <span className="font-medium">{org.organizationName}</span>
                      </div>
                      <Badge variant="secondary">{org.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Findings Tab */}
        <TabsContent value="findings" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Findings by Severity */}
            <Card>
              <CardHeader>
                <CardTitle>{t("findingsBySeverity")}</CardTitle>
                <CardDescription>
                  {t("totalFindingsCount", { count: findingStats?.total || 0 })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {findingStatsLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <FindingSeverityChart data={findingStats?.bySeverity || []} />
                )}
              </CardContent>
            </Card>

            {/* Finding Trend */}
            <Card>
              <CardHeader>
                <CardTitle>{t("findingTrend")}</CardTitle>
                <CardDescription>{t("last12Months")}</CardDescription>
              </CardHeader>
              <CardContent>
                {findingStatsLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <FindingTrendChart data={findingStats?.trends || []} />
                )}
              </CardContent>
            </Card>

            {/* Finding Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>{t("findingMetrics")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("openFindingsLabel")}
                  </p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {findingStats?.openCount || 0}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("closedFindings")}
                  </p>
                  <p className="text-3xl font-bold text-green-600">
                    {findingStats?.closedCount || 0}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("avgResolutionTime")}
                  </p>
                  <p className="text-3xl font-bold">
                    {findingStats?.averageResolutionDays || "N/A"}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      {t("days")}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Findings by Area */}
            <Card>
              <CardHeader>
                <CardTitle>{t("findingsByArea")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {findingStats?.byArea.slice(0, 6).map((area) => (
                    <div key={area.area} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{area.area}</span>
                        <span className="font-medium">{area.count}</span>
                      </div>
                      <div className="flex gap-1 h-2">
                        {area.critical > 0 && (
                          <div
                            className="bg-red-500 rounded"
                            style={{ flex: area.critical }}
                            title={`Critical: ${area.critical}`}
                          />
                        )}
                        {area.major > 0 && (
                          <div
                            className="bg-orange-500 rounded"
                            style={{ flex: area.major }}
                            title={`Major: ${area.major}`}
                          />
                        )}
                        {area.minor > 0 && (
                          <div
                            className="bg-yellow-500 rounded"
                            style={{ flex: area.minor }}
                            title={`Minor: ${area.minor}`}
                          />
                        )}
                        {area.observation > 0 && (
                          <div
                            className="bg-blue-500 rounded"
                            style={{ flex: area.observation }}
                            title={`Observation: ${area.observation}`}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded" />
                    <span>Critical</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-orange-500 rounded" />
                    <span>Major</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-500 rounded" />
                    <span>Minor</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded" />
                    <span>Observation</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CAPs Tab */}
        <TabsContent value="caps" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* CAP Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>{t("capsByStatus")}</CardTitle>
                <CardDescription>
                  {t("totalCAPsCount", { count: capStats?.total || 0 })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {capStatsLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <CAPStatusChart data={capStats?.byStatus || []} />
                )}
              </CardContent>
            </Card>

            {/* CAP Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>{t("capMetrics")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("completionRate")}
                    </p>
                    <p className="text-3xl font-bold text-green-600">
                      {capStats?.completionRate || 0}%
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("overdueCount")}
                    </p>
                    <p
                      className={cn(
                        "text-3xl font-bold",
                        (capStats?.overdueCount || 0) > 0
                          ? "text-red-600"
                          : "text-green-600"
                      )}
                    >
                      {capStats?.overdueCount || 0}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("avgClosureTime")}
                    </p>
                    <p className="text-3xl font-bold">
                      {capStats?.averageClosureTimeDays || "N/A"}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        {t("days")}
                      </span>
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("pendingVerification")}
                    </p>
                    <p className="text-3xl font-bold text-orange-600">
                      {capStats?.pendingVerification || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overdue CAPs */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  {t("overdueCapsSectionTitle")}
                </CardTitle>
                <CardDescription>{t("requiresImmediateAttention")}</CardDescription>
              </CardHeader>
              <CardContent>
                {capStatsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : capStats?.overdueCaps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mb-2 text-green-500" />
                    <p>{t("noOverdueCAPs")}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("findingReference")}</TableHead>
                        <TableHead>{t("organization")}</TableHead>
                        <TableHead>{t("dueDate")}</TableHead>
                        <TableHead className="text-right">{t("daysOverdue")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {capStats?.overdueCaps.slice(0, 10).map((cap) => (
                        <TableRow key={cap.id}>
                          <TableCell className="font-medium">
                            {cap.findingReference}
                          </TableCell>
                          <TableCell>{cap.organizationName}</TableCell>
                          <TableCell>
                            {new Date(cap.dueDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-red-600 font-bold">
                              {cap.daysOverdue}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{cap.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Team Summary */}
            <Card>
              <CardHeader>
                <CardTitle>{t("teamSummary")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("totalReviewers")}
                    </p>
                    <p className="text-3xl font-bold">
                      {teamPerformance?.totalReviewers || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("available")}
                    </p>
                    <p className="text-3xl font-bold text-green-600">
                      {teamPerformance?.availableReviewers || 0}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("avgFindingsPerReview")}
                    </p>
                    <p className="text-3xl font-bold">
                      {teamPerformance?.averageFindingsPerReview || "N/A"}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("avgReviewsPerReviewer")}
                    </p>
                    <p className="text-3xl font-bold">
                      {teamPerformance?.averageReviewsPerReviewer || "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reviewer Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{t("topPerformers")}</CardTitle>
                <CardDescription>{t("byReviewsCompleted")}</CardDescription>
              </CardHeader>
              <CardContent>
                {teamLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ReviewerPerformanceChart
                    data={teamPerformance?.reviewerPerformance.slice(0, 10) || []}
                  />
                )}
              </CardContent>
            </Card>

            {/* Reviewer List */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>{t("reviewerPerformance")}</CardTitle>
                <CardDescription>{t("reviewerPerformanceDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                {teamLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("reviewer")}</TableHead>
                        <TableHead>{t("organization")}</TableHead>
                        <TableHead className="text-center">{t("completed")}</TableHead>
                        <TableHead className="text-center">{t("inProgress")}</TableHead>
                        <TableHead className="text-center">{t("findings")}</TableHead>
                        <TableHead className="text-center">{t("availability")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamPerformance?.reviewerPerformance.map((reviewer) => (
                        <TableRow key={reviewer.reviewerId}>
                          <TableCell className="font-medium">
                            {reviewer.reviewerName}
                          </TableCell>
                          <TableCell>{reviewer.organizationName}</TableCell>
                          <TableCell className="text-center">
                            {reviewer.reviewsCompleted}
                          </TableCell>
                          <TableCell className="text-center">
                            {reviewer.reviewsInProgress}
                          </TableCell>
                          <TableCell className="text-center">
                            {reviewer.findingsRaised}
                          </TableCell>
                          <TableCell className="text-center">
                            {reviewer.isAvailable ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                                {t("available")}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                {t("unavailable")}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AnalyticsDashboard;
