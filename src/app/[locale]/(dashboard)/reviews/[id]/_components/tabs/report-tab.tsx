"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  PrerequisitesChecklist,
  type PrerequisiteItem,
} from "@/components/ui/prerequisites-checklist";
import {
  FileText,
  Clock,
  Loader2,
  FileOutput,
  RefreshCw,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { ReportViewer } from "@/components/features/report/report-viewer";
import { ReportWorkflowActions } from "@/components/features/report/report-workflow-actions";
import { VersionHistoryPanel } from "@/components/features/report/version-history-panel";
import type { ReviewData } from "../../_lib/fetch-review-data";

interface ReportTabProps {
  review: ReviewData;
  userRole: string;
  locale?: string;
}

export function ReportTab({ review, userRole }: ReportTabProps) {
  const t = useTranslations("reviews.detail.report");
  const tStatus = useTranslations("reviews.status");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;
  const utils = trpc.useUtils();

  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);

  // Fetch report data with structured content via tRPC
  const {
    data: reportData,
    isLoading: isLoadingReport,
    error: reportError,
  } = trpc.report.getByReviewId.useQuery(
    { reviewId: review.id },
    {
      enabled: !!review.id,
    }
  );

  // Fetch findings for prerequisite checks
  const { data: findingsData } = trpc.finding.getByReview.useQuery(
    { reviewId: review.id },
    { enabled: !!review.id }
  );

  const generateMutation = trpc.report.generate.useMutation({
    onSuccess: () => {
      toast.success(t("generateSuccess"));
      utils.report.getByReviewId.invalidate({ reviewId: review.id });
      setShowGenerateDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || t("generateError"));
    },
  });

  const updateStatusMutation = trpc.report.updateReportStatus.useMutation({
    onSuccess: () => {
      toast.success(t("workflow.statusUpdateSuccess"));
      utils.report.getByReviewId.invalidate({ reviewId: review.id });
      setShowSubmitDialog(false);
      setShowFinalizeDialog(false);
      setShowReturnDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || t("submitError"));
    },
  });

  // Calculate prerequisites based on findings
  type FindingWithCap = { severity: string; correctiveActionPlan?: { status: string } | null };
  const findings: FindingWithCap[] = findingsData || [];
  const criticalFindings = findings.filter((f) => f.severity === "CRITICAL");
  const majorFindings = findings.filter((f) => f.severity === "MAJOR");
  const findingsNeedingCap = [...criticalFindings, ...majorFindings];
  const capsSubmitted = findingsNeedingCap.filter(
    (f) =>
      f.correctiveActionPlan &&
      ["SUBMITTED", "ACCEPTED", "IMPLEMENTED", "VERIFIED", "CLOSED"].includes(
        f.correctiveActionPlan.status
      )
  );
  const allFindingsDocumented = findings.length > 0;
  const allCapsSubmitted =
    findingsNeedingCap.length === 0 ||
    capsSubmitted.length === findingsNeedingCap.length;
  const reviewInProgress = review.status === "IN_PROGRESS";
  const reviewCompleted = review.status === "COMPLETED";

  // Build prerequisites items for the new component
  const prerequisiteItems: PrerequisiteItem[] = useMemo(() => [
    {
      id: "findings",
      label: t("prerequisites.findingsDocumented"),
      status: allFindingsDocumented ? "complete" : "incomplete",
      required: true,
      detail: allFindingsDocumented
        ? t("prerequisites.findingsComplete", { count: findings.length })
        : t("prerequisites.findingsNeeded"),
      progress: { current: findings.length, total: findings.length || 1 },
      action: !allFindingsDocumented
        ? {
            label: t("prerequisites.addFindings"),
            href: `/${locale}/reviews/${review.id}?tab=findings&action=new`,
          }
        : undefined,
    },
    {
      id: "caps",
      label: t("prerequisites.capsSubmitted"),
      status: allCapsSubmitted
        ? "complete"
        : capsSubmitted.length > 0
        ? "in-progress"
        : "incomplete",
      required: true,
      detail: findingsNeedingCap.length === 0
        ? t("prerequisites.noCapsRequired")
        : t("prerequisites.capsProgress", {
            submitted: capsSubmitted.length,
            total: findingsNeedingCap.length,
          }),
      progress:
        findingsNeedingCap.length > 0
          ? { current: capsSubmitted.length, total: findingsNeedingCap.length }
          : undefined,
      action: !allCapsSubmitted
        ? {
            label: t("prerequisites.submitCaps"),
            href: `/${locale}/caps?review=${review.id}`,
          }
        : undefined,
    },
    {
      id: "review",
      label: t("prerequisites.reviewStatus"),
      status: reviewCompleted
        ? "complete"
        : reviewInProgress
        ? "in-progress"
        : "incomplete",
      required: false,
      detail: t("prerequisites.currentStatus", { status: tStatus(review.status) }),
    },
  ], [
    allFindingsDocumented,
    allCapsSubmitted,
    capsSubmitted.length,
    findingsNeedingCap.length,
    findings.length,
    reviewCompleted,
    reviewInProgress,
    review.id,
    review.status,
    locale,
    t,
    tStatus,
  ]);

  const requiredPrerequisitesMet = prerequisiteItems
    .filter((p) => p.required)
    .every((p) => p.status === "complete");

  const canGenerate = requiredPrerequisitesMet;
  const hasReport = reportData && !reportError;

  // Determine which date to show
  const getReportDate = () => {
    if (!hasReport) return null;
    if (reportData.finalizedAt) return reportData.finalizedAt;
    if (reportData.reviewedAt) return reportData.reviewedAt;
    if (reportData.draftedAt) return reportData.draftedAt;
    return reportData.updatedAt;
  };

  const handleContentUpdated = () => {
    utils.report.getByReviewId.invalidate({ reviewId: review.id });
  };

  const handleDownload = () => {
    window.open(
      `/api/report/export?reviewId=${review.id}&format=docx&locale=${locale}`,
      "_blank"
    );
  };

  const handleSubmitForReview = () => {
    setShowSubmitDialog(true);
  };

  const handleFinalize = () => {
    setShowFinalizeDialog(true);
  };

  const handleReturnToDraft = () => {
    setShowReturnDialog(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {/* Current Report Status */}
      {isLoadingReport ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : hasReport ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileOutput className="h-5 w-5" />
                {t("currentReport")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date info */}
            {getReportDate() && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {t("generatedAt", {
                  date: format(new Date(getReportDate()!), "PPp", {
                    locale: dateLocale,
                  }),
                })}
              </p>
            )}

            {/* Workflow Actions Bar */}
            <ReportWorkflowActions
              status={reportData.status}
              version={reportData.version}
              userRole={userRole}
              canRegenerate={canGenerate}
              isRegenerating={generateMutation.isPending}
              isUpdatingStatus={updateStatusMutation.isPending}
              onRegenerate={() => setShowGenerateDialog(true)}
              onSubmitForReview={handleSubmitForReview}
              onFinalize={handleFinalize}
              onReturnToDraft={handleReturnToDraft}
              onDownload={handleDownload}
            />

            {/* Version History */}
            <VersionHistoryPanel
              currentVersion={reportData.version}
              currentStatus={reportData.status}
              currentUpdatedAt={reportData.updatedAt}
              currentGeneratedBy={reportData.content?.metadata?.generatedBy ?? null}
              versionHistory={reportData.versionHistory}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">{t("noReport")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("noReportDescription")}
            </p>
            <Button
              onClick={() => setShowGenerateDialog(true)}
              disabled={!canGenerate || generateMutation.isPending}
            >
              {generateMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <FileOutput className="h-4 w-4 mr-2" />
              {t("generateReport")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Report Viewer (when structured content exists) */}
      {hasReport && reportData.content && (
        <ReportViewer
          content={reportData.content}
          reviewId={review.id}
          reportStatus={reportData.status}
          onContentUpdated={handleContentUpdated}
        />
      )}

      {/* Regeneration prompt for pre-existing reports without structured content */}
      {hasReport && !reportData.content && (
        <Card>
          <CardContent className="py-8 text-center">
            <RefreshCw className="h-10 w-10 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">{t("contentUpgradeNeeded")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("contentUpgradeDescription")}
            </p>
            <Button
              onClick={() => setShowGenerateDialog(true)}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("regenerate")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Prerequisites */}
      <PrerequisitesChecklist
        title={t("prerequisites.title")}
        description={t("prerequisites.description")}
        items={prerequisiteItems}
        showNextStep={!requiredPrerequisitesMet}
      />

      {/* Generate Confirmation Dialog */}
      <AlertDialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hasReport
                ? t("regenerateConfirmTitle")
                : t("generateConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hasReport
                ? t("regenerateConfirmDescription")
                : t("generateConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                generateMutation.mutate({
                  reviewId: review.id,
                  locale: locale === "fr" ? "fr" : "en",
                })
              }
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {hasReport ? t("regenerate") : t("generate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit for Review Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("submitConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("submitConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                updateStatusMutation.mutate({
                  reviewId: review.id,
                  status: "UNDER_REVIEW",
                })
              }
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t("submit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Finalize Confirmation Dialog */}
      <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("workflow.finalizeConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("workflow.finalizeConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                updateStatusMutation.mutate({
                  reviewId: review.id,
                  status: "FINALIZED",
                })
              }
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t("workflow.finalize")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Return to Draft Confirmation Dialog */}
      <AlertDialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("workflow.returnToDraftConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("workflow.returnToDraftConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                updateStatusMutation.mutate({
                  reviewId: review.id,
                  status: "DRAFT",
                })
              }
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t("workflow.returnToDraft")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
