import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuditLogsClient } from "@/components/features/audit-logs/audit-logs-client";

const ADMIN_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN", "STEERING_COMMITTEE", "PROGRAMME_COORDINATOR"];

interface AuditLogsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: AuditLogsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auditLogs" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function AuditLogsPage({ params }: AuditLogsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  if (!ADMIN_ROLES.includes(session.user.role)) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <AuditLogsClient
      locale={locale}
      userRole={session.user.role}
    />
  );
}
