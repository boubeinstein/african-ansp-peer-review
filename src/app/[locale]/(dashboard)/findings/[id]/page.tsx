import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FindingDetailClient } from "./finding-detail-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("findings");
  return {
    title: t("actions.view"),
    description: t("description"),
  };
}

interface FindingDetailPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export default async function FindingDetailPage({ params }: FindingDetailPageProps) {
  const { id } = await params;

  return <FindingDetailClient findingId={id} />;
}
