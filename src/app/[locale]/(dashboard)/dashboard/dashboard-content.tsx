"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  FileCheck,
  FileText,
  AlertTriangle,
  Plus,
  BookOpen,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard, StatsGrid } from "@/components/features/dashboard/StatsCard";
import { AssessmentStatusWidget } from "@/components/features/dashboard/AssessmentStatusWidget";
import { RecentActivityWidget } from "@/components/features/dashboard/RecentActivityWidget";
import { AttentionRequiredWidget } from "@/components/features/dashboard/AttentionRequiredWidget";
import { trpc } from "@/lib/trpc/client";

// =============================================================================
// TYPES
// =============================================================================

interface DashboardContentProps {
  userName: string;
  organizationId?: string;
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DashboardContent({
  userName,
  organizationId,
}: DashboardContentProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } =
    trpc.progress.getDashboardStats.useQuery({
      organizationId,
    });

  // Fetch assessments needing attention
  const { data: attentionItems } =
    trpc.progress.getAssessmentsNeedingAttention.useQuery({
      organizationId,
      limit: 5,
    });

  // Handle navigation
  const handleViewAllAssessments = () => {
    router.push("/assessments");
  };

  const handleViewAllActivity = () => {
    router.push("/assessments");
  };

  const handleAssessmentClick = (id: string) => {
    router.push(`/assessments/${id}`);
  };

  // Loading state
  if (statsLoading) {
    return <DashboardSkeleton />;
  }

  // Default stats if none loaded
  const assessmentStats = stats?.assessments ?? {
    total: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  };

  const byStatus = {
    DRAFT: assessmentStats.inProgress,
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    COMPLETED: assessmentStats.completed,
    ARCHIVED: 0,
  };

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
        <Button asChild>
          <Link href="/assessments/new">
            <Plus className="h-4 w-4 mr-2" />
            {t("newAssessment")}
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <StatsGrid columns={4}>
        <StatsCard
          title={t("stats.totalAssessments")}
          value={assessmentStats.total}
          subtitle={`${assessmentStats.inProgress} ${t("stats.inProgress")}`}
          icon={ClipboardList}
          iconColor="text-blue-600"
        />
        <StatsCard
          title={t("stats.completed")}
          value={assessmentStats.completed}
          icon={FileCheck}
          iconColor="text-green-600"
        />
        <StatsCard
          title={t("stats.documents")}
          value={stats?.documents?.total ?? 0}
          subtitle={`${stats?.documents?.thisWeek ?? 0} ${t("stats.thisWeek")}`}
          icon={FileText}
          iconColor="text-purple-600"
        />
        <StatsCard
          title={t("stats.overdue")}
          value={assessmentStats.overdue}
          icon={AlertTriangle}
          iconColor={
            assessmentStats.overdue > 0 ? "text-red-600" : "text-muted-foreground"
          }
        />
      </StatsGrid>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Assessment Status */}
          <AssessmentStatusWidget
            byStatus={byStatus}
            overdueCount={assessmentStats.overdue}
            onViewAll={handleViewAllAssessments}
          />

          {/* Attention Required */}
          <AttentionRequiredWidget
            assessments={attentionItems ?? []}
            onViewAll={handleViewAllAssessments}
            onAssessmentClick={handleAssessmentClick}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <RecentActivityWidget
            activities={stats?.activity ?? []}
            onViewAll={handleViewAllActivity}
          />

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>{t("quickActions.title")}</CardTitle>
              <CardDescription>{t("quickActions.description")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Link
                href="/assessments/new"
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Plus className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{t("quickActions.newAssessment")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("quickActions.newAssessmentDesc")}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link
                href="/questionnaires"
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <BookOpen className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{t("quickActions.questionnaires")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("quickActions.questionnairesDesc")}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link
                href="/training"
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <GraduationCap className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{t("quickActions.training")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("quickActions.trainingDesc")}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DashboardContent;
