"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Clock, ChevronRight } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";

interface Discussion {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  author: { id: string; name: string; image: string | null };
  _count: { replies: number };
}

interface DiscussionsListProps {
  discussions: Discussion[];
  reviewId: string;
}

export function DiscussionsList({ discussions, reviewId }: DiscussionsListProps) {
  const t = useTranslations("reviews.detail.workspace.discussionsList");
  const locale = useLocale();
  const router = useRouter();
  const dateLocale = locale === "fr" ? fr : enUS;

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (discussions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-medium mb-1">{t("empty.title")}</h3>
          <p className="text-sm text-muted-foreground">{t("empty.description")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {discussions.map((discussion) => (
        <Card
          key={discussion.id}
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push(`/${locale}/reviews/${reviewId}/discussions/${discussion.id}`)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={discussion.author.image || undefined} />
                <AvatarFallback>{getInitials(discussion.author.name)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium truncate">{discussion.title}</h4>
                  <Badge
                    variant={discussion.status === "OPEN" ? "default" : "secondary"}
                    className="shrink-0"
                  >
                    {t(`status.${discussion.status}`)}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{discussion.author.name}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(discussion.createdAt, { addSuffix: true, locale: dateLocale })}
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
      ))}
    </div>
  );
}
