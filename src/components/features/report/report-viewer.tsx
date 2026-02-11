"use client";

/**
 * Report Viewer Component
 *
 * Tabbed viewer for structured report content (ReportContent JSON).
 * Tabs: Summary, Scores, Findings, CAPs, Team
 *
 * - Summary tab: key metrics + editable sections (via ReportSummaryTab)
 * - Scores tab: ANS EI by audit area + SMS maturity by component
 * - Findings tab: findings detail table
 * - CAPs tab: corrective actions summary
 * - Team tab: team composition
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  FileText,
  BarChart3,
  AlertTriangle,
  ClipboardList,
  Users,
  Crown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReportSummaryTab } from "./report-summary-tab";
import { ReportScoresTab } from "@/app/[locale]/(dashboard)/reviews/[id]/_components/tabs/report/report-scores-tab";
import { ReportFindingsTab } from "@/app/[locale]/(dashboard)/reviews/[id]/_components/tabs/report/report-findings-tab";
import { ReportCAPsTab } from "@/app/[locale]/(dashboard)/reviews/[id]/_components/tabs/report/report-caps-tab";
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
// TEAM TAB
// =============================================================================

function TeamTab({ content }: { content: ReportContent }) {
  const t = useTranslations("report.team");

  const team = content.sections.teamComposition;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t("title")}
          <Badge variant="secondary">
            {(team.teamLead ? 1 : 0) + team.members.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team Lead */}
        {team.teamLead && (
          <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border">
            <div className="p-2 bg-primary/10 rounded-full">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{team.teamLead.name}</p>
              <p className="text-sm text-muted-foreground">
                {t("leadReviewer")} — {team.teamLead.organization}
              </p>
              {team.teamLead.expertise.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {team.teamLead.expertise.map((exp) => (
                    <Badge key={exp} variant="secondary" className="text-xs">
                      {exp}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Badge variant="outline">{team.teamLead.country}</Badge>
          </div>
        )}

        {/* Members Table */}
        {team.members.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("role")}</TableHead>
                  <TableHead>{t("organization")}</TableHead>
                  <TableHead>Country</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.members.map((member, index) => (
                  <TableRow key={`${member.name}-${index}`}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {member.role.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.organization}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {member.country}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Observer Organizations */}
        {team.observerOrganizations && team.observerOrganizations.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">{t("observers")}</h4>
            <div className="flex flex-wrap gap-2">
              {team.observerOrganizations.map((org) => (
                <Badge key={org} variant="outline">
                  {org}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
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
        <TeamTab content={content} />
      </TabsContent>
    </Tabs>
  );
}
