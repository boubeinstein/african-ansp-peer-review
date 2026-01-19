"use client";

/**
 * Training Module Card Component
 *
 * Displays the header information for a training module including
 * icon, code, title, description, and learning objectives.
 */

import { useTranslations } from "next-intl";
import {
  BookOpen,
  Network,
  GitBranch,
  ClipboardCheck,
  Shield,
  FlaskConical,
  GraduationCap,
  FileText,
  Users,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// =============================================================================
// TYPES
// =============================================================================

interface TrainingModuleCardProps {
  module: {
    moduleNumber: number;
    code: string;
    titleEn: string;
    titleFr: string;
    descriptionEn: string;
    descriptionFr: string;
    objectivesEn: string[];
    objectivesFr: string[];
    iconName: string | null;
  };
  locale: string;
  className?: string;
}

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
// MODULE COLORS
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
  return MODULE_COLORS[moduleNumber % 6] || MODULE_COLORS[0];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function TrainingModuleCard({
  module,
  locale,
  className,
}: TrainingModuleCardProps) {
  const t = useTranslations("training");
  const colors = getModuleColors(module.moduleNumber);

  const IconComponent =
    module.iconName && ICON_MAP[module.iconName]
      ? ICON_MAP[module.iconName]
      : BookOpen;

  const title = locale === "fr" ? module.titleFr : module.titleEn;
  const description = locale === "fr" ? module.descriptionFr : module.descriptionEn;
  const objectives = locale === "fr" ? module.objectivesFr : module.objectivesEn;

  return (
    <Card className={cn("", colors.border, className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <div className={cn("p-4 rounded-xl shrink-0", colors.bg)}>
            <IconComponent className={cn("h-8 w-8", colors.icon)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="font-mono text-sm">
                {module.code}
              </Badge>
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription className="mt-2 text-base">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {objectives.length > 0 && (
        <CardContent className="pt-0">
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t("objectives")}
            </h3>
            <ul className="space-y-2">
              {objectives.map((objective, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm">{objective}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default TrainingModuleCard;
