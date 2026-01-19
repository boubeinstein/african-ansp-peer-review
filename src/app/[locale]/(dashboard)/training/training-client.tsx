"use client";

/**
 * Training Page Client Component
 *
 * Displays the 6 training modules in a responsive grid layout.
 * Each module card shows icon, title, description, and links to detail page.
 */

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Network,
  GitBranch,
  ClipboardCheck,
  Shield,
  FlaskConical,
  GraduationCap,
  ArrowRight,
  FileText,
  Users,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

// =============================================================================
// ICON MAPPING
// =============================================================================

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen,
  Network,
  GitBranch,
  ClipboardCheck,
  Shield,
  FlaskConical,
  GraduationCap,
  FileText,
  Users,
};

// =============================================================================
// MODULE CARD COLORS
// =============================================================================

const MODULE_COLORS: Record<number, { bg: string; icon: string; border: string }> = {
  0: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    icon: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  1: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    icon: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
  },
  2: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    icon: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  3: {
    bg: "bg-green-50 dark:bg-green-950/30",
    icon: "text-green-600 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
  },
  4: {
    bg: "bg-red-50 dark:bg-red-950/30",
    icon: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
  },
  5: {
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    icon: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-200 dark:border-cyan-800",
  },
};

function getModuleColors(moduleNumber: number) {
  return MODULE_COLORS[moduleNumber] || MODULE_COLORS[0];
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function ModuleCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <Skeleton className="h-6 w-10" />
        </div>
        <Skeleton className="h-6 w-3/4 mt-3" />
        <Skeleton className="h-4 w-full mt-2" />
        <Skeleton className="h-4 w-2/3 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6 mt-1" />
        <Skeleton className="h-9 w-full mt-4" />
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats Skeleton */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ModuleCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState() {
  const t = useTranslations("training");

  return (
    <Card className="p-12">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="p-4 bg-muted rounded-full mb-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t("noModules")}</h3>
        <p className="text-muted-foreground max-w-md">
          {t("noModulesDescription")}
        </p>
      </div>
    </Card>
  );
}

// =============================================================================
// MODULE CARD
// =============================================================================

interface TrainingModuleData {
  id: string;
  moduleNumber: number;
  code: string;
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
  objectivesEn: string[];
  objectivesFr: string[];
  iconName: string | null;
  sortOrder: number;
  topics: Array<{ id: string }>;
  resources: Array<{ id: string }>;
}

interface ModuleCardProps {
  module: TrainingModuleData;
  locale: string;
}

function ModuleCard({ module, locale }: ModuleCardProps) {
  const t = useTranslations("training");
  const colors = getModuleColors(module.moduleNumber);

  // Get the icon component outside of render to avoid React hooks lint error
  const iconName = module.iconName;
  const IconComponent = iconName && ICON_MAP[iconName] ? ICON_MAP[iconName] : BookOpen;

  const title = locale === "fr" ? module.titleFr : module.titleEn;
  const description = locale === "fr" ? module.descriptionFr : module.descriptionEn;
  const objectives = locale === "fr" ? module.objectivesFr : module.objectivesEn;

  // Truncate description to ~100 characters
  const truncatedDescription =
    description.length > 120
      ? description.substring(0, 120).trim() + "..."
      : description;

  return (
    <Card
      className={cn(
        "h-full flex flex-col transition-all duration-200 hover:shadow-lg hover:-translate-y-1",
        colors.border
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={cn("p-3 rounded-lg", colors.bg)}>
            <IconComponent className={cn("h-6 w-6", colors.icon)} />
          </div>
          <Badge variant="secondary" className="font-mono">
            {module.code}
          </Badge>
        </div>
        <CardTitle className="text-lg mt-3">{title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {truncatedDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {/* Objectives preview */}
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {t("objectives")}
          </p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {objectives.slice(0, 2).map((objective, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span className="line-clamp-1">{objective}</span>
              </li>
            ))}
            {objectives.length > 2 && (
              <li className="text-xs text-muted-foreground/70">
                +{objectives.length - 2} {t("more")}
              </li>
            )}
          </ul>
        </div>

        {/* Stats & Action */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {module.topics.length > 0 && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {module.topics.length} {t("topics")}
                </span>
              )}
              {module.resources.length > 0 && (
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {module.resources.length} {t("resources")}
                </span>
              )}
            </div>
          </div>
          <Button asChild className="w-full" variant="outline">
            <Link href={`/${locale}/training/${module.code.toLowerCase()}`}>
              {t("viewModule")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TrainingPageClient() {
  const t = useTranslations("training");
  const locale = useLocale();

  const { data: modules, isLoading, error } = trpc.training.list.useQuery();

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 lg:px-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4 lg:px-6">
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-red-100 dark:bg-red-950 rounded-full mb-4">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t("errorTitle")}</h3>
            <p className="text-muted-foreground">{error.message}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!modules || modules.length === 0) {
    return (
      <div className="container mx-auto py-6 px-4 lg:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("description")}</p>
        </div>
        <EmptyState />
      </div>
    );
  }

  // Calculate stats
  const totalTopics = modules.reduce((acc, m) => acc + m.topics.length, 0);
  const totalResources = modules.reduce((acc, m) => acc + m.resources.length, 0);

  return (
    <div className="container mx-auto py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        </div>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Badge variant="secondary" className="text-sm py-1.5 px-3">
          <BookOpen className="h-4 w-4 mr-2" />
          {modules.length} {t("modules")}
        </Badge>
        {totalTopics > 0 && (
          <Badge variant="outline" className="text-sm py-1.5 px-3">
            <FileText className="h-4 w-4 mr-2" />
            {totalTopics} {t("topics")}
          </Badge>
        )}
        {totalResources > 0 && (
          <Badge variant="outline" className="text-sm py-1.5 px-3">
            <Users className="h-4 w-4 mr-2" />
            {totalResources} {t("resources")}
          </Badge>
        )}
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <ModuleCard
            key={module.id}
            module={module as TrainingModuleData}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}

export default TrainingPageClient;
