"use client";

/**
 * Report Client Component
 *
 * Handles client-side interactivity for the report page.
 * Fetches data using tRPC and renders the ReportDetailView.
 */

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2, AlertCircle, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { ReportDetailView } from "@/components/features/report/report-detail-view";
import type { UserRole } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

interface ReportClientProps {
  reviewId: string;
  userRole: UserRole;
  userId: string;
}

// =============================================================================
// ROLE PERMISSIONS
// =============================================================================

const EDIT_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "LEAD_REVIEWER",
];

const FINALIZE_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "LEAD_REVIEWER",
];

// =============================================================================
// LOADING SKELETON
// =============================================================================

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-5 w-48" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// ERROR STATE
// =============================================================================

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const t = useTranslations("report");

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t("errorTitle")}</h3>
        <p className="text-muted-foreground text-center mb-4 max-w-md">
          {message}
        </p>
        <Button onClick={onRetry}>{t("retry")}</Button>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// GENERATE REPORT PROMPT
// =============================================================================

function GenerateReportPrompt({
  onGenerate,
  isGenerating,
}: {
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const t = useTranslations("report");

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t("noReportTitle")}</h3>
        <p className="text-muted-foreground text-center mb-4 max-w-md">
          {t("noReportDescription")}
        </p>
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t("generateReport")}
        </Button>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ReportClient({ reviewId, userRole, userId: _userId }: ReportClientProps) {
  const t = useTranslations("report");

  // Fetch report data
  const {
    data: reportData,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.report.getByReview.useQuery(
    { reviewId },
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  // Generate report mutation
  const generateMutation = trpc.report.generate.useMutation({
    onSuccess: () => {
      toast.success(t("generateSuccess"), {
        description: t("generateSuccessDescription"),
      });
      refetch();
    },
    onError: (error) => {
      toast.error(t("generateError"), {
        description: error.message,
      });
    },
  });

  // Check if report doesn't exist (404 error)
  const isNotFound = isError && error?.data?.code === "NOT_FOUND";

  // Auto-generate report if not found and user can edit
  useEffect(() => {
    if (isNotFound && EDIT_ROLES.includes(userRole) && !generateMutation.isPending) {
      // Don't auto-generate, let user click the button
    }
  }, [isNotFound, userRole, generateMutation.isPending]);

  // Handle generate
  const handleGenerate = () => {
    generateMutation.mutate({ reviewId });
  };

  // Handle retry
  const handleRetry = () => {
    refetch();
  };

  // Calculate permissions
  const canEdit = EDIT_ROLES.includes(userRole);
  const canSubmit = canEdit;
  const canFinalize = FINALIZE_ROLES.includes(userRole);

  // Loading state
  if (isLoading) {
    return <ReportSkeleton />;
  }

  // Not found - show generate prompt
  if (isNotFound) {
    if (EDIT_ROLES.includes(userRole)) {
      return (
        <GenerateReportPrompt
          onGenerate={handleGenerate}
          isGenerating={generateMutation.isPending}
        />
      );
    } else {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("noReportTitle")}</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {t("noReportNotAuthorized")}
            </p>
          </CardContent>
        </Card>
      );
    }
  }

  // Error state
  if (isError) {
    return (
      <ErrorState message={error?.message || t("unknownError")} onRetry={handleRetry} />
    );
  }

  // No data
  if (!reportData) {
    return (
      <ErrorState message={t("noDataError")} onRetry={handleRetry} />
    );
  }

  // Render report view
  return (
    <ReportDetailView
      data={reportData}
      canEdit={canEdit}
      canSubmit={canSubmit}
      canFinalize={canFinalize}
    />
  );
}

export default ReportClient;
