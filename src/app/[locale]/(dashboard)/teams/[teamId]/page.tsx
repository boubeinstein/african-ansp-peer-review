import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TeamDetailClient } from "./team-detail-client";

interface TeamDetailPageProps {
  params: Promise<{ locale: string; teamId: string }>;
}

export async function generateMetadata({
  params,
}: TeamDetailPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "teams" });
  return {
    title: t("detail.title"),
    description: t("detail.description"),
  };
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { locale, teamId } = await params;
  setRequestLocale(locale);

  return <TeamDetailClient teamId={teamId} />;
}
