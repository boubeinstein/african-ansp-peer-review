"use client";

import { trpc } from "@/lib/trpc/client";
import { BestPracticesStats } from "./best-practices-stats";
import { BestPracticesFilters } from "./best-practices-filters";
import { BestPracticesGrid } from "./best-practices-grid";
import { BestPracticeCategory } from "@/types/prisma-enums";

interface BestPracticesContentProps {
  locale: string;
  searchParams: {
    page?: string;
    search?: string;
    category?: string;
    auditArea?: string;
    sortBy?: string;
  };
  userOrgId?: string | null;
}

export function BestPracticesContent({
  locale,
  searchParams,
  userOrgId,
}: BestPracticesContentProps) {

  const page = parseInt(searchParams.page || "1", 10);
  const search = searchParams.search || "";
  const category = searchParams.category as BestPracticeCategory | undefined;
  const auditArea = searchParams.auditArea || undefined;
  const sortBy = (searchParams.sortBy || "newest") as
    | "newest"
    | "popular"
    | "mostAdopted";

  // Fetch stats
  const { data: stats, isLoading: statsLoading } =
    trpc.bestPractice.getStats.useQuery();

  // Fetch best practices
  const { data, isLoading, error } = trpc.bestPractice.list.useQuery({
    page,
    pageSize: 12,
    search: search || undefined,
    category,
    auditArea,
    sortBy,
  });

  // Fetch filter options
  const { data: categories } = trpc.bestPractice.getCategories.useQuery();
  const { data: auditAreas } = trpc.bestPractice.getAuditAreas.useQuery();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <BestPracticesStats stats={stats} isLoading={statsLoading} />

      {/* Filters */}
      <BestPracticesFilters
        locale={locale}
        search={search}
        category={category}
        auditArea={auditArea}
        sortBy={sortBy}
        categories={categories || []}
        auditAreas={auditAreas || []}
      />

      {/* Grid */}
      <BestPracticesGrid
        locale={locale}
        items={data?.items || []}
        isLoading={isLoading}
        error={error?.message}
        page={page}
        totalPages={data?.totalPages || 1}
        total={data?.total || 0}
        userOrgId={userOrgId}
      />
    </div>
  );
}
