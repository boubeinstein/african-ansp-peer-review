"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  Activity,
  LogOut,
  StopCircle,
  Clock,
  Eye,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { usePresence } from "@/hooks/use-presence";
import { isPusherAvailable } from "@/lib/pusher/client";
import { cn } from "@/lib/utils";

interface SessionPanelProps {
  reviewId: string;
  sessionId: string;
  userId?: string; // Pass from server component - no need for SessionProvider
  isHost: boolean;
  className?: string;
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

export function SessionPanel({
  reviewId,
  sessionId,
  userId,
  isHost,
  className,
}: SessionPanelProps) {
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "activity">("members");
  const pusherAvailable = isPusherAvailable();

  const utils = trpc.useUtils();

  // Get session with participants from database
  const { data: activeSession } = trpc.collaboration.getActiveSession.useQuery(
    { reviewId },
    {
      enabled: !!userId && !!reviewId,
      refetchInterval: pusherAvailable ? 30000 : 5000,
    }
  );

  // Presence (real-time when available)
  const { members: realtimeMembers, isConnected } = usePresence({
    reviewId,
    userId,
  });

  // Use real-time members if connected, otherwise database participants
  const displayMembers =
    pusherAvailable && isConnected && realtimeMembers.length > 0
      ? realtimeMembers
      : (activeSession?.participants || []).map(
          (p: {
            user: {
              id: string;
              firstName: string;
              lastName: string;
              email: string;
            };
            role?: string;
            isOnline?: boolean;
            currentFocus?: string | null;
            lastSeenAt?: Date | string | null;
          }) => ({
            id: p.user.id,
            name: `${p.user.firstName} ${p.user.lastName}`,
            email: p.user.email,
            role: p.role || "PARTICIPANT",
            avatar: `${p.user.firstName?.[0] || ""}${p.user.lastName?.[0] || ""}`.toUpperCase(),
            color: generateColor(p.user.id),
            isOnline: p.isOnline ?? true,
            currentFocus: p.currentFocus,
            lastSeenAt: p.lastSeenAt ? new Date(p.lastSeenAt) : new Date(),
          })
        );

  // Session activities (only if authenticated)
  const { data: activitiesData } =
    trpc.collaboration.getSessionActivities.useQuery(
      { sessionId, limit: 50 },
      {
        enabled: !!userId && !!sessionId,
        refetchInterval: 10000,
      }
    );

  // Leave session
  const leaveSession = trpc.collaboration.leaveSession.useMutation({
    onSuccess: () => {
      toast.info("Left session");
      utils.collaboration.getActiveSession.invalidate({ reviewId });
    },
  });

  // End session
  const endSession = trpc.collaboration.endSession.useMutation({
    onSuccess: () => {
      toast.success("Session ended");
      utils.collaboration.getActiveSession.invalidate({ reviewId });
      setShowEndDialog(false);
    },
    onError: (error: { message: string }) => {
      toast.error("Failed to end session", { description: error.message });
    },
  });

  const handleLeave = () => {
    leaveSession.mutate({ sessionId });
  };

  const handleEndSession = () => {
    endSession.mutate({ sessionId });
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <Users className="mr-2 h-4 w-4" />
            Session ({displayMembers.length})
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              Collaboration Session
              {!pusherAvailable && (
                <Badge
                  variant="outline"
                  className="text-yellow-600 border-yellow-300"
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription>
              {pusherAvailable && isConnected
                ? "Real-time collaboration active"
                : "Viewing session participants (real-time updates unavailable)"}
            </SheetDescription>
          </SheetHeader>

          {/* Tab buttons */}
          <div className="mt-4 flex gap-2">
            <Button
              variant={activeTab === "members" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("members")}
            >
              <Users className="mr-2 h-4 w-4" />
              Members ({displayMembers.length})
            </Button>
            <Button
              variant={activeTab === "activity" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("activity")}
            >
              <Activity className="mr-2 h-4 w-4" />
              Activity
            </Button>
          </div>

          <Separator className="my-4" />

          {/* Content */}
          <ScrollArea className="h-[calc(100vh-280px)]">
            {activeTab === "members" ? (
              <MembersList members={displayMembers} currentUserId={userId} />
            ) : (
              <ActivityFeed activities={activitiesData?.activities || []} />
            )}
          </ScrollArea>

          <Separator className="my-4" />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleLeave}
              disabled={leaveSession.isPending}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Leave Session
            </Button>
            {isHost && (
              <Button
                variant="destructive"
                onClick={() => setShowEndDialog(true)}
              >
                <StopCircle className="mr-2 h-4 w-4" />
                End Session
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* End Session Confirmation */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Collaboration Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end the session for all {displayMembers.length}{" "}
              participants. All activities have been recorded for the audit
              trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Members List Component
interface DisplayMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  color: string;
  isOnline: boolean;
  currentFocus?: string | null;
  lastSeenAt: Date;
}

function MembersList({
  members,
  currentUserId,
}: {
  members: DisplayMember[];
  currentUserId?: string;
}) {
  return (
    <div className="space-y-2">
      {members.map((member: DisplayMember) => (
        <div
          key={member.id}
          className={cn(
            "flex items-center justify-between rounded-lg border p-3",
            member.id === currentUserId && "border-primary bg-primary/5"
          )}
        >
          <div className="flex items-center gap-3">
            <Avatar style={{ borderColor: member.color }} className="border-2">
              <AvatarFallback
                style={{ backgroundColor: member.color, color: "white" }}
              >
                {member.avatar}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {member.name}
                {member.id === currentUserId && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (you)
                  </span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">{member.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Current focus indicator */}
            {member.currentFocus && (
              <Badge variant="outline" className="gap-1">
                <Eye className="h-3 w-3" />
                {formatFocus(member.currentFocus)}
              </Badge>
            )}
            {/* Online/Offline indicator */}
            {member.isOnline ? (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(member.lastSeenAt, { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      ))}

      {members.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          No members in session
        </div>
      )}
    </div>
  );
}

// Activity Feed Component
function ActivityFeed({
  activities,
}: {
  activities: Array<{
    id: string;
    activityType: string;
    targetType?: string | null;
    timestamp: Date;
    user: { id: string; firstName: string; lastName: string };
  }>;
}) {
  return (
    <div className="space-y-3">
      {activities.map((activity: { id: string; activityType: string; targetType?: string | null; timestamp: Date; user: { id: string; firstName: string; lastName: string } }) => (
        <div key={activity.id} className="flex gap-3 text-sm">
          <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
          <div className="flex-1">
            <p>
              <span className="font-medium">
                {activity.user.firstName} {activity.user.lastName}
              </span>{" "}
              {formatActivityMessage(activity.activityType)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(activity.timestamp), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>
      ))}

      {activities.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          No activity recorded yet
        </div>
      )}
    </div>
  );
}

// Helper functions
function formatFocus(focus: string): string {
  const [type, id] = focus.split(":");
  const shortId = id?.slice(-6) || "";

  switch (type) {
    case "finding":
      return `Finding ...${shortId}`;
    case "document":
      return `Doc ...${shortId}`;
    case "cap":
      return `CAP ...${shortId}`;
    default:
      return focus;
  }
}

function formatActivityMessage(type: string): string {
  const messages: Record<string, string> = {
    SESSION_JOIN: "joined the session",
    SESSION_LEAVE: "left the session",
    FINDING_CREATE: "created a finding",
    FINDING_EDIT: "edited a finding",
    COMMENT_ADD: "added a comment",
    FOCUS_CHANGE: "changed focus",
  };
  return messages[type] || type.toLowerCase().replace(/_/g, " ");
}
