"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface ProgressDashboardProps {
  currentPhase: "PLANNING" | "PREPARATION" | "ON_SITE" | "POST_REVIEW";
  fieldworkProgress: {
    total: number;
    completed: number;
    percentage: number;
  };
  status: string;
}

const phases = [
  { id: "PLANNING", labelKey: "PLANNING", icon: "1" },
  { id: "PREPARATION", labelKey: "PREPARATION", icon: "2" },
  { id: "ON_SITE", labelKey: "ON_SITE", icon: "3" },
  { id: "POST_REVIEW", labelKey: "POST_REVIEW", icon: "4" },
] as const;

export function ProgressDashboard({ currentPhase, fieldworkProgress, status: _status }: ProgressDashboardProps) {
  const t = useTranslations("reviews.detail.overview.progress");

  const getPhaseStatus = (phaseId: string) => {
    const phaseOrder = phases.map(p => p.id);
    const currentIndex = phaseOrder.indexOf(currentPhase);
    const phaseIndex = phaseOrder.indexOf(phaseId as typeof currentPhase);

    if (phaseIndex < currentIndex) return "completed";
    if (phaseIndex === currentIndex) return "current";
    return "upcoming";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          {t("title")}
          <Badge variant="outline">{t(`phase.${currentPhase}`)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phase Progress */}
        <div className="flex items-center justify-between">
          {phases.map((phase, index) => {
            const phaseStatus = getPhaseStatus(phase.id);
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
                    getPhaseStatus(phases[index + 1].id) !== "upcoming" ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Fieldwork Progress */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">{t("fieldwork")}</span>
            <span className="font-medium">
              {fieldworkProgress.completed}/{fieldworkProgress.total} ({fieldworkProgress.percentage}%)
            </span>
          </div>
          <Progress value={fieldworkProgress.percentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
