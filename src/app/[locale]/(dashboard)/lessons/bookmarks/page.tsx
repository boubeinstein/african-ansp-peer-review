import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { BookmarksClient } from "./_components/bookmarks-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "lessons.bookmarks" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    sortBy?: string;
  }>;
}

export default async function BookmarksPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <BookmarksClient
        locale={locale}
        searchParams={resolvedSearchParams}
      />
    </Suspense>
  );
}
