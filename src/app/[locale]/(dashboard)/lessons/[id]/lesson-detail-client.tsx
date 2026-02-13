"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Markdown } from "@/components/ui/markdown";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Lightbulb,
  Clock,
  Tag,
  ChevronDown,
  ExternalLink,
  Eye,
  Share2,
  Check,
  User,
  Building2,
  Globe,
  BarChart3,
  FileSearch,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpfulVote } from "@/components/features/lessons/helpful-vote";
import { BookmarkButton } from "@/components/features/lessons/bookmark-button";

// =============================================================================
// Impact badge colors
// =============================================================================

const impactColors: Record<string, string> = {
  LOW: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  MODERATE:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

// =============================================================================
// Props
// =============================================================================

interface LessonDetailClientProps {
  lessonId: string;
  locale: string;
}

// =============================================================================
// Component
// =============================================================================

export function LessonDetailClient({
  lessonId,
  locale,
}: LessonDetailClientProps) {
  const t = useTranslations("lessons");
  const currentLocale = useLocale();
  const [copied, setCopied] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

  // ---- Data ----
  const {
    data: lesson,
    isLoading,
    error,
  } = trpc.lessons.getById.useQuery({ id: lessonId });

  // ---- Mutations ----
  const utils = trpc.useUtils();

  const voteMutation = trpc.lessons.vote.useMutation({
    onSuccess: () => {
      void utils.lessons.getById.invalidate({ id: lessonId });
    },
  });

  const bookmarkMutation = trpc.lessons.bookmark.useMutation({
    onSuccess: () => {
      void utils.lessons.getById.invalidate({ id: lessonId });
    },
  });

  // ---- Handlers ----
  const handleVote = (id: string, isHelpful: boolean) => {
    voteMutation.mutate({ lessonId: id, isHelpful });
  };

  const handleBookmark = (id: string, notes?: string) => {
    bookmarkMutation.mutate({ lessonId: id, notes });
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  };

  // ---- Loading ----
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        <div className="h-10 w-3/4 bg-muted rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  // ---- Error ----
  if (error || !lesson) {
    return (
      <div className="max-w-5xl">
        <Link
          href={`/${locale}/lessons`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("detail.backToLessons")}
        </Link>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
          <p className="text-destructive">
            {error?.message || "Lesson not found"}
          </p>
        </div>
      </div>
    );
  }

  // ---- Computed ----
  const title =
    currentLocale === "fr" ? lesson.titleFr : lesson.titleEn;
  const content =
    currentLocale === "fr" ? lesson.contentFr : lesson.contentEn;
  const authorName = lesson.isAnonymized
    ? t("detail.anonymousContributor")
    : `${lesson.author.firstName} ${lesson.author.lastName}`;
  const orgName = lesson.isAnonymized
    ? null
    : currentLocale === "fr"
      ? lesson.author.organization?.nameFr
      : lesson.author.organization?.nameEn;

  const publishedDate = lesson.publishedAt
    ? new Date(lesson.publishedAt).toLocaleDateString(
        currentLocale === "fr" ? "fr-FR" : "en-US",
        { year: "numeric", month: "long", day: "numeric" }
      )
    : null;

  const reviewRef = lesson.retrospective?.review?.referenceNumber;
  const reviewId = lesson.retrospective?.review?.id;
  const hostOrg = lesson.retrospective?.review?.hostOrganization;
  const hostOrgName = hostOrg
    ? currentLocale === "fr"
      ? hostOrg.nameFr
      : hostOrg.nameEn
    : null;

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      {/* Back link */}
      <Link
        href={`/${locale}/lessons`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("detail.backToLessons")}
      </Link>

      {/* Main layout: content + sidebar */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>

            {/* Metadata row */}
            <div className="flex items-center gap-2 flex-wrap mt-3">
              <Badge variant="outline">
                {t(`categories.${lesson.category}`)}
              </Badge>
              <Badge
                className={cn(
                  "border-0",
                  impactColors[lesson.impactLevel] || ""
                )}
              >
                {t(`impact.${lesson.impactLevel}`)}
              </Badge>
              {lesson.applicability && (
                <Badge variant="secondary">
                  {t(`detail.applicability_${lesson.applicability}`)}
                </Badge>
              )}
              {publishedDate && (
                <span className="text-xs text-muted-foreground">
                  {publishedDate}
                </span>
              )}
            </div>

            {/* Author */}
            <div className="flex items-center gap-2 mt-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{authorName}</p>
                {orgName && (
                  <p className="text-xs text-muted-foreground">{orgName}</p>
                )}
              </div>
            </div>
          </div>

          {/* Full content */}
          <Card>
            <CardContent className="pt-6">
              <Markdown content={content} />
            </CardContent>
          </Card>

          {/* Actionable Advice callout */}
          {lesson.actionableAdvice && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-5">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
                    {t("detail.actionableAdvice")}
                  </h3>
                  <p className="text-base text-amber-800 dark:text-amber-300 font-medium">
                    {lesson.actionableAdvice}
                  </p>
                  {lesson.estimatedTimeImpact && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700 dark:text-amber-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {t("detail.estimatedTimeImpact")}:{" "}
                        {lesson.estimatedTimeImpact}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Review Context (collapsible) */}
          {reviewRef && (
            <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <FileSearch className="h-4 w-4 text-primary" />
                        {t("detail.reviewContext")}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          contextOpen && "rotate-180"
                        )}
                      />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {t("detail.reviewRef")}:
                      </span>
                      {reviewId ? (
                        <Link
                          href={`/${locale}/reviews/${reviewId}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Badge variant="outline" className="font-mono">
                            {reviewRef}
                          </Badge>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <Badge variant="outline" className="font-mono">
                          {reviewRef}
                        </Badge>
                      )}
                    </div>
                    {hostOrgName && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{hostOrgName}</span>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Engagement bar */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <HelpfulVote
                  lessonId={lessonId}
                  helpfulCount={lesson.helpfulCount}
                  userVote={lesson.currentUserVote}
                  onVote={handleVote}
                  isLoading={voteMutation.isPending}
                />

                <div className="flex items-center gap-2">
                  <BookmarkButton
                    lessonId={lessonId}
                    isBookmarked={lesson.isBookmarked}
                    notes={lesson.bookmarkNotes}
                    onToggle={handleBookmark}
                    isLoading={bookmarkMutation.isPending}
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleShare}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        {t("detail.copied")}
                      </>
                    ) : (
                      <>
                        <Share2 className="h-3.5 w-3.5" />
                        {t("detail.share")}
                      </>
                    )}
                  </Button>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground px-2">
                        <Eye className="h-3.5 w-3.5" />
                        {lesson.viewCount}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{t("card.viewCount")}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Related Lessons */}
          {lesson.relatedLessons && lesson.relatedLessons.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">
                {t("detail.relatedLessons")}
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {lesson.relatedLessons.map((related) => {
                  const relatedTitle =
                    currentLocale === "fr"
                      ? related.titleFr
                      : related.titleEn;
                  return (
                    <Link
                      key={related.id}
                      href={`/${locale}/lessons/${related.id}`}
                      className="min-w-[220px] max-w-[260px] shrink-0"
                    >
                      <Card className="h-full hover:shadow-md transition-shadow">
                        <CardContent className="pt-4 pb-3 px-4 space-y-2">
                          <p className="text-sm font-medium line-clamp-2">
                            {relatedTitle}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {t(`categories.${related.category}`)}
                            </Badge>
                            {related.auditAreaCode && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {related.auditAreaCode}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {related.helpfulCount} {t("detail.helpful")}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: classification */}
        <aside className="w-full lg:w-72 shrink-0">
          <div className="sticky top-24 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  {t("detail.classification")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Audit Area */}
                {lesson.auditAreaCode && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("detail.auditArea")}
                    </p>
                    <Badge variant="secondary">{lesson.auditAreaCode}</Badge>
                  </div>
                )}

                {/* SoE Area */}
                {lesson.soeAreaCode && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("detail.soeArea")}
                    </p>
                    <Badge variant="secondary">{lesson.soeAreaCode}</Badge>
                  </div>
                )}

                {/* Review Phase */}
                {lesson.reviewPhase && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("detail.reviewPhase")}
                    </p>
                    <Badge variant="outline">{lesson.reviewPhase}</Badge>
                  </div>
                )}

                {/* Host Region */}
                {lesson.hostRegion && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("detail.hostRegion")}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{lesson.hostRegion}</span>
                    </div>
                  </div>
                )}

                {/* Host Maturity Level */}
                {lesson.hostMaturityLevel && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("detail.maturityLevel")}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge variant="outline">
                        {lesson.hostMaturityLevel}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Applicability */}
                {lesson.applicability && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("detail.applicabilityLabel")}
                    </p>
                    <span className="text-sm">
                      {t(`detail.applicability_${lesson.applicability}`)}
                    </span>
                  </div>
                )}

                {/* Tags */}
                {lesson.tags && lesson.tags.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      {t("detail.tags")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {lesson.tags.map((tag) => (
                        <Link
                          key={tag.id}
                          href={`/${locale}/lessons?tag=${encodeURIComponent(tag.tag)}`}
                        >
                          <Badge
                            variant="outline"
                            className="text-[11px] cursor-pointer hover:bg-muted"
                          >
                            <Tag className="h-2.5 w-2.5 mr-1" />
                            {currentLocale === "fr" && tag.tagFr
                              ? tag.tagFr
                              : tag.tag}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
