"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Clock, ChevronRight, Search } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { usePusherConnectionState } from "@/lib/pusher/client";
import { DiscussionDetail } from "./discussion-detail";

interface DiscussionsListProps {
  reviewId: string;
  userId?: string;
  userName?: string;
}

export function DiscussionsList({ reviewId, userId, userName }: DiscussionsListProps) {
  const t = useTranslations("reviews.detail.workspace.discussionsList");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const pusherState = usePusherConnectionState();

  const includeResolved = statusFilter === "all" || statusFilter === "CLOSED";

  const { data, isLoading } = trpc.reviewDiscussion.list.useQuery(
    { reviewId, includeResolved, pageSize: 50 },
    { refetchInterval: pusherState === "connected" ? false : 60000 }
  );

  const discussions = data?.discussions ?? [];

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  // Filter discussions by search query and status
  const filteredDiscussions = discussions.filter((discussion) => {
    const title = discussion.subject || "";
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());
    const status = discussion.isResolved ? "CLOSED" : "OPEN";
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Show detail view if a discussion is selected
  if (selectedId) {
    return (
      <DiscussionDetail
        discussionId={selectedId}
        reviewId={reviewId}
        userId={userId}
        userName={userName}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder={t("filterStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAll")}</SelectItem>
            <SelectItem value="OPEN">{t("status.OPEN")}</SelectItem>
            <SelectItem value="CLOSED">{t("status.CLOSED")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Discussion List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDiscussions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">
              {searchQuery || statusFilter !== "all" ? t("noResults") : t("empty.title")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all" ? t("tryDifferent") : t("empty.description")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDiscussions.map((discussion) => {
            const status = discussion.isResolved ? "CLOSED" : "OPEN";
            const authorName = `${discussion.author.firstName} ${discussion.author.lastName}`;

            return (
              <Card
                key={discussion.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedId(discussion.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(discussion.author.firstName, discussion.author.lastName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-medium truncate">
                          {discussion.subject || discussion.content?.slice(0, 60)}
                        </h4>
                        <Badge
                          variant={status === "OPEN" ? "default" : "secondary"}
                          className="shrink-0"
                        >
                          {t(`status.${status}`)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                        <span>{authorName}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(discussion.createdAt), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {discussion._count.replies} {t("replies")}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
