"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ClipboardList, Clock, CheckCircle2, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import type { QuestionnaireType, AssessmentStatus } from "@/types/prisma-enums";

interface AssessmentsStatsProps {
  organizationId?: string;
}

export function AssessmentsStats({ organizationId }: AssessmentsStatsProps) {
  const t = useTranslations("assessment");

  // Build query filters
  const queryFilters: {
    organizationId?: string;
    questionnaireType?: QuestionnaireType;
    status?: AssessmentStatus;
  } = {};

  if (organizationId) {
    queryFilters.organizationId = organizationId;
  }

  const { data } = trpc.assessment.list.useQuery(queryFilters);

  const assessments = data?.assessments ?? [];

  // Calculate stats
  const stats = {
    total: assessments.length,
    inProgress: assessments.filter((a) => a.status === "DRAFT").length,
    completed: assessments.filter((a) => a.status === "COMPLETED").length,
    submitted: assessments.filter(
      (a) => a.status === "SUBMITTED" || a.status === "UNDER_REVIEW"
    ).length,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{t("stats.total")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-bold">{stats.total}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{t("stats.inProgress")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <span className="text-2xl font-bold">{stats.inProgress}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{t("stats.completed")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-2xl font-bold">{stats.completed}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{t("stats.submitted")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-500" />
            <span className="text-2xl font-bold">{stats.submitted}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
