"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Clock } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

interface ScheduleCardProps {
  scheduledStartDate: Date | null;
  scheduledEndDate: Date | null;
  onSiteStartDate: Date | null;
  onSiteEndDate: Date | null;
  location: string | null;
}

export function ScheduleCard({
  scheduledStartDate,
  scheduledEndDate,
  onSiteStartDate,
  onSiteEndDate,
  location
}: ScheduleCardProps) {
  const t = useTranslations("reviews.detail.overview.schedule");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  const formatDateRange = (start: Date | null, end: Date | null) => {
    if (!start || !end) return t("notScheduled");
    return `${format(start, "MMM d", { locale: dateLocale })} - ${format(end, "MMM d, yyyy", { locale: dateLocale })}`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-xs text-muted-foreground">{t("scheduled")}</p>
            <p className="text-sm font-medium">
              {formatDateRange(scheduledStartDate, scheduledEndDate)}
            </p>
          </div>
        </div>

        {(onSiteStartDate || onSiteEndDate) && (
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">{t("onSite")}</p>
              <p className="text-sm font-medium">
                {formatDateRange(onSiteStartDate, onSiteEndDate)}
              </p>
            </div>
          </div>
        )}

        {location && (
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">{t("location")}</p>
              <p className="text-sm font-medium">{location}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
