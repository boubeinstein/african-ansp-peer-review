"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PresenceMember } from "@/hooks/use-presence";

interface FocusIndicatorProps {
  /** All presence members in the review */
  members: PresenceMember[];
  /** The focus key to filter by, e.g. "finding:abc123" or "document:xyz" */
  focusKey: string;
  /** Current user ID to exclude from display */
  currentUserId?: string;
  /** Max avatars to show before +N overflow */
  maxVisible?: number;
  /** Size variant */
  size?: "sm" | "md";
  className?: string;
}

const sizeClasses = {
  sm: "h-5 w-5 text-[10px]",
  md: "h-6 w-6 text-xs",
};

/**
 * Compact presence indicator showing who is currently viewing a specific item.
 * Displays small colored avatar dots with tooltips.
 */
export function FocusIndicator({
  members,
  focusKey,
  currentUserId,
  maxVisible = 3,
  size = "sm",
  className,
}: FocusIndicatorProps) {
  // Filter members who are focused on this specific item, excluding current user
  const viewers = members.filter(
    (m) => m.currentFocus === focusKey && m.id !== currentUserId
  );

  if (viewers.length === 0) return null;

  const visible = viewers.slice(0, maxVisible);
  const remaining = viewers.length - maxVisible;

  return (
    <TooltipProvider>
      <div
        className={cn("flex items-center gap-0.5", className)}
        onClick={(e) => e.stopPropagation()}
      >
        <Eye className={cn(
          "text-muted-foreground",
          size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"
        )} />
        {visible.map((member) => (
          <Tooltip key={member.id}>
            <TooltipTrigger asChild>
              <Avatar
                className={cn(
                  sizeClasses[size],
                  "border border-background cursor-default"
                )}
              >
                <AvatarFallback
                  style={{ backgroundColor: member.color, color: "white" }}
                  className="text-[10px] leading-none"
                >
                  {member.avatar}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {member.name}
            </TooltipContent>
          </Tooltip>
        ))}
        {remaining > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar
                className={cn(
                  sizeClasses[size],
                  "border border-background cursor-default"
                )}
              >
                <AvatarFallback className="bg-muted text-muted-foreground text-[10px] leading-none">
                  +{remaining}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {viewers.slice(maxVisible).map((m) => m.name).join(", ")}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
