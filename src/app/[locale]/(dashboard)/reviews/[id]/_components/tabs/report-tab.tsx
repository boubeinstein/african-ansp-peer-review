"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
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
}

interface Prerequisite {
  id: string;
  label: string;
  met: boolean;
  required: boolean;
  detail?: string;
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
  const findings = findingsData || [];
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
  const reviewCompleted = ["COMPLETED", "IN_PROGRESS"].includes(review.status);

  const prerequisites: Prerequisite[] = [
    {
      id: "findings",
      label: t("prerequisites.findingsDocumented"),
      met: allFindingsDocumented,
      required: true,
      detail: t("prerequisites.findingsDetail", { count: findings.length }),
    },
    {
      id: "caps",
      label: t("prerequisites.capsSubmitted"),
      met: allCapsSubmitted,
      required: true,
      detail: t("prerequisites.capsDetail", {
        submitted: capsSubmitted.length,
        total: findingsNeedingCap.length,
      }),
    },
    {
      id: "review",
      label: t("prerequisites.reviewStatus"),
      met: reviewCompleted,
      required: false,
      detail: t("prerequisites.reviewDetail", { status: tStatus(review.status) }),
    },
  ];

  const requiredPrerequisitesMet = prerequisites
    .filter((p) => p.required)
    .every((p) => p.met);
  const prerequisiteProgress = Math.round(
    (prerequisites.filter((p) => p.met).length / prerequisites.length) * 100
  );

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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("prerequisites.title")}</CardTitle>
          <CardDescription>{t("prerequisites.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Progress value={prerequisiteProgress} className="flex-1" />
            <span className="text-sm font-medium">{prerequisiteProgress}%</span>
          </div>

          <div className="space-y-3">
            {prerequisites.map((prereq) => (
              <div
                key={prereq.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border",
                  prereq.met
                    ? "bg-green-50/50 border-green-200"
                    : "bg-muted/50 border-muted"
                )}
              >
                {prereq.met ? (
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                ) : prereq.required ? (
                  <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "font-medium text-sm",
                        prereq.met && "text-green-800"
                      )}
                    >
                      {prereq.label}
                    </p>
                    {prereq.required && !prereq.met && (
                      <Badge variant="destructive" className="text-xs">
                        {t("prerequisites.required")}
                      </Badge>
                    )}
                  </div>
                  {prereq.detail && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {prereq.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!requiredPrerequisitesMet && (
            <p className="text-sm text-amber-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {t("prerequisites.notMet")}
            </p>
          )}
        </CardContent>
      </Card>

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
