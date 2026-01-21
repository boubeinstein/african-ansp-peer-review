"use client";

/**
 * Report Actions Component
 *
 * Provides actions for viewing, generating, and downloading peer review reports.
 * Handles different report states: not generated, generating, ready, published.
 */

import { useTranslations } from "next-intl";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  Download,
  Eye,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Send,
  FileCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// =============================================================================
// TYPES
// =============================================================================

// Report status from the database (matches Prisma schema)
type ReportStatus = "DRAFT" | "UNDER_REVIEW" | "FINALIZED";

interface ReportData {
  id: string;
  status: string;
  pdfUrl?: string | null;
  draftedAt?: Date | null;
  finalizedAt?: Date | null;
}

interface ReportActionsProps {
  reviewId: string;
  reviewStatus: string;
  locale: string;
  report?: ReportData | null;
  canGenerateReport?: boolean;
  canPublishReport?: boolean;
  className?: string;
  onReportGenerated?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const REPORT_STATUS_CONFIG: Record<
  ReportStatus | "NOT_GENERATED",
  { color: string; bgColor: string; icon: typeof CheckCircle2 }
> = {
  NOT_GENERATED: {
    color: "text-gray-700",
    bgColor: "bg-gray-100 border-gray-300",
    icon: FileText,
  },
  DRAFT: {
    color: "text-blue-700",
    bgColor: "bg-blue-100 border-blue-300",
    icon: FileText,
  },
  UNDER_REVIEW: {
    color: "text-purple-700",
    bgColor: "bg-purple-100 border-purple-300",
    icon: FileCheck,
  },
  FINALIZED: {
    color: "text-green-700",
    bgColor: "bg-green-100 border-green-300",
    icon: CheckCircle2,
  },
};

// Review statuses that allow report generation
const REPORT_ELIGIBLE_STATUSES = ["IN_PROGRESS", "REPORT_DRAFTING", "REPORT_REVIEW", "COMPLETED"];

// =============================================================================
// COMPONENT
// =============================================================================

export function ReportActions({
  reviewId,
  reviewStatus,
  locale,
  report,
  canGenerateReport = false,
  canPublishReport = false,
  className,
  onReportGenerated,
}: ReportActionsProps) {
  const t = useTranslations("review.detail.report");
  const utils = trpc.useUtils();

  // tRPC mutations
  const generateMutation = trpc.report.generate.useMutation({
    onSuccess: () => {
      toast.success(t("generateSuccess"));
      utils.review.getById.invalidate({ id: reviewId });
      onReportGenerated?.();
    },
    onError: (error) => {
      toast.error(t("generateError") || "Failed to generate report", {
        description: error.message,
      });
    },
  });

  const updateStatusMutation = trpc.report.updateStatus.useMutation({
    onSuccess: (data) => {
      if (data.status === "UNDER_REVIEW") {
        toast.success(t("sentForReview"));
      } else if (data.status === "FINALIZED") {
        toast.success(t("publishSuccess"));
      }
      utils.review.getById.invalidate({ id: reviewId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Check if review is in a status that allows report actions
  const canShowReportSection = REPORT_ELIGIBLE_STATUSES.includes(reviewStatus);

  // If review is not in an eligible status, don't render
  if (!canShowReportSection) {
    return null;
  }

  // Determine display status
  const displayStatus: ReportStatus | "NOT_GENERATED" = report
    ? (report.status as ReportStatus)
    : "NOT_GENERATED";

  const statusConfig = REPORT_STATUS_CONFIG[displayStatus];
  const StatusIcon = statusConfig.icon;

  // Loading states
  const isGenerating = generateMutation.isPending;
  const isUpdatingStatus = updateStatusMutation.isPending;

  // Handle generate report
  const handleGenerateReport = () => {
    generateMutation.mutate({ reviewId });
  };

  // Handle download report
  const handleDownloadReport = () => {
    if (report?.pdfUrl) {
      window.open(report.pdfUrl, "_blank");
    } else {
      toast.info(t("downloadPreparing"));
    }
  };

  // Handle publish report (finalize)
  const handlePublishReport = () => {
    if (report?.id) {
      updateStatusMutation.mutate({ reportId: report.id, status: "FINALIZED" });
    }
  };

  // Handle send for review
  const handleSendForReview = () => {
    if (report?.id) {
      updateStatusMutation.mutate({ reportId: report.id, status: "UNDER_REVIEW" });
    }
  };

  // Handle return to draft (for request changes)
  const handleRequestChanges = () => {
    if (report?.id) {
      updateStatusMutation.mutate({ reportId: report.id, status: "DRAFT" });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("title")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>

          {/* Status Badge */}
          <Badge
            variant="outline"
            className={`border ${statusConfig.bgColor} ${statusConfig.color}`}
          >
            <StatusIcon className="h-3 w-3 mr-1" />
            {t(`status.${displayStatus.toLowerCase()}`)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* Report Info (when draft or finalized) */}
        {(displayStatus === "DRAFT" || displayStatus === "UNDER_REVIEW" || displayStatus === "FINALIZED") && report?.draftedAt && (
          <div className="text-sm text-muted-foreground">
            <p>
              {t("generatedAt", {
                date: new Date(report.draftedAt).toLocaleDateString(locale, {
                  dateStyle: "medium",
                }),
              })}
            </p>
            {report.finalizedAt && (
              <p>
                {t("publishedAt", {
                  date: new Date(report.finalizedAt).toLocaleDateString(locale, {
                    dateStyle: "medium",
                  }),
                })}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Not Generated State */}
          {displayStatus === "NOT_GENERATED" && canGenerateReport && (
            <Button onClick={handleGenerateReport} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("generating")}
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  {t("generate")}
                </>
              )}
            </Button>
          )}

          {/* Draft State */}
          {displayStatus === "DRAFT" && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/${locale}/reviews/${reviewId}/report`}>
                  <Eye className="h-4 w-4 mr-2" />
                  {t("viewDraft")}
                </Link>
              </Button>

              {canGenerateReport && (
                <Button variant="outline" onClick={handleGenerateReport} disabled={isGenerating}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t("regenerate")}
                </Button>
              )}

              {canPublishReport && (
                <Button onClick={handleSendForReview} disabled={isUpdatingStatus}>
                  {isUpdatingStatus ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {t("sendForReview")}
                </Button>
              )}
            </>
          )}

          {/* Under Review State */}
          {displayStatus === "UNDER_REVIEW" && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/${locale}/reviews/${reviewId}/report`}>
                  <Eye className="h-4 w-4 mr-2" />
                  {t("viewReport")}
                </Link>
              </Button>

              {canPublishReport && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      {t("reviewActions")}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={handlePublishReport} disabled={isUpdatingStatus}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {t("approveAndPublish")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleRequestChanges} disabled={isUpdatingStatus}>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      {t("requestChanges")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleDownloadReport}>
                      <Download className="h-4 w-4 mr-2" />
                      {t("downloadPdf")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}

          {/* Finalized State */}
          {displayStatus === "FINALIZED" && (
            <>
              <Button asChild>
                <Link href={`/${locale}/reviews/${reviewId}/report`}>
                  <Eye className="h-4 w-4 mr-2" />
                  {t("viewReport")}
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    {t("download")}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={handleDownloadReport}>
                    <FileText className="h-4 w-4 mr-2" />
                    {t("downloadPdf")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => toast.info(t("exportWord"))}>
                    <FileText className="h-4 w-4 mr-2" />
                    {t("downloadWord")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        {/* Help Text for Not Generated */}
        {displayStatus === "NOT_GENERATED" && !canGenerateReport && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t("cannotGenerate")}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default ReportActions;
