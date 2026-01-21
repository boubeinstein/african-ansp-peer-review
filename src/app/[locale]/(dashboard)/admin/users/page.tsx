import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { AdminUsersClient } from "./client";

// Only SUPER_ADMIN and SYSTEM_ADMIN can access user management
const ADMIN_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN"] as const;

interface AdminUsersPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: AdminUsersPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.users" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function AdminUsersPage({ params }: AdminUsersPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const { id: userId, role } = session.user;

  // Check if user has permission to manage users
  if (!ADMIN_ROLES.includes(role as typeof ADMIN_ROLES[number])) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="container py-6">
      <AdminUsersClient userId={userId} userRole={role} locale={locale} />
    </div>
  );
}
