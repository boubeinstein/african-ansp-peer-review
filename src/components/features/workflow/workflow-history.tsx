"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, ArrowRight, Clock, User, MessageSquare } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useTranslations, useLocale } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkflowEntityType } from "@/types/prisma-enums";

interface WorkflowHistoryProps {
  entityType: WorkflowEntityType;
  entityId: string;
  maxItems?: number;
}

export function WorkflowHistory({
  entityType,
  entityId,
  maxItems = 10,
}: WorkflowHistoryProps) {
  const t = useTranslations("workflow.history");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  // Only query when we have both required props
  const hasValidInput = !!entityType && !!entityId;

  const { data: history, isLoading } = trpc.workflow.getHistory.useQuery(
    {
      entityType,
      entityId,
    },
    {
      enabled: hasValidInput,
      retry: false,
    }
  );

  // Early return if missing required props
  if (!hasValidInput) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  const items = history?.slice(0, maxItems) || [];

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">{t("empty")}</p>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return `${Math.floor(seconds / 60)}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="relative pl-10">
                <div className="absolute left-2.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.fromStateCode && (
                      <>
                        <Badge variant="outline">{item.fromStateCode}</Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </>
                    )}
                    <Badge>{item.toStateCode}</Badge>
                    {item.transitionCode && (
                      <span className="text-xs text-muted-foreground">
                        ({item.transitionCode})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(item.performedAt), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </span>
                    {item.performedBy && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {item.performedBy.firstName} {item.performedBy.lastName}
                      </span>
                    )}
                    {item.durationInState && (
                      <span className="flex items-center gap-1">
                        ⏱ {formatDuration(item.durationInState)}
                      </span>
                    )}
                  </div>

                  {item.comment && (
                    <div className="flex items-start gap-1 text-sm bg-muted/50 p-2 rounded mt-1">
                      <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{item.comment}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
