import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types/prisma-enums";
import { RolesDocumentationClient } from "./client";

interface AdminRolesPageProps {
  params: Promise<{ locale: string }>;
}

// Roles that can view the roles documentation page
const ALLOWED_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "STEERING_COMMITTEE",
  "PROGRAMME_COORDINATOR",
];

export async function generateMetadata({ params }: AdminRolesPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "roles" });
  return {
    title: t("pageTitle"),
    description: t("pageSubtitle"),
  };
}

export default async function AdminRolesPage({ params }: AdminRolesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const userRole = session.user.role as UserRole;

  // Check if user has permission to view roles documentation
  if (!ALLOWED_ROLES.includes(userRole)) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="container py-6">
      <RolesDocumentationClient locale={locale} />
    </div>
  );
}
