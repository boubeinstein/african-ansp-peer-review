import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { canSubmitBestPractice } from "@/lib/permissions";
import { BestPracticeForm } from "./_components/best-practice-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "bestPractices.new" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ findingId?: string }>;
}

export default async function NewBestPracticePage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const { findingId } = await searchParams;
  const session = await auth();

  // Must be logged in
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Business rule: Must be ANSP role with organization
  const canSubmit = canSubmitBestPractice(
    session.user.role as UserRole,
    session.user.organizationId
  );

  if (!canSubmit) {
    redirect(`/${locale}/best-practices?error=not-ansp-member`);
  }

  return (
    <div className="container mx-auto py-6">
      <BestPracticeForm locale={locale} findingId={findingId} />
    </div>
  );
}
