"use client";

/**
 * Dashboard Content - Role-Based KPI Dashboard
 *
 * Displays role-appropriate statistics, metrics, and quick actions
 * aligned with ICAO/CANSO requirements for the AAPRP programme.
 */

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { getRoleCategory, type RoleCategory } from "@/lib/dashboard-config";
import { RoleStatCards, RoleStatCardsSkeleton } from "@/components/features/dashboard/role-stat-cards";
import { ProgrammeOverview } from "@/components/features/dashboard/programme-overview";
import { MyOrganizationSummary } from "@/components/features/dashboard/my-organization-summary";
import { MyTeamWidget } from "@/components/features/dashboard/my-team-widget";
import { TeamPerformanceOverview } from "@/components/features/dashboard/team-performance-overview";
import { RoleQuickActions } from "@/components/features/dashboard/role-quick-actions";
import { RecentActivityWidget } from "@/components/features/dashboard/RecentActivityWidget";
import type { UserRole } from "@/types/prisma-enums";

// =============================================================================
// TYPES
// =============================================================================

interface Organization {
  id: string;
  nameEn: string;
  nameFr?: string | null;
  organizationCode: string | null;
}

interface DashboardContentProps {
  userName: string;
  userRole: UserRole;
  organizationId?: string;
  organization?: Organization | null;
  locale: string;
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <RoleStatCardsSkeleton count={4} />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

// =============================================================================
// STAT VALUE TRANSFORMERS
// =============================================================================

// Type for the stats returned by the dashboard API
type DashboardStatsResponse =
  | { role: "PROGRAMME_ADMIN"; stats: {
      totalAnsps: number;
      activeParticipants: number;
      totalAssessments: number;
      totalReviews: number;
      openFindingsBySeverity: Record<string, number>;
      overdueCaps: number;
      averageEIScore: number | null;
      pendingJoinRequests: number;
    }}
  | { role: "COORDINATOR"; stats: {
      reviewsCoordinating: { total: number; scheduled: number; inProgress: number; completed: number };
      pendingTeamAssignments: number;
      findingsAwaitingReview: number;
      capsRequiringAttention: { overdue: number; pendingVerification: number };
    }}
  | { role: "REVIEWER"; stats: {
      assignedReviews: { upcoming: number; inProgress: number; completed: number };
      findingsRaised: { open: number; closed: number };
      availabilityStatus: string;
    }}
  | { role: "ANSP"; stats: {
      assessments: { draft: number; submitted: number; underReview: number; completed: number };
      latestEIScore: number | null;
      eiScoreTrend: number | null;
      peerReviews: { asHost: number; findingsCount: number; openCaps: number };
      capsByStatus: Record<string, number>;
      overdueCaps: number;
    }}
  | { role: "LIMITED"; stats: {
      submittedAssessments: number;
      trainingModulesAvailable: number;
    }};

/**
 * Transform API stats to flat key-value map for stat cards
 */
function transformStatsForCards(
  roleCategory: RoleCategory,
  stats: DashboardStatsResponse | null | undefined
): Record<string, number | string | null> {
  if (!stats) return {};

  switch (roleCategory) {
    case "PROGRAMME_ADMIN": {
      if (stats.role !== "PROGRAMME_ADMIN") return {};
      const s = stats.stats;
      const totalOpenFindings = Object.values(s.openFindingsBySeverity).reduce(
        (sum: number, count: number) => sum + count,
        0
      );
      return {
        totalAnsps: s.totalAnsps,
        activeParticipants: s.activeParticipants,
        openFindings: totalOpenFindings,
        overdueCaps: s.overdueCaps,
      };
    }
    case "COORDINATOR": {
      if (stats.role !== "COORDINATOR") return {};
      const s = stats.stats;
      return {
        reviewsTotal: s.reviewsCoordinating.total,
        pendingTeamAssignments: s.pendingTeamAssignments,
        findingsAwaitingReview: s.findingsAwaitingReview,
        capsOverdue: s.capsRequiringAttention.overdue,
      };
    }
    case "REVIEWER": {
      if (stats.role !== "REVIEWER") return {};
      const s = stats.stats;
      return {
        totalAssigned:
          s.assignedReviews.upcoming +
          s.assignedReviews.inProgress +
          s.assignedReviews.completed,
        inProgress: s.assignedReviews.inProgress,
        findingsRaised: s.findingsRaised.open + s.findingsRaised.closed,
        completed: s.assignedReviews.completed,
      };
    }
    case "ANSP": {
      if (stats.role !== "ANSP") return {};
      const s = stats.stats;
      return {
        totalAssessments:
          s.assessments.draft +
          s.assessments.submitted +
          s.assessments.underReview +
          s.assessments.completed,
        latestEIScore: s.latestEIScore,
        openFindings: s.peerReviews.findingsCount,
        activeCaps: s.peerReviews.openCaps,
      };
    }
    case "LIMITED": {
      if (stats.role !== "LIMITED") return {};
      const s = stats.stats;
      return {
        submittedAssessments: s.submittedAssessments,
        trainingModulesAvailable: s.trainingModulesAvailable,
      };
    }
    default:
      return {};
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DashboardContent({
  userName,
  userRole,
  // organizationId is passed but may be needed for future features
  organization,
  locale,
}: DashboardContentProps) {
  const t = useTranslations("dashboard");
  const roleCategory = getRoleCategory(userRole);

  // Fetch dashboard stats
  const { data: statsData, isLoading: statsLoading } =
    trpc.dashboard.getStats.useQuery();

  // Fetch recent activity
  const { data: recentActivity, isLoading: activityLoading } =
    trpc.dashboard.getRecentActivity.useQuery({ limit: 10 });

  // Cast stats to our expected type
  const stats = statsData as DashboardStatsResponse | undefined;

  // Transform stats for stat cards
  const statValues = transformStatsForCards(roleCategory, stats);

  // Loading state
  if (statsLoading) {
    return <DashboardSkeleton />;
  }

  // Determine if user can create assessments (ANSP roles)
  const canCreateAssessment = ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"].includes(
    userRole
  );

  // Determine if user can create reviews (coordinator/admin roles)
  const canCreateReview = [
    "SUPER_ADMIN",
    "SYSTEM_ADMIN",
    "PROGRAMME_COORDINATOR",
  ].includes(userRole);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("welcome", { name: userName })}
          </h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canCreateAssessment && (
          <Button asChild>
            <Link href={`/${locale}/assessments/new`}>
              <Plus className="h-4 w-4 mr-2" />
              {t("newAssessment")}
            </Link>
          </Button>
        )}
        {canCreateReview && (
          <Button asChild>
            <Link href={`/${locale}/reviews/new`}>
              <Plus className="h-4 w-4 mr-2" />
              {t("newReview")}
            </Link>
          </Button>
        )}
      </div>

      {/* Role-Based Stat Cards */}
      <RoleStatCards
        roleCategory={roleCategory}
        stats={statValues}
        isLoading={statsLoading}
      />

      {/* Team Performance Overview for Coordinators and Steering Committee */}
      {(roleCategory === "PROGRAMME_ADMIN" || roleCategory === "COORDINATOR") && (
        <TeamPerformanceOverview locale={locale} />
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column - Role-specific content */}
        <div className="space-y-6">
          {/* Programme Overview for Admin roles */}
          {roleCategory === "PROGRAMME_ADMIN" &&
            stats?.role === "PROGRAMME_ADMIN" && (
              <ProgrammeOverview stats={stats.stats} isLoading={statsLoading} />
            )}

          {/* My Organization Summary for ANSP roles */}
          {roleCategory === "ANSP" &&
            organization &&
            stats?.role === "ANSP" && (
              <MyOrganizationSummary
                organization={organization}
                stats={stats.stats}
                locale={locale}
                isLoading={statsLoading}
              />
            )}

          {/* My Team Widget for ANSP and REVIEWER roles */}
          {(roleCategory === "ANSP" || roleCategory === "REVIEWER") && (
            <MyTeamWidget locale={locale} />
          )}

          {/* Quick Actions for all roles */}
          <RoleQuickActions
            userRole={userRole}
            locale={locale}
            isLoading={statsLoading}
          />
        </div>

        {/* Right Column - Recent Activity */}
        <div className="space-y-6">
          <RecentActivityWidget
            activities={
              recentActivity?.map((a) => ({
                id: a.id,
                type: a.type,
                title: a.title,
                description: a.description,
                timestamp: a.timestamp.toISOString(),
              })) ?? []
            }
            onViewAll={() => {}}
            isLoading={activityLoading}
          />
        </div>
      </div>
    </div>
  );
}

export default DashboardContent;
