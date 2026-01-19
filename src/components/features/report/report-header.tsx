"use client";

/**
 * Report Header Component
 *
 * Displays report title, status, review details, and action buttons.
 * Supports role-based action visibility.
 */

import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  FileText,
  Calendar,
  Building2,
  Send,
  CheckCircle,
  Edit,
  Download,
  Clock,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ReviewType, ReviewPhase, MaturityLevel } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

type ReportStatus = "DRAFT" | "UNDER_REVIEW" | "FINALIZED";

interface ReportData {
  id: string;
  titleEn: string;
  titleFr: string;
  status: ReportStatus;
  draftedAt: Date | null;
  reviewedAt: Date | null;
  finalizedAt: Date | null;
  overallEI: number | null;
  overallMaturity: MaturityLevel | null;
}

interface ReviewData {
  id: string;
  referenceNumber: string;
  reviewType: ReviewType;
  status: string;
  phase: ReviewPhase;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  hostOrganization: {
    id: string;
    nameEn: string;
    nameFr: string;
    icaoCode: string | null;
    country: string;
  };
}

interface ReportHeaderProps {
  report: ReportData;
  review: ReviewData;
  canEdit?: boolean;
  canSubmit?: boolean;
  canFinalize?: boolean;
  onEdit?: () => void;
  onStatusChange?: (status: ReportStatus) => void;
  onExportPDF?: () => void;
  className?: string;
}

// =============================================================================
// STATUS CONFIGURATION
// =============================================================================

const STATUS_CONFIG: Record<ReportStatus, {
  color: string;
  icon: React.ElementType;
}> = {
  DRAFT: {
    color: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
    icon: Edit,
  },
  UNDER_REVIEW: {
    color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
    icon: Clock,
  },
  FINALIZED: {
    color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
    icon: CheckCircle,
  },
};

const REVIEW_TYPE_LABELS: Record<ReviewType, { en: string; fr: string }> = {
  FULL: { en: "Full Review", fr: "Revue Complète" },
  FOCUSED: { en: "Focused Review", fr: "Revue Ciblée" },
  FOLLOW_UP: { en: "Follow-up Review", fr: "Revue de Suivi" },
  SURVEILLANCE: { en: "Surveillance", fr: "Surveillance" },
};

const PHASE_LABELS: Record<ReviewPhase, { en: string; fr: string }> = {
  PLANNING: { en: "Planning", fr: "Planification" },
  PREPARATION: { en: "Preparation", fr: "Préparation" },
  ON_SITE: { en: "On-Site", fr: "Sur Site" },
  REPORTING: { en: "Reporting", fr: "Rapportage" },
  FOLLOW_UP: { en: "Follow-up", fr: "Suivi" },
  CLOSED: { en: "Closed", fr: "Clôturé" },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ReportHeader({
  report,
  review,
  canEdit = false,
  canSubmit = false,
  canFinalize = false,
  onEdit,
  onStatusChange,
  onExportPDF,
  className,
}: ReportHeaderProps) {
  const t = useTranslations("report");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  const statusConfig = STATUS_CONFIG[report.status];
  const StatusIcon = statusConfig.icon;

  const title = locale === "fr" ? report.titleFr : report.titleEn;
  const orgName = locale === "fr"
    ? review.hostOrganization.nameFr
    : review.hostOrganization.nameEn;
  const reviewTypeLabel = locale === "fr"
    ? REVIEW_TYPE_LABELS[review.reviewType].fr
    : REVIEW_TYPE_LABELS[review.reviewType].en;
  const phaseLabel = locale === "fr"
    ? PHASE_LABELS[review.phase].fr
    : PHASE_LABELS[review.phase].en;

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return format(new Date(date), "dd MMM yyyy", { locale: dateLocale });
  };

  const getDateRange = (start: Date | null, end: Date | null) => {
    if (!start && !end) return "—";
    if (!start) return `— ${formatDate(end)}`;
    if (!end) return `${formatDate(start)} —`;
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Left: Title and Details */}
          <div className="flex-1 space-y-4">
            {/* Title and Status */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">{title}</h1>
              </div>
              <Badge
                variant="outline"
                className={cn("gap-1 w-fit", statusConfig.color)}
              >
                <StatusIcon className="h-3 w-3" />
                {t(`status.${report.status}`)}
              </Badge>
            </div>

            {/* Review Reference */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-mono text-sm">{review.referenceNumber}</span>
              <span>•</span>
              <Badge variant="secondary" className="text-xs">
                {reviewTypeLabel}
              </Badge>
              <span>•</span>
              <Badge variant="outline" className="text-xs">
                {phaseLabel}
              </Badge>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {/* Host Organization */}
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("hostOrganization")}
                  </p>
                  <p className="font-medium text-sm">{orgName}</p>
                  {review.hostOrganization.icaoCode && (
                    <p className="text-xs text-muted-foreground">
                      {review.hostOrganization.icaoCode}
                    </p>
                  )}
                </div>
              </div>

              {/* Country */}
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("country")}
                  </p>
                  <p className="font-medium text-sm">
                    {review.hostOrganization.country}
                  </p>
                </div>
              </div>

              {/* Planned Dates */}
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("plannedDates")}
                  </p>
                  <p className="font-medium text-sm">
                    {getDateRange(review.plannedStartDate, review.plannedEndDate)}
                  </p>
                </div>
              </div>

              {/* Actual Dates */}
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("actualDates")}
                  </p>
                  <p className="font-medium text-sm">
                    {getDateRange(review.actualStartDate, review.actualEndDate)}
                  </p>
                </div>
              </div>
            </div>

            {/* Report Dates */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
              {report.draftedAt && (
                <span>
                  {t("draftedAt")}: {formatDate(report.draftedAt)}
                </span>
              )}
              {report.reviewedAt && (
                <span>
                  {t("reviewedAt")}: {formatDate(report.reviewedAt)}
                </span>
              )}
              {report.finalizedAt && (
                <span>
                  {t("finalizedAt")}: {formatDate(report.finalizedAt)}
                </span>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            {/* Edit Button - Only show for DRAFT status */}
            {canEdit && report.status === "DRAFT" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onEdit}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      {tCommon("edit")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("editTooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Submit for Review Button */}
            {canSubmit && report.status === "DRAFT" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStatusChange?.("UNDER_REVIEW")}
                      className="gap-2"
                    >
                      <Send className="h-4 w-4" />
                      {t("submitForReview")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("submitTooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Finalize Button */}
            {canFinalize && report.status === "UNDER_REVIEW" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={() => onStatusChange?.("FINALIZED")}
                      className="gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {t("finalize")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("finalizeTooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Export PDF Button */}
            {report.status === "FINALIZED" && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportPDF}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {t("exportPDF")}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ReportHeader;
