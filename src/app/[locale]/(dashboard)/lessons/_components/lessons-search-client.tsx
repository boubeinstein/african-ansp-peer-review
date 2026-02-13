"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useDebouncedCallback } from "use-debounce";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LessonCard,
  type LessonCardItem,
} from "@/components/features/lessons/lesson-card";
import type {
  LessonCategory,
  ImpactLevel,
  LessonApplicability,
} from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

interface LessonsSearchClientProps {
  locale: string;
  searchParams: {
    page?: string;
    search?: string;
    category?: string;
    impact?: string;
    auditArea?: string;
    soeArea?: string;
    applicability?: string;
    tag?: string;
    sortBy?: string;
  };
}

// =============================================================================
// Category labels
// =============================================================================

const CATEGORY_OPTIONS: Array<{
  value: LessonCategory;
  labelEn: string;
  labelFr: string;
}> = [
  {
    value: "PROCESS_IMPROVEMENT",
    labelEn: "Process Improvement",
    labelFr: "Amélioration des processus",
  },
  {
    value: "TECHNICAL_FINDING",
    labelEn: "Technical Finding",
    labelFr: "Constatation technique",
  },
  {
    value: "LOGISTICS_PLANNING",
    labelEn: "Logistics & Planning",
    labelFr: "Logistique et planification",
  },
  {
    value: "CULTURAL_COMMUNICATION",
    labelEn: "Cultural & Communication",
    labelFr: "Culture et communication",
  },
  {
    value: "DOCUMENTATION_REVIEW",
    labelEn: "Documentation Review",
    labelFr: "Revue documentaire",
  },
  {
    value: "INTERVIEW_TECHNIQUE",
    labelEn: "Interview Technique",
    labelFr: "Technique d'entretien",
  },
  {
    value: "HOST_ENGAGEMENT",
    labelEn: "Host Engagement",
    labelFr: "Engagement de l'hôte",
  },
  {
    value: "TOOL_METHODOLOGY",
    labelEn: "Tool & Methodology",
    labelFr: "Outil et méthodologie",
  },
];

const IMPACT_OPTIONS: Array<{
  value: ImpactLevel;
  labelEn: string;
  labelFr: string;
}> = [
  { value: "LOW", labelEn: "Low", labelFr: "Faible" },
  { value: "MODERATE", labelEn: "Moderate", labelFr: "Modéré" },
  { value: "HIGH", labelEn: "High", labelFr: "Élevé" },
  { value: "CRITICAL", labelEn: "Critical", labelFr: "Critique" },
];

const APPLICABILITY_OPTIONS: Array<{
  value: LessonApplicability;
  labelEn: string;
  labelFr: string;
}> = [
  { value: "GENERAL", labelEn: "General", labelFr: "Général" },
  {
    value: "SPECIFIC_ANSP",
    labelEn: "Specific ANSP",
    labelFr: "ANSP spécifique",
  },
  {
    value: "REGIONAL",
    labelEn: "Regional",
    labelFr: "Régional",
  },
  {
    value: "MATURITY_LEVEL",
    labelEn: "Maturity Level",
    labelFr: "Niveau de maturité",
  },
];

// =============================================================================
// Component
// =============================================================================

export function LessonsSearchClient({
  locale,
  searchParams,
}: LessonsSearchClientProps) {
  const t = useTranslations("lessons");
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  // Parse URL state
  const page = parseInt(searchParams.page || "1", 10);
  const search = searchParams.search || "";
  const category = searchParams.category as LessonCategory | undefined;
  const impact = searchParams.impact as ImpactLevel | undefined;
  const auditArea = searchParams.auditArea || undefined;
  const soeArea = searchParams.soeArea || undefined;
  const applicability = searchParams.applicability as
    | LessonApplicability
    | undefined;
  const tagFilter = searchParams.tag || undefined;
  const sortBy = (searchParams.sortBy || "recent") as
    | "recent"
    | "helpful"
    | "views";

  const [searchValue, setSearchValue] = useState(search);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [bookmarkingId, setBookmarkingId] = useState<string | null>(null);

  // ---- tRPC queries ----
  const searchQuery = trpc.lessons.search.useQuery({
    query: search || undefined,
    category,
    auditAreaCode: auditArea,
    soeAreaCode: soeArea,
    applicability,
    tags: tagFilter ? [tagFilter] : undefined,
    sortBy,
    page,
    pageSize: 12,
  });

  const popularTagsQuery = trpc.lessons.getPopularTags.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  // ---- Mutations ----
  const utils = trpc.useUtils();

  const voteMutation = trpc.lessons.vote.useMutation({
    onMutate: ({ lessonId }) => setVotingId(lessonId),
    onSettled: () => setVotingId(null),
    onSuccess: () => {
      void utils.lessons.search.invalidate();
    },
  });

  const bookmarkMutation = trpc.lessons.bookmark.useMutation({
    onMutate: ({ lessonId }) => setBookmarkingId(lessonId),
    onSettled: () => setBookmarkingId(null),
    onSuccess: () => {
      void utils.lessons.search.invalidate();
    },
  });

  // ---- URL filter helpers ----
  const updateFilters = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams();

      const currentParams: Record<string, string | undefined> = {
        search: search || undefined,
        category,
        impact,
        auditArea,
        soeArea,
        applicability,
        tag: tagFilter,
        sortBy: sortBy !== "recent" ? sortBy : undefined,
      };

      Object.entries(currentParams).forEach(([key, val]) => {
        if (val && !(key in updates)) params.set(key, val);
      });

      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      if (!("page" in updates)) params.delete("page");

      startTransition(() => {
        const qs = params.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [
      router,
      pathname,
      search,
      category,
      impact,
      auditArea,
      soeArea,
      applicability,
      tagFilter,
      sortBy,
    ]
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

  const goToPage = (newPage: number) => {
    updateFilters({ page: newPage.toString() });
  };

  const hasFilters =
    search || category || impact || auditArea || soeArea || applicability || tagFilter || sortBy !== "recent";

  const activeFilterCount = [
    category,
    impact,
    auditArea,
    soeArea,
    applicability,
    tagFilter,
  ].filter(Boolean).length;

  // ---- Handlers ----
  const handleVote = (lessonId: string, isHelpful: boolean) => {
    voteMutation.mutate({ lessonId, isHelpful });
  };

  const handleBookmark = (lessonId: string) => {
    bookmarkMutation.mutate({ lessonId });
  };

  const handleCardClick = (lessonId: string) => {
    router.push(`${pathname}/${lessonId}`);
  };

  // ---- Render filter sidebar content ----
  const filterContent = (
    <div className="space-y-5">
      {/* Category */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          {t("filters.category")}
        </label>
        <Select
          value={category || "all"}
          onValueChange={(v) =>
            updateFilters({ category: v === "all" ? undefined : v })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allCategories")}</SelectItem>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {locale === "fr" ? opt.labelFr : opt.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Impact Level */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          {t("filters.impactLevel")}
        </label>
        <Select
          value={impact || "all"}
          onValueChange={(v) =>
            updateFilters({ impact: v === "all" ? undefined : v })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allImpact")}</SelectItem>
            {IMPACT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {locale === "fr" ? opt.labelFr : opt.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Applicability */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          {t("filters.applicability")}
        </label>
        <Select
          value={applicability || "all"}
          onValueChange={(v) =>
            updateFilters({ applicability: v === "all" ? undefined : v })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allApplicability")}</SelectItem>
            {APPLICABILITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {locale === "fr" ? opt.labelFr : opt.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Popular Tags */}
      {popularTagsQuery.data && popularTagsQuery.data.length > 0 && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            {t("filters.popularTags")}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {popularTagsQuery.data.slice(0, 15).map((tagItem) => {
              const isActive = tagFilter === tagItem.tag;
              const label =
                locale === "fr" && tagItem.tagFr
                  ? tagItem.tagFr
                  : tagItem.tag;
              return (
                <Badge
                  key={tagItem.tag}
                  variant={isActive ? "default" : "outline"}
                  className={cn(
                    "text-[11px] cursor-pointer transition-colors",
                    isActive && "bg-primary"
                  )}
                  onClick={() =>
                    updateFilters({
                      tag: isActive ? undefined : tagItem.tag,
                    })
                  }
                >
                  {label}
                  <span className="ml-1 opacity-60">{tagItem.count}</span>
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="w-full"
        >
          <X className="mr-1 h-4 w-4" />
          {t("filters.clearAll")}
        </Button>
      )}
    </div>
  );

  // ---- Data ----
  const items: LessonCardItem[] =
    (searchQuery.data?.items ?? []) as unknown as LessonCardItem[];
  const totalPages = searchQuery.data?.totalPages ?? 1;
  const totalCount = searchQuery.data?.totalCount ?? 0;

  return (
    <>
      {/* Search bar + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={sortBy}
          onValueChange={(v) =>
            updateFilters({ sortBy: v === "recent" ? undefined : v })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">{t("sort.recent")}</SelectItem>
            <SelectItem value="helpful">{t("sort.helpful")}</SelectItem>
            <SelectItem value="views">{t("sort.views")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Mobile filter trigger */}
        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4 mr-1.5" />
              {t("filters.title")}
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1.5 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle>{t("filters.title")}</SheetTitle>
            </SheetHeader>
            <div className="mt-6">{filterContent}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main layout: sidebar + results */}
      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24 space-y-2">
            <h3 className="text-sm font-semibold mb-3">
              {t("filters.title")}
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 text-[10px]"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </h3>
            {filterContent}
          </div>
        </aside>

        {/* Results area */}
        <div className="flex-1 min-w-0">
          {/* Error */}
          {searchQuery.error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 mb-4">
              <p className="text-sm text-destructive">{searchQuery.error.message}</p>
            </div>
          )}

          {/* Loading */}
          {searchQuery.isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border p-4 space-y-3 animate-pulse"
                >
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-12 bg-muted rounded" />
                  <div className="flex gap-2">
                    <div className="h-5 bg-muted rounded w-16" />
                    <div className="h-5 bg-muted rounded w-12" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!searchQuery.isLoading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Lightbulb className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {t("empty.title")}
              </h3>
              <p className="text-muted-foreground max-w-md">
                {t("empty.description")}
              </p>
            </div>
          )}

          {/* Results */}
          {!searchQuery.isLoading && items.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {t("showing", { count: items.length, total: totalCount })}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    onVote={handleVote}
                    onBookmark={handleBookmark}
                    onClick={handleCardClick}
                    isVoting={votingId === lesson.id}
                    isBookmarking={bookmarkingId === lesson.id}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t("pagination.previous")}
                  </Button>
                  <span className="text-sm text-muted-foreground px-4">
                    {t("pagination.page", { page, totalPages })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages}
                  >
                    {t("pagination.next")}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
