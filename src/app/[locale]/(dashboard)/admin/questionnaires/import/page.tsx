import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { QuestionnaireImportWizard } from "@/components/features/admin/questionnaire-import-wizard";

interface ImportPageProps {
  params: Promise<{
    locale: string;
  }>;
}

// Admin roles that can access this page
const ADMIN_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"];

export async function generateMetadata({ params }: ImportPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.import" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function ImportPage({ params }: ImportPageProps) {
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

  const t = await getTranslations({ locale, namespace: "admin.import" });

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Back Button */}
      <Button variant="ghost" asChild className="mb-4">
        <Link href={`/${locale}/admin/questionnaires`}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          {t("backToList")}
        </Link>
      </Button>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h1>
        <p className="text-muted-foreground">{t("pageDescription")}</p>
      </div>

      {/* Import Wizard */}
      <QuestionnaireImportWizard locale={locale} />
    </div>
  );
}
