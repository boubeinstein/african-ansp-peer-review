import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SafetyIntelligenceClient } from "./safety-intelligence-client";

interface SafetyIntelligencePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: SafetyIntelligencePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "safetyIntelligence" });
  return { title: t("title") };
}

const ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "STEERING_COMMITTEE",
];

export default async function SafetyIntelligencePage({
  params,
}: SafetyIntelligencePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <SafetyIntelligenceClient
      userId={session.user.id}
      userRole={session.user.role}
    />
  );
}
