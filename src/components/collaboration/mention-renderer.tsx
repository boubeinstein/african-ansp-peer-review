"use client";

import { cn } from "@/lib/utils";

interface MentionRendererProps {
  content: string;
  currentUserId?: string;
  className?: string;
}

/**
 * Renders message content with highlighted @mentions.
 *
 * Mention format in stored text:
 *   @[Display Name](userId)  — rendered as blue badge (primary if self)
 *   @all                     — rendered as purple badge
 *   @word                    — rendered as gray badge (legacy/unlinked)
 */
export function MentionRenderer({
  content,
  currentUserId,
  className,
}: MentionRendererProps) {
  const parts = parseMentions(content);

  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.text}</span>;
        }
        if (part.type === "mention-all") {
          return (
            <span
              key={i}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-xs font-medium mx-0.5"
            >
              @all
            </span>
          );
        }
        if (part.type === "mention-user") {
          const isMe = part.userId === currentUserId;
          return (
            <span
              key={i}
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium mx-0.5 cursor-default",
                isMe
                  ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              )}
              title={part.name}
            >
              @{part.name.split(" ")[0]}
            </span>
          );
        }
        if (part.type === "mention-plain") {
          return (
            <span
              key={i}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-medium mx-0.5"
            >
              @{part.text}
            </span>
          );
        }
        return null;
      })}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

interface TextPart {
  type: "text";
  text: string;
}

interface MentionAllPart {
  type: "mention-all";
}

interface MentionUserPart {
  type: "mention-user";
  name: string;
  userId: string;
}

interface MentionPlainPart {
  type: "mention-plain";
  text: string;
}

type Part = TextPart | MentionAllPart | MentionUserPart | MentionPlainPart;

function parseMentions(content: string): Part[] {
  const parts: Part[] = [];

  // Combined regex:
  // 1. @[Display Name](userId) — structured mention
  // 2. @all — broadcast mention
  // 3. @word — plain/legacy mention
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)|@all\b|@(\w[\w.]*)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: content.slice(lastIndex, match.index) });
    }

    if (match[1] && match[2]) {
      parts.push({ type: "mention-user", name: match[1], userId: match[2] });
    } else if (match[0] === "@all") {
      parts.push({ type: "mention-all" });
    } else if (match[3]) {
      parts.push({ type: "mention-plain", text: match[3] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", text: content.slice(lastIndex) });
  }

  return parts;
}

// Re-export shared utilities for convenience
export {
  extractMentionedUserIds,
  hasMentionAll,
  stripMentions,
} from "@/lib/mentions";
