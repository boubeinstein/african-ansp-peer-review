"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { MaturityLevel } from "@prisma/client";

interface MaturityLevelBadgeProps {
  level: MaturityLevel | string | null | undefined;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
}

const LEVEL_COLORS: Record<string, string> = {
  LEVEL_A: "bg-red-100 text-red-800 border-red-300",
  LEVEL_B: "bg-orange-100 text-orange-800 border-orange-300",
  LEVEL_C: "bg-yellow-100 text-yellow-800 border-yellow-300",
  LEVEL_D: "bg-blue-100 text-blue-800 border-blue-300",
  LEVEL_E: "bg-green-100 text-green-800 border-green-300",
  A: "bg-red-100 text-red-800 border-red-300",
  B: "bg-orange-100 text-orange-800 border-orange-300",
  C: "bg-yellow-100 text-yellow-800 border-yellow-300",
  D: "bg-blue-100 text-blue-800 border-blue-300",
  E: "bg-green-100 text-green-800 border-green-300",
};

const SIZE_CLASSES = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
  xl: "h-14 w-14 text-xl",
};

export function MaturityLevelBadge({
  level,
  size = "md",
  showLabel = false,
}: MaturityLevelBadgeProps) {
  const t = useTranslations("assessment.score");

  if (!level) {
    return (
      <div
        className={cn(
          "rounded-full border-2 flex items-center justify-center font-bold",
          "bg-gray-100 text-gray-400 border-gray-300",
          SIZE_CLASSES[size]
        )}
      >
        -
      </div>
    );
  }

  // Normalize the level (handle both "LEVEL_A" and "A" formats)
  const normalizedLevel = level.replace("LEVEL_", "");
  const colorKey = level.startsWith("LEVEL_") ? level : `LEVEL_${level}`;

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "rounded-full border-2 flex items-center justify-center font-bold",
          LEVEL_COLORS[colorKey] || "bg-gray-100 text-gray-400 border-gray-300",
          SIZE_CLASSES[size]
        )}
      >
        {normalizedLevel}
      </div>
      {showLabel && (
        <span className="text-sm text-muted-foreground">
          {t(`maturityLevels.${normalizedLevel}`)}
        </span>
      )}
    </div>
  );
}

export function getMaturityLevelName(
  level: MaturityLevel | string | null | undefined,
  locale: string
): string {
  if (!level) return "-";

  const normalizedLevel = level.replace("LEVEL_", "");

  const names: Record<string, Record<string, string>> = {
    en: {
      A: "Initial / Ad-hoc",
      B: "Defined",
      C: "Managed",
      D: "Assured",
      E: "Continuous Improvement",
    },
    fr: {
      A: "Initial / Ad-hoc",
      B: "Défini",
      C: "Géré",
      D: "Assuré",
      E: "Amélioration Continue",
    },
  };

  return names[locale]?.[normalizedLevel] || names.en[normalizedLevel] || normalizedLevel;
}
