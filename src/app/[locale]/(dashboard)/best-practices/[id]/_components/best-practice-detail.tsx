"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft } from "lucide-react";
import BestPracticeLoading from "../loading";
import { BestPracticeHeader } from "./best-practice-header";
import { BestPracticeContent } from "./best-practice-content";
import { BestPracticeSidebar } from "./best-practice-sidebar";

interface BestPracticeDetailProps {
  id: string;
  locale: string;
  userOrgId?: string | null;
}

export function BestPracticeDetail({
  id,
  locale,
  userOrgId,
}: BestPracticeDetailProps) {
  const t = useTranslations("bestPractices.detail");

  // Fetch best practice
  const {
    data: practice,
    isLoading,
    error,
  } = trpc.bestPractice.getById.useQuery({ id });

  // Increment view count on mount (only for published)
  const incrementView = trpc.bestPractice.incrementViewCount.useMutation();

  useEffect(() => {
    if (practice && practice.status === "PUBLISHED") {
      incrementView.mutate({ id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, practice?.status]);

  if (isLoading) {
    return <BestPracticeLoading />;
  }

  if (error || !practice) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href={`/${locale}/best-practices`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToLibrary")}
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error?.message || t("notFound")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isOwnOrg = practice.organizationId === userOrgId;
  const canAdopt = !!userOrgId && !isOwnOrg && practice.status === "PUBLISHED";
  const hasAdopted = practice.adoptions.some(
    (a) => a.organization.id === userOrgId
  );

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" asChild>
        <Link href={`/${locale}/best-practices`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToLibrary")}
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <BestPracticeHeader practice={practice} locale={locale} />
          <BestPracticeContent practice={practice} locale={locale} />
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          <BestPracticeSidebar
            practice={practice}
            locale={locale}
            canAdopt={canAdopt}
            hasAdopted={hasAdopted}
            isOwnOrg={isOwnOrg}
          />
        </div>
      </div>
    </div>
  );
}
