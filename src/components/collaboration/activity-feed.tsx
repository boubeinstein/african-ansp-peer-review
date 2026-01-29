"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Activity,
  FileText,
  MessageSquare,
  CheckSquare,
  Eye,
  Edit,
  Trash2,
  Plus,
  LogIn,
  LogOut,
  Bell,
  BellOff,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  type:
    | "member_joined"
    | "member_left"
    | "finding_created"
    | "finding_updated"
    | "finding_deleted"
    | "comment_added"
    | "document_uploaded"
    | "task_completed"
    | "focus_change";
  user: {
    id: string;
    name: string;
    color: string;
    avatar: string;
  };
  message: string;
  target?: {
    type: string;
    id: string;
    label: string;
  };
  timestamp: Date;
  isNew?: boolean;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
  onActivityClick?: (activity: ActivityItem) => void;
  className?: string;
}

export function ActivityFeed({
  activities,
  maxItems = 100,
  onActivityClick,
  className,
}: ActivityFeedProps) {
  const [showNotifications, setShowNotifications] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Auto-scroll to bottom when new activities arrive (if already at bottom)
  const activitiesLength = activities.length;
  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activitiesLength, isAtBottom]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const atBottom =
      Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) <
      10;
    setIsAtBottom(atBottom);
  };

  const displayedActivities = activities.slice(-maxItems);

  return (
    <div className={cn("relative flex h-full flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <span className="font-medium">Activity</span>
          <Badge variant="secondary" className="text-xs">
            {activities.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          {showNotifications ? (
            <Bell className="h-4 w-4" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Activity list */}
      <ScrollArea className="flex-1" onScrollCapture={handleScroll}>
        <div ref={scrollRef} className="space-y-1 p-2">
          <AnimatePresence initial={false}>
            {displayedActivities.map((activity) => (
              <ActivityItemCard
                key={activity.id}
                activity={activity}
                onClick={() => onActivityClick?.(activity)}
                animate={showNotifications}
              />
            ))}
          </AnimatePresence>

          {activities.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No activity yet
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {!isAtBottom && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2"
          >
            <Button
              variant="secondary"
              size="sm"
              className="shadow-lg"
              onClick={() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
              }}
            >
              <ChevronDown className="mr-1 h-4 w-4" />
              New activity
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ActivityItemCardProps {
  activity: ActivityItem;
  onClick?: () => void;
  animate?: boolean;
}

function ActivityItemCard({
  activity,
  onClick,
  animate,
}: ActivityItemCardProps) {
  return (
    <motion.div
      initial={animate ? { opacity: 0, x: -20 } : false}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex gap-3 rounded-lg p-2 text-sm transition-colors",
        onClick && "cursor-pointer hover:bg-muted",
        activity.isNew && "bg-primary/5"
      )}
      onClick={onClick}
    >
      {/* Avatar */}
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback
          className="text-xs"
          style={{ backgroundColor: activity.user.color, color: "white" }}
        >
          {activity.user.avatar}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="leading-tight">
          <span className="font-medium">{activity.user.name}</span>{" "}
          <span className="text-muted-foreground">{activity.message}</span>
        </p>
        {activity.target && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <ActivityIcon type={activity.type} className="h-3 w-3" />
            {activity.target.label}
          </p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
        </p>
      </div>

      {/* New indicator */}
      {activity.isNew && (
        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </motion.div>
  );
}

// Separate component to render activity icon
function ActivityIcon({
  type,
  className,
}: {
  type: ActivityItem["type"];
  className?: string;
}) {
  switch (type) {
    case "member_joined":
      return <LogIn className={className} />;
    case "member_left":
      return <LogOut className={className} />;
    case "finding_created":
      return <Plus className={className} />;
    case "finding_updated":
      return <Edit className={className} />;
    case "finding_deleted":
      return <Trash2 className={className} />;
    case "comment_added":
      return <MessageSquare className={className} />;
    case "document_uploaded":
      return <FileText className={className} />;
    case "task_completed":
      return <CheckSquare className={className} />;
    case "focus_change":
      return <Eye className={className} />;
    default:
      return <Activity className={className} />;
  }
}

// Floating activity feed button with preview
interface ActivityFeedButtonProps {
  activities: ActivityItem[];
  unreadCount?: number;
  onActivityClick?: (activity: ActivityItem) => void;
}

export function ActivityFeedButton({
  activities,
  unreadCount = 0,
  onActivityClick,
}: ActivityFeedButtonProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Activity className="mr-2 h-4 w-4" />
          Activity
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-2 -top-2 h-5 w-5 rounded-full p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle>Session Activity</SheetTitle>
        </SheetHeader>
        <ActivityFeed
          activities={activities}
          onActivityClick={onActivityClick}
          className="h-[calc(100vh-60px)]"
        />
      </SheetContent>
    </Sheet>
  );
}

// Mini activity toast for inline notifications
interface ActivityToastProps {
  activity: ActivityItem;
  onDismiss: () => void;
}

export function ActivityToast({ activity, onDismiss }: ActivityToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className="flex items-center gap-3 rounded-lg border bg-background p-3 shadow-lg"
    >
      <Avatar className="h-8 w-8">
        <AvatarFallback
          style={{ backgroundColor: activity.user.color, color: "white" }}
        >
          {activity.user.avatar}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="text-sm">
          <span className="font-medium">{activity.user.name}</span>{" "}
          {activity.message}
        </p>
      </div>
      <ActivityIcon type={activity.type} className="h-4 w-4 text-muted-foreground" />
    </motion.div>
  );
}
