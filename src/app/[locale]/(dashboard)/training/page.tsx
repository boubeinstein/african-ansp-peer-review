import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TrainingPageClient } from "./training-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("training");
  return {
    title: t("title"),
    description: t("description"),
  };
}

interface TrainingPageProps {
  params: Promise<{ locale: string }>;
}

export default async function TrainingPage({ params }: TrainingPageProps) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  // Check system-wide feature flag first
  const systemSettings = await db.systemSettings.findUnique({
    where: { id: "system-settings" },
    select: { trainingModuleEnabled: true },
  });

  if (systemSettings && !systemSettings.trainingModuleEnabled) {
    redirect(`/${locale}/dashboard`);
  }

  // Check if user has showTrainingModule enabled
  const preferences = await db.userPreferences.findUnique({
    where: { userId: session.user.id },
    select: { showTrainingModule: true },
  });

  // If preferences exist and showTrainingModule is false, redirect to dashboard
  if (preferences && preferences.showTrainingModule === false) {
    redirect(`/${locale}/dashboard`);
  }

  return <TrainingPageClient />;
}
