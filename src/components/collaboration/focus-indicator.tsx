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
import type { FocusedUser } from "@/hooks/use-focus-tracker";

interface FocusIndicatorProps {
  /** Pre-filtered viewers for this item (from useFocusTracker.getViewers) */
  viewers: FocusedUser[];
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
  viewers,
  maxVisible = 3,
  size = "sm",
  className,
}: FocusIndicatorProps) {
  if (viewers.length === 0) return null;

  const visible = viewers.slice(0, maxVisible);
  const remaining = viewers.length - maxVisible;

  return (
    <TooltipProvider>
      <div
        className={cn("flex items-center gap-0.5", className)}
        onClick={(e) => e.stopPropagation()}
      >
        <Eye
          className={cn(
            "text-muted-foreground",
            size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"
          )}
        />
        {visible.map((viewer) => (
          <Tooltip key={viewer.userId}>
            <TooltipTrigger asChild>
              <Avatar
                className={cn(
                  sizeClasses[size],
                  "border border-background cursor-default"
                )}
              >
                <AvatarFallback
                  style={{ backgroundColor: viewer.color, color: "white" }}
                  className="text-[10px] leading-none"
                >
                  {viewer.initials}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {viewer.name}
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
              {viewers
                .slice(maxVisible)
                .map((v) => v.name)
                .join(", ")}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
