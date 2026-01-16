import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { ReviewerCreateForm } from "./create-form";

interface CreateReviewerPageProps {
  params: Promise<{
    locale: string;
  }>;
}

// Admin roles that can create reviewers
const ADMIN_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"];

export async function generateMetadata({ params }: CreateReviewerPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviewer" });

  return {
    title: t("createTitle"),
    description: t("createDescription"),
  };
}

export default async function CreateReviewerPage({
  params,
}: CreateReviewerPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();

  // Check authentication
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Check authorization - only admins can create reviewers
  if (!ADMIN_ROLES.includes(session.user.role)) {
    redirect(`/${locale}/reviewers`);
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <ReviewerCreateForm locale={locale} />
    </div>
  );
}
