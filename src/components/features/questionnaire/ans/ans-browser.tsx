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
import { AuditAreaFilter } from "./audit-area-filter";
import { CriticalElementFilter } from "./critical-element-filter";
import { PQList } from "./pq-list";
import { USOAP_AUDIT_AREAS } from "@/lib/questionnaire/constants";
import type { USOAPAuditArea, CriticalElement } from "@prisma/client";

interface ANSBrowserProps {
  locale: string;
  initialFilters: {
    auditArea?: string;
    criticalElement?: string;
    isPriority?: string;
    requiresOnSite?: string;
    search?: string;
    page?: string;
  };
}

export function ANSBrowser({ locale, initialFilters }: ANSBrowserProps) {
  const t = useTranslations("ansBrowser");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse initial filters
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || "");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Get current filter values from URL
  const selectedAuditAreas = useMemo(() => {
    const param = searchParams.get("auditArea");
    return param ? param.split(",") as USOAPAuditArea[] : [];
  }, [searchParams]);

  const selectedCriticalElements = useMemo(() => {
    const param = searchParams.get("criticalElement");
    return param ? param.split(",") as CriticalElement[] : [];
  }, [searchParams]);

  const isPriority = searchParams.get("isPriority") === "true";
  const requiresOnSite = searchParams.get("requiresOnSite") === "true";
  const currentSearch = searchParams.get("search") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

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

      // Reset page when filters change (except when changing page itself)
      if (!("page" in updates)) {
        params.delete("page");
      }

      router.push(`/${locale}/questionnaires/ans?${params.toString()}`);
    },
    [router, searchParams, locale]
  );

  // Filter handlers
  const handleAuditAreaChange = useCallback(
    (areas: USOAPAuditArea[]) => {
      updateFilters({ auditArea: areas.length > 0 ? areas.join(",") : null });
    },
    [updateFilters]
  );

  const handleCriticalElementChange = useCallback(
    (elements: CriticalElement[]) => {
      updateFilters({
        criticalElement: elements.length > 0 ? elements.join(",") : null,
      });
    },
    [updateFilters]
  );

  const handlePriorityToggle = useCallback(
    (checked: boolean) => {
      updateFilters({ isPriority: checked ? "true" : null });
    },
    [updateFilters]
  );

  const handleOnSiteToggle = useCallback(
    (checked: boolean) => {
      updateFilters({ requiresOnSite: checked ? "true" : null });
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

  const handlePageChange = useCallback(
    (page: number) => {
      updateFilters({ page: page > 1 ? page.toString() : null });
    },
    [updateFilters]
  );

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    router.push(`/${locale}/questionnaires/ans`);
  }, [router, locale]);

  const removeFilter = useCallback(
    (type: string, value?: string) => {
      switch (type) {
        case "auditArea":
          if (value) {
            const newAreas = selectedAuditAreas.filter((a) => a !== value);
            handleAuditAreaChange(newAreas);
          }
          break;
        case "criticalElement":
          if (value) {
            const newElements = selectedCriticalElements.filter(
              (e) => e !== value
            );
            handleCriticalElementChange(newElements);
          }
          break;
        case "isPriority":
          handlePriorityToggle(false);
          break;
        case "requiresOnSite":
          handleOnSiteToggle(false);
          break;
        case "search":
          setSearchQuery("");
          updateFilters({ search: null });
          break;
      }
    },
    [
      selectedAuditAreas,
      selectedCriticalElements,
      handleAuditAreaChange,
      handleCriticalElementChange,
      handlePriorityToggle,
      handleOnSiteToggle,
      updateFilters,
    ]
  );

  // Count active filters
  const activeFilterCount =
    selectedAuditAreas.length +
    selectedCriticalElements.length +
    (isPriority ? 1 : 0) +
    (requiresOnSite ? 1 : 0) +
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
        defaultValue={["auditArea", "criticalElement"]}
        className="w-full"
      >
        {/* Audit Area Filter */}
        <AccordionItem value="auditArea">
          <AccordionTrigger className="text-sm font-medium">
            {t("filters.auditArea")}
            {selectedAuditAreas.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedAuditAreas.length}
              </Badge>
            )}
          </AccordionTrigger>
          <AccordionContent>
            <AuditAreaFilter
              selected={selectedAuditAreas}
              onChange={handleAuditAreaChange}
              locale={locale}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Critical Element Filter */}
        <AccordionItem value="criticalElement">
          <AccordionTrigger className="text-sm font-medium">
            {t("filters.criticalElement")}
            {selectedCriticalElements.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedCriticalElements.length}
              </Badge>
            )}
          </AccordionTrigger>
          <AccordionContent>
            <CriticalElementFilter
              selected={selectedCriticalElements}
              onChange={handleCriticalElementChange}
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
                  htmlFor="onsite"
                  className="text-sm cursor-pointer flex-1"
                >
                  {t("filters.requiresOnSite")}
                </Label>
                <Switch
                  id="onsite"
                  checked={requiresOnSite}
                  onCheckedChange={handleOnSiteToggle}
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
              {selectedAuditAreas.map((area) => (
                <Badge
                  key={area}
                  variant="secondary"
                  className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  {USOAP_AUDIT_AREAS[area].name[locale === "fr" ? "fr" : "en"]}
                  <button
                    onClick={() => removeFilter("auditArea", area)}
                    className="ml-1 hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedCriticalElements.map((element) => (
                <Badge
                  key={element}
                  variant="secondary"
                  className="gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                >
                  {element.replace("_", "-")}
                  <button
                    onClick={() => removeFilter("criticalElement", element)}
                    className="ml-1 hover:text-purple-900"
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
                    onClick={() => removeFilter("isPriority")}
                    className="ml-1 hover:text-amber-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {requiresOnSite && (
                <Badge
                  variant="secondary"
                  className="gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                >
                  {t("filters.requiresOnSite")}
                  <button
                    onClick={() => removeFilter("requiresOnSite")}
                    className="ml-1 hover:text-orange-900"
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
              auditAreas: selectedAuditAreas,
              criticalElements: selectedCriticalElements,
              isPriority,
              requiresOnSite,
              search: currentSearch,
            }}
            page={currentPage}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
}
