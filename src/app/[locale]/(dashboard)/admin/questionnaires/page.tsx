import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { QuestionnaireListContent } from "./questionnaire-list-content";
import { QuestionnaireListSkeleton } from "./questionnaire-list-skeleton";

interface AdminQuestionnairesPageProps {
  params: Promise<{
    locale: string;
  }>;
}

// Admin roles that can access this page
const ADMIN_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"];

export async function generateMetadata({ params }: AdminQuestionnairesPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.questionnaires" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function AdminQuestionnairesPage({
  params,
}: AdminQuestionnairesPageProps) {
  const { locale } = await params;
  const session = await auth();

  // Check authentication
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Check authorization
  if (!ADMIN_ROLES.includes(session.user.role)) {
    redirect(`/${locale}/unauthorized`);
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <Suspense fallback={<QuestionnaireListSkeleton />}>
        <QuestionnaireListContent locale={locale} />
      </Suspense>
    </div>
  );
}
