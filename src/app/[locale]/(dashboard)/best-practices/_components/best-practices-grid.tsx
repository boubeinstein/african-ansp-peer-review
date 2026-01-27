"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { BestPracticeCard } from "./best-practice-card";

interface BestPracticeItem {
  id: string;
  referenceNumber: string;
  titleEn: string;
  titleFr: string;
  summaryEn: string;
  summaryFr: string;
  category: string;
  auditArea: string | null;
  imageUrl: string | null;
  viewCount: number;
  publishedAt: Date | null;
  organization: {
    id: string;
    nameEn: string;
    nameFr: string;
    organizationCode: string | null;
  };
  _count: {
    adoptions: number;
  };
}

interface BestPracticesGridProps {
  locale: string;
  items: BestPracticeItem[];
  isLoading: boolean;
  error?: string;
  page: number;
  totalPages: number;
  total: number;
  userOrgId?: string | null;
}

export function BestPracticesGrid({
  locale,
  items,
  isLoading,
  error,
  page,
  totalPages,
  total,
  userOrgId,
}: BestPracticesGridProps) {
  const t = useTranslations("bestPractices");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!isLoading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Lightbulb className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t("empty.title")}</h3>
        <p className="text-muted-foreground max-w-md">
          {t("empty.description")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {t("showing", { count: items.length, total })}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <BestPracticeCard
            key={item.id}
            item={item}
            locale={locale}
            isOwnOrg={item.organization.id === userOrgId}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
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
    </div>
  );
}
