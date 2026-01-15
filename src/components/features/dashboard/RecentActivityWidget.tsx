"use client";

import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Play,
  Save,
  Paperclip,
  Trash2,
  RefreshCw,
  Send,
  CheckCircle,
  CheckCircle2,
  RefreshCcw,
  MessageSquare,
  Activity,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EventType } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface ActivityItem {
  id: string;
  type: EventType;
  description: string;
  userName: string;
  createdAt: Date;
}

interface RecentActivityWidgetProps {
  activities: ActivityItem[];
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  className?: string;
}

// =============================================================================
// EVENT CONFIG
// =============================================================================

const EVENT_ICONS: Record<EventType, React.ElementType> = {
  CREATED: Plus,
  STARTED: Play,
  RESPONSE_SAVED: Save,
  EVIDENCE_ADDED: Paperclip,
  EVIDENCE_REMOVED: Trash2,
  STATUS_CHANGED: RefreshCw,
  SUBMITTED: Send,
  REVIEWED: CheckCircle,
  COMPLETED: CheckCircle2,
  REOPENED: RefreshCcw,
  COMMENT_ADDED: MessageSquare,
};

const EVENT_COLORS: Record<EventType, string> = {
  CREATED: "text-green-600 bg-green-100",
  STARTED: "text-blue-600 bg-blue-100",
  RESPONSE_SAVED: "text-indigo-600 bg-indigo-100",
  EVIDENCE_ADDED: "text-purple-600 bg-purple-100",
  EVIDENCE_REMOVED: "text-orange-600 bg-orange-100",
  STATUS_CHANGED: "text-yellow-600 bg-yellow-100",
  SUBMITTED: "text-teal-600 bg-teal-100",
  REVIEWED: "text-cyan-600 bg-cyan-100",
  COMPLETED: "text-green-600 bg-green-100",
  REOPENED: "text-amber-600 bg-amber-100",
  COMMENT_ADDED: "text-slate-600 bg-slate-100",
};

// =============================================================================
// COMPONENT
// =============================================================================

export function RecentActivityWidget({
  activities,
  maxItems = 8,
  showViewAll = true,
  onViewAll,
  className,
}: RecentActivityWidgetProps) {
  const t = useTranslations("dashboard");
  const displayActivities = activities.slice(0, maxItems);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t("activity.title")}
          </CardTitle>
          {showViewAll && activities.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              {t("activity.viewAll")}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {t("activity.empty")}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {displayActivities.map((activity) => {
                const Icon = EVENT_ICONS[activity.type];
                const colorClass = EVENT_COLORS[activity.type];

                return (
                  <div key={activity.id} className="flex gap-3">
                    <div
                      className={cn(
                        "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
                        colorClass.split(" ")[1]
                      )}
                    >
                      <Icon
                        className={cn("h-4 w-4", colorClass.split(" ")[0])}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {activity.userName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
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

// =============================================================================
// INLINE ACTIVITY LIST
// =============================================================================

interface InlineActivityListProps {
  activities: ActivityItem[];
  maxItems?: number;
  className?: string;
}

export function InlineActivityList({
  activities,
  maxItems = 5,
  className,
}: InlineActivityListProps) {
  const displayActivities = activities.slice(0, maxItems);

  if (displayActivities.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {displayActivities.map((activity) => {
        const Icon = EVENT_ICONS[activity.type];
        const colorClass = EVENT_COLORS[activity.type];

        return (
          <div key={activity.id} className="flex items-center gap-2 text-sm">
            <Icon className={cn("h-3.5 w-3.5", colorClass.split(" ")[0])} />
            <span className="flex-1 truncate">{activity.description}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(activity.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default RecentActivityWidget;
