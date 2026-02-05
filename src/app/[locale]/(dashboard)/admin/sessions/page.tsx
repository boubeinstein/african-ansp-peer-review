import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types/prisma-enums";
import { AdminSessionsClient } from "@/components/features/admin/admin-sessions";

interface AdminSessionsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: AdminSessionsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.sessions" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function AdminSessionsPage({ params }: AdminSessionsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const userRole = session.user.role as UserRole;

  if (!["SUPER_ADMIN", "SYSTEM_ADMIN"].includes(userRole)) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="container py-6">
      <AdminSessionsClient locale={locale} />
    </div>
  );
}
