"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  LessonCategory,
  ImpactLevel,
  LessonStatus,
} from "@prisma/client";

// =============================================================================
// Props
// =============================================================================

interface LessonCardMiniProps {
  lesson: {
    id: string;
    titleEn: string;
    titleFr: string;
    category: LessonCategory;
    impactLevel: ImpactLevel;
    status: LessonStatus;
    actionableAdvice?: string | null;
    tags?: Array<{ tag: string }>;
  };
  onEdit: () => void;
  onDelete: () => void;
  readOnly?: boolean;
}

// =============================================================================
// Impact colors
// =============================================================================

const impactColors: Record<ImpactLevel, string> = {
  LOW: "bg-green-100 text-green-700",
  MODERATE: "bg-amber-100 text-amber-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

// =============================================================================
// Component
// =============================================================================

export function LessonCardMini({
  lesson,
  onEdit,
  onDelete,
  readOnly = false,
}: LessonCardMiniProps) {
  const t = useTranslations("reviews.retrospective.extractedLessons");
  const locale = useLocale();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const title = locale === "fr" ? lesson.titleFr : lesson.titleEn;

  return (
    <>
      <div
        className={cn(
          "rounded-lg border p-3 flex items-start gap-3 group transition-colors",
          !readOnly && "hover:bg-muted/50 cursor-pointer"
        )}
        onClick={readOnly ? undefined : onEdit}
        role={readOnly ? undefined : "button"}
        tabIndex={readOnly ? undefined : 0}
        onKeyDown={
          readOnly
            ? undefined
            : (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onEdit();
                }
              }
        }
      >
        <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>

          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {t(`category.${lesson.category}`)}
            </Badge>
            <Badge
              className={cn(
                "text-[10px] px-1.5 py-0 border-0",
                impactColors[lesson.impactLevel]
              )}
            >
              {lesson.impactLevel}
            </Badge>
            <Badge
              variant={lesson.status === "PUBLISHED" ? "default" : "outline"}
              className="text-[10px] px-1.5 py-0"
            >
              {lesson.status}
            </Badge>
          </div>

          {lesson.actionableAdvice && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {lesson.actionableAdvice}
            </p>
          )}
        </div>

        {/* Actions */}
        {!readOnly && lesson.status === "DRAFT" && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDeleteDialog(false);
                onDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
