import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types/prisma-enums";
import { canSubmitBestPractice } from "@/lib/permissions";
import { KnowledgeBaseClient } from "./knowledge-base-client";

interface KnowledgePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: KnowledgePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "knowledge" });
  return { title: t("title") };
}

export default async function KnowledgePage({ params }: KnowledgePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/auth/login`);
  }

  const canSubmitBP = canSubmitBestPractice(
    session.user.role as UserRole,
    session.user.organizationId
  );

  return (
    <Suspense>
      <KnowledgeBaseClient
        locale={locale}
        canSubmitBP={canSubmitBP}
        userOrgId={session.user.organizationId}
      />
    </Suspense>
  );
}
