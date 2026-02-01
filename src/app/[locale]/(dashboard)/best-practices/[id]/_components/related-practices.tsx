"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Lightbulb, Users, Eye } from "lucide-react";
import { BestPracticeCategory } from "@/types/prisma-enums";

interface RelatedPracticesProps {
  currentId: string;
  category: string;
  locale: string;
}

export function RelatedPractices({
  currentId,
  category,
  locale,
}: RelatedPracticesProps) {
  const t = useTranslations("bestPractices.detail.related");

  // Fetch practices in same category
  const { data, isLoading } = trpc.bestPractice.list.useQuery({
    page: 1,
    pageSize: 4,
    category: category as BestPracticeCategory,
    sortBy: "mostAdopted",
  });

  // Filter out current practice and limit to 3
  const relatedPractices = data?.items
    .filter((p) => p.id !== currentId)
    .slice(0, 3) || [];

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 rounded-lg border">
                <Skeleton className="h-5 w-20 mb-3" />
                <Skeleton className="h-5 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-3" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // No related practices
  if (relatedPractices.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {relatedPractices.map((practice) => {
            const title = locale === "fr" ? practice.titleFr : practice.titleEn;
            const orgName = locale === "fr"
              ? practice.organization.nameFr
              : practice.organization.nameEn;

            return (
              <Link
                key={practice.id}
                href={`/${locale}/best-practices/${practice.id}`}
                className="group block p-4 rounded-lg border hover:border-primary hover:bg-accent/50 transition-all"
              >
                {/* Reference number badge */}
                <Badge variant="secondary" className="mb-3 font-mono text-xs">
                  {practice.referenceNumber}
                </Badge>

                {/* Title */}
                <h4 className="font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                  {title}
                </h4>

                {/* Organization */}
                <p className="text-xs text-muted-foreground truncate mb-3">
                  {orgName}
                </p>

                {/* Metrics */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{practice.viewCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{practice._count.adoptions}</span>
                  </div>
                </div>

                {/* View link */}
                <div className="flex items-center gap-1 text-xs text-primary font-medium">
                  {t("viewPractice")}
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
