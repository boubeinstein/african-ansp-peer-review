"use client";

import { useTranslations, useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ThumbsUp,
  Bookmark,
  Eye,
  BookOpen,
  Tag,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LessonCategory, ImpactLevel } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

interface LessonAuthor {
  id: string;
  firstName: string;
  lastName: string;
  organization: { nameEn: string; nameFr: string } | null;
}

interface LessonTag {
  id: string;
  tag: string;
  tagFr: string | null;
}

export interface LessonCardItem {
  id: string;
  titleEn: string;
  titleFr: string;
  contentEn: string;
  contentFr: string;
  category: LessonCategory;
  impactLevel: ImpactLevel;
  auditAreaCode: string | null;
  soeAreaCode: string | null;
  actionableAdvice: string | null;
  helpfulCount: number;
  viewCount: number;
  publishedAt: Date | string | null;
  isAnonymized: boolean;
  author: LessonAuthor;
  tags: LessonTag[];
  _count: { votes: number; bookmarks: number };
  isBookmarked: boolean;
  currentUserVote: { id: string; isHelpful: boolean } | null;
}

interface LessonCardProps {
  lesson: LessonCardItem;
  onVote: (lessonId: string, isHelpful: boolean) => void;
  onBookmark: (lessonId: string) => void;
  onClick: (lessonId: string) => void;
  isVoting?: boolean;
  isBookmarking?: boolean;
}

// =============================================================================
// Impact badge colors
// =============================================================================

const impactColors: Record<ImpactLevel, string> = {
  LOW: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  MODERATE:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

// =============================================================================
// Component
// =============================================================================

export function LessonCard({
  lesson,
  onVote,
  onBookmark,
  onClick,
  isVoting = false,
  isBookmarking = false,
}: LessonCardProps) {
  const t = useTranslations("lessons");
  const locale = useLocale();

  const title = locale === "fr" ? lesson.titleFr : lesson.titleEn;
  const content = locale === "fr" ? lesson.contentFr : lesson.contentEn;
  const excerpt =
    content.length > 150 ? content.slice(0, 150).trim() + "..." : content;

  const authorName = lesson.isAnonymized
    ? t("card.anonymous")
    : `${lesson.author.firstName} ${lesson.author.lastName}`;

  const orgName = lesson.isAnonymized
    ? null
    : locale === "fr"
      ? lesson.author.organization?.nameFr
      : lesson.author.organization?.nameEn;

  return (
    <Card
      className="group hover:shadow-md transition-shadow cursor-pointer flex flex-col"
      onClick={() => onClick(lesson.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(lesson.id);
        }
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <h3 className="text-sm font-semibold leading-tight line-clamp-2 flex-1">
            {title}
          </h3>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {t(`categories.${lesson.category}`)}
          </Badge>
          <Badge
            className={cn(
              "text-[10px] px-1.5 py-0 border-0",
              impactColors[lesson.impactLevel]
            )}
          >
            {t(`impact.${lesson.impactLevel}`)}
          </Badge>
          {lesson.auditAreaCode && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0"
            >
              {lesson.auditAreaCode}
            </Badge>
          )}
          {lesson.soeAreaCode && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0"
            >
              {lesson.soeAreaCode}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-2">
        <p className="text-xs text-muted-foreground line-clamp-3">{excerpt}</p>

        {/* Actionable advice callout */}
        {lesson.actionableAdvice && (
          <div className="mt-2 rounded-md bg-blue-50 dark:bg-blue-950/30 p-2 flex items-start gap-1.5">
            <BookOpen className="h-3 w-3 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-blue-700 dark:text-blue-400 line-clamp-2">
              {lesson.actionableAdvice}
            </p>
          </div>
        )}

        {/* Tags */}
        {lesson.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
            {lesson.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
              >
                {locale === "fr" && tag.tagFr ? tag.tagFr : tag.tag}
              </span>
            ))}
            {lesson.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{lesson.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Author */}
        <div className="mt-2 text-[11px] text-muted-foreground">
          {authorName}
          {orgName && ` - ${orgName}`}
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-3 px-4 border-t">
        <div className="flex items-center justify-between w-full pt-2">
          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  {lesson.helpfulCount}
                </span>
              </TooltipTrigger>
              <TooltipContent>{t("card.helpfulCount")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {lesson.viewCount}
                </span>
              </TooltipTrigger>
              <TooltipContent>{t("card.viewCount")}</TooltipContent>
            </Tooltip>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7",
                    lesson.currentUserVote?.isHelpful &&
                      "text-blue-600 dark:text-blue-400"
                  )}
                  disabled={isVoting}
                  onClick={(e) => {
                    e.stopPropagation();
                    onVote(lesson.id, true);
                  }}
                >
                  <ThumbsUp
                    className={cn(
                      "h-3.5 w-3.5",
                      lesson.currentUserVote?.isHelpful && "fill-current"
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("card.markHelpful")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7",
                    lesson.isBookmarked &&
                      "text-amber-600 dark:text-amber-400"
                  )}
                  disabled={isBookmarking}
                  onClick={(e) => {
                    e.stopPropagation();
                    onBookmark(lesson.id);
                  }}
                >
                  <Bookmark
                    className={cn(
                      "h-3.5 w-3.5",
                      lesson.isBookmarked && "fill-current"
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("card.bookmark")}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
