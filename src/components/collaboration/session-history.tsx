"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Users, Activity } from "lucide-react";
import { format, formatDuration, intervalToDuration } from "date-fns";

interface SessionHistoryProps {
  reviewId: string;
}

export function SessionHistory({ reviewId }: SessionHistoryProps) {
  const { data: sessions, isLoading } =
    trpc.collaboration.getSessionHistory.useQuery({
      reviewId,
      limit: 10,
    });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!sessions?.length) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No collaboration sessions recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const duration = session.endedAt
          ? intervalToDuration({
              start: new Date(session.startedAt),
              end: new Date(session.endedAt),
            })
          : null;

        return (
          <Card key={session.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {session.title || session.sessionType.replace(/_/g, " ")}
                </CardTitle>
                <Badge
                  variant={
                    session.status === "COMPLETED" ? "secondary" : "default"
                  }
                >
                  {session.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {format(new Date(session.startedAt), "MMM d, yyyy HH:mm")}
                </div>
                {duration && (
                  <div className="flex items-center gap-1">
                    <Activity className="h-4 w-4" />
                    {formatDuration(duration, { format: ["hours", "minutes"] })}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {session._count.participants} participants
                </div>
              </div>
              <p className="mt-1 text-sm">
                Started by {session.startedBy.firstName}{" "}
                {session.startedBy.lastName}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
