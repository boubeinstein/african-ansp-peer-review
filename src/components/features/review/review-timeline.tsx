"use client";

import { useTranslations } from "next-intl";
import {
  Send,
  CheckCircle2,
  Users,
  Calendar,
  PlayCircle,
  ClipboardCheck,
  FileEdit,
  FileCheck,
  FolderClosed,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

// Review status hierarchy (order matters!)
const STATUS_HIERARCHY = [
  "REQUESTED",
  "APPROVED",
  "PLANNING",
  "SCHEDULED",
  "IN_PROGRESS",
  "REPORT_DRAFTING",
  "REPORT_REVIEW",
  "COMPLETED",
] as const;

type ReviewStatus = (typeof STATUS_HIERARCHY)[number] | "CANCELLED";

interface ReviewData {
  id: string;
  status: ReviewStatus;
  requestedDate: Date | string;
  requestedStartDate?: Date | string | null;
  requestedEndDate?: Date | string | null;
  plannedStartDate?: Date | string | null;
  plannedEndDate?: Date | string | null;
  actualStartDate?: Date | string | null;
  actualEndDate?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  teamMembers?: { id: string; confirmedAt?: Date | null }[];
  approvals?: {
    id: string;
    status: string;
    approvedAt?: Date | null;
  }[];
  report?: {
    id?: string;
    draftedAt?: Date | string | null;
    finalizedAt?: Date | string | null;
    reviewedAt?: Date | string | null;
    status?: string;
  } | null;
  findings?: { id: string }[];
  _count?: {
    teamMembers?: number;
    findings?: number;
  };
}

interface TimelineStep {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  getStatus: (review: ReviewData) => "completed" | "current" | "pending";
  getDate: (review: ReviewData) => Date | null;
  getDetails?: (review: ReviewData) => string | null;
}

// Helper: Check if review has reached or passed a status
function hasReachedStatus(
  review: ReviewData,
  targetStatus: (typeof STATUS_HIERARCHY)[number]
): boolean {
  if (review.status === "CANCELLED") return false;
  const currentIndex = STATUS_HIERARCHY.indexOf(
    review.status as (typeof STATUS_HIERARCHY)[number]
  );
  const targetIndex = STATUS_HIERARCHY.indexOf(targetStatus);
  return currentIndex >= targetIndex;
}

// Helper: Parse date safely
function parseDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Define timeline steps with logic
const TIMELINE_STEPS: TimelineStep[] = [
  {
    id: "requested",
    labelKey: "requestSubmitted",
    icon: Send,
    getStatus: () => {
      // Always completed if we have a review
      return "completed";
    },
    getDate: (review) => parseDate(review.requestedDate),
  },
  {
    id: "approved",
    labelKey: "requestApproved",
    icon: CheckCircle2,
    getStatus: (review) => {
      if (hasReachedStatus(review, "APPROVED")) return "completed";
      if (review.status === "REQUESTED") return "current";
      return "pending";
    },
    getDate: (review) => {
      // If approved or beyond, but no specific date, return null (will show "Completed")
      if (hasReachedStatus(review, "APPROVED")) {
        // Could add approvedAt field to schema, for now return null
        return null;
      }
      return null;
    },
  },
  {
    id: "teamAssigned",
    labelKey: "teamAssigned",
    icon: Users,
    getStatus: (review) => {
      const hasTeam =
        (review.teamMembers?.length ?? review._count?.teamMembers ?? 0) > 0;
      if (hasTeam || hasReachedStatus(review, "SCHEDULED")) return "completed";
      if (hasReachedStatus(review, "APPROVED")) return "current";
      return "pending";
    },
    getDate: (review) => {
      // Get earliest team member assignment date
      const confirmedDates = review.teamMembers
        ?.map((m) => parseDate(m.confirmedAt))
        .filter((d): d is Date => d !== null);
      return confirmedDates?.length
        ? confirmedDates.sort((a, b) => a.getTime() - b.getTime())[0]
        : null;
    },
    getDetails: (review) => {
      const count =
        review.teamMembers?.length ?? review._count?.teamMembers ?? 0;
      return count > 0 ? `${count} team members` : null;
    },
  },
  {
    id: "datesConfirmed",
    labelKey: "datesConfirmed",
    icon: Calendar,
    getStatus: (review) => {
      if (review.plannedStartDate && review.plannedEndDate) return "completed";
      if (hasReachedStatus(review, "IN_PROGRESS")) return "completed"; // Implied
      if (hasReachedStatus(review, "SCHEDULED")) return "current";
      return "pending";
    },
    getDate: (review) => {
      // Return when dates were set (approximate with plannedStartDate)
      return parseDate(review.plannedStartDate);
    },
    getDetails: (review) => {
      const start = parseDate(review.plannedStartDate);
      const end = parseDate(review.plannedEndDate);
      if (start && end) {
        return `${format(start, "MMM d, yyyy")} — ${format(end, "MMM d, yyyy")}`;
      }
      return null;
    },
  },
  {
    id: "reviewStarted",
    labelKey: "reviewStarted",
    icon: PlayCircle,
    getStatus: (review) => {
      if (hasReachedStatus(review, "REPORT_DRAFTING")) return "completed";
      if (hasReachedStatus(review, "IN_PROGRESS")) return "current";
      return "pending";
    },
    getDate: (review) => parseDate(review.actualStartDate),
    getDetails: (review) => {
      const start = parseDate(review.plannedStartDate);
      if (
        hasReachedStatus(review, "IN_PROGRESS") &&
        !review.actualStartDate &&
        start
      ) {
        return `Expected: ${format(start, "MMM d, yyyy")}`;
      }
      return null;
    },
  },
  {
    id: "fieldworkComplete",
    labelKey: "fieldworkComplete",
    icon: ClipboardCheck,
    getStatus: (review) => {
      if (hasReachedStatus(review, "REPORT_DRAFTING")) return "completed";
      if (review.status === "IN_PROGRESS") return "current";
      return "pending";
    },
    getDate: (review) => parseDate(review.actualEndDate),
    getDetails: (review) => {
      const findingsCount =
        review.findings?.length ?? review._count?.findings ?? 0;
      if (findingsCount > 0) {
        return `${findingsCount} findings`;
      }
      const end = parseDate(review.plannedEndDate);
      if (hasReachedStatus(review, "IN_PROGRESS") && end) {
        return `Expected: ${format(end, "MMM d, yyyy")}`;
      }
      return null;
    },
  },
  {
    id: "reportDrafted",
    labelKey: "reportDrafted",
    icon: FileEdit,
    getStatus: (review) => {
      if (
        review.report?.draftedAt ||
        hasReachedStatus(review, "REPORT_REVIEW")
      )
        return "completed";
      if (review.status === "REPORT_DRAFTING") return "current";
      return "pending";
    },
    getDate: (review) => parseDate(review.report?.draftedAt),
  },
  {
    id: "reportFinalized",
    labelKey: "reportFinalized",
    icon: FileCheck,
    getStatus: (review) => {
      if (review.report?.finalizedAt || hasReachedStatus(review, "COMPLETED"))
        return "completed";
      if (review.status === "REPORT_REVIEW") return "current";
      return "pending";
    },
    getDate: (review) => parseDate(review.report?.finalizedAt),
  },
  {
    id: "reviewClosed",
    labelKey: "reviewClosed",
    icon: FolderClosed,
    getStatus: (review) => {
      if (review.status === "COMPLETED") return "completed";
      if (review.status === "REPORT_REVIEW") return "current";
      return "pending";
    },
    getDate: (review) => {
      // If completed but no specific close date, use report finalized date
      if (review.status === "COMPLETED") {
        return parseDate(review.report?.finalizedAt) ?? null;
      }
      return null;
    },
  },
];

interface ReviewTimelineProps {
  review: ReviewData;
  defaultOpen?: boolean;
  showDurations?: boolean; // Legacy prop, kept for compatibility
  compact?: boolean; // Legacy prop, kept for compatibility
}

export function ReviewTimeline({
  review,
  defaultOpen = true,
}: ReviewTimelineProps) {
  const t = useTranslations("reviews.timeline");
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Calculate progress
  const completedSteps = TIMELINE_STEPS.filter(
    (step) => step.getStatus(review) === "completed"
  ).length;
  const totalSteps = TIMELINE_STEPS.length;
  const progressPercent = (completedSteps / totalSteps) * 100;

  // Find current step
  const currentStep = TIMELINE_STEPS.find(
    (step) => step.getStatus(review) === "current"
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">{t("title")}</h3>
            </div>
            <div className="flex items-center gap-4">
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("progress")}</span>
                <span className="font-medium">
                  {completedSteps}/{totalSteps} {t("phasesComplete")}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {currentStep && (
                <p className="text-sm text-primary">
                  ◌ {t("current")}: {t(`steps.${currentStep.labelKey}`)}
                </p>
              )}
            </div>

            {/* Timeline Steps */}
            <div className="space-y-0">
              {TIMELINE_STEPS.map((step, index) => {
                const status = step.getStatus(review);
                const date = step.getDate(review);
                const details = step.getDetails?.(review);
                const Icon = step.icon;
                const isLast = index === TIMELINE_STEPS.length - 1;

                return (
                  <div key={step.id} className="flex gap-3">
                    {/* Icon and Line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center border-2",
                          status === "completed" &&
                            "bg-green-100 border-green-500 text-green-600 dark:bg-green-900/30",
                          status === "current" &&
                            "bg-blue-100 border-blue-500 text-blue-600 dark:bg-blue-900/30",
                          status === "pending" &&
                            "bg-muted border-muted-foreground/30 text-muted-foreground"
                        )}
                      >
                        {status === "current" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      {!isLast && (
                        <div
                          className={cn(
                            "w-0.5 h-12 -my-1",
                            status === "completed" ? "bg-green-500" : "bg-muted"
                          )}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-6">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "font-medium",
                            status === "completed" && "text-foreground",
                            status === "current" &&
                              "text-blue-600 dark:text-blue-400",
                            status === "pending" && "text-muted-foreground"
                          )}
                        >
                          {t(`steps.${step.labelKey}`)}
                        </span>
                        {status === "current" && (
                          <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded-full">
                            {t("inProgress")}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {date ? (
                          format(date, "MMMM d, yyyy")
                        ) : status === "completed" ? (
                          <span className="text-green-600 dark:text-green-400">
                            {t("completed")}
                          </span>
                        ) : (
                          t("pending")
                        )}
                      </div>
                      {details && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {details}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Export types for backward compatibility
export type ReviewForTimeline = ReviewData;
export { TIMELINE_STEPS as buildTimelinePhases };
