"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info } from "lucide-react";
import { CollapsibleGuidance } from "./collapsible-guidance";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAssessmentWorkspace } from "./assessment-workspace-context";
import { ANSResponse } from "./response-types/ans-response";
import { SMSResponse } from "./response-types/sms-response";
import { CommentsSection } from "./comments-section";
import { EvidencePanel } from "./evidence-panel";
import { MobilePanelsBar } from "./mobile-panels-bar";

export function QuestionResponsePanel() {
  const locale = useLocale();
  const t = useTranslations("workspace");
  const {
    assessment,
    currentQuestion,
    currentQuestionIndex,
    responses,
    updateResponse,
  } = useAssessmentWorkspace();

  // Check if assessment can be edited
  const isEditable = assessment?.status === "DRAFT";
  const isReadOnly = !isEditable;

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
    <div className="p-4 lg:p-6 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="max-w-4xl mx-auto space-y-4 lg:space-y-6"
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

      {/* Mobile bottom bar for evidence and notes - visible on smaller screens */}
      <MobilePanelsBar
        evidenceContent={
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
        }
        notesContent={
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
        }
        evidenceCount={(response?.evidenceUrls?.length ?? 0) + (response?.evidenceDescription ? 1 : 0)}
        hasNotes={!!(response?.assessorNotes || response?.internalNotes)}
      />
    </div>
  );
}
