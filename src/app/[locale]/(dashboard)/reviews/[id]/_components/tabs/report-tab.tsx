"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Download,
  Eye,
  RefreshCw,
  Clock,
  Loader2,
  FileOutput,
  Send,
  CheckCircle2,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ReviewData } from "../../_lib/fetch-review-data";

interface ReportTabProps {
  review: ReviewData;
  locale?: string;
}

export function ReportTab({ review }: ReportTabProps) {
  const t = useTranslations("reviews.detail.report");
  const tStatus = useTranslations("reviews.status");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;
  const utils = trpc.useUtils();

  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  // Fetch full report data via tRPC (returns null if no report exists yet)
  const {
    data: reportData,
    isLoading: isLoadingReport,
    error: reportError,
  } = trpc.report.getByReview.useQuery(
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
      utils.report.getByReview.invalidate({ reviewId: review.id });
      setShowGenerateDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || t("generateError"));
    },
  });

  const updateStatusMutation = trpc.report.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(t("submitSuccess"));
      utils.report.getByReview.invalidate({ reviewId: review.id });
      setShowSubmitDialog(false);
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
  // Report exists if we have data and no error
  const hasReport = reportData && !reportError;
  const canSubmit = hasReport && reportData.report.status === "DRAFT";

  const reportStatusConfig: Record<
    string,
    { color: string; icon: React.ReactNode }
  > = {
    DRAFT: {
      color: "bg-gray-100 text-gray-800",
      icon: <FileText className="h-4 w-4" />,
    },
    UNDER_REVIEW: {
      color: "bg-blue-100 text-blue-800",
      icon: <Send className="h-4 w-4" />,
    },
    FINALIZED: {
      color: "bg-green-100 text-green-800",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
  };

  const handleSubmit = () => {
    if (hasReport) {
      updateStatusMutation.mutate({
        reportId: reportData.report.id,
        status: "UNDER_REVIEW",
      });
    }
  };

  // Determine which date to show
  const getReportDate = () => {
    if (!hasReport) return null;
    // Use finalizedAt if finalized, reviewedAt if under review, else updatedAt
    if (reportData.report.finalizedAt) return reportData.report.finalizedAt;
    if (reportData.report.reviewedAt) return reportData.report.reviewedAt;
    if (reportData.report.draftedAt) return reportData.report.draftedAt;
    return reportData.report.updatedAt;
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
              <Badge
                variant="secondary"
                className={cn(
                  reportStatusConfig[reportData.report.status]?.color
                )}
              >
                {reportStatusConfig[reportData.report.status]?.icon}
                <span className="ml-1">
                  {t(`status.${reportData.report.status}`)}
                </span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="space-y-1">
                {getReportDate() && (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {t("generatedAt", {
                      date: format(new Date(getReportDate()!), "PPp", {
                        locale: dateLocale,
                      }),
                    })}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {reportData.report.pdfUrl && (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={reportData.report.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {t("preview")}
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={reportData.report.pdfUrl} download>
                        <Download className="h-4 w-4 mr-1" />
                        {t("download")}
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowGenerateDialog(true)}
                disabled={!canGenerate || generateMutation.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                {t("regenerate")}
              </Button>
              {canSubmit && (
                <Button
                  onClick={() => setShowSubmitDialog(true)}
                  disabled={updateStatusMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-1" />
                  {t("submitForApproval")}
                </Button>
              )}
            </div>
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
              onClick={() => generateMutation.mutate({ reviewId: review.id })}
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

      {/* Submit Confirmation Dialog */}
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
              onClick={handleSubmit}
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
    </div>
  );
}
