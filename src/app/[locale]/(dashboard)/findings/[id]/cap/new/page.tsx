import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NewCAPClient } from "./new-cap-client";

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cap");
  return {
    title: t("create"),
  };
}

export default async function NewCAPPage({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations("cap");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("create")}</h1>
        <p className="text-muted-foreground">{t("form.createDescription")}</p>
      </div>

      <NewCAPClient findingId={id} />
    </div>
  );
}
