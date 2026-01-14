"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  MapPin,
  BookOpen,
  ExternalLink,
  Link2,
  FileText,
  Layers,
  Target,
  Shield,
} from "lucide-react";
import {
  LanguageToggle,
  useContentLanguage,
} from "./language-toggle";
import { AmendmentIndicators } from "./amendment-badge";
import { ICAOReferenceList } from "./icao-reference-list";
import {
  USOAP_AUDIT_AREAS,
  CRITICAL_ELEMENTS,
  SMS_COMPONENTS,
  CANSO_STUDY_AREAS,
} from "@/lib/questionnaire/constants";
import type {
  Question,
  ICAOReference,
  PQAmendmentStatus,
  QuestionnaireType,
} from "@prisma/client";

// Extended question type with relations
interface QuestionWithRelations extends Question {
  icaoReferences: ICAOReference[];
  relatedQuestions?: {
    id: string;
    pqNumber: string | null;
    questionTextEn: string | null;
  }[];
}

interface QuestionDetailModalProps {
  question: QuestionWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
  onNavigate?: (direction: "prev" | "next") => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  questionnaireType?: QuestionnaireType;
}

export function QuestionDetailModal({
  question,
  open,
  onOpenChange,
  locale,
  onNavigate,
  hasPrevious = false,
  hasNext = false,
  questionnaireType,
}: QuestionDetailModalProps) {
  const t = useTranslations("questionDetail");
  const { contentLanguage, setContentLanguage, getBilingualText } =
    useContentLanguage({ defaultLocale: locale });

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && hasPrevious && onNavigate) {
        event.preventDefault();
        onNavigate("prev");
      } else if (event.key === "ArrowRight" && hasNext && onNavigate) {
        event.preventDefault();
        onNavigate("next");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, hasPrevious, hasNext, onNavigate]);

  if (!question) return null;

  const isANS = questionnaireType === "ANS_USOAP_CMA" || question.auditArea;
  const isSMS = questionnaireType === "SMS_CANSO_SOE" || question.smsComponent;

  // Get metadata labels
  const auditAreaMeta = question.auditArea
    ? USOAP_AUDIT_AREAS[question.auditArea]
    : null;
  const criticalElementMeta = question.criticalElement
    ? CRITICAL_ELEMENTS[question.criticalElement]
    : null;
  const smsComponentMeta = question.smsComponent
    ? SMS_COMPONENTS[question.smsComponent]
    : null;
  const studyAreaMeta = question.studyArea
    ? CANSO_STUDY_AREAS[question.studyArea]
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Question Number */}
              <div className="flex items-center gap-2 mb-2">
                {question.pqNumber && (
                  <Badge
                    variant="outline"
                    className="font-mono text-base font-bold px-2 py-0.5"
                  >
                    {question.pqNumber}
                  </Badge>
                )}

                {/* Status Badges */}
                <div className="flex items-center gap-1.5">
                  {question.isPriorityPQ && (
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-xs gap-1"
                    >
                      <Star className="h-3 w-3" />
                      {t("priority")}
                    </Badge>
                  )}
                  {question.requiresOnSite && (
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 text-xs gap-1"
                    >
                      <MapPin className="h-3 w-3" />
                      {t("onSite")}
                    </Badge>
                  )}
                  <AmendmentIndicators
                    status={question.pqStatus as PQAmendmentStatus}
                    previousPQNumber={question.previousPqNumber}
                  />
                </div>
              </div>

              <DialogTitle className="text-lg font-semibold leading-tight sr-only">
                {question.pqNumber || t("question")}
              </DialogTitle>
            </div>

            {/* Language Toggle */}
            <LanguageToggle
              currentLanguage={contentLanguage}
              onChange={setContentLanguage}
              className="shrink-0"
            />
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 max-h-[calc(90vh-180px)]">
          <div className="p-4 space-y-6">
            {/* Question Text */}
            <div>
              <p className="text-base leading-relaxed">
                {getBilingualText(question.questionTextEn, question.questionTextFr)}
              </p>
            </div>

            <Separator />

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* ANS Metadata */}
              {isANS && (
                <>
                  {auditAreaMeta && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        {t("auditArea")}
                      </div>
                      <Badge variant="outline" className="font-medium">
                        {question.auditArea} -{" "}
                        {auditAreaMeta.name[contentLanguage]}
                      </Badge>
                    </div>
                  )}

                  {criticalElementMeta && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Target className="h-3.5 w-3.5" />
                        {t("criticalElement")}
                      </div>
                      <Badge variant="outline" className="font-medium">
                        CE-{criticalElementMeta.number}:{" "}
                        {criticalElementMeta.name[contentLanguage]}
                      </Badge>
                    </div>
                  )}
                </>
              )}

              {/* SMS Metadata */}
              {isSMS && (
                <>
                  {smsComponentMeta && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Shield className="h-3.5 w-3.5" />
                        {t("smsComponent")}
                      </div>
                      <Badge
                        variant="outline"
                        className="font-medium bg-emerald-50 dark:bg-emerald-900/20"
                      >
                        {smsComponentMeta.name[contentLanguage]}
                      </Badge>
                    </div>
                  )}

                  {studyAreaMeta && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Layers className="h-3.5 w-3.5" />
                        {t("studyArea")}
                      </div>
                      <Badge variant="outline" className="font-medium">
                        SA {studyAreaMeta.componentNumber}.
                        {studyAreaMeta.areaNumber}:{" "}
                        {studyAreaMeta.name[contentLanguage]}
                      </Badge>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Guidance for Review of Evidence */}
            {(question.guidanceEn || question.guidanceFr) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">{t("guidance")}</h3>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {getBilingualText(question.guidanceEn, question.guidanceFr)}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* ICAO References */}
            {question.icaoReferences && question.icaoReferences.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">
                      {t("icaoReferences")} ({question.icaoReferences.length})
                    </h3>
                  </div>
                  <ICAOReferenceList
                    references={question.icaoReferences}
                    contentLanguage={contentLanguage}
                  />
                </div>
              </>
            )}

            {/* Related Questions */}
            {question.relatedQuestions && question.relatedQuestions.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">
                      {t("relatedQuestions")} ({question.relatedQuestions.length})
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {question.relatedQuestions.map((related) => (
                      <Link
                        key={related.id}
                        href={`/${locale}/questionnaires/question/${related.id}`}
                        className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-md border bg-card hover:bg-muted transition-colors"
                      >
                        <span className="font-mono font-medium">
                          {related.pqNumber}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer with Navigation */}
        <div className="border-t p-3 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            {onNavigate && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate("prev")}
                  disabled={!hasPrevious}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t("previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate("next")}
                  disabled={!hasNext}
                  className="gap-1"
                >
                  {t("next")}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/${locale}/questionnaires/question/${question.id}`}
              target="_blank"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {t("openInNewTab")}
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing modal state with question list navigation
interface UseQuestionModalOptions {
  questions: QuestionWithRelations[];
  onQuestionChange?: (question: QuestionWithRelations | null) => void;
}

export function useQuestionModal({ questions, onQuestionChange }: UseQuestionModalOptions) {
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionWithRelations | null>(null);
  const [open, setOpen] = useState(false);

  const currentIndex = selectedQuestion
    ? questions.findIndex((q) => q.id === selectedQuestion.id)
    : -1;

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < questions.length - 1;

  const openQuestion = useCallback((question: QuestionWithRelations) => {
    setSelectedQuestion(question);
    setOpen(true);
    onQuestionChange?.(question);
  }, [onQuestionChange]);

  const closeModal = useCallback(() => {
    setOpen(false);
    setSelectedQuestion(null);
    onQuestionChange?.(null);
  }, [onQuestionChange]);

  const navigate = useCallback(
    (direction: "prev" | "next") => {
      if (direction === "prev" && hasPrevious) {
        const newQuestion = questions[currentIndex - 1];
        setSelectedQuestion(newQuestion);
        onQuestionChange?.(newQuestion);
      } else if (direction === "next" && hasNext) {
        const newQuestion = questions[currentIndex + 1];
        setSelectedQuestion(newQuestion);
        onQuestionChange?.(newQuestion);
      }
    },
    [questions, currentIndex, hasPrevious, hasNext, onQuestionChange]
  );

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      if (!newOpen) {
        setSelectedQuestion(null);
        onQuestionChange?.(null);
      }
    },
    [onQuestionChange]
  );

  return {
    selectedQuestion,
    open,
    openQuestion,
    closeModal,
    navigate,
    handleOpenChange,
    hasPrevious,
    hasNext,
    currentIndex,
    totalQuestions: questions.length,
  };
}
