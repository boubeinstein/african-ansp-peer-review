"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PresenceMember } from "@/hooks/use-presence";

interface PresenceAvatarsProps {
  members: PresenceMember[];
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

const overlapClasses = {
  sm: "-space-x-1.5",
  md: "-space-x-2",
  lg: "-space-x-2.5",
};

export function PresenceAvatars({
  members,
  maxVisible = 5,
  size = "md",
  showStatus = true,
  className,
}: PresenceAvatarsProps) {
  const visibleMembers = members.slice(0, maxVisible);
  const remainingCount = members.length - maxVisible;

  return (
    <TooltipProvider>
      <div className={cn("flex items-center", overlapClasses[size], className)}>
        {visibleMembers.map((member) => (
          <PresenceAvatar
            key={member.id}
            member={member}
            size={size}
            showStatus={showStatus}
          />
        ))}
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar
                className={cn(
                  sizeClasses[size],
                  "border-2 border-background cursor-default"
                )}
              >
                <AvatarFallback className="bg-muted text-muted-foreground">
                  +{remainingCount}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{remainingCount} more online</p>
              <div className="mt-1 space-y-1">
                {members.slice(maxVisible).map((m) => (
                  <p key={m.id} className="text-xs">
                    {m.name}
                  </p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

interface PresenceAvatarProps {
  member: PresenceMember;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
  showHoverCard?: boolean;
  className?: string;
}

export function PresenceAvatar({
  member,
  size = "md",
  showStatus = true,
  showHoverCard = false,
  className,
}: PresenceAvatarProps) {
  const avatarContent = (
    <div className="relative">
      <Avatar
        className={cn(
          sizeClasses[size],
          "border-2 border-background transition-transform hover:scale-110",
          className
        )}
        style={{ borderColor: member.color }}
      >
        <AvatarImage src={undefined} alt={member.name} />
        <AvatarFallback
          style={{ backgroundColor: member.color, color: "white" }}
        >
          {member.avatar}
        </AvatarFallback>
      </Avatar>
      {showStatus && member.isOnline && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full bg-green-500 ring-2 ring-background",
            size === "sm" && "h-1.5 w-1.5",
            size === "md" && "h-2 w-2",
            size === "lg" && "h-2.5 w-2.5"
          )}
        />
      )}
    </div>
  );

  if (showHoverCard) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>{avatarContent}</HoverCardTrigger>
        <HoverCardContent className="w-64" side="top">
          <MemberHoverContent member={member} />
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{avatarContent}</TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{member.name}</p>
        <p className="text-xs text-muted-foreground">{member.role}</p>
        {member.currentFocus && (
          <p className="mt-1 text-xs">
            Viewing: {formatFocusShort(member.currentFocus)}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function MemberHoverContent({ member }: { member: PresenceMember }) {
  return (
    <div className="flex gap-3">
      <Avatar className="h-12 w-12" style={{ borderColor: member.color }}>
        <AvatarFallback
          style={{ backgroundColor: member.color, color: "white" }}
          className="text-lg"
        >
          {member.avatar}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <h4 className="font-semibold">{member.name}</h4>
        <p className="text-sm text-muted-foreground">{member.email}</p>
        <Badge variant="outline" className="text-xs">
          {member.role}
        </Badge>
        {member.currentFocus && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            <span>{formatFocusLong(member.currentFocus)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Online indicator component for use elsewhere
interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}

export function OnlineIndicator({
  isOnline,
  size = "md",
  pulse = true,
  className,
}: OnlineIndicatorProps) {
  if (!isOnline) return null;

  return (
    <span
      className={cn(
        "relative flex",
        size === "sm" && "h-2 w-2",
        size === "md" && "h-2.5 w-2.5",
        size === "lg" && "h-3 w-3",
        className
      )}
    >
      {pulse && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
      )}
      <span className="relative inline-flex h-full w-full rounded-full bg-green-500" />
    </span>
  );
}

// Helper functions
function formatFocusShort(focus: string): string {
  const [type] = focus.split(":");
  switch (type) {
    case "finding":
      return "a finding";
    case "document":
      return "a document";
    case "cap":
      return "a CAP";
    case "checklist":
      return "the checklist";
    default:
      return type;
  }
}

function formatFocusLong(focus: string): string {
  const [type, id] = focus.split(":");
  const shortId = id?.slice(-8) || "";
  switch (type) {
    case "finding":
      return `Finding ...${shortId}`;
    case "document":
      return `Document ...${shortId}`;
    case "cap":
      return `CAP ...${shortId}`;
    case "checklist":
      return "Fieldwork Checklist";
    default:
      return focus;
  }
}
