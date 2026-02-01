"use client";

/**
 * CAP Status Workflow Stepper Component
 *
 * Visual representation of the CAP workflow stages with progress indicators.
 * Shows the complete flow: Draft → Submitted → Accepted → In Progress → Completed → Verified → Closed
 * Handles the rejection branching path back to Draft.
 *
 * Responsive: horizontal on desktop, vertical on mobile.
 */

import { useTranslations } from "next-intl";
import {
  FileEdit,
  Send,
  CheckCircle,
  XCircle,
  Wrench,
  ClipboardCheck,
  ShieldCheck,
  Lock,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CAPStatus } from "@/types/prisma-enums";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface CAPStatusWorkflowProps {
  currentStatus: CAPStatus;
  submittedAt?: Date | string | null;
  acceptedAt?: Date | string | null;
  completedAt?: Date | string | null;
  verifiedAt?: Date | string | null;
  rejectedAt?: Date | string | null;
  className?: string;
}

// Define the main workflow stages (excluding UNDER_REVIEW which is a sub-state)
const WORKFLOW_STAGES: CAPStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "VERIFIED",
  "CLOSED",
];

// Map status to stage index for progress calculation
const STATUS_TO_STAGE_INDEX: Record<CAPStatus, number> = {
  DRAFT: 0,
  SUBMITTED: 1,
  UNDER_REVIEW: 1, // Treated same as SUBMITTED for display
  ACCEPTED: 2,
  REJECTED: 0, // Goes back to start
  IN_PROGRESS: 3,
  COMPLETED: 4,
  VERIFIED: 5,
  CLOSED: 6,
};

// Icons for each stage
const STAGE_ICONS: Record<CAPStatus, React.ElementType> = {
  DRAFT: FileEdit,
  SUBMITTED: Send,
  UNDER_REVIEW: Send,
  ACCEPTED: CheckCircle,
  REJECTED: XCircle,
  IN_PROGRESS: Wrench,
  COMPLETED: ClipboardCheck,
  VERIFIED: ShieldCheck,
  CLOSED: Lock,
};

type StepState = "completed" | "current" | "pending" | "rejected";

function getStepState(
  stageIndex: number,
  currentStageIndex: number,
  currentStatus: CAPStatus
): StepState {
  if (currentStatus === "REJECTED" && stageIndex === 0) {
    return "rejected";
  }
  if (stageIndex < currentStageIndex) {
    return "completed";
  }
  if (stageIndex === currentStageIndex) {
    return currentStatus === "REJECTED" ? "rejected" : "current";
  }
  return "pending";
}

function getDateForStage(
  stage: CAPStatus,
  props: CAPStatusWorkflowProps
): Date | null {
  const { submittedAt, acceptedAt, completedAt, verifiedAt } = props;

  switch (stage) {
    case "SUBMITTED":
      return submittedAt ? new Date(submittedAt) : null;
    case "ACCEPTED":
      return acceptedAt ? new Date(acceptedAt) : null;
    case "COMPLETED":
      return completedAt ? new Date(completedAt) : null;
    case "VERIFIED":
    case "CLOSED":
      return verifiedAt ? new Date(verifiedAt) : null;
    default:
      return null;
  }
}

interface WorkflowStepProps {
  stage: CAPStatus;
  state: StepState;
  date: Date | null;
  isLast: boolean;
  showConnector: boolean;
}

function WorkflowStep({ stage, state, date, isLast, showConnector }: WorkflowStepProps) {
  const t = useTranslations("cap.status");
  const tDetail = useTranslations("cap.detail");

  const Icon = STAGE_ICONS[stage];

  const stateStyles = {
    completed: {
      circle: "bg-green-100 border-green-500 text-green-600 dark:bg-green-900/30 dark:text-green-400",
      connector: "bg-green-500",
      text: "text-green-700 dark:text-green-400",
    },
    current: {
      circle: "bg-primary/10 border-primary text-primary ring-2 ring-primary/20",
      connector: "bg-muted",
      text: "text-primary font-medium",
    },
    pending: {
      circle: "bg-muted border-muted-foreground/30 text-muted-foreground",
      connector: "bg-muted",
      text: "text-muted-foreground",
    },
    rejected: {
      circle: "bg-red-100 border-red-500 text-red-600 dark:bg-red-900/30 dark:text-red-400",
      connector: "bg-red-500",
      text: "text-red-700 dark:text-red-400",
    },
  };

  const styles = stateStyles[state];

  return (
    <div className="flex md:flex-col items-center md:items-center gap-3 md:gap-2 flex-1 min-w-0">
      {/* Step content - vertical layout on mobile, horizontal on desktop */}
      <div className="flex flex-col md:items-center gap-1">
        {/* Icon circle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full border-2 transition-all",
                  styles.circle
                )}
              >
                {state === "completed" ? (
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
                ) : (
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{t(stage)}</p>
              {date && (
                <p className="text-xs text-muted-foreground">
                  {format(date, "PPP")}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Label and date - hidden on very small screens for mobile */}
        <div className="flex flex-col md:items-center">
          <span className={cn("text-xs md:text-sm whitespace-nowrap", styles.text)}>
            {t(stage)}
          </span>
          {date && state === "completed" && (
            <span className="text-[10px] md:text-xs text-muted-foreground">
              {format(date, "MMM d")}
            </span>
          )}
          {state === "current" && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 mt-0.5 hidden md:inline-flex">
              {tDetail("current") || "Current"}
            </Badge>
          )}
        </div>
      </div>

      {/* Connector line - horizontal on mobile (after step), vertical on desktop (after step) */}
      {showConnector && !isLast && (
        <>
          {/* Mobile connector (vertical) */}
          <div className="md:hidden flex-1 flex items-center">
            <div className={cn("h-0.5 flex-1", styles.connector)} />
            <ArrowRight className={cn("w-3 h-3 -ml-1", styles.text)} />
          </div>

          {/* Desktop connector (horizontal between steps) */}
          <div className="hidden md:flex absolute top-5 md:top-6 left-1/2 w-full h-0.5 -z-10">
            <div className={cn("h-full w-full", styles.connector)} />
          </div>
        </>
      )}
    </div>
  );
}

export function CAPStatusWorkflow({
  currentStatus,
  submittedAt,
  acceptedAt,
  completedAt,
  verifiedAt,
  rejectedAt,
  className,
}: CAPStatusWorkflowProps) {
  const t = useTranslations("cap");

  const currentStageIndex = STATUS_TO_STAGE_INDEX[currentStatus];
  const isRejected = currentStatus === "REJECTED";

  return (
    <div className={cn("w-full", className)}>
      {/* Rejected banner if applicable */}
      {isRejected && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
          <RotateCcw className="w-4 h-4 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {t("status.REJECTED")}
            </p>
            {rejectedAt && (
              <p className="text-xs text-red-600 dark:text-red-500">
                {format(new Date(rejectedAt), "PPP")}
              </p>
            )}
          </div>
          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
            {t("actions.revisionRequired") || "Revision Required"}
          </Badge>
        </div>
      )}

      {/* Main workflow stepper */}
      <div className="relative">
        {/* Background connector line for desktop */}
        <div className="hidden md:block absolute top-6 left-0 right-0 h-0.5 bg-muted -z-10 mx-6" />

        {/* Steps container */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:justify-between">
          {WORKFLOW_STAGES.map((stage, index) => {
            const state = getStepState(index, currentStageIndex, currentStatus);
            const date = getDateForStage(stage, {
              currentStatus,
              submittedAt,
              acceptedAt,
              completedAt,
              verifiedAt,
              rejectedAt,
            });

            return (
              <WorkflowStep
                key={stage}
                stage={stage}
                state={state}
                date={date}
                isLast={index === WORKFLOW_STAGES.length - 1}
                showConnector={index < WORKFLOW_STAGES.length - 1}
              />
            );
          })}
        </div>
      </div>

      {/* Progress summary */}
      <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t("workflow.progress") || "Progress"}:</span>
          <span className="font-medium">
            {currentStageIndex + 1} / {WORKFLOW_STAGES.length}
          </span>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-muted-foreground">{t("workflow.completed") || "Completed"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-muted-foreground">{t("workflow.current") || "Current"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
            <span className="text-muted-foreground">{t("workflow.pending") || "Pending"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for use in cards/lists
 */
interface CAPStatusWorkflowCompactProps {
  currentStatus: CAPStatus;
  className?: string;
}

export function CAPStatusWorkflowCompact({
  currentStatus,
  className,
}: CAPStatusWorkflowCompactProps) {
  const t = useTranslations("cap.status");

  const currentStageIndex = STATUS_TO_STAGE_INDEX[currentStatus];
  const isRejected = currentStatus === "REJECTED";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {WORKFLOW_STAGES.map((stage, index) => {
        const state = getStepState(index, currentStageIndex, currentStatus);

        const dotStyles = {
          completed: "bg-green-500",
          current: "bg-primary ring-2 ring-primary/30",
          pending: "bg-muted-foreground/30",
          rejected: "bg-red-500",
        };

        return (
          <TooltipProvider key={stage}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      dotStyles[state],
                      state === "current" && "w-2.5 h-2.5"
                    )}
                  />
                  {index < WORKFLOW_STAGES.length - 1 && (
                    <div
                      className={cn(
                        "w-3 h-0.5",
                        state === "completed" ? "bg-green-500" : "bg-muted"
                      )}
                    />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t(stage)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}

      {isRejected && (
        <Badge variant="destructive" className="ml-2 text-[10px] px-1 py-0">
          {t("REJECTED")}
        </Badge>
      )}
    </div>
  );
}
