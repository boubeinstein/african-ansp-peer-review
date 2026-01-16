"use client";

/**
 * Organization Stats Cards Component
 *
 * Displays key statistics about organizations in a responsive grid.
 */

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  CheckCircle,
  Globe,
  Activity,
} from "lucide-react";
import type { OrganizationStats } from "@/types/organization";

// =============================================================================
// TYPES
// =============================================================================

interface OrganizationStatsCardsProps {
  stats: OrganizationStats | undefined;
  isLoading?: boolean;
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Region colors for badges
 */
const REGION_COLORS: Record<string, string> = {
  WACAF: "bg-blue-100 text-blue-800",
  ESAF: "bg-purple-100 text-purple-800",
  NORTHERN: "bg-orange-100 text-orange-800",
};

/**
 * Region labels
 */
const REGION_LABELS: Record<string, { en: string; fr: string }> = {
  WACAF: { en: "WACAF", fr: "WACAF" },
  ESAF: { en: "ESAF", fr: "ESAF" },
  NORTHERN: { en: "North", fr: "Nord" },
};

// =============================================================================
// SKELETON COMPONENT
// =============================================================================

function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function OrganizationStatsCards({
  stats,
  isLoading,
  className,
}: OrganizationStatsCardsProps) {
  const t = useTranslations("organizations");
  const locale = useLocale() as "en" | "fr";

  if (isLoading || !stats) {
    return (
      <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
    );
  }

  // Get top regions sorted by count
  const topRegions = Object.entries(stats.byRegion)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  // Get status counts
  const statusEntries = Object.entries(stats.byStatus).filter(
    ([, count]) => count > 0
  );

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {/* Total Organizations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("stats.total")}
          </CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            {t("stats.totalDescription")}
          </p>
        </CardContent>
      </Card>

      {/* Active Organizations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("stats.active")}
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <p className="text-xs text-muted-foreground">
            {stats.total > 0
              ? t("stats.activePercentage", {
                  percentage: Math.round((stats.active / stats.total) * 100),
                })
              : t("stats.noOrganizations")}
          </p>
        </CardContent>
      </Card>

      {/* By Region */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("stats.byRegion")}
          </CardTitle>
          <Globe className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {topRegions.length > 0 ? (
              topRegions.map(([region, count]) => (
                <Badge
                  key={region}
                  variant="secondary"
                  className={cn("text-xs", REGION_COLORS[region])}
                >
                  {REGION_LABELS[region]?.[locale] || region}: {count}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                {t("stats.noData")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("stats.regionDistribution")}
          </p>
        </CardContent>
      </Card>

      {/* By Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("stats.byStatus")}
          </CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {statusEntries.length > 0 ? (
            <div className="space-y-2">
              {/* Mini horizontal bar chart */}
              <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                {stats.active > 0 && (
                  <div
                    className="bg-green-500 transition-all"
                    style={{
                      width: `${(stats.active / stats.total) * 100}%`,
                    }}
                  />
                )}
                {stats.pending > 0 && (
                  <div
                    className="bg-yellow-500 transition-all"
                    style={{
                      width: `${(stats.pending / stats.total) * 100}%`,
                    }}
                  />
                )}
                {stats.suspended > 0 && (
                  <div
                    className="bg-red-500 transition-all"
                    style={{
                      width: `${(stats.suspended / stats.total) * 100}%`,
                    }}
                  />
                )}
                {stats.inactive > 0 && (
                  <div
                    className="bg-gray-400 transition-all"
                    style={{
                      width: `${(stats.inactive / stats.total) * 100}%`,
                    }}
                  />
                )}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-2 text-xs">
                {stats.active > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    {stats.active}
                  </span>
                )}
                {stats.pending > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-yellow-500" />
                    {stats.pending}
                  </span>
                )}
                {stats.suspended > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    {stats.suspended}
                  </span>
                )}
                {stats.inactive > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                    {stats.inactive}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              {t("stats.noData")}
            </span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default OrganizationStatsCards;
