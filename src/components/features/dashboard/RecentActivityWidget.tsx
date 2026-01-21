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
  FileText,
  ClipboardList,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { EventType } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface ActivityItem {
  id: string;
  type: EventType | string;
  description: string;
  userName?: string;
  title?: string;
  createdAt?: Date;
  timestamp?: string;
}

interface RecentActivityWidgetProps {
  activities: ActivityItem[];
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  className?: string;
  isLoading?: boolean;
}

// =============================================================================
// EVENT CONFIG
// =============================================================================

const EVENT_ICONS: Record<string, React.ElementType> = {
  // Original EventType values
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
  // Dashboard activity types
  assessment_submitted: FileText,
  assessment_updated: FileText,
  review_scheduled: ClipboardList,
  review_status_changed: RefreshCw,
  review_assigned: ClipboardList,
  finding_created: AlertTriangle,
  cap_status_changed: Clock,
};

const EVENT_COLORS: Record<string, string> = {
  // Original EventType values
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
  // Dashboard activity types
  assessment_submitted: "text-blue-600 bg-blue-100",
  assessment_updated: "text-indigo-600 bg-indigo-100",
  review_scheduled: "text-purple-600 bg-purple-100",
  review_status_changed: "text-yellow-600 bg-yellow-100",
  review_assigned: "text-teal-600 bg-teal-100",
  finding_created: "text-amber-600 bg-amber-100",
  cap_status_changed: "text-orange-600 bg-orange-100",
};

// Default fallbacks
const DEFAULT_ICON = Activity;
const DEFAULT_COLOR = "text-slate-600 bg-slate-100";

// =============================================================================
// LOADING SKELETON
// =============================================================================

function ActivitySkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-36" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function RecentActivityWidget({
  activities,
  maxItems = 8,
  showViewAll = true,
  onViewAll,
  className,
  isLoading = false,
}: RecentActivityWidgetProps) {
  const t = useTranslations("dashboard");
  const displayActivities = activities.slice(0, maxItems);

  if (isLoading) {
    return <ActivitySkeleton />;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t("activity.title")}
          </CardTitle>
          {showViewAll && activities.length > 0 && onViewAll && (
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
                const Icon = EVENT_ICONS[activity.type] || DEFAULT_ICON;
                const colorClass = EVENT_COLORS[activity.type] || DEFAULT_COLOR;

                // Get timestamp from either createdAt or timestamp field
                const activityTime = activity.createdAt
                  ? new Date(activity.createdAt)
                  : activity.timestamp
                    ? new Date(activity.timestamp)
                    : null;

                // Display title or description
                const displayTitle = activity.title || activity.description;
                const displaySubtitle = activity.title ? activity.description : null;

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
                      <p className="text-sm font-medium">{displayTitle}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {displaySubtitle && (
                          <span className="text-xs text-muted-foreground truncate">
                            {displaySubtitle}
                          </span>
                        )}
                        {activity.userName && (
                          <span className="text-xs text-muted-foreground">
                            {activity.userName}
                          </span>
                        )}
                        {activityTime && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(activityTime, {
                              addSuffix: true,
                            })}
                          </span>
                        )}
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
        const Icon = EVENT_ICONS[activity.type] || DEFAULT_ICON;
        const colorClass = EVENT_COLORS[activity.type] || DEFAULT_COLOR;
        const activityTime = activity.createdAt
          ? new Date(activity.createdAt)
          : activity.timestamp
            ? new Date(activity.timestamp)
            : null;

        return (
          <div key={activity.id} className="flex items-center gap-2 text-sm">
            <Icon className={cn("h-3.5 w-3.5", colorClass.split(" ")[0])} />
            <span className="flex-1 truncate">
              {activity.title || activity.description}
            </span>
            {activityTime && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(activityTime, {
                  addSuffix: true,
                })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default RecentActivityWidget;
