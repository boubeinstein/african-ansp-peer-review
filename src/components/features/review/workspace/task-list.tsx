"use client";

import { useTranslations } from "next-intl";
import { CheckSquare } from "lucide-react";

interface TaskListProps {
  reviewId: string;
  locale: string;
  userId: string;
}

export function TaskList({ reviewId, locale, userId }: TaskListProps) {
  const t = useTranslations("reviews.workspace.tasks");

  // Placeholder - will be implemented in Prompt 10
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <CheckSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p className="text-muted-foreground">
        {t("empty.title")}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        {t("empty.description")}
      </p>
    </div>
  );
}
