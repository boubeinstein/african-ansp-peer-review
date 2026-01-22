import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AnalyticsDashboard } from "./analytics-dashboard";

interface AnalyticsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: AnalyticsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "analytics" });
  return { title: t("title") };
}

// Admin roles that can access analytics
const ANALYTICS_ROLES = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "STEERING_COMMITTEE",
  "PROGRAMME_COORDINATOR",
];

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Check if user has permission to view analytics
  if (!ANALYTICS_ROLES.includes(session.user.role)) {
    redirect(`/${locale}/dashboard`);
  }

  return <AnalyticsDashboard locale={locale} />;
}
