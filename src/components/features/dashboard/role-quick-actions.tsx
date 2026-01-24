"use client";

/**
 * Role-Based Quick Actions Component
 *
 * Displays role-appropriate quick action links filtered by user permissions.
 * Supports both navigation links and dialog triggers (e.g., Update Availability).
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
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
import { AvailabilityDialog } from "@/components/features/reviewers/availability-dialog";

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
  onAction?: () => void;
}

function QuickActionItem({ action, locale, onAction }: QuickActionItemProps) {
  const t = useTranslations("dashboard.quickActions");
  const Icon = action.icon;

  // Build localized href
  const href = action.href.startsWith("/")
    ? `/${locale}${action.href}`
    : action.href;

  const itemClasses = cn(
    "flex items-center justify-between rounded-lg border p-4",
    "hover:bg-muted/50 hover:border-primary/30 transition-all",
    "group cursor-pointer"
  );

  const content = (
    <>
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
    </>
  );

  // If onAction is provided, render as button instead of link
  if (onAction) {
    return (
      <button type="button" className={cn(itemClasses, "w-full text-left")} onClick={onAction}>
        {content}
      </button>
    );
  }

  return (
    <Link href={href} className={itemClasses}>
      {content}
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
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);

  // Fetch reviewer profile for availability dialog (only for reviewer roles)
  const isReviewer = ["LEAD_REVIEWER", "PEER_REVIEWER"].includes(userRole);
  const { data: reviewerProfile } = trpc.reviewer.getByUserId.useQuery(
    { userId: undefined }, // Will use current user
    { enabled: isReviewer }
  );

  if (isLoading) {
    return <QuickActionsSkeleton />;
  }

  const actions = getQuickActionsForRole(userRole);

  if (actions.length === 0) {
    return null;
  }

  // Handler for update-availability action
  const getActionHandler = (actionId: string) => {
    if (actionId === "update-availability") {
      return () => setShowAvailabilityDialog(true);
    }
    return undefined;
  };

  return (
    <>
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
            <QuickActionItem
              key={action.id}
              action={action}
              locale={locale}
              onAction={getActionHandler(action.id)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Availability Dialog */}
      {isReviewer && (
        <AvailabilityDialog
          open={showAvailabilityDialog}
          onOpenChange={setShowAvailabilityDialog}
          currentAvailability={
            reviewerProfile
              ? {
                  isAvailable: reviewerProfile.isAvailable,
                  availableFrom: reviewerProfile.availableFrom,
                  availableTo: reviewerProfile.availableTo,
                }
              : undefined
          }
          reviewerProfileId={reviewerProfile?.id}
        />
      )}
    </>
  );
}

export default RoleQuickActions;
