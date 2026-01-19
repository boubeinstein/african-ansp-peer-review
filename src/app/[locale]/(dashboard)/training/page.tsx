import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TrainingPageClient } from "./training-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("training");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function TrainingPage() {
  return <TrainingPageClient />;
}
