"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  ChevronRight,
  Home,
  Search,
  Shield,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ComponentTabs } from "./component-tabs";
import { StudyAreaAccordion } from "./study-area-accordion";
import { MaturityLegend } from "./maturity-legend";
import { SMS_COMPONENTS } from "@/lib/questionnaire/constants";
import type { SMSComponent, CANSOStudyArea } from "@/types/prisma-enums";

interface SMSBrowserProps {
  locale: string;
  initialComponent?: string;
  initialStudyArea?: string;
  initialSearch?: string;
}

export function SMSBrowser({
  locale,
  initialComponent,
  initialStudyArea,
  initialSearch,
}: SMSBrowserProps) {
  const t = useTranslations("smsBrowser");
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = locale === "fr" ? "fr" : "en";

  // State
  const [selectedComponent, setSelectedComponent] = useState<SMSComponent>(
    (initialComponent as SMSComponent) || "SAFETY_POLICY_OBJECTIVES"
  );
  const [searchInput, setSearchInput] = useState(initialSearch || "");

  // Get current search from URL
  const currentSearch = searchParams.get("search") || "";

  // Track result counts from children
  const [resultCounts, setResultCounts] = useState<{
    objectives: number;
    studyAreas: number;
  }>({ objectives: 0, studyAreas: 0 });

  // Stable callback to prevent infinite loop in StudyAreaAccordion
  const handleResultCounts = useCallback((counts: { objectives: number; studyAreas: number }) => {
    setResultCounts(counts);
  }, []);

  // Update URL when component changes
  const handleComponentChange = useCallback(
    (component: SMSComponent) => {
      setSelectedComponent(component);
      const params = new URLSearchParams(searchParams.toString());
      params.set("component", component);
      params.delete("studyArea");
      router.push(`/${locale}/questionnaires/sms?${params.toString()}`);
    },
    [router, searchParams, locale]
  );

  // Update URL when study area is expanded
  const handleStudyAreaChange = useCallback(
    (studyArea: CANSOStudyArea | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (studyArea) {
        params.set("studyArea", studyArea);
      } else {
        params.delete("studyArea");
      }
      router.push(`/${locale}/questionnaires/sms?${params.toString()}`);
    },
    [router, searchParams, locale]
  );

  // Search handlers
  const handleSearch = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (searchInput) {
      params.set("search", searchInput);
    } else {
      params.delete("search");
    }
    router.push(`/${locale}/questionnaires/sms?${params.toString()}`);
  }, [router, searchParams, locale, searchInput]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSearch();
    },
    [handleSearch]
  );

  const clearSearch = useCallback(() => {
    setSearchInput("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    router.push(`/${locale}/questionnaires/sms?${params.toString()}`);
  }, [router, searchParams, locale]);

  const componentMeta = SMS_COMPONENTS[selectedComponent];

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
          <span className="text-foreground font-medium">
            {t("breadcrumb.sms")}
          </span>
        </nav>

        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-emerald-600" />
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Search Bar */}
      <div className="space-y-2">
        <Label htmlFor="sms-search" className="text-sm font-medium">
          {t("search.label")}
        </Label>
        <div className="flex gap-2">
          <Input
            id="sms-search"
            placeholder={t("search.placeholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="flex-1 max-w-md"
          />
          <Button size="icon" variant="secondary" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {/* Active search badge */}
        {currentSearch && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              &quot;{currentSearch}&quot;
              <button
                onClick={clearSearch}
                className="ml-1 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </div>
        )}
      </div>

      {/* Maturity Legend */}
      <MaturityLegend locale={locale} defaultOpen={false} />

      {/* Component Tabs */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("components.title")}</h2>
        <ComponentTabs
          selected={selectedComponent}
          onChange={handleComponentChange}
          locale={locale}
        />
      </div>

      {/* Component Details */}
      <div className="rounded-lg border bg-muted/20 p-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {t("components.selected")}:
          </span>
          <span className="font-semibold">{componentMeta.name[lang]}</span>
          <span className="text-sm px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 font-bold">
            {Math.round(componentMeta.weight * 100)}% {t("components.weight")}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {componentMeta.description[lang]}
        </p>
      </div>

      {/* Results Summary (shown when searching) */}
      {currentSearch && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t("results.total", { count: resultCounts.objectives })}</span>
          <span>
            {t("results.studyAreas", { count: resultCounts.studyAreas })}
          </span>
        </div>
      )}

      {/* Study Areas */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          {t("studyArea.title")}
        </h2>
        <StudyAreaAccordion
          component={selectedComponent}
          locale={locale}
          defaultOpen={initialStudyArea}
          onStudyAreaChange={handleStudyAreaChange}
          searchQuery={currentSearch}
          onResultCounts={handleResultCounts}
        />
      </div>
    </div>
  );
}
