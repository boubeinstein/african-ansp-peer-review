"use client";

/**
 * Organization Directory Component
 *
 * Main directory for browsing, searching, and filtering organizations.
 * Supports card and table views with pagination and URL state management.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Building2,
  Loader2,
  Search,
} from "lucide-react";
import { OrganizationCard } from "./organization-card";
import { OrganizationTable, type OrganizationSortField } from "./organization-table";
import { OrganizationStatsCards } from "./organization-stats-cards";
import { OrganizationFilterPanel } from "./organization-filter-panel";
import { OrganizationViewToggle, type ViewMode } from "./organization-view-toggle";
import type { OrganizationFilters, OrganizationListItem } from "@/types/organization";
import type { AfricanRegion, MembershipStatus } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

interface OrganizationDirectoryProps {
  className?: string;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Custom hook for debounced value
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function OrganizationDirectory({ className }: OrganizationDirectoryProps) {
  const t = useTranslations("organizations");
  const locale = useLocale() as "en" | "fr";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse URL params
  const urlSearch = searchParams.get("search") || "";
  const urlRegion = searchParams.get("region")?.split(",").filter(Boolean) as AfricanRegion[] | undefined;
  const urlStatus = searchParams.get("status")?.split(",").filter(Boolean) as MembershipStatus[] | undefined;
  const urlCountry = searchParams.get("country")?.split(",").filter(Boolean);
  const urlView = (searchParams.get("view") as ViewMode) || "card";
  const urlPage = parseInt(searchParams.get("page") || "1", 10);
  const urlPageSize = parseInt(searchParams.get("pageSize") || "12", 10);
  const urlSortBy = (searchParams.get("sortBy") as OrganizationSortField) || "nameEn";
  const urlSortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "asc";

  // State (synced with URL)
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [viewMode, setViewMode] = useState<ViewMode>(urlView);
  const [filters, setFilters] = useState<Partial<OrganizationFilters>>({
    region: urlRegion,
    country: urlCountry,
    membershipStatus: urlStatus,
  });
  const [sortBy, setSortBy] = useState<OrganizationSortField>(urlSortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(urlSortOrder);
  const [currentPage, setCurrentPage] = useState(urlPage);
  const [pageSize, setPageSize] = useState(urlPageSize);

  // Debounce search input - use directly in query, not in filters state
  const debouncedSearch = useDebounce(searchInput, 300);

  // Handler to update search and reset page
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    setCurrentPage(1);
  }, []);

  // Update URL when state changes
  const updateURL = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === "" || value === "1" && key === "page") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      // Remove default values
      if (params.get("view") === "card") params.delete("view");
      if (params.get("pageSize") === "12") params.delete("pageSize");
      if (params.get("sortBy") === "nameEn") params.delete("sortBy");
      if (params.get("sortOrder") === "asc") params.delete("sortOrder");

      const queryString = params.toString();
      router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, {
        scroll: false,
      });
    },
    [searchParams, pathname, router]
  );

  // Sync URL on filter changes
  useEffect(() => {
    updateURL({
      search: debouncedSearch || undefined,
      region: filters.region?.join(","),
      country: filters.country?.join(","),
      status: filters.membershipStatus?.join(","),
      view: viewMode,
      page: String(currentPage),
      pageSize: String(pageSize),
      sortBy,
      sortOrder,
    });
  }, [debouncedSearch, filters, viewMode, currentPage, pageSize, sortBy, sortOrder, updateURL]);

  // Fetch organizations
  const { data, isLoading, error } = trpc.organization.list.useQuery({
    search: debouncedSearch || undefined,
    region: filters.region,
    country: filters.country,
    membershipStatus: filters.membershipStatus,
    page: currentPage,
    pageSize,
    sortBy,
    sortOrder,
  });

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = trpc.organization.getStats.useQuery();

  // Fetch countries for filter
  const { data: countries = [] } = trpc.organization.getCountries.useQuery();

  const organizations = (data?.items || []) as OrganizationListItem[];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.total ?? 0;

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (debouncedSearch) count++;
    if (filters.region?.length) count++;
    if (filters.country?.length) count++;
    if (filters.membershipStatus?.length) count++;
    return count;
  }, [debouncedSearch, filters]);

  // Handlers
  const handleViewOrganization = useCallback(
    (id: string) => {
      router.push(`/${locale}/organizations/${id}`);
    },
    [router, locale]
  );

  const handleEditOrganization = useCallback(
    (id: string) => {
      router.push(`/${locale}/organizations/${id}/edit`);
    },
    [router, locale]
  );

  const handleSort = useCallback((field: OrganizationSortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  }, [sortBy]);

  const handleFiltersChange = useCallback((newFilters: Partial<OrganizationFilters>) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({});
    setSearchInput("");
    setCurrentPage(1);
  }, []);

  const handlePageSizeChange = useCallback((value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Cards */}
      <OrganizationStatsCards stats={stats} isLoading={statsLoading} />

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("filters.search")}
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Panel */}
        <OrganizationFilterPanel
          filters={filters}
          onChange={handleFiltersChange}
          onReset={handleResetFilters}
          countries={countries}
          isLoading={isLoading}
        />

        {/* View Toggle */}
        <OrganizationViewToggle
          view={viewMode}
          onChange={handleViewModeChange}
        />
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {isLoading ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            t("results.showing", {
              count: organizations.length,
              total: totalCount,
            })
          )}
        </span>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="text-muted-foreground"
          >
            {t("filters.reset")}
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-destructive/10 p-6 mb-4">
              <Building2 className="h-12 w-12 text-destructive" />
            </div>
            <h3 className="text-lg font-medium">{t("error.title")}</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              {error.message}
            </p>
          </CardContent>
        </Card>
      ) : organizations.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Building2 className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">{t("empty.title")}</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              {activeFilterCount > 0
                ? t("empty.noResults")
                : t("empty.description")}
            </p>
            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleResetFilters}
              >
                {t("filters.reset")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((organization) => (
            <OrganizationCard
              key={organization.id}
              organization={organization}
              onClick={handleViewOrganization}
              onEdit={handleEditOrganization}
            />
          ))}
        </div>
      ) : (
        <OrganizationTable
          organizations={organizations}
          onRowClick={handleViewOrganization}
          onEdit={handleEditOrganization}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
        />
      )}

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4">
          {/* Left: Showing info */}
          <div className="text-sm text-muted-foreground">
            {t("pagination.showing", {
              from: (currentPage - 1) * pageSize + 1,
              to: Math.min(currentPage * pageSize, totalCount),
              total: totalCount,
            })}
          </div>

          {/* Center: Page navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              title={t("pagination.first")}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 1}
              title={t("pagination.previous")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-sm px-2">
              {t("pagination.page")} {currentPage} {t("pagination.of")} {totalPages}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage === totalPages}
              title={t("pagination.next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              title={t("pagination.last")}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Right: Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("pagination.perPage")}
            </span>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12</SelectItem>
                <SelectItem value="24">24</SelectItem>
                <SelectItem value="48">48</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrganizationDirectory;
