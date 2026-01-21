import { redirect, notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { NewReviewClient } from "./client";

// Roles that can create reviews (coordinators and admins)
const REVIEW_CREATOR_ROLES = [
  "PROGRAMME_COORDINATOR",
  "STEERING_COMMITTEE",
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
] as const;

interface NewReviewPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: NewReviewPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "review.new" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function NewReviewPage({ params }: NewReviewPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const { id: userId, role } = session.user;

  // Check if user has permission to create reviews
  if (!REVIEW_CREATOR_ROLES.includes(role as typeof REVIEW_CREATOR_ROLES[number])) {
    notFound();
  }

  return (
    <div className="container max-w-4xl py-6">
      <NewReviewClient userId={userId} locale={locale} />
    </div>
  );
}
