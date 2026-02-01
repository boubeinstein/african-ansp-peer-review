import { redirect, notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types/prisma-enums";
import { isOversightRole, canRequestPeerReview } from "@/lib/permissions";
import { NewReviewClient } from "./client";

interface NewReviewPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: NewReviewPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "review.new" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function NewReviewPage({ params }: NewReviewPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const { id: userId, role, organizationId } = session.user;
  const userRole = role as UserRole;

  // Check if user has permission to create/request reviews
  const canManage = isOversightRole(userRole);
  const canRequest = canRequestPeerReview(userRole, organizationId);

  if (!canManage && !canRequest) {
    notFound();
  }

  return (
    <div className="container max-w-4xl py-6">
      <NewReviewClient
        userId={userId}
        locale={locale}
        userRole={role}
        userOrgId={organizationId}
      />
    </div>
  );
}
