"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  FileText,
  Clock,
  Calendar,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircularProgress } from "@/components/features/progress/ProgressBar";
import { CategoryProgress } from "@/components/features/progress/CategoryProgress";
import { ActivityTimeline } from "@/components/features/progress/ActivityTimeline";
import { trpc } from "@/lib/trpc/client";

// =============================================================================
// TYPES
// =============================================================================

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function AssessmentProgressPage({ params }: PageProps) {
  const { id } = use(params);
  const t = useTranslations("progress");
  const router = useRouter();
  const [timelineOffset, setTimelineOffset] = useState(0);

  // Fetch assessment summary with progress
  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = trpc.progress.getAssessmentSummary.useQuery({ assessmentId: id });

  // Fetch timeline events
  const {
    data: timeline,
    isLoading: timelineLoading,
    refetch: refetchTimeline,
  } = trpc.progress.getTimeline.useQuery({
    assessmentId: id,
    limit: 20,
    offset: timelineOffset,
  });

  // Handle refresh
  const handleRefresh = () => {
    refetchSummary();
    refetchTimeline();
  };

  // Handle category click - navigate to that category
  const handleCategoryClick = (categoryId: string) => {
    router.push(`/assessments/${id}?category=${categoryId}`);
  };

  // Handle load more timeline events
  const handleLoadMore = () => {
    setTimelineOffset((prev) => prev + 20);
  };

  // Loading state
  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!summary) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">
            {t("error.title")}
          </h2>
          <p className="text-muted-foreground mb-4">{t("error.notFound")}</p>
          <Button variant="outline" asChild>
            <Link href="/assessments">{t("error.back")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const assessment = summary;
  const progress = summary.progressStats;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/assessments/${id}`}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="font-semibold text-lg">{assessment.title}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline">{assessment.status}</Badge>
                  <Badge variant="secondary">
                    {assessment.questionnaire.type === "ANS_USOAP_CMA"
                      ? "ANS"
                      : "SMS"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("refresh")}
              </Button>
              <Button asChild>
                <Link href={`/assessments/${id}`}>
                  <Play className="h-4 w-4 mr-2" />
                  {t("continue")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Overall Progress */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("summary.progress")}
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {progress.percentComplete}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {progress.answeredQuestions} / {progress.totalQuestions}{" "}
                    {t("summary.questions")}
                  </p>
                </div>
                <CircularProgress
                  value={progress.percentComplete}
                  size={60}
                  strokeWidth={6}
                  showLabel={false}
                />
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-100">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("summary.status")}
                  </p>
                  <p className="font-semibold">{assessment.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-100">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("summary.activity")}
                  </p>
                  <p className="font-semibold">{assessment._count.events}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Due Date */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-orange-100">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("summary.dueDate")}
                  </p>
                  <p className="font-semibold">
                    {assessment.dueDate
                      ? format(new Date(assessment.dueDate), "MMM d, yyyy")
                      : t("summary.noDueDate")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="progress" className="space-y-4">
          <TabsList>
            <TabsTrigger value="progress">{t("tabs.progress")}</TabsTrigger>
            <TabsTrigger value="timeline">{t("tabs.timeline")}</TabsTrigger>
          </TabsList>

          {/* Progress Tab */}
          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle>{t("categories.title")}</CardTitle>
                <CardDescription>{t("categories.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryProgress
                  categories={progress.byCategory}
                  onCategoryClick={handleCategoryClick}
                  showDetails
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>{t("timeline.title")}</CardTitle>
                <CardDescription>{t("timeline.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                {timelineLoading && timelineOffset === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : timeline ? (
                  <ActivityTimeline
                    events={timeline.events}
                    totalCount={timeline.totalCount}
                    hasMore={timeline.hasMore}
                    onLoadMore={handleLoadMore}
                    isLoadingMore={timelineLoading && timelineOffset > 0}
                    maxHeight="500px"
                  />
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    {t("timeline.empty")}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
