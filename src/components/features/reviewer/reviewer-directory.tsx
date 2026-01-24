"use client";

/**
 * Reviewer Directory Component
 *
 * Main directory for browsing, searching, and filtering reviewers.
 * Supports card and table views with pagination.
 */

import { useState, useMemo, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { canEditReviewer } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
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
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Grid3X3,
  Loader2,
  MoreHorizontal,
  Search,
  Table2,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { ReviewerCard } from "./reviewer-card";
import { ReviewerTable } from "./reviewer-table";
import { ReviewerSearchFilters } from "./reviewer-search-filters";
import { ExportDialog } from "./export-dialog";
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

/**
 * User context passed from server-side auth
 */
export interface UserContext {
  id: string;
  role: UserRole;
  organizationId?: string | null;
}

interface ReviewerDirectoryProps {
  initialFilters?: ReviewerSearchFilters;
  userContext: UserContext;
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
  availableFrom: Date | null;
  availableTo: Date | null;
  reviewsCompleted: number;
  yearsExperience: number;
  user: { id: string; firstName: string; lastName: string; email: string } | null;
  homeOrganization: { id: string; nameEn: string; nameFr: string; organizationCode: string | null; country: string } | null;
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
          organizationCode: profile.homeOrganization.organizationCode,
          country: profile.homeOrganization.country,
        }
      : {
          id: "",
          nameEn: "Unknown Organization",
          nameFr: "Organisation inconnue",
          organizationCode: null,
          country: "",
        },
    reviewerType: profile.reviewerType as ReviewerListItem["reviewerType"],
    selectionStatus: profile.selectionStatus as ReviewerListItem["selectionStatus"],
    isLeadQualified: profile.isLeadQualified,
    isAvailable: profile.isAvailable,
    availableFrom: profile.availableFrom,
    availableTo: profile.availableTo,
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
  userContext,
  className,
}: ReviewerDirectoryProps) {
  const t = useTranslations("reviewers");
  const locale = useLocale() as "en" | "fr";
  const router = useRouter();

  // Get user permission context from props (passed from server-side auth)
  const userRole = userContext.role;
  const userOrgId = userContext.organizationId;
  const userId = userContext.id;

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
  const [pageSize, setPageSize] = useState(25);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Reset to page 1 when page size changes
  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

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
    pageSize,
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

  // Check if user can edit a specific reviewer
  const canEdit = useCallback(
    (reviewer: ReviewerListItem): boolean => {
      // Own profile
      if (reviewer.userId === userId) {
        return true;
      }

      // Permission check
      if (!reviewer.homeOrganization?.id) {
        return false;
      }

      return canEditReviewer({
        userRole,
        userOrgId,
        reviewerOrgId: reviewer.homeOrganization.id,
      });
    },
    [userRole, userOrgId, userId]
  );

  const handleEditProfile = useCallback(
    (id: string) => {
      router.push(`/${locale}/reviewers/${id}/edit`);
    },
    [router, locale]
  );

  // Get edit handler for a specific reviewer (returns undefined if no permission)
  const getEditHandler = useCallback(
    (reviewer: ReviewerListItem): ((id: string) => void) | undefined => {
      return canEdit(reviewer) ? handleEditProfile : undefined;
    },
    [canEdit, handleEditProfile]
  );

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

  // Selection handlers
  function handleSelectAll(checked: boolean) {
    if (checked && reviewers.length > 0) {
      setSelectedIds(new Set(reviewers.map((r) => r.id)));
      setSelectAll(true);
    } else {
      setSelectedIds(new Set());
      setSelectAll(false);
    }
  }

  function handleSelectOne(id: string, checked: boolean) {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size === reviewers.length && reviewers.length > 0);
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setSelectAll(false);
  }

  const isSelected = (id: string) => selectedIds.has(id);
  const hasSelection = selectedIds.size > 0;

  // Get reviewers to export (selected or all)
  const reviewersToExport = hasSelection
    ? reviewers.filter((r) => selectedIds.has(r.id))
    : reviewers;

  // Bulk action handlers
  function handleBulkExport() {
    setExportDialogOpen(true);
  }

  function handleBulkStatusChange() {
    // For now, just show a toast - status change dialog will be implemented later
    toast.info(t("selection.statusChangeUnavailable"));
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
        <Button
          variant="outline"
          onClick={handleBulkExport}
          disabled={!reviewers.length}
        >
          <Download className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">
            {hasSelection
              ? t("actions.exportSelected")
              : t("actions.export")}
          </span>
        </Button>
      </div>

      {/* Selection Header Bar */}
      {hasSelection && (
        <div className="flex items-center justify-between bg-muted/50 border rounded-lg px-4 py-2">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectAll}
              onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
              aria-label={t("selection.selectAll")}
            />
            <span className="text-sm font-medium">
              {t("selection.selected", { count: selectedIds.size })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="text-muted-foreground"
            >
              {t("selection.clearSelection")}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Bulk Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  {t("actions.bulkActions")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleBulkExport}>
                  <Download className="h-4 w-4 mr-2" />
                  {t("actions.exportSelected")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBulkStatusChange}>
                  <UserCheck className="h-4 w-4 mr-2" />
                  {t("actions.changeStatus")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

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
              onEdit={getEditHandler(reviewer)}
              isSelected={isSelected(reviewer.id)}
              onSelect={(checked) => handleSelectOne(reviewer.id, checked)}
            />
          ))}
        </div>
      ) : (
        <ReviewerTable
          reviewers={reviewers}
          onView={handleViewProfile}
          onEdit={handleEditProfile}
          canEdit={canEdit}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          selectAll={selectAll}
          onSelectAll={handleSelectAll}
          isSelected={isSelected}
          onSelectOne={handleSelectOne}
        />
      )}

      {/* Enhanced Pagination */}
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
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        reviewers={reviewersToExport}
        selectedCount={hasSelection ? selectedIds.size : undefined}
      />
    </div>
  );
}

export default ReviewerDirectory;
