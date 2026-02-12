"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  lessonId: string;
  isBookmarked: boolean;
  notes?: string | null;
  onToggle: (lessonId: string, notes?: string) => void;
  isLoading?: boolean;
}

export function BookmarkButton({
  lessonId,
  isBookmarked,
  notes,
  onToggle,
  isLoading = false,
}: BookmarkButtonProps) {
  const t = useTranslations("lessons.detail");
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState(notes || "");

  const handleToggle = () => {
    if (isBookmarked) {
      // Remove bookmark directly
      onToggle(lessonId);
      return;
    }
    // Show notes popover for new bookmark
    setShowNotes(true);
  };

  const handleSaveBookmark = () => {
    onToggle(lessonId, noteText || undefined);
    setShowNotes(false);
  };

  return (
    <Popover open={showNotes} onOpenChange={setShowNotes}>
      <PopoverTrigger asChild>
        <Button
          variant={isBookmarked ? "default" : "outline"}
          size="sm"
          className={cn(
            "gap-1.5",
            isBookmarked &&
              "bg-amber-600 hover:bg-amber-700 text-white"
          )}
          disabled={isLoading}
          onClick={handleToggle}
          aria-pressed={isBookmarked}
        >
          <Bookmark
            className={cn(
              "h-3.5 w-3.5",
              isBookmarked && "fill-current"
            )}
          />
          {isBookmarked ? t("bookmarked") : t("bookmark")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <p className="text-sm font-medium">{t("bookmarkNotes")}</p>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={t("bookmarkNotesPlaceholder")}
            rows={3}
            className="text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotes(false)}
            >
              {t("cancel")}
            </Button>
            <Button size="sm" onClick={handleSaveBookmark}>
              {t("saveBookmark")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
