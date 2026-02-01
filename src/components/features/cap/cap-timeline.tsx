"use client";

/**
 * CAP Timeline Component
 *
 * Vertical timeline showing CAP status change history.
 * Supports both basic mode (using CAP date fields) and detailed mode (using audit log events).
 *
 * Features:
 * - Reverse chronological order (most recent at top)
 * - Status-specific icons with color coding
 * - User information when available
 * - Notes/reasons for rejections and verifications
 * - Compact and detailed view toggle
 */

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { format, formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useLocale } from "next-intl";
import {
  FileEdit,
  Send,
  CheckCircle,
  XCircle,
  Wrench,
  ClipboardCheck,
  ShieldCheck,
  Lock,
  User,
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CAPStatus } from "@/types/prisma-enums";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// =============================================================================
// TYPES
// =============================================================================

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface StatusChangeEvent {
  id: string;
  status: CAPStatus;
  previousStatus?: CAPStatus;
  timestamp: Date | string;
  user?: UserInfo | null;
  notes?: string | null;
  reason?: string | null;
  verificationMethod?: string | null;
}

interface CAPData {
  id: string;
  status: CAPStatus;
  createdAt: Date | string;
  submittedAt?: Date | string | null;
  acceptedAt?: Date | string | null;
  completedAt?: Date | string | null;
  verifiedAt?: Date | string | null;
  verificationMethod?: string | null;
  verificationNotes?: string | null;
  verifiedBy?: UserInfo | null;
  assignedTo?: UserInfo | null;
}

interface CAPTimelineProps {
  cap: CAPData;
  events?: StatusChangeEvent[];
  className?: string;
  defaultExpanded?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_ICONS: Record<CAPStatus, LucideIcon> = {
  DRAFT: FileEdit,
  SUBMITTED: Send,
  UNDER_REVIEW: Send,
  ACCEPTED: CheckCircle,
  REJECTED: XCircle,
  IN_PROGRESS: Wrench,
  COMPLETED: ClipboardCheck,
  VERIFIED: ShieldCheck,
  CLOSED: Lock,
};

const STATUS_COLORS: Record<CAPStatus, { bg: string; text: string; border: string }> = {
  DRAFT: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-300 dark:border-slate-600",
  },
  SUBMITTED: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-300 dark:border-blue-700",
  },
  UNDER_REVIEW: {
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-300 dark:border-indigo-700",
  },
  ACCEPTED: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-600 dark:text-green-400",
    border: "border-green-300 dark:border-green-700",
  },
  REJECTED: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-300 dark:border-red-700",
  },
  IN_PROGRESS: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-300 dark:border-amber-700",
  },
  COMPLETED: {
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-300 dark:border-cyan-700",
  },
  VERIFIED: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-300 dark:border-emerald-700",
  },
  CLOSED: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-300 dark:border-purple-700",
  },
};

// Timeline entry actions for translation keys
const STATUS_ACTION_KEYS: Record<CAPStatus, string> = {
  DRAFT: "created",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "underReview",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  IN_PROGRESS: "inProgress",
  COMPLETED: "completed",
  VERIFIED: "verified",
  CLOSED: "closed",
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function buildTimelineFromCAP(cap: CAPData): StatusChangeEvent[] {
  const events: StatusChangeEvent[] = [];

  // Always add created event
  events.push({
    id: `${cap.id}-created`,
    status: "DRAFT",
    timestamp: cap.createdAt,
    user: cap.assignedTo || null,
  });

  // Add submitted event if exists
  if (cap.submittedAt) {
    events.push({
      id: `${cap.id}-submitted`,
      status: "SUBMITTED",
      previousStatus: "DRAFT",
      timestamp: cap.submittedAt,
    });
  }

  // Add accepted event if exists
  if (cap.acceptedAt) {
    events.push({
      id: `${cap.id}-accepted`,
      status: "ACCEPTED",
      previousStatus: "UNDER_REVIEW",
      timestamp: cap.acceptedAt,
    });
  }

  // If currently in progress and accepted, infer in_progress event
  if (
    cap.acceptedAt &&
    (cap.status === "IN_PROGRESS" ||
      cap.status === "COMPLETED" ||
      cap.status === "VERIFIED" ||
      cap.status === "CLOSED")
  ) {
    // Estimate in_progress as shortly after accepted
    const acceptedDate = new Date(cap.acceptedAt);
    events.push({
      id: `${cap.id}-inprogress`,
      status: "IN_PROGRESS",
      previousStatus: "ACCEPTED",
      timestamp: acceptedDate,
    });
  }

  // Add completed event if exists
  if (cap.completedAt) {
    events.push({
      id: `${cap.id}-completed`,
      status: "COMPLETED",
      previousStatus: "IN_PROGRESS",
      timestamp: cap.completedAt,
    });
  }

  // Add verified event if exists
  if (cap.verifiedAt) {
    events.push({
      id: `${cap.id}-verified`,
      status: "VERIFIED",
      previousStatus: "COMPLETED",
      timestamp: cap.verifiedAt,
      user: cap.verifiedBy || null,
      verificationMethod: cap.verificationMethod,
      notes: cap.verificationNotes,
    });
  }

  // Add closed event if status is CLOSED
  if (cap.status === "CLOSED" && cap.verifiedAt) {
    // Estimate closed as shortly after verified
    const verifiedDate = new Date(cap.verifiedAt);
    events.push({
      id: `${cap.id}-closed`,
      status: "CLOSED",
      previousStatus: "VERIFIED",
      timestamp: verifiedDate,
    });
  }

  // Handle rejected status
  if (cap.status === "REJECTED") {
    events.push({
      id: `${cap.id}-rejected`,
      status: "REJECTED",
      previousStatus: "UNDER_REVIEW",
      timestamp: cap.submittedAt || cap.createdAt, // Use submitted date as approximation
    });
  }

  return events;
}

// =============================================================================
// TIMELINE ENTRY COMPONENT
// =============================================================================

interface TimelineEntryProps {
  event: StatusChangeEvent;
  isFirst: boolean;
  isLast: boolean;
  isCompact: boolean;
}

function TimelineEntry({ event, isFirst, isLast, isCompact }: TimelineEntryProps) {
  const t = useTranslations("cap.timeline");
  const tStatus = useTranslations("cap.status");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  const Icon = STATUS_ICONS[event.status];
  const colors = STATUS_COLORS[event.status];
  const actionKey = STATUS_ACTION_KEYS[event.status];

  const timestamp = new Date(event.timestamp);
  const formattedDate = format(timestamp, "PPP", { locale: dateLocale });
  const formattedTime = format(timestamp, "p", { locale: dateLocale });
  const relativeTime = formatDistanceToNow(timestamp, {
    addSuffix: true,
    locale: dateLocale,
  });

  const userName = event.user
    ? `${event.user.firstName} ${event.user.lastName}`
    : null;

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        {/* Icon circle */}
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full border-2 z-10",
            colors.bg,
            colors.border
          )}
        >
          <Icon className={cn("w-5 h-5", colors.text)} />
        </div>
        {/* Connecting line */}
        {!isLast && (
          <div className="w-0.5 flex-1 bg-muted-foreground/20 min-h-[24px]" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn(colors.bg, colors.text, "border-0")}>
            {tStatus(event.status)}
          </Badge>
          {isFirst && (
            <Badge variant="secondary" className="text-xs">
              {t("latest")}
            </Badge>
          )}
        </div>

        {/* Action description */}
        <p className="text-sm font-medium mt-1">
          {t(`actions.${actionKey}`)}
        </p>

        {/* Compact view: just date */}
        {isCompact ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {relativeTime}
                </p>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {formattedDate} {t("at")} {formattedTime}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <>
            {/* Detailed view: full info */}
            <div className="mt-2 space-y-1">
              {/* Date and time */}
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDate} {t("at")} {formattedTime}
                <span className="text-muted-foreground/60">({relativeTime})</span>
              </p>

              {/* User */}
              {userName && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {t("by")} <span className="font-medium">{userName}</span>
                </p>
              )}

              {/* Verification method */}
              {event.verificationMethod && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t("method")}: {event.verificationMethod}
                </p>
              )}

              {/* Notes/Reason */}
              {(event.notes || event.reason) && (
                <div className="mt-2 p-2 bg-muted/50 rounded-md border">
                  <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span className="whitespace-pre-wrap">
                      {event.reason || event.notes}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CAPTimeline({
  cap,
  events: providedEvents,
  className,
  defaultExpanded = true,
}: CAPTimelineProps) {
  const t = useTranslations("cap.timeline");
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isCompact, setIsCompact] = useState(false);

  // Build timeline events from CAP data if not provided
  const timelineEvents = useMemo(() => {
    const events = providedEvents?.length
      ? providedEvents
      : buildTimelineFromCAP(cap);

    // Sort by timestamp descending (most recent first)
    return [...events].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [cap, providedEvents]);

  // Count of events for the collapsed summary
  const eventCount = timelineEvents.length;

  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between mb-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 -ml-2 h-auto py-1">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              <h3 className="text-sm font-semibold">{t("title")}</h3>
              <Badge variant="secondary" className="ml-1">
                {eventCount} {eventCount === 1 ? t("event") : t("events")}
              </Badge>
            </Button>
          </CollapsibleTrigger>

          {isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCompact(!isCompact)}
              className="text-xs"
            >
              {isCompact ? t("showDetails") : t("hideDetails")}
            </Button>
          )}
        </div>

        <CollapsibleContent>
          {/* Timeline */}
          <div className="relative">
            {timelineEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noEvents")}</p>
            ) : (
              <div className="space-y-0">
                {timelineEvents.map((event, index) => (
                  <TimelineEntry
                    key={event.id}
                    event={event}
                    isFirst={index === 0}
                    isLast={index === timelineEvents.length - 1}
                    isCompact={isCompact}
                  />
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Collapsed summary */}
      {!isExpanded && timelineEvents.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex -space-x-2">
            {timelineEvents.slice(0, 4).map((event) => {
              const Icon = STATUS_ICONS[event.status];
              const colors = STATUS_COLORS[event.status];
              return (
                <div
                  key={event.id}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 border-background flex items-center justify-center",
                    colors.bg
                  )}
                >
                  <Icon className={cn("w-3 h-3", colors.text)} />
                </div>
              );
            })}
          </div>
          <span>
            {t("summaryText", {
              count: eventCount,
              status: t(`actions.${STATUS_ACTION_KEYS[timelineEvents[0].status]}`),
            })}
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPACT INLINE TIMELINE (for use in cards)
// =============================================================================

interface CAPTimelineCompactProps {
  cap: CAPData;
  className?: string;
}

export function CAPTimelineCompact({ cap, className }: CAPTimelineCompactProps) {
  const t = useTranslations("cap.timeline");
  const tStatus = useTranslations("cap.status");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  const timelineEvents = useMemo(() => {
    const events = buildTimelineFromCAP(cap);
    return [...events].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [cap]);

  if (timelineEvents.length === 0) {
    return null;
  }

  const latestEvent = timelineEvents[0];
  const latestTimestamp = new Date(latestEvent.timestamp);
  const relativeTime = formatDistanceToNow(latestTimestamp, {
    addSuffix: true,
    locale: dateLocale,
  });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 text-xs text-muted-foreground",
              className
            )}
          >
            <div className="flex -space-x-1.5">
              {timelineEvents.slice(0, 5).map((event) => {
                const Icon = STATUS_ICONS[event.status];
                const colors = STATUS_COLORS[event.status];
                return (
                  <div
                    key={event.id}
                    className={cn(
                      "w-5 h-5 rounded-full border border-background flex items-center justify-center",
                      colors.bg
                    )}
                  >
                    <Icon className={cn("w-2.5 h-2.5", colors.text)} />
                  </div>
                );
              })}
            </div>
            <span>{relativeTime}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{t("title")}</p>
            {timelineEvents.slice(0, 3).map((event) => (
              <p key={event.id} className="text-xs">
                {tStatus(event.status)} -{" "}
                {format(new Date(event.timestamp), "PP", { locale: dateLocale })}
              </p>
            ))}
            {timelineEvents.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{timelineEvents.length - 3} {t("moreEvents")}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
