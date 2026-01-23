"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, Check, CheckCheck, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import Link from "next/link";
import { NotificationType, NotificationPriority } from "@prisma/client";

const priorityColors: Record<NotificationPriority, string> = {
  LOW: "bg-gray-100 text-gray-800",
  NORMAL: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

const typeIcons: Partial<Record<NotificationType, string>> = {
  REVIEW_REQUESTED: "📋",
  REVIEW_APPROVED: "✅",
  REVIEW_REJECTED: "❌",
  TEAM_ASSIGNED: "👥",
  TEAM_INVITATION: "📨",
  FINDING_CREATED: "🔍",
  CAP_REQUIRED: "📝",
  CAP_SUBMITTED: "📤",
  CAP_ACCEPTED: "✅",
  CAP_REJECTED: "❌",
  CAP_DEADLINE_APPROACHING: "⏰",
  CAP_OVERDUE: "🚨",
  REPORT_DRAFT_READY: "📄",
  SYSTEM_ANNOUNCEMENT: "📢",
  REMINDER: "🔔",
};

// Helper to get locale-specific field
function getLocalizedField(
  notification: { titleEn: string; titleFr: string; messageEn: string; messageFr: string },
  field: "title" | "message",
  locale: string
): string {
  if (field === "title") {
    return locale === "fr" ? notification.titleFr : notification.titleEn;
  }
  return locale === "fr" ? notification.messageFr : notification.messageEn;
}

interface NotificationBellProps {
  locale: string;
}

export function NotificationBell({ locale }: NotificationBellProps) {
  const t = useTranslations("notifications");
  const [isOpen, setIsOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: recentData, isLoading, error } = trpc.notification.getRecent.useQuery(
    { limit: 10 },
    {
      staleTime: 30 * 1000,       // Data is fresh for 30 seconds
      refetchInterval: 60 * 1000, // Poll every 60 seconds
      refetchOnWindowFocus: false, // Don't refetch on tab focus
      retry: 2,                   // Retry twice on failure
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    }
  );

  // Handle connection errors silently - show bell without count
  if (error) {
    return (
      <Button variant="ghost" size="icon" className="relative" disabled>
        <Bell className="h-4 w-4 text-muted-foreground" />
      </Button>
    );
  }

  const markAsReadMutation = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      utils.notification.getRecent.invalidate();
      utils.notification.getUnreadCount.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notification.getRecent.invalidate();
      utils.notification.getUnreadCount.invalidate();
    },
  });

  const notifications = recentData?.notifications ?? [];
  const unreadCount = recentData?.unreadCount ?? 0;

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsReadMutation.mutate({ id });
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const dateLocale = locale === "fr" ? fr : enUS;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold">{t("title")}</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              className="h-auto py-1 text-xs"
            >
              {markAllAsReadMutation.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <CheckCheck className="mr-1 h-3 w-3" />
              )}
              {t("markAllRead")}
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("noNotifications")}</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "relative px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer",
                    !notification.readAt && "bg-muted/30"
                  )}
                >
                  <div className="flex gap-3">
                    <span className="text-lg">
                      {typeIcons[notification.type] || "📌"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm line-clamp-2",
                          !notification.readAt && "font-medium"
                        )}>
                          {getLocalizedField(notification, "title", locale)}
                        </p>
                        {!notification.readAt && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                            disabled={markAsReadMutation.isPending}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {getLocalizedField(notification, "message", locale) && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {getLocalizedField(notification, "message", locale)}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            priorityColors[notification.priority]
                          )}
                        >
                          {notification.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {notification.actionUrl && (
                    <Link
                      href={notification.actionUrl}
                      className="absolute inset-0"
                      onClick={() => {
                        if (!notification.readAt) {
                          markAsReadMutation.mutate({ id: notification.id });
                        }
                        setIsOpen(false);
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full justify-center text-sm"
            asChild
          >
            <Link href={`/${locale}/notifications`} onClick={() => setIsOpen(false)}>
              {t("viewAll")}
              <ExternalLink className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
