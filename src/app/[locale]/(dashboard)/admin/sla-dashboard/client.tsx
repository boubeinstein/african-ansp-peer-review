"use client";

import { trpc } from "@/lib/trpc/client";
import { useTranslations } from "next-intl";
import { SLAStatsCard } from "@/components/features/workflow/sla-stats-card";
import { ApproachingDeadlines } from "@/components/features/workflow/approaching-deadlines";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SLADashboardClient() {
  const t = useTranslations("workflow.sla");

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = trpc.workflow.getSLAStats.useQuery({});

  const { data: capStats, isLoading: capLoading } =
    trpc.workflow.getSLAStats.useQuery({ entityType: "CAP" });

  const { data: findingStats, isLoading: findingLoading } =
    trpc.workflow.getSLAStats.useQuery({ entityType: "FINDING" });

  const { data: approachingData, isLoading: approachingLoading } =
    trpc.workflow.getApproachingBreaches.useQuery({ warningDays: 7 });

  const handleRefresh = () => {
    refetchStats();
  };

  if (statsLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("refresh")}
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">{t("allEntities")}</TabsTrigger>
          <TabsTrigger value="cap">{t("caps")}</TabsTrigger>
          <TabsTrigger value="finding">{t("findings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stats && <SLAStatsCard stats={stats} />}
            {approachingLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <ApproachingDeadlines deadlines={approachingData || []} />
            )}
          </div>

          {/* Analytics Summary */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("totalTracked")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.total || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("activeNow")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {stats?.running || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("breachRate")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${
                    (stats?.breachRate || 0) > 20
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {stats?.breachRate || 0}%
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cap" className="mt-6">
          {capLoading ? (
            <Skeleton className="h-64" />
          ) : capStats ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SLAStatsCard stats={capStats} />
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("capSummary")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("totalCaps")}
                    </span>
                    <span className="font-medium">{capStats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("avgDays")}
                    </span>
                    <span className="font-medium">
                      {capStats.averageCompletionDays} {t("days")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("onTimeRate")}
                    </span>
                    <span
                      className={`font-medium ${
                        100 - capStats.breachRate >= 80
                          ? "text-green-600"
                          : "text-amber-600"
                      }`}
                    >
                      {(100 - capStats.breachRate).toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-muted-foreground">{t("noData")}</p>
          )}
        </TabsContent>

        <TabsContent value="finding" className="mt-6">
          {findingLoading ? (
            <Skeleton className="h-64" />
          ) : findingStats ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SLAStatsCard stats={findingStats} />
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t("findingSummary")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("totalFindings")}
                    </span>
                    <span className="font-medium">{findingStats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("avgDays")}
                    </span>
                    <span className="font-medium">
                      {findingStats.averageCompletionDays} {t("days")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("onTimeRate")}
                    </span>
                    <span
                      className={`font-medium ${
                        100 - findingStats.breachRate >= 80
                          ? "text-green-600"
                          : "text-amber-600"
                      }`}
                    >
                      {(100 - findingStats.breachRate).toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-muted-foreground">{t("noData")}</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
