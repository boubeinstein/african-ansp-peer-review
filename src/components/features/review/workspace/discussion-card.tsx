"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquare,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  RotateCcw,
  Reply,
} from "lucide-react";

interface Author {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface DiscussionReply {
  id: string;
  content: string;
  createdAt: string | Date;
  isEdited: boolean;
  author: Author;
}

interface Discussion {
  id: string;
  subject: string | null;
  content: string;
  createdAt: string | Date;
  isResolved: boolean;
  isEdited: boolean;
  resolvedAt: string | Date | null;
  author: Author;
  resolvedBy: { firstName: string; lastName: string } | null;
  replies: DiscussionReply[];
  _count: { replies: number };
}

interface DiscussionCardProps {
  discussion: Discussion;
  locale: string;
  userId: string;
  onUpdate: () => void;
}

export function DiscussionCard({
  discussion,
  locale,
  userId,
  onUpdate,
}: DiscussionCardProps) {
  const t = useTranslations("reviews.workspace.discussions");
  const dateLocale = locale === "fr" ? fr : enUS;

  const [isExpanded, setIsExpanded] = useState(false);

  const isAuthor = discussion.author.id === userId;
  const authorInitials = `${discussion.author.firstName[0]}${discussion.author.lastName[0]}`;
  const authorName = `${discussion.author.firstName} ${discussion.author.lastName}`;

  // Mutations
  const resolveMutation = trpc.reviewDiscussion.resolve.useMutation({
    onSuccess: () => {
      toast.success(t("actions.resolveSuccess"));
      onUpdate();
    },
    onError: (error) => toast.error(error.message),
  });

  const unresolveMutation = trpc.reviewDiscussion.unresolve.useMutation({
    onSuccess: () => {
      toast.success(t("actions.unresolveSuccess"));
      onUpdate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.reviewDiscussion.delete.useMutation({
    onSuccess: () => {
      toast.success(t("actions.deleteSuccess"));
      onUpdate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleResolve = () => {
    if (discussion.isResolved) {
      unresolveMutation.mutate({ id: discussion.id });
    } else {
      resolveMutation.mutate({ id: discussion.id });
    }
  };

  const handleDelete = () => {
    if (confirm(t("actions.deleteConfirm"))) {
      deleteMutation.mutate({ id: discussion.id });
    }
  };

  return (
    <Card className={discussion.isResolved ? "opacity-75" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {authorInitials}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* Subject */}
                {discussion.subject && (
                  <h4 className="font-medium truncate">{discussion.subject}</h4>
                )}

                {/* Author and time */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {authorName}
                  </span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(discussion.createdAt), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </span>
                  {discussion.isEdited && (
                    <>
                      <span>•</span>
                      <span className="italic">{t("edited")}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Status badge and actions */}
              <div className="flex items-center gap-2">
                {discussion.isResolved ? (
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {t("status.resolved")}
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                  >
                    <Circle className="h-3 w-3 mr-1" />
                    {t("status.open")}
                  </Badge>
                )}

                {/* Actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleResolve}>
                      {discussion.isResolved ? (
                        <>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          {t("actions.reopen")}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {t("actions.resolve")}
                        </>
                      )}
                    </DropdownMenuItem>
                    {isAuthor && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={handleDelete}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("actions.delete")}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Content */}
            <p className="mt-2 text-sm whitespace-pre-wrap">
              {discussion.content}
            </p>

            {/* Resolved info */}
            {discussion.isResolved && discussion.resolvedBy && (
              <p className="mt-2 text-xs text-muted-foreground italic">
                {t("resolvedBy", {
                  name: `${discussion.resolvedBy.firstName} ${discussion.resolvedBy.lastName}`,
                })}
              </p>
            )}

            {/* Replies section */}
            {discussion._count.replies > 0 && (
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="mt-2 -ml-2">
                    {isExpanded ? (
                      <ChevronDown className="mr-1 h-4 w-4" />
                    ) : (
                      <ChevronRight className="mr-1 h-4 w-4" />
                    )}
                    <MessageSquare className="mr-1 h-4 w-4" />
                    {t("replies", { count: discussion._count.replies })}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-3 pl-4 border-l-2 border-muted space-y-3">
                    {discussion.replies.map((reply) => (
                      <ReplyCard key={reply.id} reply={reply} locale={locale} />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Reply button if no replies */}
            {discussion._count.replies === 0 && (
              <Button variant="ghost" size="sm" className="mt-2 -ml-2">
                <Reply className="mr-1 h-4 w-4" />
                {t("actions.reply")}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ReplyCardProps {
  reply: DiscussionReply;
  locale: string;
}

function ReplyCard({ reply, locale }: ReplyCardProps) {
  const t = useTranslations("reviews.workspace.discussions");
  const dateLocale = locale === "fr" ? fr : enUS;

  const authorInitials = `${reply.author.firstName[0]}${reply.author.lastName[0]}`;
  const authorName = `${reply.author.firstName} ${reply.author.lastName}`;

  return (
    <div className="flex items-start gap-2">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-muted text-xs">
          {authorInitials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{authorName}</span>
          <span className="text-muted-foreground">
            {formatDistanceToNow(new Date(reply.createdAt), {
              addSuffix: true,
              locale: dateLocale,
            })}
          </span>
          {reply.isEdited && (
            <span className="text-muted-foreground italic text-xs">
              ({t("edited")})
            </span>
          )}
        </div>
        <p className="text-sm mt-1 whitespace-pre-wrap">{reply.content}</p>
      </div>
    </div>
  );
}
