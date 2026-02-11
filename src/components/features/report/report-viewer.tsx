"use client";

/**
 * Report Viewer Component
 *
 * Tabbed viewer for structured report content (ReportContent JSON).
 * Tabs: Summary, Scores, Findings, CAPs, Team
 *
 * All tab content is extracted to dedicated components under the
 * report/ directory. This component handles tab navigation and
 * wires the `report-viewer` CSS class for print stylesheet targeting.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  FileText,
  BarChart3,
  AlertTriangle,
  ClipboardList,
  Users,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ReportSummaryTab } from "./report-summary-tab";
import { ReportScoresTab } from "@/app/[locale]/(dashboard)/reviews/[id]/_components/tabs/report/report-scores-tab";
import { ReportFindingsTab } from "@/app/[locale]/(dashboard)/reviews/[id]/_components/tabs/report/report-findings-tab";
import { ReportCAPsTab } from "@/app/[locale]/(dashboard)/reviews/[id]/_components/tabs/report/report-caps-tab";
import { ReportTeamTab } from "@/app/[locale]/(dashboard)/reviews/[id]/_components/tabs/report/report-team-tab";
import type { ReportContent } from "@/types/report";

// =============================================================================
// PROPS
// =============================================================================

interface ReportViewerProps {
  content: ReportContent;
  reviewId: string;
  reportStatus: string;
  onContentUpdated?: () => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ReportViewer({
  content,
  reviewId,
  reportStatus,
  onContentUpdated,
}: ReportViewerProps) {
  const t = useTranslations("report");
  const [activeTab, setActiveTab] = useState("summary");
  const readOnly = reportStatus !== "DRAFT";

  return (
    <div className="report-viewer">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="summary" className="gap-2">
            <FileText className="h-4 w-4" />
            {t("tabs.summary")}
          </TabsTrigger>
          <TabsTrigger value="scores" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            {t("tabs.scores")}
          </TabsTrigger>
          <TabsTrigger value="findings" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t("tabs.findings")}
            <Badge variant="secondary" className="ml-1">
              {content.sections.findingsSummary.totalFindings}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="caps" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            {t("tabs.caps")}
            <Badge variant="secondary" className="ml-1">
              {content.sections.correctiveActions.totalCAPs}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            {t("tabs.team")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6 mt-6">
          <ReportSummaryTab
            content={content}
            reviewId={reviewId}
            readOnly={readOnly}
            onSectionSaved={onContentUpdated}
          />
        </TabsContent>

        <TabsContent value="scores" className="mt-6">
          <ReportScoresTab content={content} />
        </TabsContent>

        <TabsContent value="findings" className="mt-6">
          <ReportFindingsTab content={content} />
        </TabsContent>

        <TabsContent value="caps" className="mt-6">
          <ReportCAPsTab content={content} />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <ReportTeamTab content={content} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
