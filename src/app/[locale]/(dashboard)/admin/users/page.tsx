import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { USER_CRUD_PERMISSIONS } from "@/lib/permissions/user-management";
import { AdminUsersClient } from "./client";

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

  const { id: userId, role, organizationId } = session.user;
  const userRole = role as UserRole;

  // Check if user has permission to read users
  const permissions = USER_CRUD_PERMISSIONS[userRole];
  if (permissions.canRead === "none") {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="container py-6">
      <AdminUsersClient
        userId={userId}
        userRole={userRole}
        userOrgId={organizationId ?? null}
        locale={locale}
      />
    </div>
  );
}
