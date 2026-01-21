"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  AlertTriangle,
  Info,
  Save,
  Loader2,
  CheckCircle2,
  Send,
  Lock,
} from "lucide-react";
import { CollapsibleGuidance } from "./collapsible-guidance";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { useAssessmentWorkspace } from "./assessment-workspace-context";
import { ANSResponse } from "./response-types/ans-response";
import { SMSResponse } from "./response-types/sms-response";
import { CommentsSection } from "./comments-section";
import { EvidencePanel } from "./evidence-panel";

export function QuestionResponsePanel() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("workspace");
  const tCommon = useTranslations("common");
  const tAssessment = useTranslations("assessment");
  const {
    assessment,
    currentQuestion,
    currentQuestionIndex,
    filteredQuestions,
    responses,
    goToNextQuestion,
    goToPreviousQuestion,
    updateResponse,
    saveStatus,
    saveCurrentResponse,
    isOnLastQuestion,
    progressPercent,
    answeredCount,
    totalCount,
  } = useAssessmentWorkspace();

  // Check if assessment can be edited/submitted
  const isEditable = assessment?.status === "DRAFT";
  const isReadOnly = !isEditable;
  const isAlreadySubmitted = assessment?.status === "SUBMITTED" ||
    assessment?.status === "UNDER_REVIEW" ||
    assessment?.status === "COMPLETED" ||
    assessment?.status === "ARCHIVED";
  const canSubmit = progressPercent === 100 && isEditable;

  // Submit mutation
  const submitMutation = trpc.assessment.submit.useMutation({
    onSuccess: () => {
      toast.success(tAssessment("submitSuccess"));
      router.push(`/${locale}/assessments`);
    },
    onError: (error) => {
      toast.error(error.message || tAssessment("submitError"));
    },
  });

  const handleSubmit = async () => {
    if (!assessment?.id) return;
    await submitMutation.mutateAsync({ id: assessment.id });
  };

  const isSubmitting = submitMutation.isPending;

  const isANS = assessment?.questionnaireType === "ANS_USOAP_CMA";
  const response = currentQuestion ? responses.get(currentQuestion.id) : null;

  const questionText = useMemo(() => {
    if (!currentQuestion) return "";
    return locale === "fr"
      ? currentQuestion.questionTextFr
      : currentQuestion.questionTextEn;
  }, [currentQuestion, locale]);

  const guidanceText = useMemo(() => {
    if (!currentQuestion) return "";
    return locale === "fr"
      ? currentQuestion.guidanceTextFr
      : currentQuestion.guidanceTextEn;
  }, [currentQuestion, locale]);

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">{t("panel.noQuestion")}</h3>
          <p className="text-muted-foreground">{t("panel.selectQuestion")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with navigation */}
      <div className="flex items-center justify-between border-b p-4 bg-background">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("panel.questionOf", {
              current: currentQuestionIndex + 1,
              total: filteredQuestions.length,
            })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextQuestion}
            disabled={currentQuestionIndex >= filteredQuestions.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Inline read-only indicator */}
          {isReadOnly && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md text-slate-600 cursor-help">
                    <Lock className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{tAssessment("readOnly.badge")}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p>{tAssessment("readOnly.tooltip")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Save status */}
          <div className="flex items-center gap-1 text-sm">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">{t("panel.saving")}</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-green-600">{t("panel.saved")}</span>
              </>
            )}
            {saveStatus === "error" && (
              <>
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-destructive">{t("panel.saveError")}</span>
              </>
            )}
          </div>

          {/* Manual save button - hidden when read-only */}
          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={saveCurrentResponse}
              disabled={saveStatus === "saving"}
            >
              <Save className="h-4 w-4 mr-2" />
              {t("panel.save")}
            </Button>
          )}

          {/* Flag button - disabled when read-only */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={response?.isFlagged ? "default" : "outline"}
                  size="icon"
                  onClick={() =>
                    updateResponse(currentQuestion.id, {
                      isFlagged: !response?.isFlagged,
                    })
                  }
                  disabled={isReadOnly}
                  className={cn(
                    response?.isFlagged && "bg-yellow-500 hover:bg-yellow-600"
                  )}
                >
                  <Flag className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{response?.isFlagged ? t("panel.unflag") : t("panel.flag")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main content area - scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="max-w-3xl mx-auto space-y-6"
          >
            {/* Question card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Question number */}
                      <Badge variant="secondary" className="font-mono">
                        {currentQuestion.pqNumber ||
                          `Q${currentQuestionIndex + 1}`}
                      </Badge>

                      {/* Category badge */}
                      <Badge variant="outline">
                        {isANS
                          ? currentQuestion.auditArea
                          : currentQuestion.smsComponent}
                      </Badge>

                      {/* Priority indicator */}
                      {currentQuestion.isPriorityPQ && (
                        <Badge
                          variant="destructive"
                          className="flex items-center gap-1"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {t("panel.priority")}
                        </Badge>
                      )}

                      {/* Critical element for ANS */}
                      {isANS && currentQuestion.criticalElement && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          CE: {currentQuestion.criticalElement}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl leading-relaxed">
                      {questionText}
                    </CardTitle>

                    {/* Collapsible guidance - placed after question text */}
                    {guidanceText && (
                      <div className="pt-2">
                        <CollapsibleGuidance guidance={guidanceText} />
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Response section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("panel.yourResponse")}</CardTitle>
                <CardDescription>
                  {isANS ? t("panel.ansInstructions") : t("panel.smsInstructions")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isANS ? (
                  <ANSResponse
                    value={response?.responseValue ?? null}
                    onChange={(value) =>
                      updateResponse(currentQuestion.id, { responseValue: value })
                    }
                    disabled={isReadOnly}
                  />
                ) : (
                  <SMSResponse
                    value={response?.maturityLevel ?? null}
                    onChange={(value) =>
                      updateResponse(currentQuestion.id, { maturityLevel: value })
                    }
                    disabled={isReadOnly}
                  />
                )}
              </CardContent>
            </Card>

            {/* Evidence section */}
            <EvidencePanel
              evidenceDescription={response?.evidenceDescription ?? ""}
              evidenceUrls={response?.evidenceUrls ?? []}
              onDescriptionChange={(value) =>
                updateResponse(currentQuestion.id, { evidenceDescription: value })
              }
              onUrlsChange={(urls) =>
                updateResponse(currentQuestion.id, { evidenceUrls: urls })
              }
              disabled={isReadOnly}
            />

            {/* Comments section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("panel.notes")}</CardTitle>
              </CardHeader>
              <CardContent>
                <CommentsSection
                  assessorNotes={response?.assessorNotes ?? ""}
                  internalNotes={response?.internalNotes ?? ""}
                  onAssessorNotesChange={(value) =>
                    updateResponse(currentQuestion.id, { assessorNotes: value })
                  }
                  onInternalNotesChange={(value) =>
                    updateResponse(currentQuestion.id, { internalNotes: value })
                  }
                  disabled={isReadOnly}
                />
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer with quick navigation */}
      <div className="border-t p-4 bg-background">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <Button
            variant="outline"
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {t("panel.previous")}
          </Button>

          <div className="text-sm text-muted-foreground">
            {t("panel.keyboardHint")}
          </div>

          {isOnLastQuestion ? (
            isAlreadySubmitted ? (
              <Button variant="outline" disabled>
                <Lock className="h-4 w-4 mr-2" />
                {tAssessment("alreadySubmitted")}
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant={canSubmit ? "default" : "outline"}
                    className={cn(canSubmit && "bg-green-600 hover:bg-green-700")}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {isSubmitting ? tCommon("submitting") : tAssessment("actions.submit")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      {canSubmit ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      )}
                      {tAssessment("confirmSubmit.title")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {tAssessment("confirmSubmit.description")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">{tAssessment("progress.percentComplete", { percent: progressPercent })}</span>
                      <span className="text-sm font-medium">{answeredCount}/{totalCount}</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                    {canSubmit && (
                      <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        {tAssessment("validation.canSubmit")}
                      </p>
                    )}
                    {!canSubmit && (
                      <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        {tAssessment("validation.cannotSubmit")}
                      </p>
                    )}
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSubmitting}>
                      {tCommon("actions.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleSubmit}
                      disabled={!canSubmit || isSubmitting}
                      className="bg-primary"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {tCommon("submitting")}
                        </>
                      ) : (
                        tCommon("actions.submit")
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )
          ) : (
            <Button onClick={goToNextQuestion}>
              {t("panel.next")}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
