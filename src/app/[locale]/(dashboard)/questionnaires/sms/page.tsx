import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { SMSBrowser } from "@/components/features/questionnaire/sms/sms-browser";
import { SMSBrowserSkeleton } from "@/components/features/questionnaire/sms/sms-browser-skeleton";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    component?: string;
    studyArea?: string;
    search?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "smsBrowser" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function SMSQuestionnairePage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const filters = await searchParams;

  return (
    <Suspense fallback={<SMSBrowserSkeleton />}>
      <SMSBrowser
        locale={locale}
        initialComponent={filters.component}
        initialStudyArea={filters.studyArea}
        initialSearch={filters.search}
      />
    </Suspense>
  );
}
