"use client";

/**
 * Progress Dashboard Component
 *
 * Displays review progress using phase-based calculation.
 * Progress percentage aligns with the current review status/phase,
 * not fieldwork checklist items (which would be misleading in early phases).
 *
 * Phase Progress Mapping:
 * - REQUESTED:       0% (Pre-planning - no progress yet)
 * - APPROVED:        5% (Pre-planning - approved but not started)
 * - PLANNING:        15% (Phase 1/4 - Planning)
 * - SCHEDULED:       25% (Phase 2/4 - Preparation)
 * - IN_PROGRESS:     50% (Phase 3/4 - On-Site)
 * - REPORT_DRAFTING: 75% (Phase 4/4 - Post-Review)
 * - REPORT_REVIEW:   90% (Phase 4/4 - Post-Review, near complete)
 * - COMPLETED:       100% (Done)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface ProgressDashboardProps {
  status: string;
}

const phases = [
  { id: "PLANNING", labelKey: "PLANNING", icon: "1" },
  { id: "PREPARATION", labelKey: "PREPARATION", icon: "2" },
  { id: "ON_SITE", labelKey: "ON_SITE", icon: "3" },
  { id: "POST_REVIEW", labelKey: "POST_REVIEW", icon: "4" },
] as const;

/**
 * Calculate overall review progress based on status.
 * This provides a more accurate representation than showing
 * fieldwork checklist completion (which includes on-site items
 * that shouldn't show progress during planning phase).
 */
function getOverallProgress(status: string): { percentage: number; stepDescription: string } {
  switch (status) {
    case "REQUESTED":
      return { percentage: 0, stepDescription: "0/8" };
    case "APPROVED":
      return { percentage: 5, stepDescription: "0.5/8" };
    case "PLANNING":
      return { percentage: 15, stepDescription: "1/8" };
    case "SCHEDULED":
      return { percentage: 25, stepDescription: "2/8" };
    case "IN_PROGRESS":
      return { percentage: 50, stepDescription: "4/8" };
    case "REPORT_DRAFTING":
      return { percentage: 75, stepDescription: "6/8" };
    case "REPORT_REVIEW":
      return { percentage: 90, stepDescription: "7/8" };
    case "COMPLETED":
      return { percentage: 100, stepDescription: "8/8" };
    case "CANCELLED":
      return { percentage: 0, stepDescription: "0/8" };
    default:
      return { percentage: 0, stepDescription: "0/8" };
  }
}

/**
 * Get the status label key for the badge.
 * Maps review status to the display label key.
 */
function getStatusLabelKey(status: string): string {
  switch (status) {
    case "REQUESTED":
      return "statusLabel.REQUESTED";
    case "APPROVED":
      return "statusLabel.APPROVED";
    case "PLANNING":
      return "statusLabel.PLANNING";
    case "SCHEDULED":
      return "statusLabel.PREPARATION";
    case "IN_PROGRESS":
      return "statusLabel.ON_SITE";
    case "REPORT_DRAFTING":
    case "REPORT_REVIEW":
      return "statusLabel.POST_REVIEW";
    case "COMPLETED":
      return "statusLabel.COMPLETED";
    case "CANCELLED":
      return "statusLabel.CANCELLED";
    default:
      return "statusLabel.REQUESTED";
  }
}

/**
 * Determine which phase step is active based on review status.
 * Returns the index of the active phase (0-3) or -1 if no phase is active.
 */
function getActivePhaseIndex(status: string): number {
  switch (status) {
    case "REQUESTED":
    case "APPROVED":
      return -1; // No phase active yet
    case "PLANNING":
      return 0; // Planning
    case "SCHEDULED":
      return 1; // Preparation
    case "IN_PROGRESS":
      return 2; // On-Site
    case "REPORT_DRAFTING":
    case "REPORT_REVIEW":
      return 3; // Post-Review
    case "COMPLETED":
      return 4; // All completed (special case)
    default:
      return -1;
  }
}

export function ProgressDashboard({ status }: ProgressDashboardProps) {
  const t = useTranslations("reviews.detail.overview.progress");

  // Calculate phase-based progress that aligns with current status
  const { percentage: overallProgress } = getOverallProgress(status);

  // Get the active phase index based on status (not currentPhase prop)
  const activePhaseIndex = getActivePhaseIndex(status);

  const getPhaseStatus = (phaseIndex: number) => {
    // For completed reviews, all phases are completed
    if (activePhaseIndex === 4) return "completed";

    // No phase is active yet (REQUESTED/APPROVED)
    if (activePhaseIndex === -1) return "upcoming";

    if (phaseIndex < activePhaseIndex) return "completed";
    if (phaseIndex === activePhaseIndex) return "current";
    return "upcoming";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          {t("title")}
          <Badge variant="outline">{t(getStatusLabelKey(status))}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phase Progress Stepper */}
        <div className="flex items-center justify-between">
          {phases.map((phase, index) => {
            const phaseStatus = getPhaseStatus(index);
            return (
              <div key={phase.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                      phaseStatus === "completed" && "bg-primary border-primary text-primary-foreground",
                      phaseStatus === "current" && "bg-primary/10 border-primary text-primary",
                      phaseStatus === "upcoming" && "bg-muted border-muted-foreground/30 text-muted-foreground"
                    )}
                  >
                    {phaseStatus === "completed" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      phase.icon
                    )}
                  </div>
                  <span className={cn(
                    "text-xs mt-1 text-center max-w-[60px]",
                    phaseStatus === "current" ? "text-primary font-medium" : "text-muted-foreground"
                  )}>
                    {t(`phase.${phase.id}`)}
                  </span>
                </div>
                {index < phases.length - 1 && (
                  <div className={cn(
                    "h-0.5 w-8 mx-1 mt-[-16px]",
                    getPhaseStatus(index + 1) !== "upcoming" ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Overall Review Progress - aligned with status/phase */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">{t("overall")}</span>
            <span className="font-medium">
              {overallProgress}%
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
