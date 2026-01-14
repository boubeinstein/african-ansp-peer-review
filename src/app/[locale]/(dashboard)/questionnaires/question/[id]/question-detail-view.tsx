"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  MapPin,
  BookOpen,
  ExternalLink,
  Link2,
  FileText,
  Layers,
  Target,
  Shield,
  ArrowLeft,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { useState, useCallback } from "react";
import {
  LanguageToggle,
  useContentLanguage,
} from "@/components/features/questionnaire/language-toggle";
import { AmendmentIndicators } from "@/components/features/questionnaire/amendment-badge";
import { ICAOReferenceList } from "@/components/features/questionnaire/icao-reference-list";
import {
  USOAP_AUDIT_AREAS,
  CRITICAL_ELEMENTS,
  SMS_COMPONENTS,
  CANSO_STUDY_AREAS,
} from "@/lib/questionnaire/constants";
import type {
  Question,
  ICAOReference,
  Questionnaire,
  QuestionnaireCategory,
  PQAmendmentStatus,
} from "@prisma/client";

interface QuestionWithRelations extends Question {
  icaoReferences: ICAOReference[];
  questionnaire: Pick<
    Questionnaire,
    "id" | "type" | "code" | "titleEn" | "titleFr"
  > | null;
  category: Pick<
    QuestionnaireCategory,
    "id" | "code" | "nameEn" | "nameFr"
  > | null;
  relatedQuestions?: {
    id: string;
    pqNumber: string | null;
    questionTextEn: string | null;
  }[];
}

interface QuestionDetailViewProps {
  question: QuestionWithRelations;
  locale: string;
}

export function QuestionDetailView({
  question,
  locale,
}: QuestionDetailViewProps) {
  const t = useTranslations("questionDetail");
  const { contentLanguage, setContentLanguage, getBilingualText } =
    useContentLanguage({ defaultLocale: locale });

  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, []);

  const isANS = question.questionnaire?.type === "ANS_USOAP_CMA";
  const isSMS = question.questionnaire?.type === "SMS_CANSO_SOE";
  const questionnairePath = isANS ? "ans" : "sms";

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
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {/* Question Number and Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {question.pqNumber && (
                  <h1 className="font-mono text-2xl font-bold">
                    {question.pqNumber}
                  </h1>
                )}

                {/* Status Badges */}
                {question.isPriorityPQ && (
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 gap-1"
                  >
                    <Star className="h-3.5 w-3.5" />
                    {t("priority")}
                  </Badge>
                )}
                {question.requiresOnSite && (
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 gap-1"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {t("onSite")}
                  </Badge>
                )}
                <AmendmentIndicators
                  status={question.pqStatus as PQAmendmentStatus}
                  previousPQNumber={question.previousPqNumber}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <LanguageToggle
                currentLanguage={contentLanguage}
                onChange={setContentLanguage}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    {t("copied")}
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    {t("share")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Question Text */}
          <p className="text-lg leading-relaxed">
            {getBilingualText(question.questionTextEn, question.questionTextFr)}
          </p>
        </CardContent>
      </Card>

      {/* Metadata Card */}
      <Card>
        <CardHeader className="pb-3">
          <h2 className="font-semibold">{t("metadata")}</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* ANS Metadata */}
            {isANS && (
              <>
                {auditAreaMeta && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      {t("auditArea")}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-sm font-mono">
                        {question.auditArea}
                      </Badge>
                      <span className="text-sm">
                        {auditAreaMeta.name[contentLanguage]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {auditAreaMeta.description[contentLanguage]}
                    </p>
                  </div>
                )}

                {criticalElementMeta && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Target className="h-4 w-4" />
                      {t("criticalElement")}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-sm font-mono">
                        CE-{criticalElementMeta.number}
                      </Badge>
                      <span className="text-sm">
                        {criticalElementMeta.name[contentLanguage]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {criticalElementMeta.description[contentLanguage]}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* SMS Metadata */}
            {isSMS && (
              <>
                {smsComponentMeta && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      {t("smsComponent")}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-sm bg-emerald-50 dark:bg-emerald-900/20"
                      >
                        {Math.round(smsComponentMeta.weight * 100)}%{" "}
                        {t("weight")}
                      </Badge>
                      <span className="text-sm">
                        {smsComponentMeta.name[contentLanguage]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {smsComponentMeta.description[contentLanguage]}
                    </p>
                  </div>
                )}

                {studyAreaMeta && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Layers className="h-4 w-4" />
                      {t("studyArea")}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-sm font-mono">
                        SA {studyAreaMeta.componentNumber}.
                        {studyAreaMeta.areaNumber}
                      </Badge>
                      <span className="text-sm">
                        {studyAreaMeta.name[contentLanguage]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {studyAreaMeta.description[contentLanguage]}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Category */}
            {question.category && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  {t("category")}
                </div>
                <Badge variant="secondary" className="text-sm">
                  {question.category.code}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {getBilingualText(
                    question.category.nameEn,
                    question.category.nameFr
                  )}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Guidance Card */}
      {(question.guidanceEn || question.guidanceFr) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">{t("guidance")}</h2>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {getBilingualText(question.guidanceEn, question.guidanceFr)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ICAO References Card */}
      {question.icaoReferences && question.icaoReferences.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">
                {t("icaoReferences")} ({question.icaoReferences.length})
              </h2>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ICAOReferenceList
              references={question.icaoReferences}
              contentLanguage={contentLanguage}
            />
          </CardContent>
        </Card>
      )}

      {/* Related Questions Card */}
      {question.relatedQuestions && question.relatedQuestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">
                {t("relatedQuestions")} ({question.relatedQuestions.length})
              </h2>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-2 sm:grid-cols-2">
              {question.relatedQuestions.map((related) => (
                <Link
                  key={related.id}
                  href={`/${locale}/questionnaires/question/${related.id}`}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <Badge variant="outline" className="font-mono shrink-0">
                    {related.pqNumber}
                  </Badge>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {related.questionTextEn}
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back Navigation */}
      <div className="flex justify-start pt-4">
        <Button variant="outline" asChild>
          <Link
            href={`/${locale}/questionnaires/${questionnairePath}`}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
