import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { LessonsAnalytics } from "../_components/lessons-analytics";

const ANALYTICS_ROLES = ["SUPER_ADMIN", "PROGRAMME_COORDINATOR"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "lessons.analytics" });
  return {
    title: t("title"),
  };
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AnalyticsPage({ params }: PageProps) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/auth/login`);
  }

  if (!ANALYTICS_ROLES.includes(session.user.role)) {
    redirect(`/${locale}/lessons`);
  }

  return <LessonsAnalytics locale={locale} />;
}
