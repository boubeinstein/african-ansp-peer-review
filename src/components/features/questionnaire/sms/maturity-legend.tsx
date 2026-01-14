"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { MATURITY_LEVELS, getMaturityLevelsArray } from "@/lib/questionnaire/constants";
import type { MaturityLevel } from "@prisma/client";

interface MaturityLegendProps {
  locale: string;
  defaultOpen?: boolean;
  compact?: boolean;
}

// Maturity level color configuration
export const maturityColors: Record<
  MaturityLevel,
  {
    bg: string;
    text: string;
    border: string;
    fill: string;
  }
> = {
  LEVEL_A: {
    bg: "bg-red-100 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-300 dark:border-red-700",
    fill: "bg-red-500",
  },
  LEVEL_B: {
    bg: "bg-orange-100 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-300 dark:border-orange-700",
    fill: "bg-orange-500",
  },
  LEVEL_C: {
    bg: "bg-yellow-100 dark:bg-yellow-950/40",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-300 dark:border-yellow-700",
    fill: "bg-yellow-500",
  },
  LEVEL_D: {
    bg: "bg-lime-100 dark:bg-lime-950/40",
    text: "text-lime-700 dark:text-lime-400",
    border: "border-lime-300 dark:border-lime-700",
    fill: "bg-lime-500",
  },
  LEVEL_E: {
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-300 dark:border-emerald-700",
    fill: "bg-emerald-500",
  },
};

export function MaturityLegend({
  locale,
  defaultOpen = true,
  compact = false,
}: MaturityLegendProps) {
  const t = useTranslations("smsBrowser");
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const levels = getMaturityLevelsArray();
  const lang = locale === "fr" ? "fr" : "en";

  if (compact) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {levels.map((level) => {
          const colors = maturityColors[level.code];
          return (
            <div key={level.code} className="flex items-center gap-1.5">
              <div
                className={cn(
                  "w-6 h-6 rounded flex items-center justify-center text-xs font-bold",
                  colors.bg,
                  colors.text
                )}
              >
                {level.level}
              </div>
              <span className="text-xs text-muted-foreground">
                {level.name[lang]}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-emerald-600" />
                <span className="font-medium text-sm">
                  {t("maturity.legend")}
                </span>
              </div>
              <div className="flex items-center gap-4">
                {/* Compact view when closed */}
                {!isOpen && (
                  <div className="hidden sm:flex items-center gap-2">
                    {levels.map((level) => {
                      const colors = maturityColors[level.code];
                      return (
                        <div
                          key={level.code}
                          className={cn(
                            "w-6 h-6 rounded flex items-center justify-center text-xs font-bold",
                            colors.bg,
                            colors.text
                          )}
                        >
                          {level.level}
                        </div>
                      );
                    })}
                  </div>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="grid gap-3 sm:grid-cols-5">
              {levels.map((level) => {
                const colors = maturityColors[level.code];
                return (
                  <div
                    key={level.code}
                    className={cn(
                      "rounded-lg p-3 border",
                      colors.bg,
                      colors.border
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={cn(
                          "w-8 h-8 rounded flex items-center justify-center text-sm font-bold",
                          colors.fill,
                          "text-white"
                        )}
                      >
                        {level.level}
                      </div>
                      <span className={cn("font-semibold text-sm", colors.text)}>
                        {level.name[lang]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {level.description[lang]}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Helper component to show a single maturity level badge
interface MaturityBadgeProps {
  level: MaturityLevel;
  locale: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function MaturityBadge({
  level,
  locale,
  showLabel = false,
  size = "md",
}: MaturityBadgeProps) {
  const lang = locale === "fr" ? "fr" : "en";
  const meta = MATURITY_LEVELS[level];
  const colors = maturityColors[level];

  const sizeClasses = {
    sm: "w-5 h-5 text-[10px]",
    md: "w-6 h-6 text-xs",
    lg: "w-8 h-8 text-sm",
  };

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          "rounded flex items-center justify-center font-bold",
          colors.fill,
          "text-white",
          sizeClasses[size]
        )}
      >
        {meta.level}
      </div>
      {showLabel && (
        <span className={cn("text-sm", colors.text)}>{meta.name[lang]}</span>
      )}
    </div>
  );
}
