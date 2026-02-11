"use client";

import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  users: Array<{ name: string }>;
  className?: string;
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const names = users.map((u) => u.name.split(" ")[0]);
  const message =
    names.length === 1
      ? `${names[0]} is typing...`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing...`
        : `${names[0]} and ${names.length - 1} others are typing...`;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground py-1",
        className
      )}
    >
      <TypingDots />
      <span>{message}</span>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1 w-1 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: "0.6s" }}
        />
      ))}
    </div>
  );
}
