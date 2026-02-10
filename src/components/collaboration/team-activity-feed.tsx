"use client";

import { trpc } from "@/lib/trpc/client";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  AlertTriangle,
  CheckSquare,
  Activity,
  LogIn,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamActivityFeedProps {
  reviewId: string;
  locale: string;
  maxItems?: number;
  className?: string;
}

const activityTypeConfig = {
  finding: {
    icon: AlertTriangle,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    borderColor: "border-l-orange-500",
  },
  discussion: {
    icon: MessageSquare,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-l-blue-500",
  },
  task: {
    icon: CheckSquare,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950",
    borderColor: "border-l-green-500",
  },
  session: {
    icon: LogIn,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    borderColor: "border-l-purple-500",
  },
} as const;

function getInitials(user: { firstName: string; lastName: string }): string {
  return `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
}

export function TeamActivityFeed({
  reviewId,
  locale,
  maxItems = 20,
  className,
}: TeamActivityFeedProps) {
  const t = useTranslations("reviews.detail.workspace.activityFeed");

  const { data: activities, isLoading } =
    trpc.collaboration.getRecentActivity.useQuery(
      { reviewId, limit: maxItems },
      { refetchInterval: 15000 }
    );

  const dateLocale = locale === "fr" ? fr : enUS;

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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            {t("title")}
          </CardTitle>
          {activities && activities.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activities.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!activities || activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <Eye className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        ) : (
          <ScrollArea className="h-[320px]">
            <div className="space-y-px px-4 pb-3">
              {activities.map((activity) => {
                const config =
                  activityTypeConfig[activity.type] || activityTypeConfig.session;
                const Icon = config.icon;
                const hasUser = activity.user.firstName || activity.user.lastName;

                return (
                  <div
                    key={activity.id}
                    className={cn(
                      "flex gap-2.5 rounded-r-lg py-1.5 px-2 pl-3 border-l-2 transition-colors hover:bg-muted/50",
                      config.borderColor
                    )}
                  >
                    {hasUser ? (
                      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                        <AvatarFallback className="text-xs">
                          {getInitials(activity.user)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className={cn("flex h-7 w-7 shrink-0 mt-0.5 items-center justify-center rounded-full", config.bgColor)}>
                        <Icon className={cn("h-3.5 w-3.5", config.color)} />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-tight">
                        {hasUser ? (
                          <>
                            <span className="font-medium">
                              {activity.user.firstName} {activity.user.lastName}
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
                          className={cn("h-3 w-3 shrink-0", config.color)}
                        />
                        <span className="text-xs text-muted-foreground truncate">
                          {hasUser ? activity.label : t(`types.${activity.type}`)}
                        </span>
                        {activity.detail && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0">
                            {activity.detail}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground/70">
                        {formatDistanceToNow(new Date(activity.timestamp), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
