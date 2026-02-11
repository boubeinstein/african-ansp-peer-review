"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  Play,
  LogIn,
  LogOut,
  StopCircle,
  Radio,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StartSessionDialog } from "./start-session-dialog";
import { usePresence } from "@/hooks/use-presence";
import { isPusherAvailable } from "@/lib/pusher/client";
import { toast } from "sonner";

interface SessionBannerProps {
  reviewId: string;
  reviewReference: string;
  userId?: string; // Pass from server component - no need for SessionProvider
  userRole?: string;
  className?: string;
}

interface DisplayMember {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isOnline: boolean;
}

// Generate a consistent color from user ID
function generateColor(userId: string): string {
  const colors = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#84cc16",
    "#22c55e",
    "#14b8a6",
    "#06b6d4",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#d946ef",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function SessionBanner({
  reviewId,
  reviewReference,
  userId,
  userRole,
  className,
}: SessionBannerProps) {
  const t = useTranslations("collaboration.session");
  const tCommon = useTranslations("common");
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const pusherAvailable = isPusherAvailable();
  const utils = trpc.useUtils();

  // Get active session from database
  const { data: activeSession, refetch } =
    trpc.collaboration.getActiveSession.useQuery(
      { reviewId },
      {
        enabled: !!userId && !!reviewId,
        refetchInterval: pusherAvailable ? 30000 : 10000,
      }
    );

  // Join session mutation
  const joinSession = trpc.collaboration.joinSession.useMutation({
    onSuccess: () => refetch(),
  });

  // Leave session mutation
  const leaveMutation = trpc.collaboration.leaveSession.useMutation({
    onSuccess: () => {
      toast.success(t("leftSession"));
      utils.collaboration.getActiveSession.invalidate({ reviewId });
      utils.collaboration.getMyActiveSessions.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // End session mutation
  const endMutation = trpc.collaboration.endSession.useMutation({
    onSuccess: () => {
      toast.success(t("sessionEnded"));
      utils.collaboration.getActiveSession.invalidate({ reviewId });
      utils.collaboration.getMyActiveSessions.invalidate();
      utils.collaboration.getActiveSessionCount.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Convert DB participants for usePresence fallback
  const dbParticipants = activeSession?.participants?.map(
    (p: {
      id: string;
      odId?: string;
      user: { id: string; firstName: string; lastName: string; email: string };
    }) => ({
      id: p.id,
      odId: p.odId || "",
      user: p.user,
    })
  );

  // Presence hook with database fallback
  const { members, isConnected } = usePresence({
    reviewId,
    userId,
    dbParticipants,
  });

  // Use database participant count when Pusher unavailable
  const displayMembers =
    pusherAvailable && isConnected
      ? members
      : (activeSession?.participants || []).map(
          (p: {
            user: {
              id: string;
              firstName: string;
              lastName: string;
              email: string;
            };
            isOnline?: boolean;
          }) => ({
            id: p.user.id,
            name: `${p.user.firstName} ${p.user.lastName}`,
            email: p.user.email,
            role: "Participant",
            avatar: `${p.user.firstName?.[0] || ""}${p.user.lastName?.[0] || ""}`.toUpperCase(),
            color: generateColor(p.user.id),
            isOnline: p.isOnline ?? true,
            lastSeenAt: new Date(),
          })
        );

  const isInSession = activeSession?.participants.some(
    (p: { userId: string }) => p.userId === userId
  );

  // Host or oversight roles can end session
  const isHost = activeSession?.startedBy?.id === userId;
  const canEndSession =
    isHost ||
    ["SUPER_ADMIN", "PROGRAMME_COORDINATOR"].includes(userRole || "");

  const handleJoinSession = () => {
    if (activeSession) {
      joinSession.mutate({ sessionId: activeSession.id });
    }
  };

  const handleLeaveSession = () => {
    if (activeSession) {
      leaveMutation.mutate({ sessionId: activeSession.id });
    }
    setShowLeaveDialog(false);
  };

  const handleEndSession = () => {
    if (activeSession) {
      endMutation.mutate({ sessionId: activeSession.id });
    }
    setShowEndDialog(false);
  };

  // No active session - show start button
  if (!activeSession) {
    return (
      <>
        <div
          className={cn(
            "flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-2",
            className
          )}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <WifiOff className="h-4 w-4" />
            <span>{t("noActiveSession")}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStartDialog(true)}
          >
            <Play className="mr-2 h-4 w-4" />
            {t("startSession")}
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
    <>
      <div
        className={cn(
          "flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 dark:border-green-800 dark:bg-green-950/30",
          className
        )}
      >
        <div className="flex items-center gap-4">
          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-[pulse_2s_ease-in-out_infinite]" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
            </span>
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              {t("liveSession")}
            </span>
          </div>

          {/* Session info - clickable title */}
          <button
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {/* session panel placeholder */}}
          >
            <Radio className="h-4 w-4" />
            <span className="hover:underline">
              {activeSession.title ||
                activeSession.sessionType.replace(/_/g, " ")}
            </span>
          </button>

          {/* Connection status */}
          {pusherAvailable ? (
            <Badge
              variant={isConnected ? "default" : "secondary"}
              className="gap-1"
            >
              {isConnected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {isConnected ? t("connected") : t("connecting")}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-1 text-yellow-600 border-yellow-300"
            >
              <AlertCircle className="h-3 w-3" />
              {t("offlineMode")}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Members from DB or real-time */}
          <TooltipProvider>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground mr-1">
                {displayMembers.length}
              </span>
              <div className="flex -space-x-2">
                {displayMembers.slice(0, 5).map((member: DisplayMember) => (
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
                      <p className="text-xs text-muted-foreground">
                        {member.isOnline ? t("online") : t("offline")}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {displayMembers.length > 5 && (
                  <Avatar className="h-7 w-7 border-2 border-background">
                    <AvatarFallback className="text-xs bg-muted">
                      +{displayMembers.length - 5}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          </TooltipProvider>

          {/* Session actions */}
          {!isInSession ? (
            <Button
              variant="default"
              size="sm"
              onClick={handleJoinSession}
              disabled={joinSession.isPending}
            >
              <LogIn className="mr-2 h-4 w-4" />
              {t("joinSession")}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-green-600 border-green-600/30"
              >
                <span className="relative flex h-2 w-2 mr-1.5">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-green-500" />
                </span>
                {t("inSession")}
              </Badge>

              {/* Leave Session */}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setShowLeaveDialog(true)}
                disabled={leaveMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-1" />
                {t("leave")}
              </Button>

              {/* End Session - host or oversight only */}
              {canEndSession && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowEndDialog(true)}
                  disabled={endMutation.isPending}
                >
                  <StopCircle className="h-4 w-4 mr-1" />
                  {t("endSession")}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Leave Session Confirmation */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("leaveConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("leaveConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveSession}>
              {t("leave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Session Confirmation */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("endConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("endConfirmDescription", {
                count: displayMembers.length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("endSession")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
