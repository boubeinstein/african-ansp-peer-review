"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  AlertTriangle,
  CheckSquare,
  Activity,
  Eye,
  Radio,
  FileText,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePusherConnectionState } from "@/lib/pusher/client";

interface TeamActivityFeedProps {
  reviewId: string;
  locale: string;
  maxItems?: number;
  className?: string;
}

// =============================================================================
// ACTIVITY TYPE CONFIG
// =============================================================================

const activityTypeConfig: Record<
  string,
  {
    icon: typeof FileText;
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
  }
> = {
  finding: {
    icon: AlertTriangle,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-l-orange-500",
    label: "Finding",
  },
  discussion: {
    icon: MessageSquare,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-l-blue-500",
    label: "Discussion",
  },
  task: {
    icon: CheckSquare,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-l-purple-500",
    label: "Task",
  },
  session: {
    icon: Radio,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-l-green-500",
    label: "Session",
  },
};

const FILTER_TYPES = ["all", "finding", "discussion", "task", "session"] as const;

// =============================================================================
// HELPERS
// =============================================================================

function getInitials(user: { firstName: string; lastName: string }): string {
  return `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
}

interface ActivityItem {
  id: string;
  type: string;
  entityId: string | null;
  label: string;
  detail: string | null;
  status: string | null;
  user: { id: string; firstName: string; lastName: string };
  timestamp: Date;
}

interface TimeGroup {
  label: string;
  items: ActivityItem[];
}

function groupByTime(activities: ActivityItem[], t: (key: string) => string): TimeGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayItems: ActivityItem[] = [];
  const yesterdayItems: ActivityItem[] = [];
  const olderItems: ActivityItem[] = [];

  for (const a of activities) {
    const d = new Date(a.timestamp);
    if (d >= today) {
      todayItems.push(a);
    } else if (d >= yesterday) {
      yesterdayItems.push(a);
    } else {
      olderItems.push(a);
    }
  }

  const groups: TimeGroup[] = [];
  if (todayItems.length) groups.push({ label: t("timeGroups.today"), items: todayItems });
  if (yesterdayItems.length) groups.push({ label: t("timeGroups.yesterday"), items: yesterdayItems });
  if (olderItems.length) groups.push({ label: t("timeGroups.earlier"), items: olderItems });

  return groups;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function TeamActivityFeed({
  reviewId,
  locale,
  maxItems = 30,
  className,
}: TeamActivityFeedProps) {
  const t = useTranslations("reviews.detail.workspace.activityFeed");
  const [filter, setFilter] = useState<string>("all");
  const [isExpanded, setIsExpanded] = useState(true);
  const pusherState = usePusherConnectionState();

  const { data: activities, isLoading } =
    trpc.collaboration.getRecentActivity.useQuery(
      { reviewId, limit: maxItems },
      { refetchInterval: pusherState === "connected" ? false : 60000 }
    );

  const dateLocale = locale === "fr" ? fr : enUS;

  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    if (filter === "all") return activities;
    return activities.filter((a) => a.type === filter);
  }, [activities, filter]);

  const timeGroups = useMemo(
    () => groupByTime(filteredActivities, t),
    [filteredActivities, t]
  );

  // Count by type for filter badges
  const typeCounts = useMemo(() => {
    if (!activities) return {};
    const counts: Record<string, number> = {};
    for (const a of activities) {
      counts[a.type] = (counts[a.type] || 0) + 1;
    }
    return counts;
  }, [activities]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-2.5">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader
        className="pb-2 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            {t("title")}
            {activities && activities.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activities.length}
              </Badge>
            )}
          </CardTitle>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-0">
          {/* Filter Pills */}
          {activities && activities.length > 0 && (
            <div className="flex items-center gap-1.5 px-4 pb-3 flex-wrap">
              {FILTER_TYPES.map((f) => {
                const config = f !== "all" ? activityTypeConfig[f] : null;
                const count = f === "all" ? activities.length : (typeCounts[f] || 0);
                if (f !== "all" && count === 0) return null;
                const Icon = config?.icon;

                return (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-7 text-xs gap-1",
                      filter !== f && config && config.color
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilter(f);
                    }}
                  >
                    {Icon && <Icon className="h-3 w-3" />}
                    {f === "all" ? t("filters.all") : t(`filters.${f}`)}
                    <Badge
                      variant="secondary"
                      className={cn(
                        "ml-0.5 h-4 px-1 text-[10px]",
                        filter === f && "bg-primary-foreground/20 text-primary-foreground"
                      )}
                    >
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          )}

          {!activities || activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <Eye className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center px-4">
              <p className="text-sm text-muted-foreground">{t("noMatchingActivity")}</p>
            </div>
          ) : (
            <ScrollArea className="h-[360px]">
              <div className="px-4 pb-3">
                {timeGroups.map((group) => (
                  <div key={group.label}>
                    {/* Time group header */}
                    <div className="sticky top-0 z-10 bg-card py-1.5 mb-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.label}
                      </span>
                    </div>

                    {/* Activities in this group */}
                    <div className="space-y-px mb-3">
                      {group.items.map((activity) => {
                        const config =
                          activityTypeConfig[activity.type] ||
                          activityTypeConfig.session;
                        const Icon = config.icon;
                        const hasUser =
                          activity.user.firstName || activity.user.lastName;

                        // Severity-based emphasis for findings
                        const isCritical =
                          activity.type === "finding" &&
                          activity.detail === "CRITICAL";
                        const isMajor =
                          activity.type === "finding" &&
                          activity.detail === "MAJOR";

                        return (
                          <div
                            key={activity.id}
                            className={cn(
                              "flex gap-2.5 rounded-r-lg py-1.5 px-2 pl-3 border-l-2 transition-colors hover:bg-muted/50",
                              config.borderColor,
                              isCritical && "border-l-red-500 bg-red-500/5",
                              isMajor && "border-l-orange-500 bg-orange-500/5"
                            )}
                          >
                            {hasUser ? (
                              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                                <AvatarFallback className="text-xs">
                                  {getInitials(activity.user)}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div
                                className={cn(
                                  "flex h-7 w-7 shrink-0 mt-0.5 items-center justify-center rounded-full",
                                  config.bgColor
                                )}
                              >
                                <Icon
                                  className={cn("h-3.5 w-3.5", config.color)}
                                />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="text-sm leading-tight">
                                {hasUser ? (
                                  <>
                                    <span className="font-medium">
                                      {activity.user.firstName}{" "}
                                      {activity.user.lastName}
                                    </span>{" "}
                                    <span className="text-muted-foreground">
                                      {t(`types.${activity.type}`)}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground capitalize">
                                    {activity.label}
                                  </span>
                                )}
                              </p>
                              <div className="mt-0.5 flex items-center gap-1.5">
                                <Icon
                                  className={cn(
                                    "h-3 w-3 shrink-0",
                                    config.color
                                  )}
                                />
                                <span className="text-xs text-muted-foreground truncate">
                                  {hasUser
                                    ? activity.label
                                    : t(`types.${activity.type}`)}
                                </span>
                                {/* Severity badge for findings */}
                                {activity.type === "finding" &&
                                  activity.detail && (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[10px] px-1 py-0 h-4 shrink-0",
                                        activity.detail === "CRITICAL" &&
                                          "border-red-500 text-red-600 bg-red-500/5",
                                        activity.detail === "MAJOR" &&
                                          "border-orange-500 text-orange-600 bg-orange-500/5",
                                        activity.detail === "MINOR" &&
                                          "border-yellow-500 text-yellow-600"
                                      )}
                                    >
                                      {activity.detail}
                                    </Badge>
                                  )}
                                {/* Status/detail for non-findings */}
                                {activity.type !== "finding" &&
                                  activity.detail && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1 py-0 h-4 shrink-0"
                                    >
                                      {activity.detail}
                                    </Badge>
                                  )}
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground/70">
                                {formatDistanceToNow(
                                  new Date(activity.timestamp),
                                  {
                                    addSuffix: true,
                                    locale: dateLocale,
                                  }
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      )}
    </Card>
  );
}
