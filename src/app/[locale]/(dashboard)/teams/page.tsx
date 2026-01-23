import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TeamsListClient } from "./teams-list-client";

interface TeamsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: TeamsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "teams" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function TeamsPage({ params }: TeamsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <TeamsListClient />;
}
