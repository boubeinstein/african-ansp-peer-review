import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LessonsSearchClient } from "./_components/lessons-search-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "lessons" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    category?: string;
    impact?: string;
    auditArea?: string;
    soeArea?: string;
    applicability?: string;
    tag?: string;
    sortBy?: string;
    tab?: string;
  }>;
}

export default async function LessonsPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/auth/login`);
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        }
      >
        <LessonsSearchClient
          locale={locale}
          searchParams={resolvedSearchParams}
        />
      </Suspense>
    </div>
  );
}
