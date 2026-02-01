"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { BestPracticeCategory } from "@/types/prisma-enums";
import { useCallback, useState, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";

interface BestPracticesFiltersProps {
  locale: string;
  search: string;
  category?: BestPracticeCategory;
  auditArea?: string;
  sortBy: string;
  categories: BestPracticeCategory[];
  auditAreas: string[];
}

const CATEGORY_LABELS: Record<BestPracticeCategory, { en: string; fr: string }> =
  {
    SAFETY_MANAGEMENT: {
      en: "Safety Management",
      fr: "Gestion de la securite",
    },
    OPERATIONAL_EFFICIENCY: {
      en: "Operational Efficiency",
      fr: "Efficacite operationnelle",
    },
    TRAINING_COMPETENCY: {
      en: "Training & Competency",
      fr: "Formation et competence",
    },
    TECHNOLOGY_INNOVATION: {
      en: "Technology & Innovation",
      fr: "Technologie et innovation",
    },
    REGULATORY_COMPLIANCE: {
      en: "Regulatory Compliance",
      fr: "Conformite reglementaire",
    },
    STAKEHOLDER_ENGAGEMENT: {
      en: "Stakeholder Engagement",
      fr: "Engagement des parties prenantes",
    },
  };

export function BestPracticesFilters({
  locale,
  search,
  category,
  auditArea,
  sortBy,
  categories,
  auditAreas,
}: BestPracticesFiltersProps) {
  const t = useTranslations("bestPractices.filters");
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(search);

  const updateFilters = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams();

      // Preserve existing params
      if (search && !("search" in updates)) params.set("search", search);
      if (category && !("category" in updates))
        params.set("category", category);
      if (auditArea && !("auditArea" in updates))
        params.set("auditArea", auditArea);
      if (sortBy !== "newest" && !("sortBy" in updates))
        params.set("sortBy", sortBy);

      // Apply updates
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      // Reset to page 1 when filters change
      params.delete("page");

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, search, category, auditArea, sortBy]
  );

  const debouncedSearch = useDebouncedCallback((value: string) => {
    updateFilters({ search: value || undefined });
  }, 300);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    debouncedSearch(value);
  };

  const clearFilters = () => {
    setSearchValue("");
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasFilters = search || category || auditArea || sortBy !== "newest";

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category Filter */}
      <Select
        value={category || "all"}
        onValueChange={(value) =>
          updateFilters({ category: value === "all" ? undefined : value })
        }
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t("allCategories")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allCategories")}</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {CATEGORY_LABELS[cat]?.[locale as "en" | "fr"] || cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Audit Area Filter */}
      {auditAreas.length > 0 && (
        <Select
          value={auditArea || "all"}
          onValueChange={(value) =>
            updateFilters({ auditArea: value === "all" ? undefined : value })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("allAreas")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allAreas")}</SelectItem>
            {auditAreas.map((area) => (
              <SelectItem key={area} value={area}>
                {area}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Sort By */}
      <Select
        value={sortBy}
        onValueChange={(value) => updateFilters({ sortBy: value })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">{t("sortNewest")}</SelectItem>
          <SelectItem value="popular">{t("sortPopular")}</SelectItem>
          <SelectItem value="mostAdopted">{t("sortMostAdopted")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-4 w-4" />
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );
}
