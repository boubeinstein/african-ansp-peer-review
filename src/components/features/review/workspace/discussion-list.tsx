"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  MessageSquare,
  Plus,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DiscussionCard } from "./discussion-card";
import { CreateDiscussionDialog } from "./create-discussion-dialog";

interface DiscussionListProps {
  reviewId: string;
  locale: string;
  userId: string;
}

export function DiscussionList({
  reviewId,
  locale,
  userId,
}: DiscussionListProps) {
  const t = useTranslations("reviews.workspace.discussions");

  const [page, setPage] = useState(1);
  const [includeResolved, setIncludeResolved] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch discussions (only if authenticated)
  const { data, isLoading, error, refetch } =
    trpc.reviewDiscussion.list.useQuery(
      {
        reviewId,
        includeResolved,
        page,
        pageSize: 10,
      },
      { enabled: !!userId }
    );

  // Fetch stats (only if authenticated)
  const { data: stats } = trpc.reviewDiscussion.getStats.useQuery(
    { reviewId },
    { enabled: !!userId }
  );

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Stats */}
        <div className="flex items-center gap-4">
          {stats && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Circle className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span>{t("stats.unresolved", { count: stats.unresolved })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{t("stats.resolved", { count: stats.resolved })}</span>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Show resolved toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="show-resolved"
              checked={includeResolved}
              onCheckedChange={(checked) => {
                setIncludeResolved(checked);
                setPage(1);
              }}
            />
            <Label htmlFor="show-resolved" className="text-sm cursor-pointer">
              {t("filters.showResolved")}
            </Label>
          </div>

          {/* New discussion button */}
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("actions.newDiscussion")}
          </Button>
        </div>
      </div>

      {/* Discussion list */}
      {isLoading ? (
        <DiscussionListSkeleton />
      ) : data?.discussions.length === 0 ? (
        <EmptyDiscussions onCreateClick={() => setShowCreateDialog(true)} />
      ) : (
        <div className="space-y-3">
          {data?.discussions.map((discussion) => (
            <DiscussionCard
              key={discussion.id}
              discussion={discussion}
              reviewId={reviewId}
              locale={locale}
              userId={userId}
              onUpdate={() => refetch()}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            {t("pagination.page", { page, totalPages: data.pagination.totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
            disabled={page >= data.pagination.totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Create dialog */}
      <CreateDiscussionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        reviewId={reviewId}
        onSuccess={() => {
          setShowCreateDialog(false);
          refetch();
        }}
      />
    </div>
  );
}

function DiscussionListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface EmptyDiscussionsProps {
  onCreateClick: () => void;
}

function EmptyDiscussions({ onCreateClick }: EmptyDiscussionsProps) {
  const t = useTranslations("reviews.workspace.discussions.empty");

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{t("title")}</h3>
      <p className="text-muted-foreground max-w-md mb-4">{t("description")}</p>
      <Button onClick={onCreateClick}>
        <Plus className="mr-2 h-4 w-4" />
        {t("action")}
      </Button>
    </div>
  );
}
