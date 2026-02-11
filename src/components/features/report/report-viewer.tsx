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
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
// COLOR HELPERS
// =============================================================================

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white",
  MAJOR: "bg-orange-600 text-white",
  MINOR: "bg-yellow-500 text-white",
  OBSERVATION: "bg-blue-500 text-white",
};

const TYPE_STYLES: Record<string, string> = {
  NON_CONFORMITY: "bg-red-100 text-red-800 border-red-200",
  OBSERVATION: "bg-blue-100 text-blue-800 border-blue-200",
  CONCERN: "bg-amber-100 text-amber-800 border-amber-200",
  RECOMMENDATION: "bg-purple-100 text-purple-800 border-purple-200",
  GOOD_PRACTICE: "bg-green-100 text-green-800 border-green-200",
};

const CAP_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-indigo-100 text-indigo-700",
  REJECTED: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  IMPLEMENTED: "bg-teal-100 text-teal-700",
  VERIFIED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-green-100 text-green-700",
};

// =============================================================================
// FINDINGS TAB
// =============================================================================

function FindingsTab({ content }: { content: ReportContent }) {
  const t = useTranslations("report.findings");

  const summary = content.sections.findingsSummary;
  const findings = content.sections.findingsDetail.findings;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(summary.byType).map(([type, count]) => (
          <div
            key={type}
            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
          >
            <span className="text-xs text-muted-foreground">{type.replace(/_/g, " ")}</span>
            <Badge variant="secondary">{count}</Badge>
          </div>
        ))}
      </div>

      {/* Findings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {t("title")}
            <Badge variant="secondary">{findings.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {findings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t("noFindings")}
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">{t("reference")}</TableHead>
                    <TableHead className="w-[130px]">{t("type")}</TableHead>
                    <TableHead className="w-[100px]">{t("severity")}</TableHead>
                    <TableHead className="w-[100px]">{t("status")}</TableHead>
                    <TableHead>{t("finding")}</TableHead>
                    <TableHead className="w-[80px] text-center">{t("cap")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {findings.map((finding) => (
                    <TableRow key={finding.reference}>
                      <TableCell className="font-mono text-sm">
                        {finding.reference}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", TYPE_STYLES[finding.type] || "")}
                        >
                          {finding.type.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", SEVERITY_STYLES[finding.severity] || "")}>
                          {finding.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {finding.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="truncate block max-w-[300px]" title={finding.title}>
                          {finding.title}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {finding.capRequired ? (
                          <Badge variant="secondary" className="text-xs">
                            {t("required")}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// CAPS TAB
// =============================================================================

function CAPsTab({ content }: { content: ReportContent }) {
  const t = useTranslations("report.caps");

  const caps = content.sections.correctiveActions;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label={t("total")} value={caps.totalCAPs} />
        <StatCard label={t("statusBreakdown")} value={caps.submitted} sublabel="Submitted" />
        <StatCard label={t("completionRate")} value={`${caps.completionRate}%`} highlight />
        <StatCard label={t("overdue")} value={caps.overdue} warning={caps.overdue > 0} />
        <StatCard label="Accepted" value={caps.accepted} />
      </div>

      {/* Completion Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">{t("completionRate")}</span>
            <span className="font-medium">{caps.completionRate}%</span>
          </div>
          <Progress value={caps.completionRate} className="h-2" />
        </CardContent>
      </Card>

      {/* CAPs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {t("title")}
            <Badge variant="secondary">{caps.totalCAPs}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {caps.caps.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t("noCAPs")}
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Reference</TableHead>
                    <TableHead className="w-[120px]">{t("finding")}</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead>Corrective Action</TableHead>
                    <TableHead className="w-[120px]">{t("dueDate")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {caps.caps.map((cap) => (
                    <TableRow key={cap.reference}>
                      <TableCell className="font-mono text-sm">
                        {cap.reference}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {cap.findingReference}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", CAP_STATUS_STYLES[cap.status] || "")}
                        >
                          {cap.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="truncate block max-w-[250px]" title={cap.correctiveAction}>
                          {cap.correctiveAction}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {cap.dueDate || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  warning,
  highlight,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  warning?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "p-3 rounded-lg",
        warning
          ? "bg-red-100 dark:bg-red-900/30"
          : highlight
          ? "bg-blue-100 dark:bg-blue-900/30"
          : "bg-muted/30"
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-xl font-bold",
          warning ? "text-red-600" : highlight ? "text-blue-600" : ""
        )}
      >
        {value}
      </p>
      {sublabel && (
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      )}
    </div>
  );
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
        <FindingsTab content={content} />
      </TabsContent>

      <TabsContent value="caps" className="mt-6">
        <CAPsTab content={content} />
      </TabsContent>

      <TabsContent value="team" className="mt-6">
        <TeamTab content={content} />
      </TabsContent>
    </Tabs>
  );
}
