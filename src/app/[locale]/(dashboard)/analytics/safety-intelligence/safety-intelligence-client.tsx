"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Shield,
  ArrowLeft,
  Download,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { OverviewTab } from "@/components/features/safety-intelligence/overview-tab";
import { BenchmarkingTab } from "@/components/features/safety-intelligence/benchmarking-tab";
import { FindingsAnalysisTab } from "@/components/features/safety-intelligence/findings-analysis-tab";
import { SMSMaturityTab } from "@/components/features/safety-intelligence/sms-maturity-tab";

// =============================================================================
// TYPES
// =============================================================================

interface SafetyIntelligenceClientProps {
  userId: string;
  userRole: string;
}

export type TabId =
  | "overview"
  | "benchmarking"
  | "findings"
  | "smsMaturity"
  | "teams"
  | "caps";

export interface TabContentProps {
  selectedTeamId: string | null;
  anonymized: boolean;
}

// =============================================================================
// TAB DEFINITIONS
// =============================================================================

const TAB_IDS: TabId[] = [
  "overview",
  "benchmarking",
  "findings",
  "smsMaturity",
  "teams",
  "caps",
];

// =============================================================================
// MAIN CLIENT COMPONENT
// =============================================================================

export function SafetyIntelligenceClient({
  userId,
  userRole,
}: SafetyIntelligenceClientProps) {
  const locale = useLocale();
  const t = useTranslations("safetyIntelligence");

  // State
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showAbuja, setShowAbuja] = useState(false);
  const [anonymized, setAnonymized] = useState(false);

  // Fetch team summaries for the team selector
  const { data: teams, isLoading: teamsLoading } =
    trpc.safetyIntelligence.getTeamSummaries.useQuery();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/analytics`}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">
                {t("title")}
              </h1>
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
              >
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
                {t("live")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Abuja toggle */}
          <Button
            variant={showAbuja ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAbuja(!showAbuja)}
          >
            <Target className="h-4 w-4 mr-1.5" />
            {t("abuja.toggle")}
          </Button>

          {/* Team selector */}
          <Select
            value={selectedTeamId ?? "all"}
            onValueChange={(val) =>
              setSelectedTeamId(val === "all" ? null : val)
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("filters.allTeams")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allTeams")}</SelectItem>
              {teams?.map((team) => (
                <SelectItem key={team.teamId} value={team.teamId}>
                  {t("filters.team", {
                    number: team.teamNumber,
                    region: team.teamCode,
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Anonymize toggle */}
          <Button
            variant={anonymized ? "default" : "outline"}
            size="sm"
            onClick={() => setAnonymized(!anonymized)}
          >
            {anonymized ? t("filters.showCodes") : t("filters.anonymized")}
          </Button>

          {/* Export */}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1.5" />
            {t("export")}
          </Button>
        </div>
      </div>

      {/* Abuja Safety Targets Banner */}
      {showAbuja && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="p-4">
            <button
              onClick={() => setShowAbuja(!showAbuja)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold text-amber-900 dark:text-amber-200">
                  {t("abuja.title")}
                </span>
              </div>
              {showAbuja ? (
                <ChevronUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              )}
            </button>
            <ul className="mt-3 space-y-2 text-sm text-amber-800 dark:text-amber-300">
              <li className="flex items-start gap-2">
                <span className="font-medium shrink-0">15.1</span>
                <span>{t("abuja.target15_1")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium shrink-0">15.2</span>
                <span>{t("abuja.target15_2")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium shrink-0">15.3</span>
                <span>{t("abuja.target15_3")}</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as TabId)}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-6">
          {TAB_IDS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {t(`tabs.${tab}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab content — placeholder for tab components (SI-6 through SI-11) */}
        <div className="min-h-[400px]">
          {teamsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          ) : (
            <TabContent
              activeTab={activeTab}
              selectedTeamId={selectedTeamId}
              anonymized={anonymized}
            />
          )}
        </div>
      </Tabs>

      {/* Footer */}
      <footer className="border-t pt-4 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span>{t("footer.version")}</span>
        <span>
          {t("footer.dataSource", {
            count: teams?.reduce((sum, team) => sum + team.memberCount, 0) ?? 0,
          })}
        </span>
        <span>{t("footer.frameworks")}</span>
      </footer>
    </div>
  );
}

// =============================================================================
// TAB CONTENT ROUTER — renders the active tab component
// =============================================================================

function TabContent({
  activeTab,
  selectedTeamId,
  anonymized,
}: TabContentProps & { activeTab: TabId }) {
  switch (activeTab) {
    case "overview":
      return <OverviewTab selectedTeamId={selectedTeamId} />;
    case "benchmarking":
      return (
        <BenchmarkingTab
          selectedTeamId={selectedTeamId}
          anonymized={anonymized}
        />
      );
    case "findings":
      return <FindingsAnalysisTab selectedTeamId={selectedTeamId} />;
    case "smsMaturity":
      return <SMSMaturityTab selectedTeamId={selectedTeamId} />;
    default:
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-24 text-muted-foreground">
            <p className="text-sm">
              {activeTab} tab — content coming soon
            </p>
          </CardContent>
        </Card>
      );
  }
}
