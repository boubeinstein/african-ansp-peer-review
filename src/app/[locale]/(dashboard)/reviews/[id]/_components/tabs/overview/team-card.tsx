"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";

interface TeamMember {
  id: string;
  name: string;
  image: string | null;
  role: string;
}

interface TeamCardProps {
  leadReviewer: TeamMember | null;
  reviewers: TeamMember[];
  reviewId: string;
}

export function TeamCard({ leadReviewer, reviewers, reviewId }: TeamCardProps) {
  const t = useTranslations("reviews.detail.overview.team");
  const locale = useLocale();
  const router = useRouter();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {leadReviewer && (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={leadReviewer.image || undefined} />
              <AvatarFallback>{getInitials(leadReviewer.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{leadReviewer.name}</p>
              <p className="text-xs text-muted-foreground">{t("leadReviewer")}</p>
            </div>
          </div>
        )}

        {reviewers.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex -space-x-2">
              {reviewers.slice(0, 4).map((reviewer) => (
                <Avatar key={reviewer.id} className="h-7 w-7 border-2 border-background">
                  <AvatarImage src={reviewer.image || undefined} />
                  <AvatarFallback className="text-xs">{getInitials(reviewer.name)}</AvatarFallback>
                </Avatar>
              ))}
              {reviewers.length > 4 && (
                <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-xs font-medium">+{reviewers.length - 4}</span>
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {reviewers.length} {t("reviewers")}
            </span>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => router.push(`/${locale}/reviews/${reviewId}?tab=settings`)}
        >
          {t("viewAll")}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
