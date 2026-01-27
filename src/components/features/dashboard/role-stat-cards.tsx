"use client";

/**
 * Role-Based Stat Cards Component
 *
 * Displays role-appropriate KPI cards with dynamic colors and loading states.
 * Adapts layout and metrics based on user role category.
 */

import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type RoleCategory,
  getStatCardsForRole,
  getColorClasses,
  type ColorScheme,
} from "@/lib/dashboard-config";

// =============================================================================
// TYPES
// =============================================================================

interface RoleStatCardsProps {
  roleCategory: RoleCategory;
  stats: Record<string, number | string | null>;
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
// STAT CARD
// =============================================================================

interface StatCardProps {
  title: string;
  value: number | string | null;
  subtitle?: string;
  icon: React.ElementType;
  colorScheme: ColorScheme;
  linkTo?: string;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorScheme,
  linkTo,
}: StatCardProps) {
  const colors = getColorClasses(colorScheme);
  const displayValue = value ?? "-";

  const content = (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        linkTo && "cursor-pointer hover:border-primary/50"
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{displayValue}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn("p-3 rounded-lg", colors.bg)}>
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

        return (
          <StatCard
            key={config.id}
            title={title}
            value={displayValue}
            subtitle={subtitle}
            icon={config.icon}
            colorScheme={colorScheme}
            linkTo={config.linkTo}
          />
        );
      })}
    </div>
  );
}

export default RoleStatCards;
