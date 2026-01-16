"use client";

/**
 * Reviewer Search Filters Component
 *
 * Collapsible filter panel for reviewer directory.
 * Supports multi-select filters for expertise, languages, and status.
 */

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  X,
} from "lucide-react";
import {
  LANGUAGE_LABELS,
  SELECTION_STATUS_LABELS,
  getExpertiseAreasByCategory,
} from "@/lib/reviewer/labels";
import type { ReviewerFilterOptions } from "@/types/reviewer";
import type {
  ExpertiseArea,
  Language,
  ReviewerSelectionStatus,
} from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

interface ReviewerSearchFiltersProps {
  filters: ReviewerFilterOptions;
  onFiltersChange: (filters: ReviewerFilterOptions) => void;
  activeFilterCount: number;
  onClearFilters: () => void;
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const LANGUAGES: Language[] = ["EN", "FR", "PT", "AR", "ES"];
const SELECTION_STATUSES: ReviewerSelectionStatus[] = [
  "NOMINATED",
  "UNDER_REVIEW",
  "SELECTED",
  "INACTIVE",
  "WITHDRAWN",
  "REJECTED",
];

// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewerSearchFilters({
  filters,
  onFiltersChange,
  activeFilterCount,
  onClearFilters,
  className,
}: ReviewerSearchFiltersProps) {
  const t = useTranslations("reviewers");
  const locale = useLocale() as "en" | "fr";

  const [isOpen, setIsOpen] = useState(false);
  const [expertiseOpen, setExpertiseOpen] = useState(true);
  const [languagesOpen, setLanguagesOpen] = useState(true);
  const [statusOpen, setStatusOpen] = useState(true);
  const [otherOpen, setOtherOpen] = useState(true);

  const expertiseGroups = getExpertiseAreasByCategory(locale);

  function toggleExpertise(area: ExpertiseArea) {
    const current = filters.expertiseAreas || [];
    const updated = current.includes(area)
      ? current.filter((a) => a !== area)
      : [...current, area];
    onFiltersChange({
      ...filters,
      expertiseAreas: updated.length > 0 ? updated : undefined,
    });
  }

  function toggleLanguage(lang: Language) {
    const current = filters.languages || [];
    const updated = current.includes(lang)
      ? current.filter((l) => l !== lang)
      : [...current, lang];
    onFiltersChange({
      ...filters,
      languages: updated.length > 0 ? updated : undefined,
    });
  }

  function toggleStatus(status: ReviewerSelectionStatus) {
    const current = filters.selectionStatus || [];
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onFiltersChange({
      ...filters,
      selectionStatus: updated.length > 0 ? updated : undefined,
    });
  }

  function toggleAvailability(checked: boolean) {
    onFiltersChange({
      ...filters,
      isAvailable: checked ? true : undefined,
    });
  }

  function toggleLeadQualified(checked: boolean) {
    onFiltersChange({
      ...filters,
      isLeadQualified: checked ? true : undefined,
    });
  }

  const filterContent = (
    <div className="space-y-4">
      {/* Expertise Areas */}
      <Collapsible open={expertiseOpen} onOpenChange={setExpertiseOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <span className="font-medium">{t("filters.expertise")}</span>
            {expertiseOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-3">
          {expertiseGroups.map((group) => (
            <div key={group.category}>
              <p className="text-xs text-muted-foreground mb-2">
                {group.category}
              </p>
              <div className="space-y-1.5">
                {group.areas.map((area) => (
                  <div key={area.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`exp-${area.value}`}
                      checked={filters.expertiseAreas?.includes(area.value)}
                      onCheckedChange={() => toggleExpertise(area.value)}
                    />
                    <Label
                      htmlFor={`exp-${area.value}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      <span className="font-mono text-xs text-muted-foreground mr-1">
                        {area.abbrev}
                      </span>
                      {area.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Languages */}
      <Collapsible open={languagesOpen} onOpenChange={setLanguagesOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <span className="font-medium">{t("filters.languages")}</span>
            {languagesOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-1.5">
          {LANGUAGES.map((lang) => (
            <div key={lang} className="flex items-center space-x-2">
              <Checkbox
                id={`lang-${lang}`}
                checked={filters.languages?.includes(lang)}
                onCheckedChange={() => toggleLanguage(lang)}
              />
              <Label
                htmlFor={`lang-${lang}`}
                className="text-sm font-normal cursor-pointer"
              >
                {LANGUAGE_LABELS[lang][locale]}
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Selection Status */}
      <Collapsible open={statusOpen} onOpenChange={setStatusOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <span className="font-medium">{t("filters.status")}</span>
            {statusOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-1.5">
          {SELECTION_STATUSES.map((status) => (
            <div key={status} className="flex items-center space-x-2">
              <Checkbox
                id={`status-${status}`}
                checked={filters.selectionStatus?.includes(status)}
                onCheckedChange={() => toggleStatus(status)}
              />
              <Label
                htmlFor={`status-${status}`}
                className="text-sm font-normal cursor-pointer"
              >
                {SELECTION_STATUS_LABELS[status][locale]}
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Other Filters */}
      <Collapsible open={otherOpen} onOpenChange={setOtherOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <span className="font-medium">{t("filters.other")}</span>
            {otherOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="available" className="text-sm font-normal">
              {t("filters.availableOnly")}
            </Label>
            <Switch
              id="available"
              checked={filters.isAvailable === true}
              onCheckedChange={toggleAvailability}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="lead" className="text-sm font-normal">
              {t("filters.leadQualifiedOnly")}
            </Label>
            <Switch
              id="lead"
              checked={filters.isLeadQualified === true}
              onCheckedChange={toggleLeadQualified}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className={cn("gap-2", className)}>
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">{t("search.filters")}</span>
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[320px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>{t("filters.title")}</SheetTitle>
          <SheetDescription>{t("filters.description")}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] mt-4 pr-4">
          {filterContent}
        </ScrollArea>

        <SheetFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => {
              onClearFilters();
              setIsOpen(false);
            }}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            {t("search.clearFilters")}
          </Button>
          <Button onClick={() => setIsOpen(false)} className="flex-1">
            {t("filters.apply")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default ReviewerSearchFilters;
