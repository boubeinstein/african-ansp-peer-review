"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Lightbulb,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export type PrerequisiteStatus = "complete" | "incomplete" | "in-progress" | "optional";

export interface PrerequisiteItem {
  id: string;
  label: string;
  status: PrerequisiteStatus;
  required: boolean;
  detail?: string;
  progress?: {
    current: number;
    total: number;
  };
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface PrerequisitesChecklistProps {
  title?: string;
  description?: string;
  items: PrerequisiteItem[];
  className?: string;
  showNextStep?: boolean;
  compact?: boolean;
}

// =============================================================================
// SEGMENTED PROGRESS BAR
// =============================================================================

function SegmentedProgressBar({
  items,
  className,
}: {
  items: PrerequisiteItem[];
  className?: string;
}) {
  const segments = items.map((item) => ({
    id: item.id,
    status: item.status,
    required: item.required,
  }));

  return (
    <div className={cn("flex gap-1 h-2", className)}>
      {segments.map((segment) => (
        <div
          key={segment.id}
          className={cn(
            "flex-1 rounded-full transition-colors",
            segment.status === "complete" && "bg-green-500",
            segment.status === "in-progress" && "bg-blue-500",
            segment.status === "incomplete" && segment.required && "bg-red-300",
            segment.status === "incomplete" && !segment.required && "bg-gray-300",
            segment.status === "optional" && "bg-gray-200"
          )}
        />
      ))}
    </div>
  );
}

// =============================================================================
// STATUS ICON
// =============================================================================

function StatusIcon({ status, required }: { status: PrerequisiteStatus; required: boolean }) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />;
    case "in-progress":
      return <Clock className="h-5 w-5 text-blue-500 shrink-0" />;
    case "incomplete":
      return required ? (
        <XCircle className="h-5 w-5 text-red-500 shrink-0" />
      ) : (
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
      );
    case "optional":
      return <div className="h-5 w-5 rounded-full border-2 border-gray-300 shrink-0" />;
    default:
      return null;
  }
}

// =============================================================================
// NEXT STEP CALLOUT
// =============================================================================

function NextStepCallout({ item }: { item: PrerequisiteItem | null }) {
  const t = useTranslations("common.prerequisites");

  if (!item) {
    return (
      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            {t("allComplete")}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400">
            {t("readyToProceed")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg">
      <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          {t("nextStep")}
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
          {item.label}
          {item.progress && ` (${item.progress.current}/${item.progress.total})`}
        </p>
      </div>
      {item.action && (
        item.action.href ? (
          <Button size="sm" variant="outline" asChild className="shrink-0">
            <Link href={item.action.href}>
              {item.action.label}
              <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={item.action.onClick} className="shrink-0">
            {item.action.label}
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )
      )}
    </div>
  );
}

// =============================================================================
// CHECKLIST ITEM
// =============================================================================

function ChecklistItem({ item }: { item: PrerequisiteItem }) {
  const statusStyles = {
    complete: "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900",
    "in-progress": "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900",
    incomplete: item.required
      ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
      : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900",
    optional: "bg-muted/30 border-muted",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
        statusStyles[item.status]
      )}
    >
      <StatusIcon status={item.status} required={item.required} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={cn(
              "font-medium text-sm",
              item.status === "complete" && "text-green-800 dark:text-green-200"
            )}
          >
            {item.label}
          </p>
          {item.progress && (
            <Badge
              variant={item.status === "complete" ? "default" : "secondary"}
              className="text-xs"
            >
              {item.progress.current}/{item.progress.total}
            </Badge>
          )}
          {item.required && item.status === "incomplete" && (
            <Badge variant="destructive" className="text-xs">
              Required
            </Badge>
          )}
        </div>

        {item.detail && (
          <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
        )}

        {/* Action button for incomplete items */}
        {item.status !== "complete" && item.action && (
          <div className="mt-2">
            {item.action.href ? (
              <Button size="sm" variant="outline" asChild className="h-7 text-xs">
                <Link href={item.action.href}>
                  {item.action.label}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={item.action.onClick}
                className="h-7 text-xs"
              >
                {item.action.label}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PrerequisitesChecklist({
  title,
  description,
  items,
  className,
  showNextStep = true,
  compact = false,
}: PrerequisitesChecklistProps) {
  const t = useTranslations("common.prerequisites");

  // Calculate progress
  const progress = useMemo(() => {
    const completed = items.filter((item) => item.status === "complete").length;
    const total = items.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  }, [items]);

  // Find the first incomplete required item for "Next Step"
  const nextStep = useMemo(() => {
    return (
      items.find(
        (item) => item.status !== "complete" && item.required
      ) ||
      items.find((item) => item.status !== "complete") ||
      null
    );
  }, [items]);

  // Check if all required items are complete
  const allRequiredComplete = useMemo(() => {
    return items.filter((item) => item.required).every((item) => item.status === "complete");
  }, [items]);

  if (compact) {
    return (
      <div className={cn("space-y-3", className)}>
        {/* Compact header with progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{title || t("title")}</span>
            <Badge variant={allRequiredComplete ? "default" : "secondary"}>
              {progress.percentage}%
            </Badge>
          </div>
        </div>

        {/* Segmented progress bar */}
        <SegmentedProgressBar items={items} />

        {/* Compact item list */}
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              <StatusIcon status={item.status} required={item.required} />
              <span
                className={cn(
                  "flex-1",
                  item.status === "complete" && "text-muted-foreground line-through"
                )}
              >
                {item.label}
              </span>
              {item.progress && (
                <span className="text-xs text-muted-foreground">
                  {item.progress.current}/{item.progress.total}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            📋 {title || t("title")}
          </CardTitle>
          <Badge variant={allRequiredComplete ? "default" : "secondary"} className="text-sm">
            {progress.percentage}%
          </Badge>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Segmented progress bar */}
        <SegmentedProgressBar items={items} />

        {/* Next step callout */}
        {showNextStep && <NextStepCallout item={nextStep} />}

        {/* Checklist items */}
        <div className="space-y-2">
          {items.map((item) => (
            <ChecklistItem key={item.id} item={item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default PrerequisitesChecklist;
