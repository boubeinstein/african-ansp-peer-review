"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Plus, ClipboardList, Clock, CheckCircle2, FileText, Loader2, PlayCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import type { AssessmentStatus } from "@prisma/client";

export default function AssessmentsPage() {
  const t = useTranslations("assessment");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  const { data, isLoading, error } = trpc.assessment.list.useQuery({});
  
  const assessments = data?.assessments ?? [];

  // Calculate stats
  const stats = {
    total: assessments.length,
    inProgress: assessments.filter(a => a.status === "DRAFT").length,
    completed: assessments.filter(a => a.status === "COMPLETED").length,
    submitted: assessments.filter(a => a.status === "SUBMITTED" || a.status === "UNDER_REVIEW").length,
  };

  const getStatusBadge = (status: AssessmentStatus) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      DRAFT: { variant: "secondary", label: t("status.draft") },
      SUBMITTED: { variant: "outline", label: t("status.submitted") },
      UNDER_REVIEW: { variant: "outline", label: t("status.underReview") },
      COMPLETED: { variant: "default", label: t("status.completed") },
      ARCHIVED: { variant: "secondary", label: t("status.archived") },
    };
    const config = variants[status] ?? { variant: "secondary" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t("list.title")}</h1>
          <p className="text-muted-foreground">{t("list.description")}</p>
        </div>
        <Button asChild>
          <Link href="/assessments/new">
            <Plus className="h-4 w-4 mr-2" />
            {t("list.newAssessment")}
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
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

      {/* Loading State */}
      {isLoading && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">{t("list.loading")}</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="py-12 border-destructive">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <p className="text-destructive">{error.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Assessment List */}
      {!isLoading && !error && assessments.length > 0 && (
        <div className="space-y-4">
          {assessments.map((assessment) => (
            <Card key={assessment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{assessment.title}</h3>
                      {getStatusBadge(assessment.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {locale === "fr" 
                        ? assessment.questionnaire.titleFr 
                        : assessment.questionnaire.titleEn}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        {t("list.updated")} {formatDistanceToNow(new Date(assessment.updatedAt), { 
                          addSuffix: true, 
                          locale: dateLocale 
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
                    <div className="w-full">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{t("list.progress")}</span>
                        <span>{assessment.progress}%</span>
                      </div>
                      <Progress value={assessment.progress} className="h-2" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/assessments/${assessment.id}`}>
                          {t("list.view")}
                        </Link>
                      </Button>
                      {assessment.status === "DRAFT" && (
                        <Button size="sm" asChild>
                          <Link href={`/assessments/${assessment.id}`}>
                            <PlayCircle className="h-4 w-4 mr-1" />
                            {t("list.continue")}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && assessments.length === 0 && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <ClipboardList className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">{t("list.empty.title")}</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              {t("list.empty.description")}
            </p>
            <Button className="mt-6" asChild>
              <Link href="/assessments/new">
                <Plus className="h-4 w-4 mr-2" />
                {t("list.empty.create")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
