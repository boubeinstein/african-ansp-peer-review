"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

interface ApproachingDeadline {
  slaId: string;
  entityType: string;
  entityId: string;
  stateCode: string;
  dueAt: Date | string;
  daysRemaining: number;
}

interface ApproachingDeadlinesProps {
  deadlines: ApproachingDeadline[];
}

export function ApproachingDeadlines({ deadlines }: ApproachingDeadlinesProps) {
  const t = useTranslations("workflow.sla");
  const locale = useLocale();
  const router = useRouter();
  const dateLocale = locale === "fr" ? fr : enUS;

  const getEntityUrl = (entityType: string, entityId: string) => {
    switch (entityType) {
      case "CAP":
        return `/${locale}/caps/${entityId}`;
      case "FINDING":
        return `/${locale}/findings/${entityId}`;
      case "REVIEW":
        return `/${locale}/reviews/${entityId}`;
      default:
        return "#";
    }
  };

  const getUrgencyVariant = (
    days: number
  ): "destructive" | "secondary" | "outline" => {
    if (days <= 1) return "destructive";
    if (days <= 3) return "secondary";
    return "outline";
  };

  const getEntityTypeLabel = (entityType: string) => {
    switch (entityType) {
      case "CAP":
        return locale === "fr" ? "PAC" : "CAP";
      case "FINDING":
        return locale === "fr" ? "Constatation" : "Finding";
      case "REVIEW":
        return locale === "fr" ? "Évaluation" : "Review";
      default:
        return entityType;
    }
  };

  if (deadlines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t("approachingDeadlines")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            {t("noApproaching")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          {t("approachingDeadlines")}
          <Badge variant="secondary">{deadlines.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deadlines.map((deadline) => (
            <div
              key={deadline.slaId}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {getEntityTypeLabel(deadline.entityType)}
                  </Badge>
                  <span className="text-sm font-medium">
                    {deadline.stateCode}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(deadline.dueAt), {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getUrgencyVariant(deadline.daysRemaining)}>
                  {deadline.daysRemaining} {t("daysLeft")}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    router.push(
                      getEntityUrl(deadline.entityType, deadline.entityId)
                    )
                  }
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
