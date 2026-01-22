import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuditLogsViewer } from "./audit-logs-viewer";

interface AuditLogsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: AuditLogsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auditLogs" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

// Admin roles that can access audit logs
const AUDIT_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN"];

export default async function AuditLogsPage({ params }: AuditLogsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Check if user has permission to view audit logs
  if (!AUDIT_ROLES.includes(session.user.role)) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="container py-6">
      <AuditLogsViewer locale={locale} />
    </div>
  );
}
