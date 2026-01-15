"use client";

import { useState } from "react";
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
  ChevronDown,
  Loader2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EventType } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface TimelineEvent {
  id: string;
  type: EventType;
  description: string;
  metadata: Record<string, unknown> | null;
  userId: string;
  userName: string;
  createdAt: Date;
}

interface ActivityTimelineProps {
  events: TimelineEvent[];
  totalCount: number;
  hasMore: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  maxHeight?: string;
  showEmpty?: boolean;
  className?: string;
}

// =============================================================================
// EVENT TYPE CONFIG
// =============================================================================

const EVENT_CONFIG: Record<
  EventType,
  {
    icon: React.ElementType;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  CREATED: {
    icon: Plus,
    color: "text-green-600",
    bgColor: "bg-green-100",
    label: "Created",
  },
  STARTED: {
    icon: Play,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    label: "Started",
  },
  RESPONSE_SAVED: {
    icon: Save,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    label: "Response Saved",
  },
  EVIDENCE_ADDED: {
    icon: Paperclip,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    label: "Evidence Added",
  },
  EVIDENCE_REMOVED: {
    icon: Trash2,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    label: "Evidence Removed",
  },
  STATUS_CHANGED: {
    icon: RefreshCw,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    label: "Status Changed",
  },
  SUBMITTED: {
    icon: Send,
    color: "text-teal-600",
    bgColor: "bg-teal-100",
    label: "Submitted",
  },
  REVIEWED: {
    icon: CheckCircle,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
    label: "Reviewed",
  },
  COMPLETED: {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100",
    label: "Completed",
  },
  REOPENED: {
    icon: RefreshCcw,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    label: "Reopened",
  },
  COMMENT_ADDED: {
    icon: MessageSquare,
    color: "text-slate-600",
    bgColor: "bg-slate-100",
    label: "Comment Added",
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ActivityTimeline({
  events,
  totalCount,
  hasMore,
  onLoadMore,
  isLoadingMore,
  maxHeight = "400px",
  showEmpty = true,
  className,
}: ActivityTimelineProps) {
  const t = useTranslations("progress");

  if (events.length === 0 && showEmpty) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-8 text-center",
          className
        )}
      >
        <Clock className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">{t("timeline.empty")}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <ScrollArea style={{ maxHeight }} className="pr-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          {/* Events */}
          <div className="space-y-4">
            {events.map((event, index) => {
              const config = EVENT_CONFIG[event.type];
              const Icon = config.icon;
              const isLast = index === events.length - 1;

              return (
                <div key={event.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      "relative z-10 flex h-8 w-8 items-center justify-center rounded-full",
                      config.bgColor
                    )}
                  >
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>

                  {/* Content */}
                  <div className={cn("flex-1 pb-4", !isLast && "border-b")}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">
                          {event.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {event.userName}
                        </p>
                      </div>
                      <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(event.createdAt), {
                          addSuffix: true,
                        })}
                      </time>
                    </div>

                    {/* Metadata */}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                        {Object.entries(event.metadata).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className="text-muted-foreground capitalize">
                              {key}:
                            </span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Load more */}
        {hasMore && onLoadMore && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ChevronDown className="h-4 w-4 mr-2" />
              )}
              {t("timeline.loadMore")} ({totalCount - events.length} more)
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// =============================================================================
// COMPACT TIMELINE (for sidebar/summary views)
// =============================================================================

interface CompactTimelineProps {
  events: TimelineEvent[];
  limit?: number;
  className?: string;
}

export function CompactTimeline({
  events,
  limit = 5,
  className,
}: CompactTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const displayEvents = expanded ? events : events.slice(0, limit);
  const hasMore = events.length > limit;

  if (events.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        {displayEvents.map((event) => {
          const config = EVENT_CONFIG[event.type];
          const Icon = config.icon;

          return (
            <div
              key={event.id}
              className="flex items-center gap-2 text-sm"
            >
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full",
                  config.bgColor
                )}
              >
                <Icon className={cn("h-3 w-3", config.color)} />
              </div>
              <span className="flex-1 truncate text-muted-foreground">
                {event.description}
              </span>
              <time className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(event.createdAt), {
                  addSuffix: true,
                })}
              </time>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 w-full"
        >
          {expanded ? "Show less" : `Show ${events.length - limit} more`}
        </Button>
      )}
    </div>
  );
}

export default ActivityTimeline;
