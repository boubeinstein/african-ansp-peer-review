"use client";

import { useState } from "react";
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
  AlertCircle,
  ChevronDown,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { resolveTimelineData } from "@/lib/resolve-timeline";
import type { ReviewTimelineData, TimelineStep } from "@/types/timeline";

// Icon mapping for steps
const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> =
  {
    requested: Send,
    approved: CheckCircle2,
    teamAssigned: Users,
    datesConfirmed: Calendar,
    reviewStarted: PlayCircle,
    fieldworkComplete: ClipboardCheck,
    reportDrafted: FileEdit,
    reportFinalized: FileCheck,
    reviewClosed: FolderClosed,
  };

interface ReviewTimelineProps {
  review: ReviewTimelineData;
  defaultOpen?: boolean;
  /** @deprecated No longer used - kept for backward compatibility */
  showDurations?: boolean;
}

export function ReviewTimeline({
  review,
  defaultOpen = true,
   
  showDurations: _showDurations,
}: ReviewTimelineProps) {
  const t = useTranslations("reviews.timeline");
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const isCancelled = review.status === "CANCELLED";
  const timeline = resolveTimelineData(review);
  const progressPercent =
    (timeline.completedCount / timeline.totalCount) * 100;

  // If cancelled, show cancelled state
  if (isCancelled) {
    return (
      <TooltipProvider>
        <div className="border rounded-lg">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">{t("title")}</h3>
            </div>
          </div>
          <div className="px-4 pb-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>{t("cancelled.title")}</AlertTitle>
              <AlertDescription>
                {t("cancelled.description")}
              </AlertDescription>
            </Alert>
            {/* Show completed steps before cancellation with cancelled styling */}
            <div className="mt-4 space-y-0 opacity-60">
              {timeline.steps
                .filter((s) => s.status === "completed")
                .map((step, index, arr) => (
                  <TimelineStepItem
                    key={step.id}
                    step={{ ...step, status: "cancelled" as const }}
                    isLast={index === arr.length - 1}
                    t={t}
                  />
                ))}
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="border rounded-lg">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">{t("title")}</h3>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("progress")}</span>
                  <span className="font-medium">
                    {timeline.completedCount}/{timeline.totalCount}{" "}
                    {t("phasesComplete")}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {timeline.currentStepId && (
                  <p className="text-sm text-primary">
                    ◌ {t("current")}:{" "}
                    {t(
                      `steps.${timeline.steps.find((s) => s.id === timeline.currentStepId)?.labelKey}`
                    )}
                  </p>
                )}
              </div>

              {/* Timeline Steps */}
              <div className="space-y-0">
                {timeline.steps.map((step, index) => (
                  <TimelineStepItem
                    key={step.id}
                    step={step}
                    isLast={index === timeline.steps.length - 1}
                    t={t}
                  />
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </TooltipProvider>
  );
}

interface TimelineStepItemProps {
  step: TimelineStep;
  isLast: boolean;
  t: (key: string) => string;
}

function TimelineStepItem({ step, isLast, t }: TimelineStepItemProps) {
  const Icon = STEP_ICONS[step.id] ?? CheckCircle2;
  const isCancelled = step.status === "cancelled";

  return (
    <div className="flex gap-3">
      {/* Icon and Line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center border-2",
            step.status === "completed" &&
              "bg-green-100 border-green-500 text-green-600 dark:bg-green-900/30",
            step.status === "current" &&
              "bg-blue-100 border-blue-500 text-blue-600 dark:bg-blue-900/30",
            step.status === "pending" &&
              "bg-muted border-muted-foreground/30 text-muted-foreground",
            isCancelled &&
              "bg-red-100 border-red-400 text-red-500 dark:bg-red-900/30"
          )}
        >
          {step.status === "current" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : step.status === "completed" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : isCancelled ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </div>
        {!isLast && (
          <div
            className={cn(
              "w-0.5 h-12 -my-1",
              step.status === "completed" ? "bg-green-500" : "bg-muted",
              isCancelled && "bg-red-300 dark:bg-red-800"
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
              step.status === "completed" && "text-foreground",
              step.status === "current" && "text-blue-600 dark:text-blue-400",
              step.status === "pending" && "text-muted-foreground",
              isCancelled && "text-red-600 dark:text-red-400 line-through"
            )}
          >
            {t(`steps.${step.labelKey}`)}
          </span>
          {step.status === "current" && (
            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded-full">
              {t("inProgress")}
            </span>
          )}
          {step.hasChronologyIssue && (
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("dateInconsistency")}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className={cn(
          "text-sm mt-0.5",
          isCancelled ? "text-red-500 dark:text-red-400" : "text-muted-foreground"
        )}>
          {step.displayDate ? (
            <span className={cn(step.isInferred ? "italic" : "", isCancelled && "line-through")}>
              {step.displayDate}
            </span>
          ) : step.status === "completed" ? (
            <span className="text-green-600 dark:text-green-400">
              {t("completed")}
            </span>
          ) : isCancelled ? (
            <span>{t("cancelled.label")}</span>
          ) : (
            t("pending")
          )}
        </div>
        {step.details && (
          <div className={cn(
            "text-xs mt-1",
            isCancelled ? "text-red-400 dark:text-red-500" : "text-muted-foreground"
          )}>
            {step.details}
          </div>
        )}
      </div>
    </div>
  );
}

// Export types for backward compatibility
export type { ReviewTimelineData as ReviewForTimeline };
