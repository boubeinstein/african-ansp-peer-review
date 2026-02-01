"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Reply, Send, Shield, User } from "lucide-react";
import { canModerateDiscussion } from "@/lib/permissions";
import type { UserRole } from "@/types/prisma-enums";

interface DiscussionThreadProps {
  bestPracticeId: string;
  locale: string;
  isAuthenticated: boolean;
  userRole?: string;
}

interface CommentAuthor {
  firstName: string;
  lastName: string;
  organization?: { organizationCode: string | null } | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: Date | string;
  author: CommentAuthor;
  replies?: Comment[];
}

export function DiscussionThread({
  bestPracticeId,
  locale,
  isAuthenticated,
  userRole,
}: DiscussionThreadProps) {
  const t = useTranslations("bestPractices.detail.discussion");
  const dateLocale = locale === "fr" ? fr : enUS;
  const utils = trpc.useUtils();

  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // Role-based moderation check
  const isModerator = userRole ? canModerateDiscussion(userRole as UserRole) : false;

  // Fetch comments
  const { data: comments, isLoading } = trpc.bestPractice.getComments.useQuery({
    bestPracticeId,
  });

  // Add comment mutation
  const addComment = trpc.bestPractice.addComment.useMutation({
    onSuccess: () => {
      setNewComment("");
      setReplyingTo(null);
      setReplyContent("");
      utils.bestPractice.getComments.invalidate({ bestPracticeId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    addComment.mutate({
      bestPracticeId,
      content: newComment.trim(),
    });
  };

  const handleSubmitReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    addComment.mutate({
      bestPracticeId,
      content: replyContent.trim(),
      parentId,
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAuthorName = (author: { firstName: string; lastName: string }) => {
    return `${author.firstName} ${author.lastName}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalComments =
    (comments?.length || 0) +
    (comments?.reduce((acc: number, c: Comment) => acc + (c.replies?.length || 0), 0) || 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            {t("title")}
            {totalComments > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({t("commentCount", { count: totalComments })})
              </span>
            )}
          </CardTitle>
          {isModerator && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Shield className="h-3 w-3" />
              {t("moderator")}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* New comment input */}
        {isAuthenticated ? (
          <div className="space-y-3">
            <Textarea
              placeholder={t("placeholder")}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || addComment.isPending}
                size="sm"
              >
                <Send className="h-4 w-4 mr-2" />
                {t("post")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("signInToComment")}
            </p>
          </div>
        )}

        {/* Comments list */}
        {!comments || comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t("noComments")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment: Comment) => (
              <div key={comment.id} className="space-y-4">
                {/* Main comment */}
                <div className="flex gap-3">
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(
                        comment.author.firstName,
                        comment.author.lastName
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {getAuthorName(comment.author)}
                      </span>
                      {comment.author.organization?.organizationCode && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                          {comment.author.organization.organizationCode}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {comment.content}
                    </p>
                    {isAuthenticated && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 mt-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          setReplyingTo(
                            replyingTo === comment.id ? null : comment.id
                          )
                        }
                      >
                        <Reply className="h-3.5 w-3.5 mr-1" />
                        {t("reply")}
                      </Button>
                    )}

                    {/* Reply input */}
                    {replyingTo === comment.id && (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          placeholder={t("replyPlaceholder")}
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          rows={2}
                          className="resize-none text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent("");
                            }}
                          >
                            {t("cancel")}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSubmitReply(comment.id)}
                            disabled={
                              !replyContent.trim() || addComment.isPending
                            }
                          >
                            {t("reply")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-12 space-y-4 border-l-2 border-muted pl-4">
                    {comment.replies.map((reply: Comment) => (
                      <div key={reply.id} className="flex gap-3">
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                            {getInitials(
                              reply.author.firstName,
                              reply.author.lastName
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {getAuthorName(reply.author)}
                            </span>
                            {reply.author.organization?.organizationCode && (
                              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                                {reply.author.organization.organizationCode}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(reply.createdAt), {
                                addSuffix: true,
                                locale: dateLocale,
                              })}
                            </span>
                          </div>
                          <p className="mt-1 text-sm whitespace-pre-wrap">
                            {reply.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
