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
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Download,
  Grid3X3,
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
// MOCK DATA (for demonstration)
// =============================================================================

const MOCK_REVIEWERS: ReviewerListItem[] = [
  {
    id: "1",
    userId: "u1",
    fullName: "Dr. Amadou Diallo",
    email: "amadou.diallo@asecna.org",
    title: "Dr.",
    currentPosition: "ATS Safety Manager",
    homeOrganization: {
      id: "org1",
      nameEn: "Agency for Aerial Navigation Safety in Africa",
      nameFr: "Agence pour la Sécurité de la Navigation Aérienne en Afrique",
      icaoCode: "ASECNA",
      country: "Senegal",
    },
    reviewerType: "LEAD_REVIEWER",
    selectionStatus: "SELECTED",
    isLeadQualified: true,
    isAvailable: true,
    primaryExpertise: ["ATS", "SMS_RISK"],
    languages: ["FR", "EN"],
    reviewsCompleted: 12,
    yearsExperience: 18,
  },
  {
    id: "2",
    userId: "u2",
    fullName: "Ms. Fatima Al-Hassan",
    email: "f.alhassan@nansc.gov.ng",
    title: "Ms.",
    currentPosition: "Chief Safety Officer",
    homeOrganization: {
      id: "org2",
      nameEn: "Nigerian Airspace Management Agency",
      nameFr: "Agence de Gestion de l'Espace Aérien Nigérian",
      icaoCode: "NAMA",
      country: "Nigeria",
    },
    reviewerType: "SENIOR_REVIEWER",
    selectionStatus: "SELECTED",
    isLeadQualified: true,
    isAvailable: false,
    primaryExpertise: ["SMS_POLICY", "SMS_ASSURANCE", "QMS"],
    languages: ["EN"],
    reviewsCompleted: 8,
    yearsExperience: 15,
  },
  {
    id: "3",
    userId: "u3",
    fullName: "Mr. Jean-Pierre Kabongo",
    email: "jp.kabongo@rva.cd",
    title: "Mr.",
    currentPosition: "CNS/ATM Specialist",
    homeOrganization: {
      id: "org3",
      nameEn: "Air Navigation Authority of DRC",
      nameFr: "Régie des Voies Aériennes",
      icaoCode: "RVA",
      country: "DRC",
    },
    reviewerType: "PEER_REVIEWER",
    selectionStatus: "NOMINATED",
    isLeadQualified: false,
    isAvailable: true,
    primaryExpertise: ["CNS", "ENGINEERING"],
    languages: ["FR", "EN"],
    reviewsCompleted: 3,
    yearsExperience: 10,
  },
  {
    id: "4",
    userId: "u4",
    fullName: "Ms. Amina Osei",
    email: "a.osei@gcaa.gov.gh",
    title: "Ms.",
    currentPosition: "AIM Supervisor",
    homeOrganization: {
      id: "org4",
      nameEn: "Ghana Civil Aviation Authority",
      nameFr: "Autorité de l'Aviation Civile du Ghana",
      icaoCode: "GCAA",
      country: "Ghana",
    },
    reviewerType: "PEER_REVIEWER",
    selectionStatus: "UNDER_REVIEW",
    isLeadQualified: false,
    isAvailable: true,
    primaryExpertise: ["AIM_AIS", "PANS_OPS"],
    languages: ["EN"],
    reviewsCompleted: 0,
    yearsExperience: 7,
  },
  {
    id: "5",
    userId: "u5",
    fullName: "Dr. Mohamed Ben Ali",
    email: "m.benali@oaca.nat.tn",
    title: "Dr.",
    currentPosition: "Director of Safety",
    homeOrganization: {
      id: "org5",
      nameEn: "Office of Civil Aviation and Airports",
      nameFr: "Office de l'Aviation Civile et des Aéroports",
      icaoCode: "OACA",
      country: "Tunisia",
    },
    reviewerType: "LEAD_REVIEWER",
    selectionStatus: "SELECTED",
    isLeadQualified: true,
    isAvailable: true,
    primaryExpertise: ["SMS_RISK", "SMS_ASSURANCE", "HUMAN_FACTORS"],
    languages: ["AR", "FR", "EN"],
    reviewsCompleted: 15,
    yearsExperience: 22,
  },
  {
    id: "6",
    userId: "u6",
    fullName: "Mr. Paulo Santos",
    email: "p.santos@nav.pt.ao",
    title: "Mr.",
    currentPosition: "ATC Training Manager",
    homeOrganization: {
      id: "org6",
      nameEn: "ENANA Angola",
      nameFr: "ENANA Angola",
      icaoCode: "ENANA",
      country: "Angola",
    },
    reviewerType: "PEER_REVIEWER",
    selectionStatus: "NOMINATED",
    isLeadQualified: false,
    isAvailable: false,
    primaryExpertise: ["ATS", "TRAINING"],
    languages: ["PT", "EN"],
    reviewsCompleted: 2,
    yearsExperience: 12,
  },
];

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

  // Filter and sort data
  const filteredReviewers = useMemo(() => {
    let result = [...MOCK_REVIEWERS];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.fullName.toLowerCase().includes(query) ||
          r.email.toLowerCase().includes(query) ||
          r.homeOrganization.nameEn.toLowerCase().includes(query) ||
          r.homeOrganization.nameFr.toLowerCase().includes(query) ||
          r.homeOrganization.icaoCode?.toLowerCase().includes(query) ||
          r.homeOrganization.country.toLowerCase().includes(query)
      );
    }

    // Expertise filter
    if (filters.expertiseAreas && filters.expertiseAreas.length > 0) {
      result = result.filter((r) =>
        filters.expertiseAreas!.some((area) => r.primaryExpertise.includes(area))
      );
    }

    // Language filter
    if (filters.languages && filters.languages.length > 0) {
      result = result.filter((r) =>
        filters.languages!.some((lang) => r.languages.includes(lang))
      );
    }

    // Selection status filter
    if (filters.selectionStatus && filters.selectionStatus.length > 0) {
      result = result.filter((r) =>
        filters.selectionStatus!.includes(r.selectionStatus)
      );
    }

    // Availability filter
    if (filters.isAvailable !== undefined) {
      result = result.filter((r) => r.isAvailable === filters.isAvailable);
    }

    // Lead qualified filter
    if (filters.isLeadQualified !== undefined) {
      result = result.filter((r) => r.isLeadQualified === filters.isLeadQualified);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "fullName":
          comparison = a.fullName.localeCompare(b.fullName);
          break;
        case "organization":
          comparison = a.homeOrganization.nameEn.localeCompare(
            b.homeOrganization.nameEn
          );
          break;
        case "reviewsCompleted":
          comparison = a.reviewsCompleted - b.reviewsCompleted;
          break;
        case "yearsExperience":
          comparison = a.yearsExperience - b.yearsExperience;
          break;
        case "selectionStatus":
          comparison = a.selectionStatus.localeCompare(b.selectionStatus);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [searchQuery, filters, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredReviewers.length / itemsPerPage);
  const paginatedReviewers = filteredReviewers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
          {t("results.showing", {
            count: filteredReviewers.length,
            total: MOCK_REVIEWERS.length,
          })}
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
      {filteredReviewers.length === 0 ? (
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
          {paginatedReviewers.map((reviewer) => (
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
          reviewers={paginatedReviewers}
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
