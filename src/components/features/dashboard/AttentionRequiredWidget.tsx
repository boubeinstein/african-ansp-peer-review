"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, isPast } from "date-fns";
import {
  AlertTriangle,
  Clock,
  Pause,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "../progress/ProgressBar";
import type { AssessmentStatus } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface AssessmentAttentionItem {
  id: string;
  title: string;
  status: AssessmentStatus;
  progress: number;
  dueDate: Date | null;
  lastActivity: Date | null;
  reason: "overdue" | "stalled";
}

interface AttentionRequiredWidgetProps {
  assessments: AssessmentAttentionItem[];
  showViewAll?: boolean;
  onViewAll?: () => void;
  onAssessmentClick?: (assessmentId: string) => void;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AttentionRequiredWidget({
  assessments,
  showViewAll = true,
  onViewAll,
  onAssessmentClick,
  className,
}: AttentionRequiredWidgetProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();

  const handleAssessmentClick = (id: string) => {
    if (onAssessmentClick) {
      onAssessmentClick(id);
    } else {
      router.push(`/assessments/${id}`);
    }
  };

  if (assessments.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t("attention.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("attention.allOnTrack")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {t("attention.title")}
          </CardTitle>
          <Badge variant="destructive">{assessments.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {assessments.map((assessment) => {
            const isOverdue = assessment.reason === "overdue";
            const Icon = isOverdue ? Clock : Pause;
            const colorClass = isOverdue
              ? "text-red-600 bg-red-100"
              : "text-yellow-600 bg-yellow-100";

            return (
              <div
                key={assessment.id}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-colors",
                  "hover:bg-muted/50"
                )}
                onClick={() => handleAssessmentClick(assessment.id)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "p-1.5 rounded",
                        colorClass.split(" ")[1]
                      )}
                    >
                      <Icon
                        className={cn("h-3.5 w-3.5", colorClass.split(" ")[0])}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm line-clamp-1">
                        {assessment.title}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] mt-0.5",
                          isOverdue && "border-red-300 text-red-700",
                          !isOverdue && "border-yellow-300 text-yellow-700"
                        )}
                      >
                        {isOverdue
                          ? t("attention.overdue")
                          : t("attention.stalled")}
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>

                <div className="space-y-2">
                  <ProgressBar
                    value={assessment.progress}
                    showLabel={false}
                    size="sm"
                    variant={isOverdue ? "danger" : "warning"}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{assessment.progress}% complete</span>
                    {assessment.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {isPast(new Date(assessment.dueDate))
                          ? `${formatDistanceToNow(new Date(assessment.dueDate))} overdue`
                          : `Due ${formatDistanceToNow(new Date(assessment.dueDate), { addSuffix: true })}`}
                      </span>
                    )}
                    {!assessment.dueDate && assessment.lastActivity && (
                      <span>
                        Last activity{" "}
                        {formatDistanceToNow(new Date(assessment.lastActivity), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {showViewAll && assessments.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={onViewAll}
            >
              {t("attention.viewAll")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AttentionRequiredWidget;
