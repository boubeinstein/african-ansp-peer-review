"use client";

/**
 * Role-Based Stat Cards Component
 *
 * Displays role-appropriate KPI cards with dynamic colors and loading states.
 * Adapts layout and metrics based on user role category.
 * Includes trend indicators and optional sparkline charts.
 */

import { useTranslations } from "next-intl";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/ui/sparkline";
import {
  type RoleCategory,
  getStatCardsForRole,
  getColorClasses,
  type ColorScheme,
} from "@/lib/dashboard-config";

// =============================================================================
// TYPES
// =============================================================================

interface TrendData {
  value: number;
  direction: "up" | "down" | "neutral";
  isPositive?: boolean;
  sparklineData?: number[];
}

interface RoleStatCardsProps {
  roleCategory: RoleCategory;
  stats: Record<string, number | string | null>;
  trends?: Record<string, TrendData>;
  isLoading?: boolean;
  className?: string;
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function StatCardSkeleton() {
  return (
    <Card className="transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export function RoleStatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

// =============================================================================
// TREND INDICATOR
// =============================================================================

interface TrendIndicatorProps {
  value: number;
  direction: "up" | "down" | "neutral";
  isPositive?: boolean; // Whether "up" is good (green) or bad (red)
}

function TrendIndicator({ value, direction, isPositive = true }: TrendIndicatorProps) {
  // Determine color based on direction and whether it's positive
  const getColor = () => {
    if (direction === "neutral") return "text-muted-foreground";
    if (direction === "up") {
      return isPositive ? "text-green-600" : "text-red-600";
    }
    // direction === "down"
    return isPositive ? "text-red-600" : "text-green-600";
  };

  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  const colorClass = getColor();

  return (
    <div className={cn("flex items-center gap-1", colorClass)}>
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">
        {direction !== "neutral" && (direction === "up" ? "+" : "-")}
        {Math.abs(value)}%
      </span>
    </div>
  );
}

// =============================================================================
// STAT CARD
// =============================================================================

interface StatCardProps {
  title: string;
  value: number | string | null;
  subtitle?: string;
  icon: React.ElementType;
  colorScheme: ColorScheme;
  linkTo?: string;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
    isPositive?: boolean; // Whether "up" is good
  };
  sparklineData?: number[];
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorScheme,
  linkTo,
  trend,
  sparklineData,
}: StatCardProps) {
  const colors = getColorClasses(colorScheme);
  const displayValue = value ?? "-";

  // Determine sparkline color based on trend
  const getSparklineColor = (): "default" | "success" | "warning" | "danger" => {
    if (!trend) return "default";
    if (trend.direction === "neutral") return "default";
    if (trend.direction === "up") {
      return trend.isPositive !== false ? "success" : "danger";
    }
    return trend.isPositive !== false ? "danger" : "success";
  };

  const content = (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        linkTo && "cursor-pointer hover:border-primary/50"
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold">{displayValue}</p>
              {trend && (
                <TrendIndicator
                  value={trend.value}
                  direction={trend.direction}
                  isPositive={trend.isPositive}
                />
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {sparklineData && sparklineData.length > 1 && (
              <div className="mt-2">
                <Sparkline
                  data={sparklineData}
                  color={getSparklineColor()}
                  height={20}
                />
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-lg flex-shrink-0", colors.bg)}>
            <Icon className={cn("h-5 w-5", colors.text)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (linkTo) {
    return <Link href={linkTo}>{content}</Link>;
  }

  return content;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RoleStatCards({
  roleCategory,
  stats,
  trends,
  isLoading,
  className,
}: RoleStatCardsProps) {
  const t = useTranslations("dashboard.stats");

  if (isLoading) {
    const cardCount = roleCategory === "LIMITED" ? 2 : 4;
    return <RoleStatCardsSkeleton count={cardCount} />;
  }

  const cardConfigs = getStatCardsForRole(roleCategory);

  // Determine grid columns based on card count
  const gridCols =
    cardConfigs.length <= 2
      ? "grid-cols-1 sm:grid-cols-2"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={cn("grid gap-4", gridCols, className)}>
      {cardConfigs.map((config) => {
        const rawValue = stats[config.valueKey];
        const numericValue = typeof rawValue === "number" ? rawValue : 0;

        // Determine color scheme
        let colorScheme: ColorScheme = config.colorScheme as ColorScheme;
        if (config.colorScheme === "dynamic" && config.getColor) {
          colorScheme = config.getColor(numericValue);
        }

        // Format value for display
        let displayValue: string | number | null = rawValue;

        // Format EI Score as percentage with 1 decimal place
        if (config.id === "latest-ei-score" && typeof rawValue === "number") {
          displayValue = `${rawValue.toFixed(1)}%`;
        }

        // Get translated strings
        const title = t(config.titleKey);
        const subtitle = config.subtitleKey ? t(config.subtitleKey) : undefined;

        // Get trend data if available
        const trendData = trends?.[config.valueKey];

        return (
          <StatCard
            key={config.id}
            title={title}
            value={displayValue}
            subtitle={subtitle}
            icon={config.icon}
            colorScheme={colorScheme}
            linkTo={config.linkTo}
            trend={trendData ? {
              value: trendData.value,
              direction: trendData.direction,
              isPositive: trendData.isPositive,
            } : undefined}
            sparklineData={trendData?.sparklineData}
          />
        );
      })}
    </div>
  );
}

export default RoleStatCards;
