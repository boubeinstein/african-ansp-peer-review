"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  FileText,
  AlertTriangle,
  CheckSquare,
  ArrowRight
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";

interface ActivityItem {
  id: string;
  type: "DISCUSSION" | "DOCUMENT" | "FINDING" | "TASK" | "STATUS_CHANGE";
  titleEn: string;
  titleFr: string;
  user: {
    name: string;
    image: string | null;
  };
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  reviewId: string;
}

const iconMap = {
  DISCUSSION: MessageSquare,
  DOCUMENT: FileText,
  FINDING: AlertTriangle,
  TASK: CheckSquare,
  STATUS_CHANGE: CheckSquare,
};

export function RecentActivity({ activities, reviewId: _reviewId }: RecentActivityProps) {
  const t = useTranslations("reviews.detail.overview.activity");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("empty")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.slice(0, 5).map((activity) => {
          const Icon = iconMap[activity.type];
          return (
            <div key={activity.id} className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={activity.user.image || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(activity.user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">
                    {locale === "fr" ? activity.titleFr : activity.titleEn}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {activity.user.name} • {formatDistanceToNow(activity.createdAt, { addSuffix: true, locale: dateLocale })}
                </p>
              </div>
            </div>
          );
        })}

        {activities.length > 5 && (
          <Button variant="ghost" size="sm" className="w-full">
            {t("viewAll")}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
