"use client";

/**
 * Review Timeline Component
 *
 * Visual timeline showing review phases and progress with dates,
 * durations, and key metrics.
 */

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { format, formatDistanceStrict, differenceInDays } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  Loader2,
  Calendar,
  Users,
  FileText,
  ClipboardCheck,
  Flag,
  Send,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ReviewStatus, ApprovalStatus } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface TimelinePhase {
  id: string;
  nameKey: string;
  status: "complete" | "current" | "pending" | "blocked";
  date?: Date | null;
  expectedDate?: Date | null;
  icon: React.ElementType;
  metadata?: Record<string, string | number | null | undefined>;
}

interface ReviewForTimeline {
  id: string;
  status: ReviewStatus;
  requestedDate: Date;
  requestedStartDate?: Date | null;
  requestedEndDate?: Date | null;
  plannedStartDate?: Date | null;
  plannedEndDate?: Date | null;
  actualStartDate?: Date | null;
  actualEndDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  teamMembers?: { id: string }[];
  approvals?: {
    id: string;
    status: ApprovalStatus;
    approvedAt?: Date | null;
  }[];
  report?: {
    id: string;
    status: string;
    draftedAt?: Date | null;
    reviewedAt?: Date | null;
    finalizedAt?: Date | null;
  } | null;
  findings?: { id: string }[];
  _count?: {
    teamMembers?: number;
    findings?: number;
  };
}

interface ReviewTimelineProps {
  review: ReviewForTimeline;
  showDurations?: boolean;
  compact?: boolean;
}

// =============================================================================
// PHASE BUILDER
// =============================================================================

function buildTimelinePhases(review: ReviewForTimeline): TimelinePhase[] {
  const teamCount = review._count?.teamMembers ?? review.teamMembers?.length ?? 0;
  const findingsCount = review._count?.findings ?? review.findings?.length ?? 0;
  const approval = review.approvals?.find((a) => a.status === "APPROVED");
  const isApproved = !!approval;
  const isCancelled = review.status === "CANCELLED";

  // Helper to determine phase status
  const getPhaseStatus = (
    isComplete: boolean,
    isCurrent: boolean,
    isBlocked: boolean = false
  ): TimelinePhase["status"] => {
    if (isBlocked || isCancelled) return "blocked";
    if (isComplete) return "complete";
    if (isCurrent) return "current";
    return "pending";
  };

  // Determine current status position
  const statusOrder: ReviewStatus[] = [
    "REQUESTED",
    "APPROVED",
    "PLANNING",
    "SCHEDULED",
    "IN_PROGRESS",
    "REPORT_DRAFTING",
    "REPORT_REVIEW",
    "COMPLETED",
  ];
  const currentIndex = statusOrder.indexOf(review.status);

  const phases: TimelinePhase[] = [
    // 1. Request Submitted
    {
      id: "request_submitted",
      nameKey: "requestSubmitted",
      status: "complete", // Always complete if we have the review
      date: review.requestedDate,
      icon: Send,
    },

    // 2. Request Approved
    {
      id: "request_approved",
      nameKey: "requestApproved",
      status: getPhaseStatus(
        isApproved,
        review.status === "REQUESTED",
        isCancelled && !isApproved
      ),
      date: approval?.approvedAt,
      expectedDate: !isApproved ? review.requestedStartDate : null,
      icon: CheckCircle2,
    },

    // 3. Team Assigned
    {
      id: "team_assigned",
      nameKey: "teamAssigned",
      status: getPhaseStatus(
        teamCount > 0,
        isApproved && teamCount === 0 && currentIndex >= 1,
        isCancelled && teamCount === 0
      ),
      date: teamCount > 0 ? review.updatedAt : null, // Approximate
      icon: Users,
      metadata: teamCount > 0 ? { teamCount } : undefined,
    },

    // 4. Dates Confirmed
    {
      id: "dates_confirmed",
      nameKey: "datesConfirmed",
      status: getPhaseStatus(
        !!review.plannedStartDate && !!review.plannedEndDate,
        currentIndex >= 2 && (!review.plannedStartDate || !review.plannedEndDate),
        isCancelled && !review.plannedStartDate
      ),
      date: review.plannedStartDate && review.plannedEndDate ? review.updatedAt : null,
      expectedDate: review.requestedStartDate,
      icon: Calendar,
      metadata:
        review.plannedStartDate && review.plannedEndDate
          ? {
              startDate: format(new Date(review.plannedStartDate), "PP"),
              endDate: format(new Date(review.plannedEndDate), "PP"),
            }
          : undefined,
    },

    // 5. Review Started
    {
      id: "review_started",
      nameKey: "reviewStarted",
      status: getPhaseStatus(
        !!review.actualStartDate,
        review.status === "SCHEDULED" || (currentIndex >= 4 && !review.actualStartDate),
        isCancelled && !review.actualStartDate
      ),
      date: review.actualStartDate,
      expectedDate: review.plannedStartDate,
      icon: Flag,
    },

    // 6. Fieldwork Complete
    {
      id: "fieldwork_complete",
      nameKey: "fieldworkComplete",
      status: getPhaseStatus(
        !!review.actualEndDate,
        review.status === "IN_PROGRESS",
        isCancelled && !review.actualEndDate
      ),
      date: review.actualEndDate,
      expectedDate: review.plannedEndDate,
      icon: ClipboardCheck,
      metadata: findingsCount > 0 ? { findingsCount } : undefined,
    },

    // 7. Report Drafted
    {
      id: "report_drafted",
      nameKey: "reportDrafted",
      status: getPhaseStatus(
        !!review.report?.draftedAt,
        review.status === "REPORT_DRAFTING",
        isCancelled && !review.report?.draftedAt
      ),
      date: review.report?.draftedAt,
      icon: FileText,
    },

    // 8. Report Finalized
    {
      id: "report_finalized",
      nameKey: "reportFinalized",
      status: getPhaseStatus(
        !!review.report?.finalizedAt,
        review.status === "REPORT_REVIEW",
        isCancelled && !review.report?.finalizedAt
      ),
      date: review.report?.finalizedAt,
      icon: FileText,
    },

    // 9. Review Closed
    {
      id: "review_closed",
      nameKey: "reviewClosed",
      status: getPhaseStatus(
        review.status === "COMPLETED",
        false,
        isCancelled
      ),
      date: review.status === "COMPLETED" ? review.updatedAt : null,
      icon: Building2,
    },
  ];

  return phases;
}

// =============================================================================
// TIMELINE ITEM
// =============================================================================

interface TimelineItemProps {
  phase: TimelinePhase;
  isLast: boolean;
  previousDate?: Date | null;
  showDuration: boolean;
  compact: boolean;
}

function TimelineItem({
  phase,
  isLast,
  previousDate,
  showDuration,
  compact,
}: TimelineItemProps) {
  const t = useTranslations("reviews.timeline");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  // Status styling
  const statusConfig = {
    complete: {
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      lineColor: "bg-green-500",
      textColor: "text-foreground",
    },
    current: {
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      lineColor: "bg-blue-500",
      textColor: "text-blue-600 dark:text-blue-400 font-medium",
    },
    pending: {
      iconBg: "bg-muted",
      iconColor: "text-muted-foreground",
      lineColor: "bg-muted",
      textColor: "text-muted-foreground",
    },
    blocked: {
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      lineColor: "bg-red-300",
      textColor: "text-red-600 dark:text-red-400",
    },
  };

  const config = statusConfig[phase.status];
  const Icon = phase.icon;

  // Calculate duration from previous phase
  const duration = useMemo(() => {
    if (!showDuration || !phase.date || !previousDate) return null;
    const days = differenceInDays(new Date(phase.date), new Date(previousDate));
    if (days === 0) return t("sameDay");
    return formatDistanceStrict(new Date(phase.date), new Date(previousDate), {
      locale: dateLocale,
    });
  }, [phase.date, previousDate, showDuration, dateLocale, t]);

  return (
    <div className={cn("relative flex gap-4", compact ? "pb-4" : "pb-6")}>
      {/* Vertical line */}
      {!isLast && (
        <div
          className={cn(
            "absolute left-4 top-8 bottom-0 w-0.5 -translate-x-1/2",
            phase.status === "complete" ? config.lineColor : "bg-muted"
          )}
        />
      )}

      {/* Icon */}
      <div
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full",
          compact ? "h-8 w-8" : "h-10 w-10",
          config.iconBg
        )}
      >
        {phase.status === "current" ? (
          <Loader2 className={cn("animate-spin", config.iconColor, compact ? "h-4 w-4" : "h-5 w-5")} />
        ) : (
          <Icon className={cn(config.iconColor, compact ? "h-4 w-4" : "h-5 w-5")} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("font-medium", config.textColor, compact && "text-sm")}>
            {t(`phases.${phase.nameKey}`)}
          </span>
          {phase.status === "current" && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              {t("inProgress")}
            </Badge>
          )}
          {phase.status === "blocked" && (
            <Badge variant="destructive" className="text-xs">
              {t("blocked")}
            </Badge>
          )}
        </div>

        {/* Date info */}
        <div className={cn("flex items-center gap-2 mt-1", compact ? "text-xs" : "text-sm")}>
          {phase.date ? (
            <span className="text-muted-foreground">
              {format(new Date(phase.date), "PPP", { locale: dateLocale })}
            </span>
          ) : phase.expectedDate ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t("expected")}: {format(new Date(phase.expectedDate), "PP", { locale: dateLocale })}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("expectedDateTooltip")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-muted-foreground italic">{t("pending")}</span>
          )}

          {/* Duration badge */}
          {duration && (
            <Badge variant="secondary" className="text-xs">
              {duration}
            </Badge>
          )}
        </div>

        {/* Metadata */}
        {phase.metadata && (
          <div className={cn("mt-1 flex flex-wrap gap-2", compact ? "text-xs" : "text-sm")}>
            {typeof phase.metadata.teamCount === "number" && (
              <span className="text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {t("teamMembers", { count: phase.metadata.teamCount })}
              </span>
            )}
            {typeof phase.metadata.findingsCount === "number" && (
              <span className="text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t("findings", { count: phase.metadata.findingsCount })}
              </span>
            )}
            {phase.metadata.startDate && phase.metadata.endDate && (
              <span className="text-muted-foreground">
                {phase.metadata.startDate} → {phase.metadata.endDate}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// PROGRESS SUMMARY
// =============================================================================

interface ProgressSummaryProps {
  phases: TimelinePhase[];
}

function ProgressSummary({ phases }: ProgressSummaryProps) {
  const t = useTranslations("reviews.timeline");

  const completedCount = phases.filter((p) => p.status === "complete").length;
  const totalCount = phases.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const currentPhase = phases.find((p) => p.status === "current");
  const blockedPhase = phases.find((p) => p.status === "blocked");

  return (
    <div className="mb-6 p-4 rounded-lg bg-muted/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{t("progress")}</span>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{totalCount} {t("phasesComplete")}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-500",
            blockedPhase ? "bg-red-500" : "bg-green-500"
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Current/Blocked status */}
      {currentPhase && (
        <p className="mt-2 text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t("currentPhase")}: {t(`phases.${currentPhase.nameKey}`)}
        </p>
      )}
      {blockedPhase && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          {t("blockedAt")}: {t(`phases.${blockedPhase.nameKey}`)}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ReviewTimeline({
  review,
  showDurations = true,
  compact = false,
}: ReviewTimelineProps) {
  const phases = useMemo(() => buildTimelinePhases(review), [review]);

  return (
    <div className="relative">
      {!compact && <ProgressSummary phases={phases} />}

      <div className={compact ? "space-y-0" : "space-y-0"}>
        {phases.map((phase, index) => (
          <TimelineItem
            key={phase.id}
            phase={phase}
            isLast={index === phases.length - 1}
            previousDate={index > 0 ? phases[index - 1].date : null}
            showDuration={showDurations}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export { buildTimelinePhases };
export type { ReviewForTimeline };
