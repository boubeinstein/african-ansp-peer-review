import { getTranslations } from "next-intl/server";
import { AssessmentWizard } from "@/components/features/assessment/assessment-wizard";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "wizard" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function NewAssessmentPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "wizard" });

  return (
    <div className="container max-w-4xl mx-auto py-8">
      {/* Page Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("pageTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("pageDescription")}</p>
      </div>

      {/* Wizard Component */}
      <AssessmentWizard />
    </div>
  );
}
