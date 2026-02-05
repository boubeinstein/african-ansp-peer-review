/**
 * Training Module Detail Page (Server Component)
 *
 * Displays a single training module with its topics and resources.
 * The [code] parameter is the module code (M0, M1, M2, etc.)
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TrainingDetailClient } from "./training-detail-client";

// =============================================================================
// TYPES
// =============================================================================

interface TrainingDetailPageProps {
  params: Promise<{
    locale: string;
    code: string;
  }>;
}

// =============================================================================
// LOADING FALLBACK
// =============================================================================

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default async function TrainingDetailPage({
  params,
}: TrainingDetailPageProps) {
  const { locale, code } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  // Check system-wide feature flag
  const systemSettings = await db.systemSettings.findUnique({
    where: { id: "system-settings" },
    select: { trainingModuleEnabled: true },
  });

  if (systemSettings && !systemSettings.trainingModuleEnabled) {
    redirect(`/${locale}/dashboard`);
  }

  // Check user-level preference
  const preferences = await db.userPreferences.findUnique({
    where: { userId: session.user.id },
    select: { showTrainingModule: true },
  });

  if (preferences && preferences.showTrainingModule === false) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="container mx-auto py-6 px-4 lg:px-6">
      <Suspense fallback={<LoadingFallback />}>
        <TrainingDetailClient code={code} />
      </Suspense>
    </div>
  );
}

// =============================================================================
// METADATA
// =============================================================================

export async function generateMetadata({ params }: TrainingDetailPageProps) {
  const { locale, code } = await params;
  const t = await getTranslations({ locale, namespace: "training" });

  return {
    title: `${code.toUpperCase()} - ${t("title")}`,
    description: t("description"),
  };
}
