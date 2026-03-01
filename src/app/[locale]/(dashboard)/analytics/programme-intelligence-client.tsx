"use client";

/**
 * Programme Intelligence — unified analytics hub
 *
 * Merges the Analytics dashboard and Safety Intelligence dashboard
 * into a single tabbed interface with four sections:
 *   1. Overview — KPIs, review/finding/CAP statistics, team metrics
 *   2. Cross-ANSP Benchmarking — EI benchmarking, SMS maturity, regional analysis
 *   3. Findings & CAP Trends — pattern analysis, CAP closure, severity
 *   4. Abuja Target #15 — AST #15 KPI tracking
 */

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  GitCompareArrows,
  TrendingUp,
  Target,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { SafetyIntelligenceClient } from "./safety-intelligence/safety-intelligence-client";
import { FindingsCapTrendsTab } from "@/components/features/analytics/findings-cap-trends-tab";
import { AbujaTarget15Tab } from "@/components/features/analytics/abuja-target15-tab";

// =============================================================================
// TYPES
// =============================================================================

interface ProgrammeIntelligenceClientProps {
  locale: string;
  userId: string;
  userRole: string;
}

type PITab = "overview" | "benchmarking" | "findingsTrends" | "abujaTargets";

const VALID_TABS: PITab[] = ["overview", "benchmarking", "findingsTrends", "abujaTargets"];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ProgrammeIntelligenceClient({
  locale,
  userId,
  userRole,
}: ProgrammeIntelligenceClientProps) {
  const t = useTranslations("analytics");
  const searchParams = useSearchParams();

  // Support ?tab= deep linking (e.g. redirect from /safety-intelligence)
  const tabParam = searchParams.get("tab") as PITab | null;
  const defaultTab: PITab =
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : "overview";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {t("programmeIntelligence.title")}
          </h1>
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
          >
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
            Live
          </Badge>
        </div>
        <p className="text-muted-foreground">
          {t("programmeIntelligence.subtitle")}
        </p>
      </div>

      {/* Top-level tabs */}
      <Tabs defaultValue={defaultTab} className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="h-4 w-4 hidden sm:inline" />
            {t("programmeIntelligence.tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="benchmarking" className="gap-1.5">
            <GitCompareArrows className="h-4 w-4 hidden sm:inline" />
            {t("programmeIntelligence.tabs.benchmarking")}
          </TabsTrigger>
          <TabsTrigger value="findingsTrends" className="gap-1.5">
            <TrendingUp className="h-4 w-4 hidden sm:inline" />
            {t("programmeIntelligence.tabs.findingsTrends")}
          </TabsTrigger>
          <TabsTrigger value="abujaTargets" className="gap-1.5">
            <Target className="h-4 w-4 hidden sm:inline" />
            {t("programmeIntelligence.tabs.abujaTargets")}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview — existing Analytics Dashboard */}
        <TabsContent value="overview">
          <AnalyticsDashboard locale={locale} embedded />
        </TabsContent>

        {/* Tab 2: Cross-ANSP Benchmarking — existing Safety Intelligence */}
        <TabsContent value="benchmarking">
          <SafetyIntelligenceClient
            userId={userId}
            userRole={userRole}
            embedded
          />
        </TabsContent>

        {/* Tab 3: Findings & CAP Trends */}
        <TabsContent value="findingsTrends">
          <FindingsCapTrendsTab locale={locale} />
        </TabsContent>

        {/* Tab 4: Abuja Target #15 */}
        <TabsContent value="abujaTargets">
          <AbujaTarget15Tab locale={locale} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProgrammeIntelligenceClient;
