"use client";

/**
 * Training Detail Client Component
 *
 * Displays a single training module with its topics and resources.
 * Handles data fetching and navigation between modules.
 */

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

import { TrainingModuleCard } from "@/components/features/training/training-module-card";
import {
  TrainingTopicList,
  TrainingResourceGrid,
} from "@/components/features/training/training-topic-list";

// =============================================================================
// TYPES
// =============================================================================

interface TrainingDetailClientProps {
  code: string;
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Module Card Skeleton */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
        <div className="mt-6 pt-4 border-t space-y-3">
          <Skeleton className="h-4 w-24" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          ))}
        </div>
      </Card>

      {/* Topics Skeleton */}
      <Card className="p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-lg">
              <div className="flex items-start gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Navigation Skeleton */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

// =============================================================================
// ERROR STATE
// =============================================================================

function ErrorState({ message }: { message: string }) {
  const t = useTranslations("training");
  const locale = useLocale();

  return (
    <Card className="p-12">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="p-4 bg-red-100 dark:bg-red-950 rounded-full mb-4">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t("errorTitle")}</h3>
        <p className="text-muted-foreground mb-6">{message}</p>
        <Button asChild>
          <Link href={`/${locale}/training`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToTraining")}
          </Link>
        </Button>
      </div>
    </Card>
  );
}

// =============================================================================
// NOT FOUND STATE
// =============================================================================

function NotFoundState() {
  const t = useTranslations("training");
  const locale = useLocale();

  return (
    <Card className="p-12">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="p-4 bg-muted rounded-full mb-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t("moduleNotFound")}</h3>
        <p className="text-muted-foreground mb-6">
          {t("moduleNotFoundDescription")}
        </p>
        <Button asChild>
          <Link href={`/${locale}/training`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToTraining")}
          </Link>
        </Button>
      </div>
    </Card>
  );
}

// =============================================================================
// MODULE NAVIGATION
// =============================================================================

interface ModuleNavigationProps {
  currentCode: string;
  modules: Array<{ code: string; titleEn: string; titleFr: string }>;
  locale: string;
}

function ModuleNavigation({ currentCode, modules, locale }: ModuleNavigationProps) {
  const t = useTranslations("training");

  // Find current module index
  const currentIndex = modules.findIndex(
    (m) => m.code.toUpperCase() === currentCode.toUpperCase()
  );

  const prevModule = currentIndex > 0 ? modules[currentIndex - 1] : null;
  const nextModule = currentIndex < modules.length - 1 ? modules[currentIndex + 1] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t">
      {/* Previous */}
      <div className="w-full sm:w-auto">
        {prevModule ? (
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/${locale}/training/${prevModule.code.toLowerCase()}`}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("previousModule")}: </span>
              {prevModule.code}
            </Link>
          </Button>
        ) : (
          <div className="w-32" />
        )}
      </div>

      {/* Back to list */}
      <Button asChild variant="ghost">
        <Link href={`/${locale}/training`}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("backToTraining")}
        </Link>
      </Button>

      {/* Next */}
      <div className="w-full sm:w-auto">
        {nextModule ? (
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/${locale}/training/${nextModule.code.toLowerCase()}`}>
              <span className="hidden sm:inline">{t("nextModule")}: </span>
              {nextModule.code}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        ) : (
          <div className="w-32" />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TrainingDetailClient({ code }: TrainingDetailClientProps) {
  const t = useTranslations("training");
  const locale = useLocale();

  // Fetch the specific module by code
  const {
    data: module,
    isLoading,
    error,
  } = trpc.training.getByCode.useQuery(
    { code: code.toUpperCase() },
    {
      retry: false,
    }
  );

  // Fetch all modules for navigation
  const { data: allModules } = trpc.training.list.useQuery();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  if (!module) {
    return <NotFoundState />;
  }

  const title = locale === "fr" ? module.titleFr : module.titleEn;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link
          href={`/${locale}/training`}
          className="hover:text-foreground transition-colors"
        >
          {t("title")}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">
          {module.code} - {title}
        </span>
      </nav>

      {/* Module Header Card */}
      <TrainingModuleCard module={module} locale={locale} />

      {/* Topics */}
      {module.topics && module.topics.length > 0 && (
        <TrainingTopicList topics={module.topics} locale={locale} />
      )}

      {/* Resources */}
      {module.resources && module.resources.length > 0 && (
        <TrainingResourceGrid resources={module.resources} locale={locale} />
      )}

      {/* Navigation */}
      {allModules && allModules.length > 1 && (
        <ModuleNavigation
          currentCode={code}
          modules={allModules.map((m) => ({
            code: m.code,
            titleEn: m.titleEn,
            titleFr: m.titleFr,
          }))}
          locale={locale}
        />
      )}
    </div>
  );
}

export default TrainingDetailClient;
