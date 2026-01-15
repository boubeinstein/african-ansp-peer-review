"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  AlertTriangle,
  Info,
  Save,
  Loader2,
  CheckCircle2,
} from "lucide-react";
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
import { useAssessmentWorkspace } from "./assessment-workspace-context";
import { ANSResponse } from "./response-types/ans-response";
import { SMSResponse } from "./response-types/sms-response";
import { CommentsSection } from "./comments-section";
import { EvidencePanel } from "./evidence-panel";

export function QuestionResponsePanel() {
  const locale = useLocale();
  const t = useTranslations("workspace");
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
  } = useAssessmentWorkspace();

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

          {/* Manual save button */}
          <Button
            variant="outline"
            size="sm"
            onClick={saveCurrentResponse}
            disabled={saveStatus === "saving"}
          >
            <Save className="h-4 w-4 mr-2" />
            {t("panel.save")}
          </Button>

          {/* Flag button */}
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
                  </div>
                </div>
              </CardHeader>

              {/* Guidance text */}
              {guidanceText && (
                <CardContent>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800 mb-1">
                          {t("panel.guidance")}
                        </p>
                        <p className="text-sm text-blue-700 whitespace-pre-wrap">
                          {guidanceText}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
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
                  />
                ) : (
                  <SMSResponse
                    value={response?.maturityLevel ?? null}
                    onChange={(value) =>
                      updateResponse(currentQuestion.id, { maturityLevel: value })
                    }
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

          <Button
            onClick={goToNextQuestion}
            disabled={currentQuestionIndex >= filteredQuestions.length - 1}
          >
            {t("panel.next")}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
