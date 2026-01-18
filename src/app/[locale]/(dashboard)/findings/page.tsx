import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FindingsClient } from "./findings-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("findings");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function FindingsPage() {
  const t = await getTranslations("findings");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
      </div>
      <FindingsClient />
    </div>
  );
}
