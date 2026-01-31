import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { WorkloadDashboardClient } from "./workload-dashboard-client";

// Roles that can access workload dashboard
const ALLOWED_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.SYSTEM_ADMIN,
  UserRole.PROGRAMME_COORDINATOR,
  UserRole.STEERING_COMMITTEE,
];

interface WorkloadPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: WorkloadPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviewers.workload" });
  return {
    title: t("title"),
  };
}

export default async function WorkloadPage({ params }: WorkloadPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();

  // Redirect if not authenticated
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Check permissions
  if (!ALLOWED_ROLES.includes(session.user.role as UserRole)) {
    redirect(`/${locale}/dashboard`);
  }

  return <WorkloadDashboardClient locale={locale} />;
}
