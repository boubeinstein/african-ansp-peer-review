"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "./ProgressBar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// =============================================================================
// TYPES
// =============================================================================

export interface CategoryProgressData {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  totalQuestions: number;
  answeredQuestions: number;
  percentComplete: number;
}

interface CategoryProgressProps {
  categories: CategoryProgressData[];
  onCategoryClick?: (categoryId: string) => void;
  showDetails?: boolean;
  className?: string;
}

interface CategoryProgressItemProps {
  category: CategoryProgressData;
  onClick?: () => void;
  showDetails?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function getStatusIcon(percentComplete: number) {
  if (percentComplete === 100) {
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  }
  if (percentComplete > 0) {
    return <Circle className="h-4 w-4 text-blue-500" />;
  }
  return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
}

function getStatusColor(percentComplete: number): string {
  if (percentComplete === 100) return "bg-green-100 text-green-800";
  if (percentComplete >= 75) return "bg-blue-100 text-blue-800";
  if (percentComplete >= 50) return "bg-yellow-100 text-yellow-800";
  if (percentComplete >= 25) return "bg-orange-100 text-orange-800";
  if (percentComplete > 0) return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

// =============================================================================
// CATEGORY PROGRESS ITEM
// =============================================================================

function CategoryProgressItem({
  category,
  onClick,
  showDetails,
}: CategoryProgressItemProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-4 p-3 rounded-lg border transition-colors",
        onClick && "cursor-pointer hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      {/* Status Icon */}
      <div className="flex-shrink-0">{getStatusIcon(category.percentComplete)}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-sm truncate">
            {category.categoryCode} - {category.categoryName}
          </span>
          <Badge
            variant="secondary"
            className={cn("text-xs ml-2", getStatusColor(category.percentComplete))}
          >
            {category.percentComplete}%
          </Badge>
        </div>

        {showDetails && (
          <ProgressBar
            value={category.percentComplete}
            showLabel={false}
            size="sm"
            className="mb-1"
          />
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {category.answeredQuestions} / {category.totalQuestions} questions
          </span>
          {category.percentComplete === 100 && (
            <span className="text-green-600 font-medium">Complete</span>
          )}
        </div>
      </div>

      {/* Arrow */}
      {onClick && (
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CategoryProgress({
  categories,
  onCategoryClick,
  showDetails = true,
  className,
}: CategoryProgressProps) {
  const t = useTranslations("progress");

  // Calculate summary stats
  const summary = useMemo(() => {
    const totalQuestions = categories.reduce((sum, c) => sum + c.totalQuestions, 0);
    const answeredQuestions = categories.reduce(
      (sum, c) => sum + c.answeredQuestions,
      0
    );
    const completedCategories = categories.filter(
      (c) => c.percentComplete === 100
    ).length;
    const inProgressCategories = categories.filter(
      (c) => c.percentComplete > 0 && c.percentComplete < 100
    ).length;
    const notStartedCategories = categories.filter(
      (c) => c.percentComplete === 0
    ).length;

    return {
      totalQuestions,
      answeredQuestions,
      overallProgress:
        totalQuestions > 0
          ? Math.round((answeredQuestions / totalQuestions) * 100)
          : 0,
      completedCategories,
      inProgressCategories,
      notStartedCategories,
    };
  }, [categories]);

  return (
    <div className={className}>
      {/* Summary */}
      <div className="mb-4 p-4 rounded-lg bg-muted/30 border">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">{t("categories.overallProgress")}</span>
          <span className="text-lg font-bold">{summary.overallProgress}%</span>
        </div>
        <ProgressBar value={summary.overallProgress} size="lg" showLabel={false} />
        <div className="flex items-center justify-between mt-3 text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {summary.completedCategories} complete
            </span>
            <span className="flex items-center gap-1">
              <Circle className="h-3 w-3 text-blue-500" />
              {summary.inProgressCategories} in progress
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-muted-foreground" />
              {summary.notStartedCategories} not started
            </span>
          </div>
          <span className="text-muted-foreground">
            {summary.answeredQuestions} / {summary.totalQuestions} questions
          </span>
        </div>
      </div>

      {/* Category List */}
      <div className="space-y-2">
        {categories.map((category) => (
          <CategoryProgressItem
            key={category.categoryId}
            category={category}
            onClick={onCategoryClick ? () => onCategoryClick(category.categoryId) : undefined}
            showDetails={showDetails}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// COLLAPSIBLE CATEGORY PROGRESS
// =============================================================================

interface CollapsibleCategoryProgressProps {
  categories: CategoryProgressData[];
  onCategoryClick?: (categoryId: string) => void;
  defaultExpanded?: boolean;
  title?: string;
  className?: string;
}

export function CollapsibleCategoryProgress({
  categories,
  onCategoryClick,
  defaultExpanded = false,
  title = "Category Progress",
  className,
}: CollapsibleCategoryProgressProps) {
  const summary = useMemo(() => {
    const totalQuestions = categories.reduce((sum, c) => sum + c.totalQuestions, 0);
    const answeredQuestions = categories.reduce(
      (sum, c) => sum + c.answeredQuestions,
      0
    );
    return totalQuestions > 0
      ? Math.round((answeredQuestions / totalQuestions) * 100)
      : 0;
  }, [categories]);

  return (
    <Collapsible defaultOpen={defaultExpanded} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between p-4 h-auto"
        >
          <div className="flex items-center gap-3">
            <span className="font-medium">{title}</span>
            <Badge variant="secondary">{summary}%</Badge>
          </div>
          <ChevronRight className="h-4 w-4 transition-transform ui-expanded:rotate-90" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        <div className="space-y-2">
          {categories.map((category) => (
            <CategoryProgressItem
              key={category.categoryId}
              category={category}
              onClick={
                onCategoryClick
                  ? () => onCategoryClick(category.categoryId)
                  : undefined
              }
              showDetails={false}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default CategoryProgress;
