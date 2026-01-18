import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CAPsClient } from "./caps-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cap");
  return {
    title: t("title"),
    description: t("pageDescription"),
  };
}

export default async function CAPsPage() {
  const t = await getTranslations("cap");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("pageDescription")}</p>
        </div>
      </div>
      <CAPsClient />
    </div>
  );
}
