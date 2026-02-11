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
  Radio,
  User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS, type Locale } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { usePresence } from "@/hooks/use-presence";
import { isPusherAvailable } from "@/lib/pusher/client";
import { cn } from "@/lib/utils";

interface SessionPanelProps {
  reviewId: string;
  sessionId: string;
  userId?: string;
  isHost: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  open,
  onOpenChange,
}: SessionPanelProps) {
  const t = useTranslations("collaboration.sessionPanel");
  const tSession = useTranslations("collaboration.session");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

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
      toast.info(tSession("leftSession"));
      utils.collaboration.getActiveSession.invalidate({ reviewId });
      utils.collaboration.getMyActiveSessions.invalidate();
      onOpenChange(false);
    },
  });

  // End session
  const endSession = trpc.collaboration.endSession.useMutation({
    onSuccess: () => {
      toast.success(tSession("sessionEnded"));
      utils.collaboration.getActiveSession.invalidate({ reviewId });
      utils.collaboration.getMyActiveSessions.invalidate();
      setShowEndDialog(false);
      onOpenChange(false);
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const handleLeave = () => {
    leaveSession.mutate({ sessionId });
  };

  const handleEndSession = () => {
    endSession.mutate({ sessionId });
  };

  // Session info
  const sessionTitle =
    activeSession?.title ||
    activeSession?.sessionType?.replace(/_/g, " ") ||
    t("title");
  const startedByName = activeSession?.startedBy
    ? `${activeSession.startedBy.firstName} ${activeSession.startedBy.lastName}`
    : null;
  const startedAt = activeSession?.startedAt
    ? new Date(activeSession.startedAt)
    : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {t("title")}
              {!pusherAvailable && (
                <Badge
                  variant="outline"
                  className="text-yellow-600 border-yellow-300"
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {tSession("offlineMode")}
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription>
              {pusherAvailable && isConnected
                ? t("realtimeActive")
                : t("realtimeUnavailable")}
            </SheetDescription>
          </SheetHeader>

          {/* Session Info Card */}
          <div className="mt-4 rounded-lg border bg-muted/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Radio className="h-4 w-4 text-green-500" />
              <span className="font-medium">{sessionTitle}</span>
            </div>
            {startedByName && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{t("startedBy", { name: startedByName })}</span>
              </div>
            )}
            {startedAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {t("duration", {
                    time: formatDistanceToNow(startedAt, {
                      locale: dateLocale,
                    }),
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Tab buttons */}
          <div className="mt-4 flex gap-2">
            <Button
              variant={activeTab === "members" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("members")}
            >
              <Users className="mr-2 h-4 w-4" />
              {t("membersTab", { count: displayMembers.length })}
            </Button>
            <Button
              variant={activeTab === "activity" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("activity")}
            >
              <Activity className="mr-2 h-4 w-4" />
              {t("activityTab")}
            </Button>
          </div>

          <Separator className="my-4" />

          {/* Content */}
          <ScrollArea className="h-[calc(100vh-380px)]">
            {activeTab === "members" ? (
              <MembersList
                members={displayMembers}
                currentUserId={userId}
                t={t}
                dateLocale={dateLocale}
              />
            ) : (
              <ActivityFeed
                activities={activitiesData?.activities || []}
                t={t}
                dateLocale={dateLocale}
              />
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
              {tSession("leave")}
            </Button>
            {isHost && (
              <Button
                variant="destructive"
                onClick={() => setShowEndDialog(true)}
              >
                <StopCircle className="mr-2 h-4 w-4" />
                {tSession("endSession")}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* End Session Confirmation */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tSession("endConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tSession("endConfirmDescription", {
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
              {tSession("endSession")}
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

interface TranslationFn {
  (key: string, values?: Record<string, string | number>): string;
}

function MembersList({
  members,
  currentUserId,
  t,
  dateLocale,
}: {
  members: DisplayMember[];
  currentUserId?: string;
  t: TranslationFn;
  dateLocale: Locale;
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
                    ({t("you")})
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
                {formatFocus(member.currentFocus, t)}
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
                {formatDistanceToNow(member.lastSeenAt, {
                  addSuffix: true,
                  locale: dateLocale,
                })}
              </span>
            )}
          </div>
        </div>
      ))}

      {members.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          {t("noMembers")}
        </div>
      )}
    </div>
  );
}

// Activity Feed Component
function ActivityFeed({
  activities,
  t,
  dateLocale,
}: {
  activities: Array<{
    id: string;
    activityType: string;
    targetType?: string | null;
    timestamp: Date;
    user: { id: string; firstName: string; lastName: string };
  }>;
  t: TranslationFn;
  dateLocale: Locale;
}) {
  return (
    <div className="space-y-3">
      {activities.map(
        (activity: {
          id: string;
          activityType: string;
          targetType?: string | null;
          timestamp: Date;
          user: { id: string; firstName: string; lastName: string };
        }) => (
          <div key={activity.id} className="flex gap-3 text-sm">
            <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
            <div className="flex-1">
              <p>
                <span className="font-medium">
                  {activity.user.firstName} {activity.user.lastName}
                </span>{" "}
                {formatActivityMessage(activity.activityType, t)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(activity.timestamp), {
                  addSuffix: true,
                  locale: dateLocale,
                })}
              </p>
            </div>
          </div>
        )
      )}

      {activities.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          {t("noActivity")}
        </div>
      )}
    </div>
  );
}

// Helper functions
function formatFocus(focus: string, t: TranslationFn): string {
  const [type, id] = focus.split(":");
  const shortId = id?.slice(-6) || "";

  switch (type) {
    case "finding":
      return t("focusFinding", { id: shortId });
    case "document":
      return t("focusDocument", { id: shortId });
    case "cap":
      return t("focusCap", { id: shortId });
    default:
      return focus;
  }
}

function formatActivityMessage(type: string, t: TranslationFn): string {
  const key = `activity.${type}`;
  // Use the translation key if it exists, fallback to formatted type
  try {
    return t(key);
  } catch {
    return type.toLowerCase().replace(/_/g, " ");
  }
}
