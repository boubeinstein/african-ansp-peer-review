"use client";

import { useTranslations, useLocale } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  ClipboardList,
  FileWarning,
  Building2,
  ArrowRight,
  RefreshCw,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS, type Locale } from "date-fns/locale";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ActivityType =
  | "REVIEW_CREATED"
  | "REVIEW_STARTED"
  | "REVIEW_COMPLETED"
  | "FINDING_RAISED"
  | "FINDING_CLOSED"
  | "CAP_SUBMITTED"
  | "CAP_APPROVED"
  | "CAP_OVERDUE"
  | "REVIEWER_ASSIGNED"
  | "ASSESSMENT_SUBMITTED"
  | "ORGANIZATION_JOINED";

interface ActivityItem {
  id: string;
  type: ActivityType;
  timestamp: Date;
  teamId: string | null;
  teamName: string | null;
  teamNumber: number | null;
  organizationId: string | null;
  organizationName: string | null;
  reviewId: string | null;
  findingId: string | null;
  capId: string | null;
  userId: string | null;
  userName: string | null;
  metadata: {
    severity?: string;
    status?: string;
    title?: string;
    count?: number;
  };
}

const activityConfig: Record<
  ActivityType,
  {
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  REVIEW_CREATED: {
    icon: ClipboardList,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  REVIEW_STARTED: {
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  REVIEW_COMPLETED: {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  FINDING_RAISED: {
    icon: AlertTriangle,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  FINDING_CLOSED: {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  CAP_SUBMITTED: {
    icon: FileCheck,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  CAP_APPROVED: {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  CAP_OVERDUE: {
    icon: FileWarning,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  REVIEWER_ASSIGNED: {
    icon: Users,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
  },
  ASSESSMENT_SUBMITTED: {
    icon: FileCheck,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
  },
  ORGANIZATION_JOINED: {
    icon: Building2,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
  },
};

interface TeamActivityTimelineProps {
  teamId?: string;
  maxHeight?: string;
}

export function TeamActivityTimeline({
  teamId,
  maxHeight = "400px",
}: TeamActivityTimelineProps) {
  const t = useTranslations("dashboard.activity");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const {
    data: activities,
    isLoading,
    refetch,
    isFetching,
  } = trpc.activity.getRecent.useQuery({
    limit: 50,
    teamId: teamId || (filterTeam !== "all" ? filterTeam : undefined),
    days: 30,
  });

  const { data: teams } = trpc.teamStatistics.getAll.useQuery(undefined, {
    enabled: !teamId, // Only fetch teams if not filtered by specific team
  });

  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="font-medium text-lg mb-1">{t("noActivity")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("noActivityDescription")}
        </p>
      </div>
    );
  }

  // Filter activities
  let filteredActivities = activities;
  if (filterType !== "all") {
    filteredActivities = activities.filter((a: ActivityItem) => a.type === filterType);
  }

  // Group activities by date
  const groupedActivities = groupByDate(filteredActivities, dateLocale);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {!teamId && teams && (
            <Select value={filterTeam} onValueChange={setFilterTeam}>
              <SelectTrigger className="w-[180px] h-8 text-sm">
                <SelectValue placeholder={t("allTeams")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allTeams")}</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.teamId} value={team.teamId}>
                    Team {team.teamNumber}: {team.teamName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px] h-8 text-sm">
              <SelectValue placeholder={t("allTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allTypes")}</SelectItem>
              <SelectItem value="REVIEW_CREATED">
                {t("types.reviewCreated")}
              </SelectItem>
              <SelectItem value="REVIEW_COMPLETED">
                {t("types.reviewCompleted")}
              </SelectItem>
              <SelectItem value="FINDING_RAISED">
                {t("types.findingRaised")}
              </SelectItem>
              <SelectItem value="FINDING_CLOSED">
                {t("types.findingClosed")}
              </SelectItem>
              <SelectItem value="CAP_SUBMITTED">
                {t("types.capSubmitted")}
              </SelectItem>
              <SelectItem value="CAP_APPROVED">
                {t("types.capApproved")}
              </SelectItem>
              <SelectItem value="CAP_OVERDUE">{t("types.capOverdue")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw
            className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`}
          />
          {t("refresh")}
        </Button>
      </div>

      {/* Timeline */}
      <ScrollArea style={{ maxHeight }} className="pr-4">
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 mb-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {dateLabel}
                </h4>
              </div>
              <div className="space-y-1 relative">
                {/* Vertical line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

                {items.map((activity, index) => (
                  <ActivityTimelineItem
                    key={activity.id}
                    activity={activity}
                    isLast={index === items.length - 1}
                    locale={locale}
                    dateLocale={dateLocale}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Summary Footer */}
      <div className="pt-4 border-t text-center">
        <p className="text-sm text-muted-foreground">
          {t("showingActivities", { count: filteredActivities.length })}
        </p>
      </div>
    </div>
  );
}

function ActivityTimelineItem({
  activity,
  isLast,
  locale,
  dateLocale,
}: {
  activity: ActivityItem;
  isLast: boolean;
  locale: string;
  dateLocale: Locale;
}) {
  const t = useTranslations("dashboard.activity");
  const config = activityConfig[activity.type];
  const Icon = config.icon;

  const getActivityMessage = () => {
    switch (activity.type) {
      case "REVIEW_CREATED":
        return t("messages.reviewCreated", {
          org: activity.organizationName || "Organization",
        });
      case "REVIEW_STARTED":
        return t("messages.reviewStarted", {
          org: activity.organizationName || "Organization",
        });
      case "REVIEW_COMPLETED":
        return t("messages.reviewCompleted", {
          org: activity.organizationName || "Organization",
        });
      case "FINDING_RAISED":
        return t("messages.findingRaised", {
          severity: activity.metadata.severity || "finding",
          org: activity.organizationName || "Organization",
        });
      case "FINDING_CLOSED":
        return t("messages.findingClosed", {
          org: activity.organizationName || "Organization",
        });
      case "CAP_SUBMITTED":
        return t("messages.capSubmitted", {
          org: activity.organizationName || "Organization",
        });
      case "CAP_APPROVED":
        return t("messages.capApproved", {
          org: activity.organizationName || "Organization",
        });
      case "CAP_OVERDUE":
        return t("messages.capOverdue", {
          org: activity.organizationName || "Organization",
        });
      default:
        return activity.type;
    }
  };

  const getActivityLink = () => {
    if (activity.reviewId) return `/${locale}/reviews/${activity.reviewId}`;
    if (activity.findingId) return `/${locale}/findings/${activity.findingId}`;
    if (activity.capId) return `/${locale}/caps/${activity.capId}`;
    return null;
  };

  const link = getActivityLink();

  return (
    <div className="flex gap-3 pb-4 relative group">
      {/* Icon */}
      <div
        className={`
        relative z-10 flex-shrink-0 w-10 h-10 rounded-full
        flex items-center justify-center
        ${config.bgColor} ${config.borderColor} border-2
        transition-transform group-hover:scale-110
      `}
      >
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">
              {getActivityMessage()}
            </p>
            {activity.metadata.title && (
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {activity.metadata.title}
              </p>
            )}
          </div>
          {link && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              asChild
            >
              <Link href={link}>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {activity.teamNumber && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              Team {activity.teamNumber}
            </Badge>
          )}
          {activity.metadata.severity && (
            <SeverityBadge severity={activity.metadata.severity} />
          )}
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(activity.timestamp), {
              addSuffix: true,
              locale: dateLocale,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const variants: Record<string, string> = {
    CRITICAL: "bg-red-100 text-red-800 border-red-200",
    MAJOR: "bg-orange-100 text-orange-800 border-orange-200",
    MINOR: "bg-yellow-100 text-yellow-800 border-yellow-200",
    OBSERVATION: "bg-blue-100 text-blue-800 border-blue-200",
  };

  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded border ${variants[severity] || variants.OBSERVATION}`}
    >
      {severity}
    </span>
  );
}

function groupByDate(
  activities: ActivityItem[],
  locale: Locale
): Record<string, ActivityItem[]> {
  const groups: Record<string, ActivityItem[]> = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  for (const activity of activities) {
    const date = new Date(activity.timestamp);
    let label: string;

    if (isSameDay(date, today)) {
      label = locale.code === "fr" ? "Aujourd'hui" : "Today";
    } else if (isSameDay(date, yesterday)) {
      label = locale.code === "fr" ? "Hier" : "Yesterday";
    } else if (date > lastWeek) {
      label = locale.code === "fr" ? "Cette semaine" : "This Week";
    } else {
      label = locale.code === "fr" ? "Plus ancien" : "Earlier";
    }

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(activity);
  }

  return groups;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-8 w-[180px]" />
        <Skeleton className="h-8 w-[160px]" />
      </div>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TeamActivityTimeline;
