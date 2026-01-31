"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AlertCircle, ArrowLeft } from "lucide-react";
import BestPracticeLoading from "../loading";
import { BestPracticeHeader } from "./best-practice-header";
import { BestPracticeContent } from "./best-practice-content";
import { BestPracticeSidebar } from "./best-practice-sidebar";
import { RelatedPractices } from "./related-practices";
import { LessonsLearned } from "./lessons-learned";
import { DiscussionThread } from "./discussion-thread";

interface BestPracticeDetailProps {
  id: string;
  locale: string;
  userOrgId?: string | null;
  userRole?: string;
}

export function BestPracticeDetail({
  id,
  locale,
  userOrgId,
  userRole,
}: BestPracticeDetailProps) {
  const t = useTranslations("bestPractices.detail");
  const tNav = useTranslations("bestPractices");

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

  // Get practice title for breadcrumb
  const practiceTitle = locale === "fr"
    ? practice.titleFr || practice.titleEn
    : practice.titleEn;
  const practiceRef = practice.referenceNumber || id.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Breadcrumb navigation */}
      <Breadcrumb
        homeHref={`/${locale}/dashboard`}
        items={[
          { label: tNav("title"), href: `/${locale}/best-practices` },
          { label: practiceRef },
        ]}
        className="hidden md:flex"
      />

      {/* Mobile back button */}
      <Button variant="ghost" asChild className="md:hidden">
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
          <LessonsLearned
            bestPracticeId={id}
            locale={locale}
            hasAdopted={hasAdopted}
          />
          <DiscussionThread
            bestPracticeId={id}
            locale={locale}
            isAuthenticated={!!userRole}
          />
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          <BestPracticeSidebar
            practice={practice}
            locale={locale}
            canAdopt={canAdopt}
            hasAdopted={hasAdopted}
            userOrgId={userOrgId}
            userRole={userRole}
            isOwnOrg={isOwnOrg}
          />
        </div>
      </div>

      {/* Related Practices - full width below */}
      <RelatedPractices
        currentId={id}
        category={practice.category}
        locale={locale}
      />
    </div>
  );
}
