"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, ExternalLink, CheckCircle2 } from "lucide-react";
import type { FindingType } from "@prisma/client";

interface PublishBestPracticeButtonProps {
  findingId: string;
  findingType: FindingType;
  locale: string;
}

// Finding types that can be published as best practices
const PUBLISHABLE_TYPES: FindingType[] = ["GOOD_PRACTICE", "OBSERVATION"];

export function PublishBestPracticeButton({
  findingId,
  findingType,
  locale,
}: PublishBestPracticeButtonProps) {
  const t = useTranslations("findings.detail.bestPractice");

  // Check if a best practice already exists for this finding
  const { data: existingPractice, isLoading } =
    trpc.bestPractice.getByFindingId.useQuery({ findingId });

  // Only show for positive finding types
  if (!PUBLISHABLE_TYPES.includes(findingType)) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  // Best practice already exists
  if (existingPractice) {
    const title =
      locale === "fr" ? existingPractice.titleFr : existingPractice.titleEn;

    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-800 dark:text-green-200">
          {t("alreadyPublished")}
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs">
              {existingPractice.referenceNumber}
            </Badge>
            <Badge variant="outline">{existingPractice.status}</Badge>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300 line-clamp-2">
            {title}
          </p>
          <Button variant="outline" size="sm" asChild className="mt-2">
            <Link href={`/${locale}/best-practices/${existingPractice.id}`}>
              {t("viewPractice")}
              <ExternalLink className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Show publish button
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      <Button asChild className="w-full">
        <Link href={`/${locale}/best-practices/new?findingId=${findingId}`}>
          <Lightbulb className="mr-2 h-4 w-4" />
          {t("publishButton")}
        </Link>
      </Button>
    </div>
  );
}
