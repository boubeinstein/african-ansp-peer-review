"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SmilePlus } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

const EMOJI_OPTIONS = [
  { key: "thumbsup", display: "👍" },
  { key: "check", display: "✅" },
  { key: "eyes", display: "👀" },
  { key: "target", display: "🎯" },
  { key: "question", display: "❓" },
  { key: "fire", display: "🔥" },
] as const;

export type EmojiKey = (typeof EMOJI_OPTIONS)[number]["key"];

const emojiDisplayMap: Record<string, string> = Object.fromEntries(
  EMOJI_OPTIONS.map((e) => [e.key, e.display])
);

export interface ReactionData {
  emoji: string;
  user: { id: string; firstName: string; lastName: string };
}

interface ReactionBarProps {
  reactions: ReactionData[];
  currentUserId?: string;
  onToggle: (emoji: EmojiKey) => void;
  disabled?: boolean;
}

/**
 * Groups reactions by emoji and renders clickable badges + an add button.
 */
export function ReactionBar({ reactions, currentUserId, onToggle, disabled }: ReactionBarProps) {
  const t = useTranslations("collaboration.reactions");
  const [pickerOpen, setPickerOpen] = useState(false);

  // Group reactions: { emoji: { count, users[], hasReacted } }
  const grouped = new Map<string, { count: number; users: string[]; hasReacted: boolean }>();
  for (const r of reactions) {
    const existing = grouped.get(r.emoji);
    const userName = `${r.user.firstName} ${r.user.lastName}`;
    if (existing) {
      existing.count++;
      existing.users.push(userName);
      if (r.user.id === currentUserId) existing.hasReacted = true;
    } else {
      grouped.set(r.emoji, {
        count: 1,
        users: [userName],
        hasReacted: r.user.id === currentUserId,
      });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {Array.from(grouped.entries()).map(([emoji, { count, users, hasReacted }]) => (
        <Tooltip key={emoji}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onToggle(emoji as EmojiKey)}
              disabled={disabled}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-muted",
                hasReacted
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground"
              )}
            >
              <span>{emojiDisplayMap[emoji] || emoji}</span>
              <span>{count}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <p className="text-xs">{users.join(", ")}</p>
          </TooltipContent>
        </Tooltip>
      ))}

      {/* Add reaction picker */}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full"
            disabled={disabled}
          >
            <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="sr-only">{t("add")}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-auto p-1.5">
          <div className="flex gap-1">
            {EMOJI_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  onToggle(opt.key);
                  setPickerOpen(false);
                }}
                className="rounded p-1.5 text-base hover:bg-muted transition-colors"
                title={t(opt.key)}
              >
                {opt.display}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
