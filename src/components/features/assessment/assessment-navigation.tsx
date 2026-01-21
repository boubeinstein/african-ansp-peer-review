"use client";

import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  Send,
  Save,
  Flag,
  Loader2,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AssessmentNavigationProps {
  currentIndex: number;
  totalQuestions: number;
  progress: number;
  answeredCount: number;
  onPrevious: () => void;
  onNext: () => void;
  onSave: () => void;
  onSubmit: () => void;
  onFlag?: () => void;
  isFlagged?: boolean;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  isReadOnly: boolean;
  isSaving?: boolean;
  isSaved?: boolean;
  hasError?: boolean;
  canSubmit: boolean;
  isSubmitting?: boolean;
  isAlreadySubmitted?: boolean;
}

export function AssessmentNavigation({
  currentIndex,
  totalQuestions,
  progress,
  answeredCount,
  onPrevious,
  onNext,
  onSave,
  onSubmit,
  onFlag,
  isFlagged = false,
  isFirstQuestion,
  isLastQuestion,
  isReadOnly,
  isSaving = false,
  isSaved = false,
  hasError = false,
  canSubmit,
  isSubmitting = false,
  isAlreadySubmitted = false,
}: AssessmentNavigationProps) {
  const t = useTranslations("workspace");
  const tAssessment = useTranslations("assessment");

  return (
    <footer
      className={cn(
        "sticky bottom-0 z-50",
        "bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80",
        "border-t shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.1)]",
        "px-4 py-3"
      )}
    >
      {/* Progress bar */}
      <div className="max-w-5xl mx-auto mb-3">
        <div className="flex items-center gap-3">
          <Progress value={progress} className="h-1.5 flex-1" />
          <span className="text-xs font-medium text-muted-foreground tabular-nums whitespace-nowrap">
            {answeredCount} / {totalQuestions} {t("navigation.answered")}
          </span>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Left: Previous + Flag */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={isFirstQuestion}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t("panel.previous")}</span>
          </Button>

          {onFlag && !isReadOnly && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onFlag}
                    className={cn("gap-1", isFlagged && "text-amber-600")}
                  >
                    <Flag
                      className={cn("h-4 w-4", isFlagged && "fill-current")}
                    />
                    <span className="hidden sm:inline">
                      {isFlagged ? t("panel.unflag") : t("panel.flag")}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isFlagged
                      ? t("panel.unflag")
                      : t("panel.flag")}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Center: Status indicator */}
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
          {isSaving && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("panel.saving")}
            </span>
          )}
          {isSaved && !isSaving && (
            <span className="flex items-center gap-1.5 text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("panel.saved")}
            </span>
          )}
          {hasError && !isSaving && (
            <span className="flex items-center gap-1.5 text-destructive">
              {t("panel.saveError")}
            </span>
          )}
          {isReadOnly && (
            <span className="flex items-center gap-1.5 text-slate-500">
              <Lock className="h-3.5 w-3.5" />
              {tAssessment("readOnly.badge")}
            </span>
          )}
        </div>

        {/* Right: Save + Next/Submit */}
        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="gap-1"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{t("panel.save")}</span>
            </Button>
          )}

          {isLastQuestion ? (
            isAlreadySubmitted ? (
              <Button variant="outline" size="sm" disabled className="gap-1">
                <Lock className="h-4 w-4" />
                <span>{tAssessment("alreadySubmitted")}</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onSubmit}
                disabled={!canSubmit || isReadOnly || isSubmitting}
                className={cn(
                  "gap-1",
                  canSubmit && "bg-green-600 hover:bg-green-700"
                )}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>{tAssessment("actions.submit")}</span>
              </Button>
            )
          ) : (
            <Button size="sm" onClick={onNext} className="gap-1">
              <span className="hidden sm:inline">{t("panel.next")}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Question indicator for mobile */}
      <div className="md:hidden text-center mt-2">
        <span className="text-xs text-muted-foreground">
          {t("panel.questionOf", {
            current: currentIndex + 1,
            total: totalQuestions,
          })}
        </span>
      </div>
    </footer>
  );
}
