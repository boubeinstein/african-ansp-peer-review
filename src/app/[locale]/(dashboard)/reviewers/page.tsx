import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types/prisma-enums";
import { ReviewerPoolClient } from "./reviewer-pool-client";

// Admin roles that can add reviewers and access team management
const ADMIN_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.SYSTEM_ADMIN,
  UserRole.PROGRAMME_COORDINATOR,
];

interface ReviewersPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ReviewersPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviewerPool" });
  return { title: t("title") };
}

export default async function ReviewersPage({ params }: ReviewersPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const userContext = {
    id: session.user.id,
    role: session.user.role as UserRole,
    organizationId: session.user.organizationId,
  };

  const isAdmin = ADMIN_ROLES.includes(userContext.role);

  return (
    <Suspense>
      <ReviewerPoolClient
        locale={locale}
        userContext={userContext}
        isAdmin={isAdmin}
      />
    </Suspense>
  );
}
