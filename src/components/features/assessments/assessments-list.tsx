"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ClipboardList,
  Loader2,
  PlayCircle,
  Award,
  Trash2,
  Archive,
  MoreVertical,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { MaturityLevelBadge } from "@/components/features/assessment/maturity-level-badge";
import { DeleteAssessmentDialog } from "@/components/features/assessment/delete-assessment-dialog";
import { ArchiveAssessmentDialog } from "@/components/features/assessment/archive-assessment-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AssessmentStatus, QuestionnaireType } from "@/types/prisma-enums";

// Type for assessment list items from tRPC
interface AssessmentListItem {
  id: string;
  referenceNumber: string | null;
  title: string;
  status: AssessmentStatus;
  progress: number;
  dueDate: Date | string | null;
  updatedAt: Date | string;
  eiScore: number | null;
  overallScore: number | null;
  maturityLevel: string | null;
  questionnaire: {
    id: string;
    type: string;
    titleEn: string;
    titleFr: string;
  };
  organization: {
    id: string;
    nameEn: string;
    nameFr: string;
  };
}

interface AssessmentsListProps {
  organizationId?: string;
  status?: string;
  questionnaireType?: string;
}

export function AssessmentsList({
  organizationId,
  status,
  questionnaireType,
}: AssessmentsListProps) {
  const t = useTranslations("assessment");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<{
    id: string;
    title: string;
    type: string;
  } | null>(null);

  // Build query filters
  const queryFilters: {
    organizationId?: string;
    status?: AssessmentStatus;
    questionnaireType?: QuestionnaireType;
  } = {};

  if (organizationId) {
    queryFilters.organizationId = organizationId;
  }
  if (status && ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "COMPLETED", "ARCHIVED"].includes(status)) {
    queryFilters.status = status as AssessmentStatus;
  }
  if (questionnaireType && ["ANS_USOAP_CMA", "SMS_CANSO_SOE"].includes(questionnaireType)) {
    queryFilters.questionnaireType = questionnaireType as QuestionnaireType;
  }

  const { data, isLoading, error } = trpc.assessment.list.useQuery(queryFilters);

  const assessments = data?.assessments ?? [];

  // Handler to open delete dialog
  const handleDeleteClick = (assessment: { id: string; title: string; type: string }) => {
    setSelectedAssessment(assessment);
    setDeleteDialogOpen(true);
  };

  // Handler to open archive dialog
  const handleArchiveClick = (assessment: { id: string; title: string }) => {
    setSelectedAssessment({ ...assessment, type: "" });
    setArchiveDialogOpen(true);
  };

  // Check if assessment can be deleted (DRAFT only)
  const canDelete = (assessmentStatus: AssessmentStatus) => {
    return assessmentStatus === "DRAFT";
  };

  // Check if assessment can be archived (SUBMITTED, UNDER_REVIEW, COMPLETED)
  const canArchive = (assessmentStatus: AssessmentStatus) => {
    return (
      assessmentStatus === "SUBMITTED" ||
      assessmentStatus === "UNDER_REVIEW" ||
      assessmentStatus === "COMPLETED"
    );
  };

  const getStatusBadge = (assessmentStatus: AssessmentStatus) => {
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
    > = {
      DRAFT: { variant: "secondary", label: t("status.draft") },
      SUBMITTED: { variant: "outline", label: t("status.submitted") },
      UNDER_REVIEW: { variant: "outline", label: t("status.underReview") },
      COMPLETED: { variant: "default", label: t("status.completed") },
      ARCHIVED: { variant: "secondary", label: t("status.archived") },
    };
    const config = variants[assessmentStatus] ?? { variant: "secondary" as const, label: assessmentStatus };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Loading State
  if (isLoading) {
    return (
      <Card className="py-12">
        <CardContent className="flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">{t("list.loading")}</p>
        </CardContent>
      </Card>
    );
  }

  // Error State
  if (error) {
    return (
      <Card className="py-12 border-destructive">
        <CardContent className="flex flex-col items-center justify-center text-center">
          <p className="text-destructive">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  // Empty State
  if (assessments.length === 0) {
    return (
      <Card className="py-12">
        <CardContent className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <ClipboardList className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">{t("list.empty.title")}</h3>
          <p className="text-muted-foreground max-w-sm mt-2">
            {t("list.empty.description")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {assessments.map((assessment: AssessmentListItem) => (
          <Card key={assessment.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg font-mono">
                      {assessment.referenceNumber || assessment.title}
                    </h3>
                    {getStatusBadge(assessment.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {assessment.questionnaire.type === "ANS_USOAP_CMA"
                      ? t("typeLabel.ans")
                      : t("typeLabel.sms")}
                    {" • "}
                    {locale === "fr"
                      ? assessment.organization.nameFr
                      : assessment.organization.nameEn}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {t("list.updated")}{" "}
                      {formatDistanceToNow(new Date(assessment.updatedAt), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </span>
                    {assessment.dueDate && (
                      <span>
                        {t("list.due")}: {new Date(assessment.dueDate).toLocaleDateString(locale)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 min-w-[200px]">
                  {/* Show score for submitted/completed assessments */}
                  {(assessment.status === "SUBMITTED" ||
                    assessment.status === "UNDER_REVIEW" ||
                    assessment.status === "COMPLETED") &&
                  (assessment.eiScore !== null ||
                    assessment.maturityLevel !== null ||
                    assessment.overallScore !== null) ? (
                    <div className="flex items-center gap-3 mb-1">
                      {assessment.questionnaire.type === "ANS_USOAP_CMA" ? (
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">EI:</span>
                          <span
                            className={cn(
                              "font-bold text-lg",
                              (assessment.eiScore ?? assessment.overallScore ?? 0) >= 80
                                ? "text-green-600"
                                : (assessment.eiScore ?? assessment.overallScore ?? 0) >= 60
                                  ? "text-yellow-600"
                                  : (assessment.eiScore ?? assessment.overallScore ?? 0) >= 40
                                    ? "text-orange-600"
                                    : "text-red-600"
                            )}
                          >
                            {(assessment.eiScore ?? assessment.overallScore)?.toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <MaturityLevelBadge level={assessment.maturityLevel} size="sm" />
                          <span className="font-semibold">
                            {assessment.overallScore?.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{t("list.progress")}</span>
                        <span>{assessment.progress}%</span>
                      </div>
                      <Progress value={assessment.progress} className="h-2" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/assessments/${assessment.id}`}>{t("list.view")}</Link>
                    </Button>
                    {assessment.status === "DRAFT" && (
                      <Button size="sm" asChild>
                        <Link href={`/assessments/${assessment.id}`}>
                          <PlayCircle className="h-4 w-4 mr-1" />
                          {t("list.continue")}
                        </Link>
                      </Button>
                    )}
                    {/* Actions Menu */}
                    {(canDelete(assessment.status) || canArchive(assessment.status)) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">{t("list.actions")}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canDelete(assessment.status) && (
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() =>
                                handleDeleteClick({
                                  id: assessment.id,
                                  title: assessment.title,
                                  type:
                                    locale === "fr"
                                      ? assessment.questionnaire.titleFr
                                      : assessment.questionnaire.titleEn,
                                })
                              }
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("delete.button")}
                            </DropdownMenuItem>
                          )}
                          {canArchive(assessment.status) && (
                            <DropdownMenuItem
                              className="text-amber-600 focus:text-amber-600"
                              onClick={() =>
                                handleArchiveClick({
                                  id: assessment.id,
                                  title: assessment.title,
                                })
                              }
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              {t("archive.button")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Dialog */}
      {selectedAssessment && (
        <DeleteAssessmentDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          assessmentId={selectedAssessment.id}
          assessmentTitle={selectedAssessment.title}
          assessmentType={selectedAssessment.type}
        />
      )}

      {/* Archive Dialog */}
      {selectedAssessment && (
        <ArchiveAssessmentDialog
          open={archiveDialogOpen}
          onOpenChange={setArchiveDialogOpen}
          assessmentId={selectedAssessment.id}
          assessmentTitle={selectedAssessment.title}
        />
      )}
    </>
  );
}
