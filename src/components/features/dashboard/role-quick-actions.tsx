"use client";

/**
 * Role-Based Quick Actions Component
 *
 * Displays role-appropriate quick action links filtered by user permissions.
 */

import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Zap } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { getQuickActionsForRole, type QuickActionConfig } from "@/lib/dashboard-config";

// =============================================================================
// TYPES
// =============================================================================

interface RoleQuickActionsProps {
  userRole: UserRole;
  locale: string;
  isLoading?: boolean;
  className?: string;
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function QuickActionsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// QUICK ACTION ITEM
// =============================================================================

interface QuickActionItemProps {
  action: QuickActionConfig;
  locale: string;
}

function QuickActionItem({ action, locale }: QuickActionItemProps) {
  const t = useTranslations("dashboard.quickActions");
  const Icon = action.icon;

  // Build localized href
  const href = action.href.startsWith("/")
    ? `/${locale}${action.href}`
    : action.href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between rounded-lg border p-4",
        "hover:bg-muted/50 hover:border-primary/30 transition-all",
        "group"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
            {t(action.titleKey)}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t(action.descriptionKey)}
          </p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </Link>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RoleQuickActions({
  userRole,
  locale,
  isLoading,
  className,
}: RoleQuickActionsProps) {
  const t = useTranslations("dashboard");

  if (isLoading) {
    return <QuickActionsSkeleton />;
  }

  const actions = getQuickActionsForRole(userRole);

  if (actions.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5" />
          {t("quickActions.title")}
        </CardTitle>
        <CardDescription>{t("quickActions.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {actions.map((action) => (
          <QuickActionItem key={action.id} action={action} locale={locale} />
        ))}
      </CardContent>
    </Card>
  );
}

export default RoleQuickActions;
