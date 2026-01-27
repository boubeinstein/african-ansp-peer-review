"use client";

import { useTranslations } from "next-intl";
import { MessageSquare } from "lucide-react";

interface DiscussionListProps {
  reviewId: string;
  locale: string;
  userId: string;
}

export function DiscussionList({
  reviewId,
  locale,
  userId,
}: DiscussionListProps) {
  const t = useTranslations("reviews.workspace.discussions");

  // Placeholder - will be implemented in Prompt 9b
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p className="text-muted-foreground">
        {t("empty.title")}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        {t("empty.description")}
      </p>
    </div>
  );
}
