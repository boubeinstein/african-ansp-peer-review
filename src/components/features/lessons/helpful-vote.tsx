"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpfulVoteProps {
  lessonId: string;
  helpfulCount: number;
  userVote: { id: string; isHelpful: boolean } | null;
  onVote: (lessonId: string, isHelpful: boolean) => void;
  isLoading?: boolean;
}

export function HelpfulVote({
  lessonId,
  helpfulCount,
  userVote,
  onVote,
  isLoading = false,
}: HelpfulVoteProps) {
  const t = useTranslations("lessons.detail");

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">
        {t("wasHelpful")}
      </span>

      <div className="flex items-center gap-1.5">
        <Button
          variant={userVote?.isHelpful === true ? "default" : "outline"}
          size="sm"
          className={cn(
            "gap-1.5",
            userVote?.isHelpful === true &&
              "bg-blue-600 hover:bg-blue-700 text-white"
          )}
          disabled={isLoading}
          onClick={() => onVote(lessonId, true)}
          aria-pressed={userVote?.isHelpful === true}
          aria-label={t("helpful")}
        >
          <ThumbsUp
            className={cn(
              "h-3.5 w-3.5",
              userVote?.isHelpful === true && "fill-current"
            )}
          />
          <span className="text-xs">{helpfulCount}</span>
        </Button>

        <Button
          variant={userVote?.isHelpful === false ? "default" : "outline"}
          size="sm"
          className={cn(
            "gap-1.5",
            userVote?.isHelpful === false &&
              "bg-gray-600 hover:bg-gray-700 text-white"
          )}
          disabled={isLoading}
          onClick={() => onVote(lessonId, false)}
          aria-pressed={userVote?.isHelpful === false}
          aria-label={t("notHelpful")}
        >
          <ThumbsDown
            className={cn(
              "h-3.5 w-3.5",
              userVote?.isHelpful === false && "fill-current"
            )}
          />
        </Button>
      </div>
    </div>
  );
}
