"use client";

/**
 * Review Next Actions Component
 *
 * Displays a progress checklist and next actions panel for peer reviews.
 * Shows the workflow steps with their completion status and guides users
 * through the review process.
 */

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

// Icons
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  CircleDot,
  FileText,
  ListChecks,
  Users,
} from "lucide-react";

// Feature Components
import { ReviewActionButton } from "./review-action-button";

// =============================================================================
// TYPES
// =============================================================================

interface ReviewNextActionsProps {
  reviewId: string;
  onAssignTeam?: () => void;
  onSetDates?: () => void;
  onSuccess?: () => void;
  className?: string;
}


// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewNextActions({
  reviewId,
  onAssignTeam,
  onSetDates,
  onSuccess,
  className,
}: ReviewNextActionsProps) {
  const t = useTranslations("review.workflow");

  // Fetch next actions and checklist
  const { data, isLoading, error } = trpc.review.getNextActions.useQuery({
    reviewId,
  });

  // Loading state
  if (isLoading) {
    return <ReviewNextActionsSkeleton />;
  }

  // Error state
  if (error || !data) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <span>{t("errorLoadingActions")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { review, checklist, primaryAction, userContext } = data;

  // Calculate progress
  const completedSteps = checklist.filter((item) => item.completed).length;
  const totalSteps = checklist.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  // Determine if review is terminal (completed or cancelled)
  const isTerminal = ["COMPLETED", "CANCELLED"].includes(review.status);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListChecks className="h-5 w-5" />
              {t("workflowProgress")}
            </CardTitle>
            <CardDescription>{t("workflowDescription")}</CardDescription>
          </div>
          {!isTerminal && (
            <Badge variant="outline" className="font-mono">
              {completedSteps}/{totalSteps}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        {!isTerminal && (
          <div className="space-y-1">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {t("progressPercent", { percent: progressPercent })}
            </p>
          </div>
        )}

        {/* Checklist */}
        <div className="space-y-1">
          {checklist.map((item) => {
            const isCompleted = item.completed;
            const isCurrent = item.current;

            return (
              <div
                key={item.key}
                className={cn(
                  "flex items-center gap-3 py-2 px-3 rounded-md transition-colors",
                  isCurrent && "bg-primary/5 border border-primary/20",
                  isCompleted && "text-muted-foreground"
                )}
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : isCurrent ? (
                    <CircleDot className="h-5 w-5 text-primary animate-pulse" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isCompleted && "line-through"
                    )}
                  >
                    {t(`checklist.${item.key}`)}
                  </p>
                </div>
                {isCurrent && (
                  <Badge variant="secondary" className="text-xs">
                    {t("currentStep")}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center p-2">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Users className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold">{review.teamSize}</p>
            <p className="text-xs text-muted-foreground">{t("teamMembers")}</p>
          </div>
          <div className="text-center p-2">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold">{review.findingsCount}</p>
            <p className="text-xs text-muted-foreground">{t("findings")}</p>
          </div>
          <div className="text-center p-2">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <FileText className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold">
              {review.hasReport ? t("yes") : t("no")}
            </p>
            <p className="text-xs text-muted-foreground">{t("report")}</p>
          </div>
        </div>

        {/* Primary Action Button */}
        {primaryAction && primaryAction.canPerform && (
          <div className="pt-2 border-t">
            <ReviewActionButton
              reviewId={reviewId}
              onAssignTeam={onAssignTeam}
              onSetDates={onSetDates}
              onSuccess={onSuccess}
              className="w-full"
            />
          </div>
        )}

        {/* Context-aware hints */}
        {!isTerminal && userContext.isAdmin && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
            {review.status === "REQUESTED" && (
              <p>{t("hints.requested")}</p>
            )}
            {review.status === "APPROVED" && !review.hasTeam && (
              <p>{t("hints.needsTeam")}</p>
            )}
            {review.status === "PLANNING" && !review.hasDates && (
              <p>{t("hints.needsDates")}</p>
            )}
            {review.status === "PLANNING" && review.hasDates && review.hasTeam && (
              <p>{t("hints.readyToSchedule")}</p>
            )}
            {review.status === "SCHEDULED" && (
              <p>{t("hints.scheduled")}</p>
            )}
            {review.status === "IN_PROGRESS" && (
              <p>{t("hints.inProgress")}</p>
            )}
            {review.status === "REPORT_DRAFTING" && (
              <p>{t("hints.reportDrafting")}</p>
            )}
            {review.status === "REPORT_REVIEW" && (
              <p>{t("hints.reportReview")}</p>
            )}
          </div>
        )}

        {/* User role indicator */}
        <div className="flex flex-wrap gap-1 pt-1">
          {userContext.isAdmin && (
            <Badge variant="outline" className="text-xs">
              {t("role.admin")}
            </Badge>
          )}
          {userContext.isLeadReviewer && (
            <Badge variant="outline" className="text-xs">
              {t("role.leadReviewer")}
            </Badge>
          )}
          {userContext.isTeamMember && !userContext.isLeadReviewer && (
            <Badge variant="outline" className="text-xs">
              {t("role.teamMember")}
            </Badge>
          )}
          {userContext.isHostOrg && (
            <Badge variant="outline" className="text-xs">
              {t("role.hostOrg")}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

function ReviewNextActionsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-5 w-12" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-2 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center p-2">
              <Skeleton className="h-4 w-4 mx-auto mb-1" />
              <Skeleton className="h-6 w-8 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default ReviewNextActions;
