import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NewFindingClient } from "./new-finding-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("findings");
  return {
    title: t("form.createTitle"),
    description: t("form.createDescription"),
  };
}

interface NewFindingPageProps {
  searchParams: Promise<{
    reviewId?: string;
  }>;
}

export default async function NewFindingPage({ searchParams }: NewFindingPageProps) {
  const t = await getTranslations("findings");
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("form.createTitle")}</h1>
        <p className="text-muted-foreground">{t("form.createDescription")}</p>
      </div>
      <NewFindingClient reviewId={params.reviewId} />
    </div>
  );
}
