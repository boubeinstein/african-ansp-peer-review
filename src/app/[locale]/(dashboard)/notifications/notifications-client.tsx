"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  Check,
  CheckCheck,
  Filter,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow, format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import Link from "next/link";
import { NotificationType, NotificationPriority } from "@/types/prisma-enums";

interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  titleEn: string;
  titleFr: string;
  messageEn: string;
  messageFr: string;
  readAt?: Date | string | null;
  createdAt: Date | string;
  linkUrl?: string | null;
  actionUrl?: string | null;
}

const priorityColors: Record<NotificationPriority, string> = {
  LOW: "bg-gray-100 text-gray-800 border-gray-200",
  NORMAL: "bg-blue-100 text-blue-800 border-blue-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  URGENT: "bg-red-100 text-red-800 border-red-200",
};

const typeIcons: Partial<Record<NotificationType, string>> = {
  REVIEW_REQUESTED: "📋",
  REVIEW_APPROVED: "✅",
  REVIEW_REJECTED: "❌",
  TEAM_ASSIGNED: "👥",
  TEAM_INVITATION: "📨",
  TEAM_INVITATION_RESPONSE: "📩",
  REVIEW_STATUS_CHANGED: "🔄",
  REVIEW_DATES_CONFIRMED: "📅",
  REVIEW_SCHEDULED: "📆",
  REVIEW_STARTED: "▶️",
  REVIEW_COMPLETED: "🏁",
  FINDING_CREATED: "🔍",
  FINDING_UPDATED: "📝",
  CAP_REQUIRED: "📝",
  CAP_SUBMITTED: "📤",
  CAP_ACCEPTED: "✅",
  CAP_REJECTED: "❌",
  CAP_DEADLINE_APPROACHING: "⏰",
  CAP_OVERDUE: "🚨",
  CAP_VERIFIED: "✔️",
  CAP_CLOSED: "📁",
  REPORT_DRAFT_READY: "📄",
  REPORT_SUBMITTED: "📤",
  REPORT_APPROVED: "✅",
  SYSTEM_ANNOUNCEMENT: "📢",
  REMINDER: "🔔",
};

const typeLabels: Partial<Record<NotificationType, string>> = {
  REVIEW_REQUESTED: "Review Requested",
  REVIEW_APPROVED: "Review Approved",
  REVIEW_REJECTED: "Review Rejected",
  TEAM_ASSIGNED: "Team Assigned",
  TEAM_INVITATION: "Team Invitation",
  TEAM_INVITATION_RESPONSE: "Invitation Response",
  REVIEW_STATUS_CHANGED: "Status Changed",
  REVIEW_DATES_CONFIRMED: "Dates Confirmed",
  REVIEW_SCHEDULED: "Scheduled",
  REVIEW_STARTED: "Started",
  REVIEW_COMPLETED: "Completed",
  FINDING_CREATED: "Finding Created",
  FINDING_UPDATED: "Finding Updated",
  CAP_REQUIRED: "CAP Required",
  CAP_SUBMITTED: "CAP Submitted",
  CAP_ACCEPTED: "CAP Accepted",
  CAP_REJECTED: "CAP Rejected",
  CAP_DEADLINE_APPROACHING: "Deadline Approaching",
  CAP_OVERDUE: "Overdue",
  CAP_VERIFIED: "Verified",
  CAP_CLOSED: "Closed",
  REPORT_DRAFT_READY: "Draft Ready",
  REPORT_SUBMITTED: "Report Submitted",
  REPORT_APPROVED: "Report Approved",
  SYSTEM_ANNOUNCEMENT: "Announcement",
  REMINDER: "Reminder",
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

interface NotificationsClientProps {
  locale: string;
}

export function NotificationsClient({ locale }: NotificationsClientProps) {
  const t = useTranslations("notifications");
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriority | "all">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const pageSize = 20;

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.notification.list.useQuery({
    page,
    pageSize,
    unreadOnly,
    type: typeFilter === "all" ? undefined : typeFilter,
    priority: priorityFilter === "all" ? undefined : priorityFilter,
  });

  const { data: stats } = trpc.notification.getStats.useQuery();

  const markAsReadMutation = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.getStats.invalidate();
    },
  });

  const markMultipleAsReadMutation = trpc.notification.markMultipleAsRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.getStats.invalidate();
      setSelectedIds([]);
    },
  });

  const markAllAsReadMutation = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.getStats.invalidate();
    },
  });

  const deleteMutation = trpc.notification.delete.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.getStats.invalidate();
    },
  });

  const deleteAllReadMutation = trpc.notification.deleteAllRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.getStats.invalidate();
    },
  });

  const notifications = data?.notifications ?? [];
  const pagination = data?.pagination;

  const dateLocale = locale === "fr" ? fr : enUS;

  const handleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map((n: { id: string }) => n.id));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleMarkSelectedAsRead = () => {
    if (selectedIds.length > 0) {
      markMultipleAsReadMutation.mutate({ ids: selectedIds });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("pageTitle")}</h1>
          <p className="text-muted-foreground">{t("pageDescription")}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/${locale}/settings?tab=notifications`}>
            <Settings className="mr-2 h-4 w-4" />
            {t("preferences")}
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.total")}</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.unread")}</CardTitle>
            <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center">
              {stats?.unread ?? 0}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.unread ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.urgent")}</CardTitle>
            <span className="text-lg">🚨</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats?.byPriority?.URGENT ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.read")}</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats?.read ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("filters.label")}</span>
            </div>

            <Tabs value={unreadOnly ? "unread" : "all"} onValueChange={(v) => setUnreadOnly(v === "unread")}>
              <TabsList>
                <TabsTrigger value="all">{t("filters.all")}</TabsTrigger>
                <TabsTrigger value="unread">{t("filters.unreadOnly")}</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as NotificationType | "all")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("filters.type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
                {Object.values(NotificationType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {typeIcons[type]} {typeLabels[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as NotificationPriority | "all")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t("filters.priority")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.allPriorities")}</SelectItem>
                {Object.values(NotificationPriority).map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-2">
              {selectedIds.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkSelectedAsRead}
                  disabled={markMultipleAsReadMutation.isPending}
                >
                  {markMultipleAsReadMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  {t("markSelectedRead")} ({selectedIds.length})
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending || (stats?.unread ?? 0) === 0}
              >
                {markAllAsReadMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="mr-2 h-4 w-4" />
                )}
                {t("markAllRead")}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deleteAllReadMutation.isPending || (stats?.read ?? 0) === 0}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("deleteAllRead")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("deleteConfirm.title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("deleteConfirm.description", { count: stats?.read ?? 0 })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("deleteConfirm.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteAllReadMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("deleteConfirm.confirm")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">{t("noNotifications")}</h3>
              <p className="text-sm text-muted-foreground">{t("noNotificationsDescription")}</p>
            </div>
          ) : (
            <>
              {/* Select All Header */}
              <div className="flex items-center gap-4 border-b px-4 py-3 bg-muted/50">
                <Checkbox
                  checked={selectedIds.length === notifications.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length > 0
                    ? t("selected", { count: selectedIds.length })
                    : t("selectAll")}
                </span>
              </div>

              {/* Notification Items */}
              <div className="divide-y">
                {notifications.map((notification: Notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-4 px-4 py-4 hover:bg-muted/50 transition-colors",
                      !notification.readAt && "bg-muted/30"
                    )}
                  >
                    <Checkbox
                      checked={selectedIds.includes(notification.id)}
                      onCheckedChange={() => handleSelectOne(notification.id)}
                    />
                    <span className="text-xl mt-0.5">
                      {typeIcons[notification.type] || "📌"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4
                              className={cn(
                                "text-sm",
                                !notification.readAt && "font-semibold"
                              )}
                            >
                              {getLocalizedField(notification, "title", locale)}
                            </h4>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] shrink-0",
                                priorityColors[notification.priority]
                              )}
                            >
                              {notification.priority}
                            </Badge>
                          </div>
                          {getLocalizedField(notification, "message", locale) && (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                              {getLocalizedField(notification, "message", locale)}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                            <span>
                              {formatDistanceToNow(new Date(notification.createdAt), {
                                addSuffix: true,
                                locale: dateLocale,
                              })}
                            </span>
                            <span>•</span>
                            <span>
                              {format(new Date(notification.createdAt), "PPp", { locale: dateLocale })}
                            </span>
                            <Badge variant="secondary" className="text-[10px]">
                              {typeLabels[notification.type] || notification.type}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {notification.actionUrl && (
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={notification.actionUrl}>{t("view")}</Link>
                            </Button>
                          )}
                          {!notification.readAt && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => markAsReadMutation.mutate({ id: notification.id })}
                              disabled={markAsReadMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("deleteSingle.title")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("deleteSingle.description")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("deleteConfirm.cancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate({ id: notification.id })}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t("deleteConfirm.confirm")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {t("pagination.showing", {
                      from: (page - 1) * pageSize + 1,
                      to: Math.min(page * pageSize, pagination.total),
                      total: pagination.total,
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      {t("pagination.page", { page, total: pagination.totalPages })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={!pagination.hasMore}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
