import { getTranslations } from "next-intl/server";
import { CreateAssessmentWizard } from "@/components/features/assessments/create-assessment-wizard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "assessments.create" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function NewAssessmentPage() {
  const t = await getTranslations("assessments.create");

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("pageTitle")}</h1>
        <p className="text-muted-foreground mt-2">{t("pageDescription")}</p>
      </div>

      <CreateAssessmentWizard />
    </div>
  );
}
