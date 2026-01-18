import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FindingEditClient } from "./finding-edit-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("findings");
  return {
    title: t("form.editTitle"),
    description: t("form.editDescription"),
  };
}

interface FindingEditPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export default async function FindingEditPage({ params }: FindingEditPageProps) {
  const t = await getTranslations("findings");
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("form.editTitle")}</h1>
        <p className="text-muted-foreground">{t("form.editDescription")}</p>
      </div>
      <FindingEditClient findingId={id} />
    </div>
  );
}
