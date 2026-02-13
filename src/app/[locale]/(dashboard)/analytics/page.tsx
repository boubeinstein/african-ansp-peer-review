import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ProgrammeIntelligenceClient } from "./programme-intelligence-client";

interface AnalyticsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: AnalyticsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "analytics" });
  return { title: t("programmeIntelligence.title") };
}

// Admin roles that can access Programme Intelligence
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

  if (!ANALYTICS_ROLES.includes(session.user.role)) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <Suspense>
      <ProgrammeIntelligenceClient
        locale={locale}
        userId={session.user.id}
        userRole={session.user.role}
      />
    </Suspense>
  );
}
