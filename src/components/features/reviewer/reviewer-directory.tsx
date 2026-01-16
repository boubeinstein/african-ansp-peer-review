"use client";

/**
 * Reviewer Directory Component
 *
 * Main directory for browsing, searching, and filtering reviewers.
 * Supports card and table views with pagination.
 */

import { useState, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Download,
  Grid3X3,
  Loader2,
  Search,
  Table2,
  Users,
} from "lucide-react";
import { ReviewerCard } from "./reviewer-card";
import { ReviewerTable } from "./reviewer-table";
import { ReviewerSearchFilters } from "./reviewer-search-filters";
import type {
  ReviewerListItem,
  ReviewerFilterOptions,
  ReviewerSortField,
} from "@/types/reviewer";
import type { ExpertiseArea, Language, ReviewerSelectionStatus } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface ReviewerSearchFilters {
  expertiseAreas?: ExpertiseArea[];
  languages?: Language[];
  selectionStatus?: ReviewerSelectionStatus[];
  isSelected?: boolean;
  isAvailable?: boolean;
  searchQuery?: string;
}

interface ReviewerDirectoryProps {
  initialFilters?: ReviewerSearchFilters;
  className?: string;
}

// =============================================================================
// HELPER FUNCTION
// =============================================================================

/**
 * Transform API response to ReviewerListItem format
 */
function transformToListItem(profile: {
  id: string;
  userId: string;
  currentPosition: string | null;
  reviewerType: string;
  selectionStatus: string;
  isLeadQualified: boolean;
  isAvailable: boolean;
  reviewsCompleted: number;
  yearsExperience: number;
  user: { id: string; firstName: string; lastName: string; email: string } | null;
  homeOrganization: { id: string; nameEn: string; nameFr: string; icaoCode: string | null; country: string } | null;
  expertiseRecords: { area: string; proficiencyLevel: string }[];
  languages: { language: string; proficiency: string }[];
}): ReviewerListItem {
  return {
    id: profile.id,
    userId: profile.userId,
    fullName: profile.user
      ? `${profile.user.firstName} ${profile.user.lastName}`
      : "Unknown",
    email: profile.user?.email ?? "",
    title: null,
    currentPosition: profile.currentPosition ?? "",
    homeOrganization: profile.homeOrganization
      ? {
          id: profile.homeOrganization.id,
          nameEn: profile.homeOrganization.nameEn,
          nameFr: profile.homeOrganization.nameFr,
          icaoCode: profile.homeOrganization.icaoCode,
          country: profile.homeOrganization.country,
        }
      : {
          id: "",
          nameEn: "Unknown Organization",
          nameFr: "Organisation inconnue",
          icaoCode: null,
          country: "",
        },
    reviewerType: profile.reviewerType as ReviewerListItem["reviewerType"],
    selectionStatus: profile.selectionStatus as ReviewerListItem["selectionStatus"],
    isLeadQualified: profile.isLeadQualified,
    isAvailable: profile.isAvailable,
    primaryExpertise: profile.expertiseRecords.map((e) => e.area) as ExpertiseArea[],
    languages: profile.languages.map((l) => l.language) as Language[],
    reviewsCompleted: profile.reviewsCompleted,
    yearsExperience: profile.yearsExperience,
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewerDirectory({
  initialFilters,
  className,
}: ReviewerDirectoryProps) {
  const t = useTranslations("reviewers");
  const locale = useLocale() as "en" | "fr";
  const router = useRouter();

  // State
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [searchQuery, setSearchQuery] = useState(initialFilters?.searchQuery || "");
  const [filters, setFilters] = useState<ReviewerFilterOptions>({
    expertiseAreas: initialFilters?.expertiseAreas,
    languages: initialFilters?.languages,
    selectionStatus: initialFilters?.selectionStatus,
  });
  const [sortBy, setSortBy] = useState<ReviewerSortField>("fullName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === "card" ? 12 : 10;

  // Map sortBy to API sort field
  const apiSortBy = useMemo(() => {
    switch (sortBy) {
      case "fullName":
        return "name" as const;
      case "organization":
        return "organization" as const;
      case "reviewsCompleted":
        return "reviewsCompleted" as const;
      case "yearsExperience":
        return "experience" as const;
      case "selectionStatus":
        return "createdAt" as const;
      default:
        return "name" as const;
    }
  }, [sortBy]);

  // Fetch reviewers from API
  const { data, isLoading, error } = trpc.reviewer.list.useQuery({
    page: currentPage,
    pageSize: itemsPerPage,
    sortBy: apiSortBy,
    sortOrder,
    search: searchQuery || undefined,
    expertiseAreas: filters.expertiseAreas,
    languages: filters.languages,
    selectionStatus: filters.selectionStatus?.[0],
    isLeadQualified: filters.isLeadQualified,
    isActive: filters.isAvailable,
  });

  // Transform API data to list items
  const items = data?.items;
  const reviewers = useMemo(() => {
    if (!items) return [];
    return items.map(transformToListItem);
  }, [items]);

  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.total ?? 0;

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.expertiseAreas?.length) count++;
    if (filters.languages?.length) count++;
    if (filters.selectionStatus?.length) count++;
    if (filters.isAvailable !== undefined) count++;
    if (filters.isLeadQualified !== undefined) count++;
    return count;
  }, [filters]);

  function handleViewProfile(id: string) {
    router.push(`/${locale}/reviewers/${id}`);
  }

  function handleEditProfile(id: string) {
    router.push(`/${locale}/reviewers/${id}/edit`);
  }

  function handleSort(field: ReviewerSortField) {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  }

  function handleClearFilters() {
    setFilters({});
    setSearchQuery("");
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search.placeholder")}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>

        {/* Filter Toggle */}
        <ReviewerSearchFilters
          filters={filters}
          onFiltersChange={(newFilters) => {
            setFilters(newFilters);
            setCurrentPage(1);
          }}
          activeFilterCount={activeFilterCount}
          onClearFilters={handleClearFilters}
        />

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              {sortOrder === "asc" ? (
                <ArrowDownAZ className="h-4 w-4" />
              ) : (
                <ArrowUpAZ className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{t("sort.label")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={sortBy}
              onValueChange={(value) => handleSort(value as ReviewerSortField)}
            >
              <DropdownMenuRadioItem value="fullName">
                {t("sort.name")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="organization">
                {t("sort.organization")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="selectionStatus">
                {t("sort.status")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="yearsExperience">
                {t("sort.experience")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="reviewsCompleted">
                {t("sort.reviews")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Toggle */}
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "card" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("card")}
            className="rounded-r-none"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("table")}
            className="rounded-l-none"
          >
            <Table2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Export */}
        <Button variant="outline" disabled>
          <Download className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">{t("actions.export")}</span>
        </Button>
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            t("results.showing", {
              count: reviewers.length,
              total: totalCount,
            })
          )}
        </span>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-muted-foreground"
          >
            {t("search.clearFilters")}
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
              <Users className="h-12 w-12 text-destructive" />
            </div>
            <h3 className="text-lg font-medium">Error loading reviewers</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              {error.message}
            </p>
          </CardContent>
        </Card>
      ) : reviewers.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Users className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">{t("empty.title")}</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              {t("empty.description")}
            </p>
            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleClearFilters}
              >
                {t("search.clearFilters")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviewers.map((reviewer) => (
            <ReviewerCard
              key={reviewer.id}
              reviewer={reviewer}
              onView={handleViewProfile}
              onEdit={handleEditProfile}
            />
          ))}
        </div>
      ) : (
        <ReviewerTable
          reviewers={reviewers}
          onView={handleViewProfile}
          onEdit={handleEditProfile}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            {t("pagination.previous")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("pagination.page", { current: currentPage, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            {t("pagination.next")}
          </Button>
        </div>
      )}
    </div>
  );
}

export default ReviewerDirectory;
