"use client";

/**
 * Report Detail View Component
 *
 * Main view combining all report components with tabs for different sections.
 * Supports editing of executive summary and recommendations in DRAFT status.
 */

import { useState, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import "@/styles/report-print.css";
import {
  FileText,
  BarChart3,
  AlertTriangle,
  ClipboardList,
  Users,
  Save,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

import { ReportHeader } from "./report-header";
import { ReportSummaryCards } from "./report-summary-cards";
import { ReportScoresSection } from "./report-scores-section";
import { ReportFindingsTable } from "./report-findings-table";
import { ReportCAPSummary } from "./report-cap-summary";
import { ReportPrintView } from "./report-print-view";
import { generatePDF, formatPDFFilename } from "@/lib/pdf/generate-report-pdf";

import type {
  FindingType,
  FindingSeverity,
  FindingStatus,
  CAPStatus,
  MaturityLevel,
  ReviewType,
  ReviewPhase,
  TeamRole,
} from "@/types/prisma-enums";

// =============================================================================
// TYPES
// =============================================================================

type ReportStatus = "DRAFT" | "UNDER_REVIEW" | "FINALIZED";

interface ReportData {
  id: string;
  titleEn: string;
  titleFr: string;
  executiveSummaryEn: string | null;
  executiveSummaryFr: string | null;
  status: ReportStatus;
  draftedAt: Date | null;
  reviewedAt: Date | null;
  finalizedAt: Date | null;
  pdfUrl: string | null;
  overallEI: number | null;
  overallMaturity: MaturityLevel | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ReviewData {
  id: string;
  referenceNumber: string;
  reviewType: ReviewType;
  status: string;
  phase: ReviewPhase;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  hostOrganization: {
    id: string;
    nameEn: string;
    nameFr: string;
    organizationCode: string | null;
    country: string;
  };
}

interface TeamMember {
  userId: string;
  role: TeamRole;
  firstName: string;
  lastName: string;
  email: string;
  title: string | null;
  confirmedAt: Date | null;
}

interface AuditAreaScore {
  score: number;
  total: number;
  satisfactory: number;
}

interface ComponentScore {
  level: MaturityLevel | null;
  avgScore: number;
  count: number;
}

interface AssessmentScores {
  ans: {
    overallEI: number;
    byReviewArea: Record<string, AuditAreaScore>;
  } | null;
  sms: {
    overallMaturity: MaturityLevel | null;
    overallScore: number;
    byComponent: Record<string, ComponentScore>;
  } | null;
}

interface Finding {
  id: string;
  referenceNumber: string;
  titleEn: string;
  titleFr: string;
  findingType: FindingType;
  severity: FindingSeverity;
  status: FindingStatus;
  criticalElement: string | null;
  icaoReference: string | null;
  capRequired: boolean;
  targetCloseDate: Date | null;
}

interface FindingsData {
  total: number;
  byType: Record<FindingType, number>;
  bySeverity: Record<FindingSeverity, number>;
  byStatus: Record<FindingStatus, number>;
  findings: Finding[];
}

interface CAPItem {
  id: string;
  findingRef: string;
  status: CAPStatus;
  dueDate: Date;
  isOverdue: boolean;
  completedAt: Date | null;
  verifiedAt: Date | null;
}

interface CAPsData {
  total: number;
  byStatus: Record<CAPStatus, number>;
  overdueCount: number;
  completionRate: number;
  caps: CAPItem[];
}

interface ReportDetailData {
  report: ReportData;
  review: ReviewData;
  team: TeamMember[];
  assessmentScores: AssessmentScores;
  findings: FindingsData;
  caps: CAPsData;
}

interface ReportDetailViewProps {
  data: ReportDetailData;
  canEdit?: boolean;
  canSubmit?: boolean;
  canFinalize?: boolean;
  className?: string;
}

// =============================================================================
// ROLE LABELS
// =============================================================================

const ROLE_LABELS: Record<TeamRole, { en: string; fr: string }> = {
  LEAD_REVIEWER: { en: "Lead Reviewer", fr: "Réviseur Principal" },
  REVIEWER: { en: "Reviewer", fr: "Réviseur" },
  TECHNICAL_EXPERT: { en: "Technical Expert", fr: "Expert Technique" },
  OBSERVER: { en: "Observer", fr: "Observateur" },
  TRAINEE: { en: "Trainee", fr: "Stagiaire" },
};

// =============================================================================
// EXECUTIVE SUMMARY EDITOR
// =============================================================================

interface SummaryEditorProps {
  titleKey: string;
  contentEn: string;
  contentFr: string;
  onChangeEn: (value: string) => void;
  onChangeFr: (value: string) => void;
  readOnly?: boolean;
}

function SummaryEditor({
  titleKey,
  contentEn,
  contentFr,
  onChangeEn,
  onChangeFr,
  readOnly = false,
}: SummaryEditorProps) {
  const t = useTranslations("report");
  const [activeTab, setActiveTab] = useState<"en" | "fr">("en");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t(titleKey)}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "en" | "fr")}>
          <TabsList className="mb-3">
            <TabsTrigger value="en">English</TabsTrigger>
            <TabsTrigger value="fr">Français</TabsTrigger>
          </TabsList>
          <TabsContent value="en">
            <Textarea
              value={contentEn}
              onChange={(e) => onChangeEn(e.target.value)}
              placeholder={t(`${titleKey}PlaceholderEn`)}
              className="min-h-[200px] resize-y"
              readOnly={readOnly}
            />
          </TabsContent>
          <TabsContent value="fr">
            <Textarea
              value={contentFr}
              onChange={(e) => onChangeFr(e.target.value)}
              placeholder={t(`${titleKey}PlaceholderFr`)}
              className="min-h-[200px] resize-y"
              readOnly={readOnly}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// TEAM TABLE
// =============================================================================

function TeamTable({ team, locale }: { team: TeamMember[]; locale: string }) {
  const t = useTranslations("report.team");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t("title")}
          <Badge variant="secondary">{team.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("role")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("title")}</TableHead>
                <TableHead>{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((member) => {
                const roleLabel = locale === "fr"
                  ? ROLE_LABELS[member.role].fr
                  : ROLE_LABELS[member.role].en;
                const initials = `${member.firstName?.[0] || ""}${member.lastName?.[0] || ""}`.toUpperCase();

                return (
                  <TableRow key={member.userId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {member.firstName} {member.lastName}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={member.role === "LEAD_REVIEWER" ? "default" : "outline"}
                      >
                        {roleLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {member.email}
                    </TableCell>
                    <TableCell className="text-sm">
                      {member.title || "—"}
                    </TableCell>
                    <TableCell>
                      {member.confirmedAt ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {t("confirmed")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {t("pending")}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ReportDetailView({
  data,
  canEdit = false,
  canSubmit = false,
  canFinalize = false,
  className,
}: ReportDetailViewProps) {
  const t = useTranslations("report");
  const locale = useLocale();
  const router = useRouter();

  // Editable state
  const [executiveSummaryEn, setExecutiveSummaryEn] = useState(
    data.report.executiveSummaryEn || ""
  );
  const [executiveSummaryFr, setExecutiveSummaryFr] = useState(
    data.report.executiveSummaryFr || ""
  );
  const [recommendationsEn, setRecommendationsEn] = useState("");
  const [recommendationsFr, setRecommendationsFr] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Track changes
  const handleSummaryEnChange = useCallback((value: string) => {
    setExecutiveSummaryEn(value);
    setHasChanges(true);
  }, []);

  const handleSummaryFrChange = useCallback((value: string) => {
    setExecutiveSummaryFr(value);
    setHasChanges(true);
  }, []);

  const handleRecsEnChange = useCallback((value: string) => {
    setRecommendationsEn(value);
    setHasChanges(true);
  }, []);

  const handleRecsFrChange = useCallback((value: string) => {
    setRecommendationsFr(value);
    setHasChanges(true);
  }, []);

  // Mutations
  const updateMutation = trpc.report.update.useMutation({
    onSuccess: () => {
      setHasChanges(false);
      toast.success(t("saveSuccess"), {
        description: t("saveSuccessDescription"),
      });
    },
    onError: (error) => {
      toast.error(t("saveError"), {
        description: error.message,
      });
    },
  });

  const statusMutation = trpc.report.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(t("statusUpdateSuccess"), {
        description: t("statusUpdateSuccessDescription"),
      });
      router.refresh();
    },
    onError: (error) => {
      toast.error(t("statusUpdateError"), {
        description: error.message,
      });
    },
  });

  // Handlers
  const handleSave = useCallback(() => {
    updateMutation.mutate({
      reportId: data.report.id,
      executiveSummaryEn,
      executiveSummaryFr,
      recommendationsEn: recommendationsEn || undefined,
      recommendationsFr: recommendationsFr || undefined,
    });
  }, [
    updateMutation,
    data.report.id,
    executiveSummaryEn,
    executiveSummaryFr,
    recommendationsEn,
    recommendationsFr,
  ]);

  const handleStatusChange = useCallback(
    (status: ReportStatus) => {
      statusMutation.mutate({
        reportId: data.report.id,
        status,
      });
    },
    [statusMutation, data.report.id]
  );

  const handleEdit = useCallback(() => {
    setActiveTab("summary");
  }, []);

  const handleCancel = useCallback(() => {
    setExecutiveSummaryEn(data.report.executiveSummaryEn || "");
    setExecutiveSummaryFr(data.report.executiveSummaryFr || "");
    setRecommendationsEn("");
    setRecommendationsFr("");
    setHasChanges(false);
  }, [data.report.executiveSummaryEn, data.report.executiveSummaryFr]);

  const handleExportPDF = useCallback(async () => {
    setIsExporting(true);
    setIsPrintMode(true);

    // Wait for print view to render
    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      const filename = formatPDFFilename(
        "Review_Report",
        data.review.referenceNumber
      );

      await generatePDF({ title: filename });

      toast.success(t("actions.exportPdf"), {
        description: locale === "fr"
          ? "Le rapport a été préparé pour l'impression."
          : "The report has been prepared for printing.",
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error(t("saveError"), {
        description: locale === "fr"
          ? "Erreur lors de l'export du PDF."
          : "Error exporting PDF.",
      });
    } finally {
      setIsPrintMode(false);
      setIsExporting(false);
    }
  }, [t, locale, data.review.referenceNumber]);

  const handleViewFinding = useCallback(
    (id: string) => {
      router.push(`/${locale}/findings/${id}`);
    },
    [router, locale]
  );

  const handleViewCAP = useCallback(
    (findingRef: string) => {
      const finding = data.findings.findings.find(
        (f) => f.referenceNumber === findingRef
      );
      if (finding) {
        router.push(`/${locale}/findings/${finding.id}`);
      }
    },
    [router, locale, data.findings.findings]
  );

  const isEditable = data.report.status === "DRAFT" && canEdit;
  const isSaving = updateMutation.isPending;
  const isUpdatingStatus = statusMutation.isPending;

  return (
    <div className={cn("space-y-6 print:space-y-4", className)}>
      {/* Header */}
      <ReportHeader
        report={data.report}
        review={data.review}
        canEdit={canEdit}
        canSubmit={canSubmit}
        canFinalize={canFinalize}
        onEdit={handleEdit}
        onStatusChange={handleStatusChange}
        onExportPDF={handleExportPDF}
      />

      {/* Summary Cards */}
      <ReportSummaryCards
        findings={data.findings}
        caps={data.caps}
        scores={data.assessmentScores}
        className="print:hidden"
      />

      {/* Save/Cancel Buttons (floating) */}
      {isEditable && hasChanges && (
        <div className="fixed bottom-6 right-6 z-50 print:hidden flex gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
            className="shadow-lg"
          >
            <X className="h-4 w-4 mr-2" />
            {t("actions.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="shadow-lg"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {t("saveChanges")}
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="print:block">
        <TabsList className="print:hidden">
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
              {data.findings.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="caps" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            {t("tabs.caps")}
            <Badge variant="secondary" className="ml-1">
              {data.caps.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            {t("tabs.team")}
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6 print:block">
          <SummaryEditor
            titleKey="executiveSummary"
            contentEn={executiveSummaryEn}
            contentFr={executiveSummaryFr}
            onChangeEn={handleSummaryEnChange}
            onChangeFr={handleSummaryFrChange}
            readOnly={!isEditable}
          />
          <SummaryEditor
            titleKey="recommendations"
            contentEn={recommendationsEn}
            contentFr={recommendationsFr}
            onChangeEn={handleRecsEnChange}
            onChangeFr={handleRecsFrChange}
            readOnly={!isEditable}
          />
        </TabsContent>

        {/* Scores Tab */}
        <TabsContent value="scores" className="print:block print:break-before-page">
          <ReportScoresSection
            ansScores={data.assessmentScores.ans}
            smsScores={data.assessmentScores.sms}
          />
        </TabsContent>

        {/* Findings Tab */}
        <TabsContent value="findings" className="print:block print:break-before-page">
          <ReportFindingsTable
            findings={data.findings.findings}
            onViewFinding={handleViewFinding}
          />
        </TabsContent>

        {/* CAPs Tab */}
        <TabsContent value="caps" className="print:block print:break-before-page">
          <ReportCAPSummary
            caps={data.caps}
            onViewCAP={handleViewCAP}
          />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="print:block print:break-before-page">
          <TeamTable team={data.team} locale={locale} />
        </TabsContent>
      </Tabs>

      {/* Status Update Loading Overlay */}
      {isUpdatingStatus && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>{t("updatingStatus")}</span>
          </div>
        </div>
      )}

      {/* Export Loading Overlay */}
      {isExporting && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 no-print">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>{locale === "fr" ? "Préparation du PDF..." : "Preparing PDF..."}</span>
          </div>
        </div>
      )}

      {/* Print View (hidden on screen, visible when printing) */}
      {isPrintMode && (
        <div className="print-container hidden print:block">
          <ReportPrintView
            ref={printRef}
            report={data.report}
            review={data.review}
            team={data.team}
            assessmentScores={data.assessmentScores}
            findings={data.findings}
            caps={data.caps}
            locale={locale}
            translations={{
              title: t("title"),
              executiveSummary: t("executiveSummary"),
              scores: t("tabs.scores"),
              findings: t("tabs.findings"),
              caps: t("tabs.caps"),
              team: t("tabs.team"),
              confidential: t("print.confidential"),
              generatedOn: t("print.generatedOn"),
              page: t("print.page"),
              overallEI: t("scores.overallEI"),
              overallMaturity: t("scores.overallMaturity"),
              reviewArea: t("scores.byReviewArea"),
              score: t("scores.eiScore"),
              component: t("scores.byComponent"),
              maturityLevel: t("scores.maturityScore"),
              reference: t("findings.reference"),
              finding: t("findings.finding"),
              type: t("findings.type"),
              severity: t("findings.severity"),
              status: t("findings.status"),
              dueDate: t("findings.dueDate"),
              completionRate: t("caps.completionRate"),
              total: t("caps.total"),
              overdue: t("caps.overdue"),
              name: t("team.name"),
              role: t("team.role"),
              email: t("team.email"),
            }}
          />
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print,
          .print\\:hidden {
            display: none !important;
          }

          .print-container {
            display: block !important;
          }

          @page {
            margin: 15mm;
            size: A4;
          }
        }

        @media screen {
          .print-container {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default ReportDetailView;
