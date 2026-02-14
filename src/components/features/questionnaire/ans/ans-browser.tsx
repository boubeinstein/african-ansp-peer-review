"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ChevronRight,
  FileText,
  Filter,
  Home,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ReviewAreaFilter } from "./review-area-filter";
import { PQList } from "./pq-list";
import type { ANSReviewArea } from "@/types/prisma-enums";

interface ANSBrowserProps {
  locale: string;
  initialFilters: {
    area?: string;
    search?: string;
    priority?: string;
    newRevised?: string;
  };
}

export function ANSBrowser({ locale, initialFilters }: ANSBrowserProps) {
  const t = useTranslations("ansBrowser");
  const tAreas = useTranslations("reviewAreas");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse initial filters
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || "");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // PQ counts per area (updated from PQList via callback)
  const [areaCounts, setAreaCounts] = useState<Record<string, number>>({});

  // Get current filter values from URL
  const selectedAreas = useMemo(() => {
    const param = searchParams.get("area");
    return param ? (param.split(",") as ANSReviewArea[]) : [];
  }, [searchParams]);

  const isPriority = searchParams.get("priority") === "true";
  const isNewRevised = searchParams.get("newRevised") === "true";
  const currentSearch = searchParams.get("search") || "";

  // Update URL with new filters
  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === "false") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      router.push(`/${locale}/questionnaires/ans?${params.toString()}`);
    },
    [router, searchParams, locale]
  );

  // Filter handlers
  const handleAreaChange = useCallback(
    (areas: ANSReviewArea[]) => {
      updateFilters({ area: areas.length > 0 ? areas.join(",") : null });
    },
    [updateFilters]
  );

  const handlePriorityToggle = useCallback(
    (checked: boolean) => {
      updateFilters({ priority: checked ? "true" : null });
    },
    [updateFilters]
  );

  const handleNewRevisedToggle = useCallback(
    (checked: boolean) => {
      updateFilters({ newRevised: checked ? "true" : null });
    },
    [updateFilters]
  );

  const handleSearch = useCallback(() => {
    updateFilters({ search: searchQuery || null });
  }, [updateFilters, searchQuery]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch]
  );

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    router.push(`/${locale}/questionnaires/ans`);
  }, [router, locale]);

  const removeFilter = useCallback(
    (type: string, value?: string) => {
      switch (type) {
        case "area":
          if (value) {
            const newAreas = selectedAreas.filter((a) => a !== value);
            handleAreaChange(newAreas);
          }
          break;
        case "priority":
          handlePriorityToggle(false);
          break;
        case "newRevised":
          handleNewRevisedToggle(false);
          break;
        case "search":
          setSearchQuery("");
          updateFilters({ search: null });
          break;
      }
    },
    [
      selectedAreas,
      handleAreaChange,
      handlePriorityToggle,
      handleNewRevisedToggle,
      updateFilters,
    ]
  );

  // Count active filters
  const activeFilterCount =
    selectedAreas.length +
    (isPriority ? 1 : 0) +
    (isNewRevised ? 1 : 0) +
    (currentSearch ? 1 : 0);

  // Filter sidebar content (shared between desktop and mobile)
  const FilterContent = (
    <div className="space-y-4">
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search">{t("filters.search")}</Label>
        <div className="flex gap-2">
          <Input
            id="search"
            placeholder={t("filters.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="flex-1"
          />
          <Button size="icon" variant="secondary" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Filter Accordion */}
      <Accordion
        type="multiple"
        defaultValue={["reviewArea", "additional"]}
        className="w-full"
      >
        {/* Review Area Filter */}
        <AccordionItem value="reviewArea">
          <AccordionTrigger className="text-sm font-medium">
            {t("filters.reviewArea")}
            {selectedAreas.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedAreas.length}
              </Badge>
            )}
          </AccordionTrigger>
          <AccordionContent>
            <ReviewAreaFilter
              selected={selectedAreas}
              onChange={handleAreaChange}
              counts={areaCounts}
              locale={locale}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Additional Filters */}
        <AccordionItem value="additional">
          <AccordionTrigger className="text-sm font-medium">
            {t("filters.additional")}
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="priority"
                  className="text-sm cursor-pointer flex-1"
                >
                  {t("filters.priorityPQ")}
                </Label>
                <Switch
                  id="priority"
                  checked={isPriority}
                  onCheckedChange={handlePriorityToggle}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="newRevised"
                  className="text-sm cursor-pointer flex-1"
                >
                  {t("filters.newRevised")}
                </Label>
                <Switch
                  id="newRevised"
                  checked={isNewRevised}
                  onCheckedChange={handleNewRevisedToggle}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Clear All */}
      {activeFilterCount > 0 && (
        <>
          <Separator />
          <Button
            variant="outline"
            className="w-full"
            onClick={clearAllFilters}
          >
            {t("filters.clearAll")} ({activeFilterCount})
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb & Header */}
      <div>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Link
            href={`/${locale}/questionnaires`}
            className="hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/${locale}/questionnaires`}
            className="hover:text-foreground transition-colors"
          >
            {t("breadcrumb.questionnaires")}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{t("breadcrumb.ans")}</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              {t("title")}
            </h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>

          {/* Mobile Filter Button */}
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {t("filters.title")}
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>{t("filters.title")}</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
                {FilterContent}
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-72 shrink-0">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {t("filters.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-16rem)]">
                {FilterContent}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedAreas.map((area) => (
                <Badge
                  key={area}
                  variant="secondary"
                  className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  {area}: {tAreas(`${area}.name`)}
                  <button
                    onClick={() => removeFilter("area", area)}
                    className="ml-1 hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {isPriority && (
                <Badge
                  variant="secondary"
                  className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                >
                  {t("filters.priorityPQ")}
                  <button
                    onClick={() => removeFilter("priority")}
                    className="ml-1 hover:text-amber-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {isNewRevised && (
                <Badge
                  variant="secondary"
                  className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                >
                  {t("filters.newRevised")}
                  <button
                    onClick={() => removeFilter("newRevised")}
                    className="ml-1 hover:text-green-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {currentSearch && (
                <Badge variant="secondary" className="gap-1">
                  &quot;{currentSearch}&quot;
                  <button
                    onClick={() => removeFilter("search")}
                    className="ml-1 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {/* Question List */}
          <PQList
            locale={locale}
            filters={{
              reviewAreas: selectedAreas,
              isPriority,
              isNewRevised,
              search: currentSearch,
            }}
            onCountsLoaded={setAreaCounts}
          />
        </div>
      </div>
    </div>
  );
}
