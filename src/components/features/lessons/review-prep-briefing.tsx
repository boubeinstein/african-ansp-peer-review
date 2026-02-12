"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  ChevronDown,
  Clock,
  Download,
  ExternalLink,
  Globe,
  Lightbulb,
  BarChart3,
  Layers,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AfricanRegion, MaturityLevel } from "@prisma/client";

// =============================================================================
// Category metadata
// =============================================================================

const CATEGORY_ICONS: Record<string, typeof Lightbulb> = {
  PROCESS_IMPROVEMENT: Layers,
  TECHNICAL_FINDING: Search,
  LOGISTICS_PLANNING: Clock,
  CULTURAL_COMMUNICATION: Globe,
  DOCUMENTATION_REVIEW: BookOpen,
  INTERVIEW_TECHNIQUE: BookOpen,
  HOST_ENGAGEMENT: Globe,
  TOOL_METHODOLOGY: Layers,
};

// =============================================================================
// Types
// =============================================================================

interface ReviewPrepBriefingProps {
  reviewId: string;
  locale: string;
  review: {
    referenceNumber: string;
    status: string;
    reviewType: string;
    hostOrganization: {
      id: string;
      nameEn: string;
      nameFr: string;
      region: AfricanRegion;
      country: string;
    };
    maturityLevel: MaturityLevel | null;
  };
}

// =============================================================================
// Component
// =============================================================================

export function ReviewPrepBriefing({
  reviewId,
  locale,
  review,
}: ReviewPrepBriefingProps) {
  const t = useTranslations("lessons");
  const currentLocale = useLocale();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [bookmarkingAll, setBookmarkingAll] = useState(false);

  const hostName =
    currentLocale === "fr"
      ? review.hostOrganization.nameFr
      : review.hostOrganization.nameEn;

  // ---- Data ----
  const { data, isLoading, error } = trpc.lessons.getForReviewPrep.useQuery({
    hostRegion: review.hostOrganization.region,
    hostMaturityLevel: review.maturityLevel ?? undefined,
  });

  const bookmarkMutation = trpc.lessons.bookmark.useMutation();
  const utils = trpc.useUtils();

  // ---- Handlers ----
  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const handleBookmarkAll = async () => {
    if (!data?.items) return;
    setBookmarkingAll(true);
    try {
      for (const lesson of data.items) {
        await bookmarkMutation.mutateAsync({
          lessonId: lesson.id,
          notes: `Pre-review briefing for ${review.referenceNumber}`,
        });
      }
      void utils.lessons.getMyBookmarks.invalidate();
    } finally {
      setBookmarkingAll(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // ---- Derived data ----
  const categories = data?.byCategory
    ? (Object.entries(data.byCategory) as [string, typeof data.items][])
    : [];

  const keyTakeaways = data?.items
    ?.filter((l) => l.actionableAdvice)
    .map((l) => l.actionableAdvice!)
    ?? [];

  const timeInsights = data?.items
    ?.filter((l) => l.estimatedTimeImpact)
    .map((l) => ({
      title:
        currentLocale === "fr" ? l.titleFr : l.titleEn,
      impact: l.estimatedTimeImpact!,
      category: l.category,
    }))
    ?? [];

  return (
    <div className="container mx-auto py-6 max-w-5xl print:max-w-none">
      {/* Back link */}
      <Link
        href={`/${locale}/reviews/${reviewId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 print:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("detail.backToLessons")}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-3">
          <BookOpen className="h-7 w-7 text-primary mt-1 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("prep.title")}: {hostName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("prep.subtitle")}
            </p>
          </div>
        </div>

        {/* Host metadata */}
        <div className="flex items-center gap-2 flex-wrap mt-4">
          <Badge variant="outline" className="gap-1">
            <Globe className="h-3 w-3" />
            {review.hostOrganization.region}
          </Badge>
          <Badge variant="outline">
            {review.hostOrganization.country}
          </Badge>
          {review.maturityLevel && (
            <Badge variant="secondary" className="gap-1">
              <BarChart3 className="h-3 w-3" />
              {t("prep.maturity")}: {review.maturityLevel}
            </Badge>
          )}
          <Badge variant="secondary">
            {review.reviewType}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            {review.referenceNumber}
          </Badge>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-6 animate-pulse">
              <div className="h-5 bg-muted rounded w-1/4 mb-4" />
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error.message}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && data?.total === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("prep.noLessonsTitle")}</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t("prep.noLessons")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {!isLoading && data && data.total > 0 && (
        <div className="space-y-6">
          {/* Summary bar */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm">
              <span className="font-semibold">{data.total}</span>{" "}
              {t("prep.lessonsFound")}{" "}
              <span className="text-muted-foreground">
                ({categories.length} {t("prep.categoriesLabel")})
              </span>
            </p>
            <div className="flex items-center gap-2">
              {keyTakeaways.length > 0 && (
                <Badge variant="secondary">
                  {keyTakeaways.length} {t("prep.takeawaysCount")}
                </Badge>
              )}
              {timeInsights.length > 0 && (
                <Badge variant="secondary">
                  {timeInsights.length} {t("prep.timeInsightsCount")}
                </Badge>
              )}
            </div>
          </div>

          {/* Key Takeaways */}
          {keyTakeaways.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  {t("prep.keyTakeaways")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {keyTakeaways.map((advice, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-sm"
                    >
                      <span className="shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xs font-semibold">
                        {i + 1}
                      </span>
                      <span>{advice}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Time Planning Insights */}
          {timeInsights.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5 text-blue-500" />
                  {t("prep.timePlanning")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {timeInsights.map((insight, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 text-sm rounded-md bg-blue-50 dark:bg-blue-950/30 p-3"
                    >
                      <Badge
                        variant="outline"
                        className="text-[10px] shrink-0"
                      >
                        {t(`categories.${insight.category}`)}
                      </Badge>
                      <span className="flex-1 truncate text-muted-foreground">
                        {insight.title}
                      </span>
                      <span className="font-medium text-blue-700 dark:text-blue-400 shrink-0">
                        {insight.impact}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lessons by Category */}
          <div>
            <h2 className="text-lg font-semibold mb-3">
              {t("prep.byCategory")}
            </h2>
            <div className="space-y-3">
              {categories.map(([category, lessons]) => {
                const isExpanded = expandedCategories.has(category);
                const Icon =
                  CATEGORY_ICONS[category] || Lightbulb;
                return (
                  <Collapsible
                    key={category}
                    open={isExpanded}
                    onOpenChange={() => toggleCategory(category)}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Icon className="h-4 w-4 text-primary" />
                              {t(`categories.${category}`)}
                              <Badge variant="secondary" className="text-[10px] ml-1">
                                {lessons.length}
                              </Badge>
                            </CardTitle>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform",
                                isExpanded && "rotate-180"
                              )}
                            />
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-3">
                          {lessons.map((lesson) => {
                            const title =
                              currentLocale === "fr"
                                ? lesson.titleFr
                                : lesson.titleEn;
                            const content =
                              currentLocale === "fr"
                                ? lesson.contentFr
                                : lesson.contentEn;
                            const excerpt =
                              content.length > 200
                                ? content.slice(0, 200).trim() + "..."
                                : content;
                            return (
                              <div
                                key={lesson.id}
                                className="rounded-md border p-3 hover:bg-muted/30 transition-colors"
                              >
                                <Link
                                  href={`/${locale}/lessons/${lesson.id}`}
                                  className="block"
                                >
                                  <div className="flex items-start gap-2">
                                    <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">
                                        {title}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {excerpt}
                                      </p>
                                      {lesson.actionableAdvice && (
                                        <div className="mt-2 rounded bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-1.5">
                                          <Lightbulb className="h-3 w-3 text-amber-600 mt-0.5 shrink-0" />
                                          <p className="text-[11px] text-amber-700 dark:text-amber-400">
                                            {lesson.actionableAdvice}
                                          </p>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2 mt-2">
                                        {lesson.auditAreaCode && (
                                          <Badge
                                            variant="secondary"
                                            className="text-[10px] px-1.5 py-0"
                                          >
                                            {lesson.auditAreaCode}
                                          </Badge>
                                        )}
                                        <span className="text-[10px] text-muted-foreground">
                                          {lesson.helpfulCount}{" "}
                                          {t("detail.helpful")}
                                        </span>
                                        <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                                      </div>
                                    </div>
                                  </div>
                                </Link>
                              </div>
                            );
                          })}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          </div>

          {/* Bottom actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t print:hidden">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleBookmarkAll}
              disabled={bookmarkingAll}
            >
              <Bookmark className="h-4 w-4" />
              {bookmarkingAll
                ? t("prep.bookmarkingAll")
                : t("prep.bookmarkAll")}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handlePrint}
            >
              <Download className="h-4 w-4" />
              {t("prep.downloadPdf")}
            </Button>
            <Link
              href={`/${locale}/lessons?hostRegion=${review.hostOrganization.region}`}
              className="sm:ml-auto"
            >
              <Button variant="ghost" className="gap-2 w-full sm:w-auto">
                <Search className="h-4 w-4" />
                {t("prep.exploreAll")}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
