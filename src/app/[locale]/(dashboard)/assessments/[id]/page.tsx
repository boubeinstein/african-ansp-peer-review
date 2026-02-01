"use client";

import { useTranslations, useLocale } from "next-intl";
import { use } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  PlayCircle,
  Eye,
  FileText,
  Calendar,
  Building2,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { AssessmentScoreSummary } from "@/components/features/assessment/assessment-score-summary";
import type { AssessmentStatus } from "@/types/prisma-enums";

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default function AssessmentDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const t = useTranslations("assessment");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  const { data: assessment, isLoading, error } = trpc.assessment.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="container py-12">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">
            {t("error.title")}
          </h2>
          <p className="text-muted-foreground mb-4">
            {error?.message || t("error.description")}
          </p>
          <Button variant="outline" asChild>
            <Link href="/assessments">{t("backToList")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isEditable = assessment.status === "DRAFT";
  const isSubmitted = ["SUBMITTED", "UNDER_REVIEW", "COMPLETED"].includes(assessment.status);
  const questionnaireTitle = locale === "fr"
    ? assessment.questionnaire.titleFr
    : assessment.questionnaire.titleEn;
  const orgName = locale === "fr"
    ? assessment.organization.nameFr
    : assessment.organization.nameEn;

  // Calculate progress from counts (don't rely on stored progress value which may be stale)
  const calculatedProgress = assessment.totalQuestions > 0
    ? Math.round((assessment.answeredQuestions / assessment.totalQuestions) * 100)
    : 0;

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/assessments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{assessment.title}</h1>
              <StatusBadge status={assessment.status} />
              <Badge variant={assessment.questionnaire.type === "ANS_USOAP_CMA" ? "default" : "secondary"}>
                {assessment.questionnaire.type === "ANS_USOAP_CMA" ? "ANS" : "SMS"}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">{questionnaireTitle}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditable && (
            <Button asChild>
              <Link href={`/assessments/${assessment.id}/take`}>
                <PlayCircle className="h-4 w-4 mr-2" />
                {t("actions.continue")}
              </Link>
            </Button>
          )}
          {isSubmitted && (
            <Button variant="outline" asChild>
              <Link href={`/assessments/${assessment.id}/take`}>
                <Eye className="h-4 w-4 mr-2" />
                {t("actions.viewResponses")}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Assessment Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t("details.organization")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{orgName}</p>
            {assessment.organization.organizationCode && (
              <p className="text-sm text-muted-foreground">
                ICAO: {assessment.organization.organizationCode}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t("details.progress")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold">{calculatedProgress}%</div>
              <div className="text-sm text-muted-foreground">
                {assessment.answeredQuestions} / {assessment.totalQuestions} {t("details.questionsAnswered")}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t("details.dates")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {assessment.startedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("details.started")}:</span>
                  <span>{format(new Date(assessment.startedAt), "PP", { locale: dateLocale })}</span>
                </div>
              )}
              {assessment.submittedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("details.submitted")}:</span>
                  <span>{format(new Date(assessment.submittedAt), "PP", { locale: dateLocale })}</span>
                </div>
              )}
              {assessment.completedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("details.completed")}:</span>
                  <span>{format(new Date(assessment.completedAt), "PP", { locale: dateLocale })}</span>
                </div>
              )}
              {assessment.dueDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("details.due")}:</span>
                  <span>{format(new Date(assessment.dueDate), "PP", { locale: dateLocale })}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score Summary - Only for submitted/completed assessments */}
      {isSubmitted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold">{t("score.resultsTitle")}</h2>
          </div>
          <AssessmentScoreSummary
            assessment={{
              id: assessment.id,
              status: assessment.status,
              overallScore: assessment.overallScore,
              eiScore: assessment.eiScore,
              maturityLevel: assessment.maturityLevel,
              categoryScores: assessment.categoryScores as Record<string, number> | null,
              questionnaire: {
                type: assessment.questionnaire.type,
              },
              submittedAt: assessment.submittedAt,
              completedAt: assessment.completedAt,
            }}
          />
        </motion.div>
      )}

      {/* Draft Assessment Info */}
      {isEditable && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t("draft.title")}</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              {t("draft.description")}
            </p>
            <Button size="lg" asChild>
              <Link href={`/assessments/${assessment.id}/take`}>
                <PlayCircle className="h-5 w-5 mr-2" />
                {t("draft.continueButton")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AssessmentStatus }) {
  const t = useTranslations("assessment");

  const variants: Record<AssessmentStatus, "default" | "secondary" | "destructive" | "outline"> = {
    DRAFT: "secondary",
    SUBMITTED: "outline",
    UNDER_REVIEW: "outline",
    COMPLETED: "default",
    ARCHIVED: "secondary",
  };

  return (
    <Badge variant={variants[status] || "secondary"}>
      {t(`status.${status}`)}
    </Badge>
  );
}
