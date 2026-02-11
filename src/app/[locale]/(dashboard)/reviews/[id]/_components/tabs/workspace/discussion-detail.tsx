"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  MoreHorizontal,
  MessageSquare,
  Clock,
  CheckCircle,
  Loader2,
  Send,
  Eye,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { formatDistanceToNow, format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { useTypingIndicator } from "@/hooks/use-typing-indicator";
import { TypingIndicator } from "@/components/collaboration/typing-indicator";
import { MentionTextarea } from "@/components/collaboration/mention-textarea";
import type { MentionUser } from "@/components/collaboration/mention-textarea";
import { MentionRenderer } from "@/components/collaboration/mention-renderer";
import { ReactionBar } from "@/components/collaboration/reaction-bar";
import type { EmojiKey } from "@/components/collaboration/reaction-bar";
import { extractMentionedUserIds, hasMentionAll } from "@/lib/mentions";
import { CHANNELS } from "@/lib/pusher/server";

const replySchema = z.object({
  content: z.string().min(1, "Reply cannot be empty").max(2000),
});

type ReplyFormData = z.infer<typeof replySchema>;

interface DiscussionDetailProps {
  discussionId: string;
  reviewId: string;
  userId?: string;
  userName?: string;
  onBack: () => void;
}

export function DiscussionDetail({ discussionId, reviewId, userId, userName, onBack }: DiscussionDetailProps) {
  const t = useTranslations("reviews.detail.workspace.discussionsList.detail");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;
  const utils = trpc.useUtils();

  const { data: discussion, isLoading } = trpc.reviewDiscussion.getById.useQuery(
    { id: discussionId },
    { enabled: !!discussionId }
  );

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReplyFormData>({
    resolver: zodResolver(replySchema),
    defaultValues: { content: "" },
  });

  const replyContent = watch("content");

  // Fetch team members for @mention autocomplete
  const { data: rawTeamMembers = [] } =
    trpc.reviewDiscussion.getTeamMembers.useQuery(
      { reviewId },
      { staleTime: 5 * 60 * 1000 }
    );

  const mentionMembers: MentionUser[] = rawTeamMembers.map(
    (m: { id: string; firstName: string; lastName: string }) => ({
      id: m.id,
      name: `${m.firstName} ${m.lastName}`,
      initials: `${m.firstName?.[0] || ""}${m.lastName?.[0] || ""}`.toUpperCase(),
    })
  );

  const replyMutation = trpc.reviewDiscussion.addReply.useMutation({
    onSuccess: () => {
      toast.success(t("replySent"));
      reset();
      utils.reviewDiscussion.getById.invalidate({ id: discussionId });
    },
    onError: (error) => {
      toast.error(error.message || t("replyError"));
    },
  });

  const { typingUsers, startTyping, stopTyping } = useTypingIndicator({
    channelName: CHANNELS.review(reviewId),
    userId: userId ?? "",
    userName: userName ?? "",
    contextKey: `discussion:${discussionId}`,
  });

  const resolveMutation = trpc.reviewDiscussion.resolve.useMutation({
    onSuccess: () => {
      toast.success(t("statusUpdated"));
      utils.reviewDiscussion.getById.invalidate({ id: discussionId });
      utils.reviewDiscussion.list.invalidate({ reviewId });
    },
  });

  const unresolveMutation = trpc.reviewDiscussion.unresolve.useMutation({
    onSuccess: () => {
      toast.success(t("statusUpdated"));
      utils.reviewDiscussion.getById.invalidate({ id: discussionId });
      utils.reviewDiscussion.list.invalidate({ reviewId });
    },
  });

  const reactionMutation = trpc.reviewDiscussion.toggleReaction.useMutation({
    onSuccess: () => {
      utils.reviewDiscussion.getById.invalidate({ id: discussionId });
    },
  });

  const markAsReadMutation = trpc.reviewDiscussion.markAsRead.useMutation({
    onSuccess: () => {
      utils.reviewDiscussion.getById.invalidate({ id: discussionId });
    },
  });

  // Auto-mark discussion as read when the user opens it
  const hasMarkedRead = useRef(false);
  useEffect(() => {
    if (discussion && userId && !hasMarkedRead.current) {
      hasMarkedRead.current = true;
      markAsReadMutation.mutate({ discussionId });
    }
  }, [discussion, userId, discussionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReaction = (targetId: string, emoji: EmojiKey) => {
    reactionMutation.mutate({ discussionId: targetId, emoji });
  };

  const onSubmitReply = (data: ReplyFormData) => {
    // Extract mention IDs from content for the stored mentions array
    const mentionedIds = extractMentionedUserIds(data.content);
    const allMentioned = hasMentionAll(data.content);
    // For @all, pass "__all__" sentinel; server expands to team members
    const mentions = allMentioned
      ? ["__all__", ...mentionedIds]
      : mentionedIds;

    replyMutation.mutate({
      discussionId,
      content: data.content,
      mentions,
    });
  };

  const handleResolve = () => {
    resolveMutation.mutate({ id: discussionId });
  };

  const handleUnresolve = () => {
    unresolveMutation.mutate({ id: discussionId });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("notFound")}</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("back")}
        </Button>
      </div>
    );
  }

  const authorName = `${discussion.author.firstName} ${discussion.author.lastName}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("back")}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!discussion.isResolved ? (
              <DropdownMenuItem onClick={handleResolve}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {t("markClosed")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={handleUnresolve}>
                <MessageSquare className="h-4 w-4 mr-2" />
                {t("reopen")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Discussion Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={undefined} />
                <AvatarFallback>
                  {getInitials(discussion.author.firstName, discussion.author.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-lg">{discussion.subject || "Discussion"}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <span>{authorName}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(discussion.createdAt), "PPp", { locale: dateLocale })}
                  </span>
                </div>
              </div>
            </div>
            <Badge variant={discussion.isResolved ? "secondary" : "default"}>
              {t(`status.${discussion.isResolved ? "CLOSED" : "OPEN"}`)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <MentionRenderer
              content={discussion.content}
              currentUserId={userId}
              className="text-sm"
            />
          </div>
          {discussion.reactions && (
            <div className="mt-3 pt-3 border-t">
              <ReactionBar
                reactions={discussion.reactions}
                currentUserId={userId}
                onToggle={(emoji) => handleReaction(discussion.id, emoji)}
                disabled={reactionMutation.isPending}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Replies */}
      {discussion.replies && discussion.replies.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground">
            {t("replies", { count: discussion.replies.length })}
          </h3>

          {discussion.replies.map((reply: { id: string; content: string; createdAt: Date | string; author: { firstName: string; lastName: string }; reactions?: { emoji: string; user: { id: string; firstName: string; lastName: string } }[] }) => {
            const replyAuthorName = `${reply.author.firstName} ${reply.author.lastName}`;
            return (
              <Card key={reply.id} className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(reply.author.firstName, reply.author.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{replyAuthorName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(reply.createdAt), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </span>
                      </div>
                      <MentionRenderer
                        content={reply.content}
                        currentUserId={userId}
                        className="text-sm"
                      />
                      {reply.reactions && (
                        <div className="mt-2">
                          <ReactionBar
                            reactions={reply.reactions}
                            currentUserId={userId}
                            onToggle={(emoji) => handleReaction(reply.id, emoji)}
                            disabled={reactionMutation.isPending}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Seen by */}
      {(() => {
        const otherReaders = (discussion.reads ?? [])
          .filter((r: { user: { id: string } }) => r.user.id !== userId)
          .map((r: { user: { firstName: string } }) => r.user.firstName);
        if (otherReaders.length === 0) return null;
        return (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
            <Eye className="h-3 w-3 shrink-0" />
            <span>{t("seenBy", { names: otherReaders.join(", ") })}</span>
          </div>
        );
      })()}

      {/* Reply Form */}
      {!discussion.isResolved && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSubmit(onSubmitReply)} className="space-y-3">
              <MentionTextarea
                value={replyContent}
                onChange={(val) => setValue("content", val, { shouldValidate: true })}
                onSubmit={handleSubmit(onSubmitReply)}
                placeholder={t("replyPlaceholder")}
                teamMembers={mentionMembers}
                currentUserId={userId}
                disabled={isSubmitting || replyMutation.isPending}
                onKeyDown={startTyping}
                onBlur={stopTyping}
              />
              {errors.content && (
                <p className="text-sm text-destructive">{errors.content.message}</p>
              )}
              <TypingIndicator users={typingUsers} />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || replyMutation.isPending}
                >
                  {(isSubmitting || replyMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Send className="h-4 w-4 mr-2" />
                  {t("sendReply")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {discussion.isResolved && (
        <Card className="bg-muted/50">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">{t("closedMessage")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
