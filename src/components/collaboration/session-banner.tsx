"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Users, Play, LogIn, Radio, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { StartSessionDialog } from "./start-session-dialog";
import { usePresence } from "@/hooks/use-presence";

interface SessionBannerProps {
  reviewId: string;
  reviewReference: string;
  className?: string;
}

export function SessionBanner({
  reviewId,
  reviewReference,
  className,
}: SessionBannerProps) {
  const { data: session } = useSession();
  const [showStartDialog, setShowStartDialog] = useState(false);

  // Get active session
  const { data: activeSession, refetch } = trpc.collaboration.getActiveSession.useQuery(
    { reviewId },
    { refetchInterval: 30000 } // Refresh every 30s
  );

  // Join session mutation
  const joinSession = trpc.collaboration.joinSession.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Presence hook (only if session exists)
  const { members, isConnected } = usePresence({
    reviewId,
  });

  const isInSession = activeSession?.participants.some(
    (p: { userId: string }) => p.userId === session?.user?.id
  );

  const handleJoinSession = () => {
    if (activeSession) {
      joinSession.mutate({ sessionId: activeSession.id });
    }
  };

  // No active session - show start button
  if (!activeSession) {
    return (
      <>
        <div
          className={cn(
            "flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-2",
            className
          )}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <WifiOff className="h-4 w-4" />
            <span>No active collaboration session</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStartDialog(true)}
          >
            <Play className="mr-2 h-4 w-4" />
            Start Session
          </Button>
        </div>

        <StartSessionDialog
          open={showStartDialog}
          onOpenChange={setShowStartDialog}
          reviewId={reviewId}
          reviewReference={reviewReference}
          onSessionStarted={() => {
            setShowStartDialog(false);
            refetch();
          }}
        />
      </>
    );
  }

  // Active session exists
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-2 dark:border-green-800 dark:bg-green-950",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
          </span>
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            Live Session
          </span>
        </div>

        {/* Session info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Radio className="h-4 w-4" />
          <span>{activeSession.title || activeSession.sessionType}</span>
        </div>

        {/* Connection status */}
        <Badge
          variant={isConnected ? "default" : "secondary"}
          className="gap-1"
        >
          {isConnected ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          {isConnected ? "Connected" : "Connecting..."}
        </Badge>
      </div>

      <div className="flex items-center gap-4">
        {/* Online members */}
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="flex -space-x-2">
              {members.slice(0, 5).map((member) => (
                <Tooltip key={member.id}>
                  <TooltipTrigger asChild>
                    <Avatar
                      className="h-7 w-7 border-2 border-background"
                      style={{ borderColor: member.color }}
                    >
                      <AvatarFallback
                        className="text-xs"
                        style={{ backgroundColor: member.color, color: "white" }}
                      >
                        {member.avatar}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.role}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {members.length > 5 && (
                <Avatar className="h-7 w-7 border-2 border-background">
                  <AvatarFallback className="text-xs bg-muted">
                    +{members.length - 5}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </TooltipProvider>

        {/* Join/Leave button */}
        {!isInSession ? (
          <Button
            variant="default"
            size="sm"
            onClick={handleJoinSession}
            disabled={joinSession.isPending}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Join Session
          </Button>
        ) : (
          <Badge variant="outline" className="text-green-600">
            In Session
          </Badge>
        )}
      </div>
    </div>
  );
}
