import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types/prisma-enums";
import { canSubmitBestPractice } from "@/lib/permissions";
import { BestPracticesHeader } from "./_components/best-practices-header";
import { BestPracticesContent } from "./_components/best-practices-content";
import { BestPracticesLoading } from "./loading";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "bestPractices" });
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
    auditArea?: string;
    sortBy?: string;
  }>;
}

export default async function BestPracticesPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const searchParamsResolved = await searchParams;
  const session = await auth();

  const canSubmit = canSubmitBestPractice(
    session?.user?.role as UserRole,
    session?.user?.organizationId
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <BestPracticesHeader locale={locale} canSubmit={canSubmit} />

      <Suspense fallback={<BestPracticesLoading />}>
        <BestPracticesContent
          locale={locale}
          searchParams={searchParamsResolved}
          userOrgId={session?.user?.organizationId}
        />
      </Suspense>
    </div>
  );
}
