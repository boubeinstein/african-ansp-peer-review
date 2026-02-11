"use client";

/**
 * Active Sessions Widget - Dashboard
 *
 * Shows live collaboration sessions the current user can access,
 * with 1-click navigation to the review workspace tab.
 */

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radio, Users, ArrowRight, Clock, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import { usePusherConnectionState } from "@/lib/pusher/client";

interface ActiveSessionsWidgetProps {
  locale: string;
}

export function ActiveSessionsWidget({ locale }: ActiveSessionsWidgetProps) {
  const t = useTranslations("dashboard.activeSessions");
  const router = useRouter();
  const pusherState = usePusherConnectionState();

  const { data: activeSessions, isLoading } =
    trpc.collaboration.getMyActiveSessions.useQuery(undefined, {
      refetchInterval: pusherState === "connected" ? false : 30000,
    });

  if (isLoading) {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="p-6">
          <div className="animate-pulse flex gap-4">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeSessions || activeSessions.length === 0) {
    return null;
  }

  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeSessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors cursor-pointer group"
            onClick={() =>
              router.push(
                `/${locale}/reviews/${session.reviewId}?tab=workspace`
              )
            }
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-full bg-green-500/10">
                <Radio className="h-4 w-4 text-green-500" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  {session.title || session.review.reference}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{session.review.organizationName}</span>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {session.participantCount} {t("online")}
                  </span>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(session.startedAt), {
                      addSuffix: false,
                    })}
                  </span>
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 group-hover:bg-green-500/10"
            >
              <Zap className="h-4 w-4 mr-1" />
              {t("join")}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
