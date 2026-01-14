import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ANSBrowser } from "@/components/features/questionnaire/ans/ans-browser";
import { ANSBrowserSkeleton } from "@/components/features/questionnaire/ans/ans-browser-skeleton";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    auditArea?: string;
    criticalElement?: string;
    isPriority?: string;
    requiresOnSite?: string;
    search?: string;
    page?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ansBrowser" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function ANSQuestionnairePage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const filters = await searchParams;

  return (
    <Suspense fallback={<ANSBrowserSkeleton />}>
      <ANSBrowser locale={locale} initialFilters={filters} />
    </Suspense>
  );
}
