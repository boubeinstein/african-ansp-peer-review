"use client";

/**
 * CAP Timeline Component
 *
 * Visual timeline showing:
 * - Submission deadline
 * - Milestones with status
 * - Current progress
 * - Overdue indicator (red)
 * - Days remaining badge
 */

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { format, differenceInDays, isPast, isToday, isFuture, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icons
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Circle,
  CalendarDays,
  Timer,
  Flag,
  ArrowRight,
  XCircle,
  PlayCircle,
} from "lucide-react";

// Types
import type { CAPStatus, MilestoneStatus } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

interface Milestone {
  id: string;
  titleEn: string;
  titleFr?: string | null;
  targetDate: Date;
  completedDate?: Date | null;
  status: MilestoneStatus;
  sortOrder: number;
}

interface CAPTimelineProps {
  status: CAPStatus;
  dueDate: Date;
  createdAt: Date;
  submittedAt?: Date | null;
  acceptedAt?: Date | null;
  completedAt?: Date | null;
  verifiedAt?: Date | null;
  closedAt?: Date | null;
  milestones?: Milestone[];
  className?: string;
  compact?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_CONFIG: Record<
  CAPStatus,
  {
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ComponentType<{ className?: string }>;
    progressPercent: number;
  }
> = {
  DRAFT: {
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    borderColor: "border-gray-300",
    icon: Circle,
    progressPercent: 10,
  },
  SUBMITTED: {
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-300",
    icon: ArrowRight,
    progressPercent: 20,
  },
  UNDER_REVIEW: {
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    borderColor: "border-purple-300",
    icon: Clock,
    progressPercent: 30,
  },
  REJECTED: {
    color: "text-red-600",
    bgColor: "bg-red-100",
    borderColor: "border-red-300",
    icon: XCircle,
    progressPercent: 15,
  },
  ACCEPTED: {
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    borderColor: "border-emerald-300",
    icon: CheckCircle2,
    progressPercent: 40,
  },
  IN_PROGRESS: {
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-300",
    icon: PlayCircle,
    progressPercent: 60,
  },
  COMPLETED: {
    color: "text-teal-600",
    bgColor: "bg-teal-100",
    borderColor: "border-teal-300",
    icon: Flag,
    progressPercent: 80,
  },
  VERIFIED: {
    color: "text-green-600",
    bgColor: "bg-green-100",
    borderColor: "border-green-300",
    icon: CheckCircle2,
    progressPercent: 95,
  },
  CLOSED: {
    color: "text-slate-600",
    bgColor: "bg-slate-100",
    borderColor: "border-slate-300",
    icon: CheckCircle2,
    progressPercent: 100,
  },
};

const MILESTONE_STATUS_CONFIG: Record<
  MilestoneStatus,
  {
    color: string;
    bgColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  PENDING: {
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    icon: Circle,
  },
  IN_PROGRESS: {
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    icon: PlayCircle,
  },
  COMPLETED: {
    color: "text-green-600",
    bgColor: "bg-green-100",
    icon: CheckCircle2,
  },
  OVERDUE: {
    color: "text-red-600",
    bgColor: "bg-red-100",
    icon: AlertCircle,
  },
  CANCELLED: {
    color: "text-gray-400",
    bgColor: "bg-gray-50",
    icon: XCircle,
  },
};

// CAP workflow stages for the main timeline
const CAP_STAGES: { status: CAPStatus; label: string }[] = [
  { status: "DRAFT", label: "Draft" },
  { status: "SUBMITTED", label: "Submitted" },
  { status: "ACCEPTED", label: "Accepted" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "COMPLETED", label: "Completed" },
  { status: "VERIFIED", label: "Verified" },
  { status: "CLOSED", label: "Closed" },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getDaysRemaining(dueDate: Date): number {
  const today = startOfDay(new Date());
  const due = startOfDay(dueDate);
  return differenceInDays(due, today);
}

function getDeadlineStatus(dueDate: Date): {
  label: string;
  variant: "default" | "destructive" | "secondary" | "outline";
  isOverdue: boolean;
  isDueToday: boolean;
  isDueSoon: boolean;
} {
  const daysRemaining = getDaysRemaining(dueDate);
  const today = startOfDay(new Date());
  const due = startOfDay(dueDate);

  if (isPast(due) && !isToday(due)) {
    return {
      label: `${Math.abs(daysRemaining)} days overdue`,
      variant: "destructive",
      isOverdue: true,
      isDueToday: false,
      isDueSoon: false,
    };
  }

  if (isToday(due)) {
    return {
      label: "Due today",
      variant: "destructive",
      isOverdue: false,
      isDueToday: true,
      isDueSoon: false,
    };
  }

  if (daysRemaining <= 7) {
    return {
      label: `${daysRemaining} days remaining`,
      variant: "outline",
      isOverdue: false,
      isDueToday: false,
      isDueSoon: true,
    };
  }

  return {
    label: `${daysRemaining} days remaining`,
    variant: "default",
    isOverdue: false,
    isDueToday: false,
    isDueSoon: false,
  };
}

function getStageIndex(status: CAPStatus): number {
  // Map status to stage index
  const stageMap: Record<CAPStatus, number> = {
    DRAFT: 0,
    SUBMITTED: 1,
    UNDER_REVIEW: 1, // Same as submitted for display
    REJECTED: 0, // Goes back to draft stage
    ACCEPTED: 2,
    IN_PROGRESS: 3,
    COMPLETED: 4,
    VERIFIED: 5,
    CLOSED: 6,
  };
  return stageMap[status];
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface DaysRemainingBadgeProps {
  dueDate: Date;
  status: CAPStatus;
  className?: string;
}

function DaysRemainingBadge({ dueDate, status, className }: DaysRemainingBadgeProps) {
  const t = useTranslations("cap.timeline");

  // Don't show for closed/verified CAPs
  if (status === "CLOSED" || status === "VERIFIED") {
    return null;
  }

  const { label, variant, isOverdue, isDueToday, isDueSoon } = getDeadlineStatus(dueDate);

  return (
    <Badge
      variant={variant}
      className={cn(
        "gap-1",
        isDueSoon && "border-amber-500 text-amber-600 bg-amber-50",
        className
      )}
    >
      {isOverdue ? (
        <AlertTriangle className="h-3 w-3" />
      ) : isDueToday ? (
        <AlertCircle className="h-3 w-3" />
      ) : (
        <Timer className="h-3 w-3" />
      )}
      {label}
    </Badge>
  );
}

interface MilestoneItemProps {
  milestone: Milestone;
  isLast: boolean;
  locale: "en" | "fr";
}

function MilestoneItem({ milestone, isLast, locale }: MilestoneItemProps) {
  const config = MILESTONE_STATUS_CONFIG[milestone.status];
  const Icon = config.icon;
  const title = locale === "fr" && milestone.titleFr ? milestone.titleFr : milestone.titleEn;
  const daysRemaining = getDaysRemaining(milestone.targetDate);

  return (
    <div className="flex items-start gap-3">
      {/* Status icon and line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            config.bgColor
          )}
        >
          <Icon className={cn("h-4 w-4", config.color)} />
        </div>
        {!isLast && (
          <div className="w-0.5 h-full min-h-[40px] bg-muted" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("font-medium text-sm", config.color)}>{title}</span>
          {milestone.status === "OVERDUE" && (
            <Badge variant="destructive" className="text-xs">
              {Math.abs(daysRemaining)} days overdue
            </Badge>
          )}
          {milestone.status === "PENDING" && daysRemaining <= 7 && daysRemaining > 0 && (
            <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
              {daysRemaining} days
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          <span>Target: {format(milestone.targetDate, "MMM d, yyyy")}</span>
          {milestone.completedDate && (
            <>
              <span>|</span>
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span>Completed: {format(milestone.completedDate, "MMM d, yyyy")}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CAPTimeline({
  status,
  dueDate,
  createdAt,
  submittedAt,
  acceptedAt,
  completedAt,
  verifiedAt,
  closedAt,
  milestones = [],
  className,
  compact = false,
}: CAPTimelineProps) {
  const t = useTranslations("cap");
  const locale = useLocale() as "en" | "fr";

  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;
  const currentStageIndex = getStageIndex(status);

  // Calculate progress based on milestones if available, otherwise use status
  const progress = useMemo(() => {
    if (milestones.length > 0) {
      const completed = milestones.filter((m) => m.status === "COMPLETED").length;
      return Math.round((completed / milestones.length) * 100);
    }
    return statusConfig.progressPercent;
  }, [milestones, statusConfig.progressPercent]);

  // Sort milestones by target date
  const sortedMilestones = useMemo(() => {
    return [...milestones].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [milestones]);

  // Milestone statistics
  const milestoneStats = useMemo(() => {
    const total = milestones.length;
    const completed = milestones.filter((m) => m.status === "COMPLETED").length;
    const overdue = milestones.filter((m) => m.status === "OVERDUE").length;
    const inProgress = milestones.filter((m) => m.status === "IN_PROGRESS").length;
    return { total, completed, overdue, inProgress };
  }, [milestones]);

  if (compact) {
    return (
      <div className={cn("space-y-3", className)}>
        {/* Status and deadline */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                statusConfig.bgColor
              )}
            >
              <StatusIcon className={cn("h-4 w-4", statusConfig.color)} />
            </div>
            <div>
              <span className={cn("font-medium text-sm", statusConfig.color)}>
                {t(`status.${status}`)}
              </span>
              <p className="text-xs text-muted-foreground">
                Due: {format(dueDate, "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <DaysRemainingBadge dueDate={dueDate} status={status} />
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("timeline.progress")}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Milestone summary */}
        {milestoneStats.total > 0 && (
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">
              {t("timeline.milestones")}: {milestoneStats.completed}/{milestoneStats.total}
            </span>
            {milestoneStats.overdue > 0 && (
              <span className="text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {milestoneStats.overdue} {t("timeline.overdue")}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            {t("timeline.title")}
          </CardTitle>
          <DaysRemainingBadge dueDate={dueDate} status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Timeline */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("timeline.statusProgress")}</span>
            <Badge variant="outline" className={cn(statusConfig.color, statusConfig.bgColor)}>
              {t(`status.${status}`)}
            </Badge>
          </div>

          {/* Stage indicators */}
          <div className="relative">
            <div className="flex items-center justify-between">
              {CAP_STAGES.map((stage, index) => {
                const isCompleted = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                const stageConfig = STATUS_CONFIG[stage.status];
                const StageIcon = stageConfig.icon;

                return (
                  <TooltipProvider key={stage.status}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "relative flex flex-col items-center",
                            index < CAP_STAGES.length - 1 && "flex-1"
                          )}
                        >
                          <motion.div
                            initial={false}
                            animate={{
                              scale: isCurrent ? 1.1 : 1,
                            }}
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center z-10 border-2",
                              isCompleted
                                ? "bg-primary border-primary text-primary-foreground"
                                : isCurrent
                                ? cn(stageConfig.bgColor, stageConfig.borderColor)
                                : "bg-muted border-muted-foreground/20"
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <StageIcon
                                className={cn(
                                  "h-4 w-4",
                                  isCurrent ? stageConfig.color : "text-muted-foreground"
                                )}
                              />
                            )}
                          </motion.div>

                          {/* Connecting line */}
                          {index < CAP_STAGES.length - 1 && (
                            <div
                              className={cn(
                                "absolute top-4 left-1/2 h-0.5 w-full",
                                isCompleted ? "bg-primary" : "bg-muted"
                              )}
                              style={{ transform: "translateX(50%)" }}
                            />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t(`status.${stage.status}`)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>

            {/* Stage labels (shown on larger screens) */}
            <div className="hidden md:flex items-center justify-between mt-2">
              {CAP_STAGES.map((stage, index) => {
                const isCompleted = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                return (
                  <div
                    key={`label-${stage.status}`}
                    className={cn(
                      "text-xs text-center",
                      index < CAP_STAGES.length - 1 && "flex-1",
                      isCompleted
                        ? "text-primary font-medium"
                        : isCurrent
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {t(`status.${stage.status}`)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Key Dates */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">{t("timeline.created")}</span>
            <p className="text-sm font-medium">{format(createdAt, "MMM d, yyyy")}</p>
          </div>
          {submittedAt && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">{t("timeline.submitted")}</span>
              <p className="text-sm font-medium">{format(submittedAt, "MMM d, yyyy")}</p>
            </div>
          )}
          {acceptedAt && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">{t("timeline.accepted")}</span>
              <p className="text-sm font-medium">{format(acceptedAt, "MMM d, yyyy")}</p>
            </div>
          )}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {t("timeline.deadline")}
              {getDeadlineStatus(dueDate).isOverdue && (
                <AlertTriangle className="h-3 w-3 text-red-500" />
              )}
            </span>
            <p
              className={cn(
                "text-sm font-medium",
                getDeadlineStatus(dueDate).isOverdue && "text-red-600"
              )}
            >
              {format(dueDate, "MMM d, yyyy")}
            </p>
          </div>
          {completedAt && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">{t("timeline.completed")}</span>
              <p className="text-sm font-medium">{format(completedAt, "MMM d, yyyy")}</p>
            </div>
          )}
          {verifiedAt && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">{t("timeline.verified")}</span>
              <p className="text-sm font-medium">{format(verifiedAt, "MMM d, yyyy")}</p>
            </div>
          )}
          {closedAt && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">{t("timeline.closed")}</span>
              <p className="text-sm font-medium">{format(closedAt, "MMM d, yyyy")}</p>
            </div>
          )}
        </div>

        {/* Milestones */}
        {sortedMilestones.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium flex items-center gap-2">
                <Flag className="h-4 w-4" />
                {t("timeline.milestones")}
              </h4>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600">
                  {milestoneStats.completed} {t("timeline.completed")}
                </span>
                {milestoneStats.overdue > 0 && (
                  <span className="text-red-600">
                    {milestoneStats.overdue} {t("timeline.overdue")}
                  </span>
                )}
                <span className="text-muted-foreground">/ {milestoneStats.total}</span>
              </div>
            </div>

            {/* Milestone progress bar */}
            <div className="mb-4">
              <Progress
                value={(milestoneStats.completed / milestoneStats.total) * 100}
                className="h-2"
              />
            </div>

            {/* Milestone list */}
            <div className="space-y-0">
              {sortedMilestones.map((milestone, index) => (
                <MilestoneItem
                  key={milestone.id}
                  milestone={milestone}
                  isLast={index === sortedMilestones.length - 1}
                  locale={locale}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export { DaysRemainingBadge };
export type { CAPTimelineProps, Milestone };
