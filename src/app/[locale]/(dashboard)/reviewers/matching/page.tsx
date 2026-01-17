import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MatchingPageClient } from "./matching-client";

// Roles that can access the matching feature
const COORDINATOR_ROLES = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "REVIEW_COORDINATOR",
];

interface MatchingPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: MatchingPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviewer.matching" });
  return {
    title: t("title"),
    description: t("criteriaDescription"),
  };
}

export default async function MatchingPage({ params }: MatchingPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();

  // Check if user has permission to access matching
  const canAccessMatching =
    session?.user?.role && COORDINATOR_ROLES.includes(session.user.role);

  if (!canAccessMatching) {
    redirect(`/${locale}/reviewers`);
  }

  return <MatchingPageClient locale={locale} />;
}
