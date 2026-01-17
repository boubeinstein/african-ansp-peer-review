"use client";

/**
 * Matching Empty State Component
 *
 * Provides actionable guidance when no results found,
 * team incomplete, or initial state before search.
 */

import { useTranslations } from "next-intl";
import { SearchX, Users, AlertTriangle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export type EmptyStateType =
  | "initial"
  | "no-results"
  | "no-eligible"
  | "incomplete-team"
  | "no-selection";

export interface MatchingEmptyStateProps {
  type: EmptyStateType;
  eligibleCount?: number;
  requiredCount?: number;
  missingExpertise?: string[];
  onExpandSearch?: () => void;
  onClearFilters?: () => void;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MatchingEmptyState({
  type,
  eligibleCount = 0,
  requiredCount = 4,
  missingExpertise = [],
  onExpandSearch,
  onClearFilters,
  className,
}: MatchingEmptyStateProps) {
  const t = useTranslations("reviewer.matching.emptyState");

  const getConfig = () => {
    switch (type) {
      case "initial":
        return {
          icon: Search,
          iconBg: "bg-primary/10",
          iconColor: "text-primary",
          title: t("initial.title"),
          description: t("initial.description"),
          actions: null,
        };

      case "no-results":
        return {
          icon: SearchX,
          iconBg: "bg-orange-100 dark:bg-orange-900/30",
          iconColor: "text-orange-600 dark:text-orange-400",
          title: t("noResults.title"),
          description: t("noResults.description"),
          actions: (
            <div className="flex flex-wrap gap-2 justify-center">
              {onClearFilters && (
                <Button variant="outline" onClick={onClearFilters}>
                  {t("noResults.clearFilters")}
                </Button>
              )}
              {onExpandSearch && (
                <Button onClick={onExpandSearch}>
                  {t("noResults.expandSearch")}
                </Button>
              )}
            </div>
          ),
        };

      case "no-eligible":
        return {
          icon: AlertTriangle,
          iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
          iconColor: "text-yellow-600 dark:text-yellow-400",
          title: t("noEligible.title"),
          description: t("noEligible.description"),
          actions: (
            <div className="space-y-3 text-left max-w-sm mx-auto">
              <p className="text-sm font-medium">{t("noEligible.suggestions")}</p>
              <ul className="text-sm list-disc list-inside text-muted-foreground space-y-1">
                <li>{t("noEligible.suggestion1")}</li>
                <li>{t("noEligible.suggestion2")}</li>
                <li>{t("noEligible.suggestion3")}</li>
              </ul>
              {onExpandSearch && (
                <Button variant="outline" size="sm" onClick={onExpandSearch} className="mt-2">
                  {t("noResults.expandSearch")}
                </Button>
              )}
            </div>
          ),
        };

      case "incomplete-team":
        const needed = requiredCount - eligibleCount;
        return {
          icon: Users,
          iconBg: "bg-blue-100 dark:bg-blue-900/30",
          iconColor: "text-blue-600 dark:text-blue-400",
          title: t("incompleteTeam.title", { needed, required: requiredCount }),
          description: t("incompleteTeam.description"),
          actions: missingExpertise.length > 0 && (
            <div className="text-sm space-y-2">
              <p className="font-medium">{t("incompleteTeam.missing")}</p>
              <div className="flex flex-wrap gap-1 justify-center">
                {missingExpertise.map((exp) => (
                  <span
                    key={exp}
                    className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded text-xs"
                  >
                    {exp}
                  </span>
                ))}
              </div>
            </div>
          ),
        };

      case "no-selection":
        return {
          icon: Users,
          iconBg: "bg-muted",
          iconColor: "text-muted-foreground",
          title: t("noSelection.title"),
          description: t("noSelection.description"),
          actions: null,
        };

      default:
        return {
          icon: Search,
          iconBg: "bg-muted",
          iconColor: "text-muted-foreground",
          title: "",
          description: "",
          actions: null,
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mb-4",
            config.iconBg
          )}
        >
          <Icon className={cn("w-8 h-8", config.iconColor)} />
        </div>
        <h3 className="text-lg font-medium mb-2">{config.title}</h3>
        <p className="text-muted-foreground mb-4 max-w-md">{config.description}</p>
        {config.actions}
      </CardContent>
    </Card>
  );
}

export default MatchingEmptyState;
