"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
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
  FileText,
  MessageSquare,
  CheckSquare,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { usePresence, type PresenceMember } from "@/hooks/use-presence";
import { cn } from "@/lib/utils";

interface SessionPanelProps {
  reviewId: string;
  sessionId: string;
  isHost: boolean;
  className?: string;
}

export function SessionPanel({
  reviewId,
  sessionId,
  isHost,
  className,
}: SessionPanelProps) {
  const { data: authSession } = useSession();
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "activity">("members");

  const utils = trpc.useUtils();

  // Presence - pass userId to avoid needing SessionProvider
  const { members } = usePresence({ reviewId, userId: authSession?.user?.id });

  // Session activities
  const { data: activitiesData } = trpc.collaboration.getSessionActivities.useQuery(
    { sessionId, limit: 50 },
    { refetchInterval: 10000 }
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
            Session ({members.length})
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Collaboration Session</SheetTitle>
            <SheetDescription>
              Manage participants and view session activity
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
              Members ({members.length})
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
              <MembersList
                members={members}
                currentUserId={authSession?.user?.id}
              />
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
              This will end the session for all {members.length} participants.
              All activities have been recorded for the audit trail.
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
function MembersList({
  members,
  currentUserId,
}: {
  members: PresenceMember[];
  currentUserId?: string;
}) {
  return (
    <div className="space-y-2">
      {members.map((member) => (
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
            {/* Online indicator */}
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
          </div>
        </div>
      ))}

      {members.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          No members currently online
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
    data?: unknown;
  }>;
}) {
  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-3 text-sm">
          <div className="mt-1">
            <ActivityIcon type={activity.activityType} />
          </div>
          <div className="flex-1">
            <p>
              <span className="font-medium">
                {activity.user.firstName} {activity.user.lastName}
              </span>{" "}
              {formatActivityMessage(activity)}
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
      return `Document ...${shortId}`;
    case "cap":
      return `CAP ...${shortId}`;
    default:
      return focus;
  }
}

function ActivityIcon({ type }: { type: string }) {
  const iconClass = "h-4 w-4 text-muted-foreground";

  switch (type) {
    case "SESSION_JOIN":
    case "SESSION_LEAVE":
      return <Users className={iconClass} />;
    case "FINDING_CREATE":
    case "FINDING_EDIT":
    case "FINDING_DELETE":
      return <AlertTriangle className={iconClass} />;
    case "COMMENT_ADD":
      return <MessageSquare className={iconClass} />;
    case "DOCUMENT_VIEW":
    case "DOCUMENT_UPLOAD":
      return <FileText className={iconClass} />;
    case "TASK_UPDATE":
    case "TASK_COMPLETE":
      return <CheckSquare className={iconClass} />;
    default:
      return <Clock className={iconClass} />;
  }
}

function formatActivityMessage(activity: {
  activityType: string;
  targetType?: string | null;
  data?: unknown;
}): string {
  switch (activity.activityType) {
    case "SESSION_JOIN":
      return "joined the session";
    case "SESSION_LEAVE":
      return "left the session";
    case "FINDING_CREATE":
      return `created a finding`;
    case "FINDING_EDIT":
      return "edited a finding";
    case "FINDING_DELETE":
      return "deleted a finding";
    case "COMMENT_ADD":
      return `added a comment`;
    case "DOCUMENT_VIEW":
      return "viewed a document";
    case "DOCUMENT_UPLOAD":
      return "uploaded a document";
    case "TASK_UPDATE":
      return "updated a task";
    case "TASK_COMPLETE":
      return "completed a task";
    case "FOCUS_CHANGE": {
      const data = activity.data as { focus?: string } | undefined;
      return `is viewing ${data?.focus || "item"}`;
    }
    default:
      return activity.activityType.toLowerCase().replace(/_/g, " ");
  }
}
