"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface AssessmentsFiltersProps {
  showOrganizationFilter: boolean;
  initialFilters: {
    organizationId?: string;
    status?: string;
    type?: string;
  };
}

export function AssessmentsFilters({
  showOrganizationFilter,
  initialFilters,
}: AssessmentsFiltersProps) {
  const t = useTranslations("assessments.filters");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Fetch organizations for filter (only if showing org filter)
  const { data: orgData } = trpc.organization.list.useQuery(
    { page: 1, pageSize: 100 },
    { enabled: showOrganizationFilter }
  );

  const organizations = orgData?.items ?? [];

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/${locale}/assessments?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push(`/${locale}/assessments`);
  };

  const hasActiveFilters = initialFilters.organizationId || initialFilters.status || initialFilters.type;

  return (
    <div className="flex flex-wrap items-center gap-4">
      {showOrganizationFilter && (
        <Select
          value={initialFilters.organizationId ?? "all"}
          onValueChange={(v) => updateFilter("organizationId", v === "all" ? null : v)}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder={t("selectOrganization")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allOrganizations")}</SelectItem>
            {organizations.map((org: { id: string; nameEn: string; nameFr: string; organizationCode: string | null }) => (
              <SelectItem key={org.id} value={org.id}>
                {locale === "fr" ? org.nameFr : org.nameEn} ({org.organizationCode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={initialFilters.status ?? "all"}
        onValueChange={(v) => updateFilter("status", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t("selectStatus")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allStatuses")}</SelectItem>
          <SelectItem value="DRAFT">{t("draft")}</SelectItem>
          <SelectItem value="SUBMITTED">{t("submitted")}</SelectItem>
          <SelectItem value="UNDER_REVIEW">{t("underReview")}</SelectItem>
          <SelectItem value="COMPLETED">{t("completed")}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={initialFilters.type ?? "all"}
        onValueChange={(v) => updateFilter("type", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t("selectType")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allTypes")}</SelectItem>
          <SelectItem value="ANS_USOAP_CMA">{t("ansUsoap")}</SelectItem>
          <SelectItem value="SMS_CANSO_SOE">{t("smsCanso")}</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );
}
