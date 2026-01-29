"use client";

import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  users: Array<{ id: string; name: string }>;
  className?: string;
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const message =
    users.length === 1
      ? `${users[0].name} is typing...`
      : users.length === 2
        ? `${users[0].name} and ${users[1].name} are typing...`
        : `${users[0].name} and ${users.length - 1} others are typing...`;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground",
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
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}
