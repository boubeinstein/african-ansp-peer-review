"use client";

/**
 * CAP Detail View Component
 *
 * Comprehensive view combining all CAP workflow components:
 * - Status workflow stepper
 * - Action buttons
 * - Timeline/history
 * - Content sections (root cause, actions, etc.)
 * - Sidebar with finding info and dates
 */

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { format, differenceInDays, isPast } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { UserRole, CAPStatus, EvidenceCategory, EvidenceStatus, MilestoneStatus } from "@/types/prisma-enums";
import {
  ArrowLeft,
  Calendar,
  User,
  AlertTriangle,
  FileText,
  Building,
  ExternalLink,
  Clock,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Feature Components
import { CAPStatusWorkflow } from "./cap-status-workflow";
import { CAPActionButtons } from "./cap-action-buttons";
import { CAPTimeline } from "./cap-timeline";
import { CAPStatusBadge } from "./cap-status-badge";
import { CAPVerificationForm } from "./cap-verification-form";
import { FindingSeverityBadge } from "../finding/finding-severity-badge";
import { WorkflowHistory } from "../workflow/workflow-history";
import { SLAIndicator } from "../workflow/sla-indicator";
import { CAPEvidenceUpload } from "../caps/cap-evidence-upload";

// =============================================================================
// TYPES
// =============================================================================

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface FindingInfo {
  id: string;
  referenceNumber: string;
  titleEn: string;
  titleFr: string;
  severity: "CRITICAL" | "MAJOR" | "MINOR" | "OBSERVATION";
  status: string;
  organizationId: string;
  review: {
    id: string;
    referenceNumber: string;
    status: string;
    hostOrganization: {
      id: string;
      nameEn: string;
      nameFr: string;
      organizationCode: string | null;
    };
    teamMembers?: Array<{ userId: string }>;
  };
  organization: {
    id: string;
    nameEn: string;
    nameFr: string;
    organizationCode: string | null;
  };
  question?: {
    id: string;
    pqNumber: string | null;
    questionTextEn: string;
    questionTextFr: string;
  } | null;
}

interface DocumentInfo {
  id: string;
  name: string;
  originalName?: string | null;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: Date | string;
}

interface CAPData {
  id: string;
  findingId: string;
  rootCauseEn: string;
  rootCauseFr: string;
  correctiveActionEn: string;
  correctiveActionFr: string;
  preventiveActionEn?: string | null;
  preventiveActionFr?: string | null;
  status: CAPStatus;
  dueDate: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  submittedAt?: Date | string | null;
  acceptedAt?: Date | string | null;
  completedAt?: Date | string | null;
  verifiedAt?: Date | string | null;
  verificationMethod?: string | null;
  verificationNotes?: string | null;
  finding: FindingInfo;
  assignedTo?: UserInfo | null;
  verifiedBy?: UserInfo | null;
  documents?: DocumentInfo[];
  evidence?: {
    id: string;
    category: EvidenceCategory;
    titleEn: string;
    titleFr: string | null;
    descriptionEn: string | null;
    descriptionFr: string | null;
    evidenceDate: Date | string;
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    status: EvidenceStatus;
    uploadedAt: Date | string;
    reviewedAt: Date | string | null;
    reviewerCommentEn: string | null;
    reviewerCommentFr: string | null;
    rejectionReason: string | null;
    uploadedBy: { id: string; firstName: string; lastName: string };
    reviewedBy?: { id: string; firstName: string; lastName: string } | null;
    milestone?: { id: string; titleEn: string; titleFr: string | null; status: MilestoneStatus; targetDate: Date | string } | null;
  }[];
  milestones?: {
    id: string;
    titleEn: string;
    titleFr: string | null;
    status: MilestoneStatus;
    targetDate: Date | string;
  }[];
}

interface CAPDetailViewProps {
  cap: CAPData;
  userRole: UserRole;
  onStatusChange?: () => void;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Content section with EN/FR tabs
 */
interface ContentSectionProps {
  titleKey: string;
  contentEn: string;
  contentFr: string;
  icon?: React.ReactNode;
  emptyMessage?: string;
}

function ContentSection({
  titleKey,
  contentEn,
  contentFr,
  icon,
  emptyMessage,
}: ContentSectionProps) {
  const t = useTranslations("cap.form");
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<"en" | "fr">(locale === "fr" ? "fr" : "en");

  const hasContent = contentEn || contentFr;

  if (!hasContent && emptyMessage) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            {t(titleKey)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {t(titleKey)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "en" | "fr")}>
          <TabsList className="grid w-full grid-cols-2 max-w-[200px]">
            <TabsTrigger value="en">English</TabsTrigger>
            <TabsTrigger value="fr">Français</TabsTrigger>
          </TabsList>
          <TabsContent value="en" className="mt-4">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {contentEn || <span className="italic text-muted-foreground">No English content</span>}
            </p>
          </TabsContent>
          <TabsContent value="fr" className="mt-4">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {contentFr || <span className="italic text-muted-foreground">Pas de contenu en français</span>}
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/**
 * Sidebar info card
 */
interface InfoCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function InfoCard({ title, icon, children }: InfoCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

/**
 * Info row for sidebar
 */
interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

function InfoRow({ label, value, className }: InfoRowProps) {
  return (
    <div className={cn("flex justify-between items-start gap-2", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CAPDetailView({ cap, userRole, onStatusChange }: CAPDetailViewProps) {
  const t = useTranslations("cap");
  const tFinding = useTranslations("findings");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  const [showVerificationForm, setShowVerificationForm] = useState(false);

  // Computed values
  const dueDate = new Date(cap.dueDate);
  const isOverdue =
    isPast(dueDate) &&
    !["VERIFIED", "CLOSED"].includes(cap.status);
  const daysUntilDue = differenceInDays(dueDate, new Date());
  const findingTitle = locale === "fr" ? cap.finding.titleFr : cap.finding.titleEn;
  const orgName = locale === "fr"
    ? cap.finding.organization.nameFr
    : cap.finding.organization.nameEn;

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-muted-foreground">
        <Link
          href={`/${locale}/findings`}
          className="hover:text-foreground transition-colors"
        >
          {tFinding("title")}
        </Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <Link
          href={`/${locale}/findings/${cap.findingId}`}
          className="hover:text-foreground transition-colors"
        >
          {cap.finding.referenceNumber}
        </Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="text-foreground font-medium">
          {t("title").split(" ")[0]}
        </span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">
              {t("view")}
            </h1>
            <CAPStatusBadge status={cap.status} />
            <SLAIndicator entityType="CAP" entityId={cap.id} />
            {isOverdue && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {t("detail.overdue")}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {t("detail.finding")}: {cap.finding.referenceNumber} - {findingTitle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <Link href={`/${locale}/findings/${cap.findingId}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("detail.backToFinding")}
            </Link>
          </Button>
          <CAPActionButtons
            capId={cap.id}
            findingId={cap.findingId}
            currentStatus={cap.status}
            userRole={userRole}
            onStatusChange={onStatusChange}
          />
        </div>
      </div>

      {/* Overdue Warning */}
      {isOverdue && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t("detail.daysOverdue", { days: Math.abs(daysUntilDue) })}
          </AlertDescription>
        </Alert>
      )}

      {/* Status Workflow Stepper */}
      <Card>
        <CardContent className="pt-6">
          <CAPStatusWorkflow
            currentStatus={cap.status}
            submittedAt={cap.submittedAt}
            acceptedAt={cap.acceptedAt}
            completedAt={cap.completedAt}
            verifiedAt={cap.verifiedAt}
          />
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Root Cause Analysis */}
          <ContentSection
            titleKey="rootCause"
            contentEn={cap.rootCauseEn}
            contentFr={cap.rootCauseFr}
            icon={<FileText className="w-4 h-4" />}
          />

          {/* Corrective Action */}
          <ContentSection
            titleKey="correctiveAction"
            contentEn={cap.correctiveActionEn}
            contentFr={cap.correctiveActionFr}
            icon={<FileText className="w-4 h-4" />}
          />

          {/* Preventive Action (optional) */}
          {(cap.preventiveActionEn || cap.preventiveActionFr) && (
            <ContentSection
              titleKey="preventiveAction"
              contentEn={cap.preventiveActionEn || ""}
              contentFr={cap.preventiveActionFr || ""}
              icon={<FileText className="w-4 h-4" />}
            />
          )}

          {/* Evidence/Documents */}
          <CAPEvidenceUpload
            capId={cap.id}
            evidence={cap.evidence}
            milestones={cap.milestones}
            canUpload={
              !["VERIFIED", "CLOSED"].includes(cap.status) &&
              ["SUPER_ADMIN", "SYSTEM_ADMIN", "ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER", "PROGRAMME_COORDINATOR"].includes(userRole)
            }
            canReview={
              ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR", "STEERING_COMMITTEE", "LEAD_REVIEWER"].includes(userRole)
            }
            onEvidenceChange={onStatusChange}
          />

          {/* Timeline/History */}
          <Card>
            <CardContent className="pt-6">
              <CAPTimeline
                cap={{
                  id: cap.id,
                  status: cap.status,
                  createdAt: cap.createdAt,
                  submittedAt: cap.submittedAt,
                  acceptedAt: cap.acceptedAt,
                  completedAt: cap.completedAt,
                  verifiedAt: cap.verifiedAt,
                  verificationMethod: cap.verificationMethod,
                  verificationNotes: cap.verificationNotes,
                  verifiedBy: cap.verifiedBy || undefined,
                  assignedTo: cap.assignedTo || undefined,
                }}
              />
            </CardContent>
          </Card>

          {/* Workflow History */}
          <WorkflowHistory entityType="CAP" entityId={cap.id} maxItems={5} />
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-6">
          {/* Finding Info */}
          <InfoCard
            title={t("detail.finding")}
            icon={<FileText className="w-4 h-4" />}
          >
            <InfoRow
              label={tFinding("detail.reference")}
              value={
                <Link
                  href={`/${locale}/findings/${cap.findingId}`}
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {cap.finding.referenceNumber}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              }
            />
            <InfoRow
              label={tFinding("detail.severity")}
              value={<FindingSeverityBadge severity={cap.finding.severity} />}
            />
            <InfoRow
              label={tFinding("detail.type")}
              value={cap.finding.status}
            />
            {cap.finding.question && (
              <InfoRow
                label={tFinding("detail.question")}
                value={
                  <span className="text-xs">
                    {cap.finding.question.pqNumber}
                  </span>
                }
              />
            )}
            <Separator className="my-2" />
            <div className="text-sm">
              <p className="text-muted-foreground line-clamp-3">{findingTitle}</p>
            </div>
          </InfoCard>

          {/* Organization Info */}
          <InfoCard
            title={t("organization")}
            icon={<Building className="w-4 h-4" />}
          >
            <InfoRow
              label={tFinding("detail.organization")}
              value={orgName}
            />
            <InfoRow
              label="ICAO Code"
              value={cap.finding.organization.organizationCode}
            />
            <InfoRow
              label={tFinding("detail.review")}
              value={
                <Link
                  href={`/${locale}/reviews/${cap.finding.review.id}`}
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {cap.finding.review.referenceNumber}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              }
            />
          </InfoCard>

          {/* Dates & Assignment */}
          <InfoCard
            title={t("detail.dueDate")}
            icon={<Calendar className="w-4 h-4" />}
          >
            <InfoRow
              label={t("detail.dueDate")}
              value={
                <span
                  className={cn(
                    isOverdue && "text-destructive font-semibold"
                  )}
                >
                  {format(dueDate, "PPP", { locale: dateLocale })}
                </span>
              }
            />
            {!["VERIFIED", "CLOSED"].includes(cap.status) && (
              <InfoRow
                label=""
                value={
                  <span
                    className={cn(
                      "text-xs",
                      isOverdue
                        ? "text-destructive"
                        : daysUntilDue <= 7
                        ? "text-amber-600"
                        : "text-muted-foreground"
                    )}
                  >
                    {isOverdue
                      ? t("detail.daysOverdue", { days: Math.abs(daysUntilDue) })
                      : t("detail.daysRemaining", { days: daysUntilDue })}
                  </span>
                }
              />
            )}
            <Separator className="my-2" />
            <InfoRow
              label={t("form.assignedTo")}
              value={
                cap.assignedTo ? (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {cap.assignedTo.firstName} {cap.assignedTo.lastName}
                  </span>
                ) : (
                  <span className="text-muted-foreground italic">
                    {t("form.noAssignee") || "Not assigned"}
                  </span>
                )
              }
            />
          </InfoCard>

          {/* Key Dates */}
          <InfoCard
            title={t("detail.keyDates") || "Key Dates"}
            icon={<Clock className="w-4 h-4" />}
          >
            <InfoRow
              label={t("detail.created") || "Created"}
              value={format(new Date(cap.createdAt), "PP", { locale: dateLocale })}
            />
            {cap.submittedAt && (
              <InfoRow
                label={t("detail.submittedAt")}
                value={format(new Date(cap.submittedAt), "PP", { locale: dateLocale })}
              />
            )}
            {cap.acceptedAt && (
              <InfoRow
                label={t("detail.acceptedAt")}
                value={format(new Date(cap.acceptedAt), "PP", { locale: dateLocale })}
              />
            )}
            {cap.completedAt && (
              <InfoRow
                label={t("detail.completedAt")}
                value={format(new Date(cap.completedAt), "PP", { locale: dateLocale })}
              />
            )}
            {cap.verifiedAt && (
              <InfoRow
                label={t("detail.verifiedAt")}
                value={format(new Date(cap.verifiedAt), "PP", { locale: dateLocale })}
              />
            )}
          </InfoCard>

          {/* Verification Info (if verified) */}
          {cap.verifiedAt && (
            <InfoCard
              title={t("verification.title")}
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              <InfoRow
                label={t("detail.verifiedAt")}
                value={format(new Date(cap.verifiedAt), "PPP", { locale: dateLocale })}
              />
              {cap.verifiedBy && (
                <InfoRow
                  label={t("detail.verifiedBy")}
                  value={
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {cap.verifiedBy.firstName} {cap.verifiedBy.lastName}
                    </span>
                  }
                />
              )}
              {cap.verificationMethod && (
                <>
                  <Separator className="my-2" />
                  <InfoRow
                    label={t("verification.method")}
                    value={cap.verificationMethod}
                  />
                </>
              )}
              {cap.verificationNotes && (
                <div className="mt-2 p-2 bg-muted/50 rounded-md">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {cap.verificationNotes}
                  </p>
                </div>
              )}
            </InfoCard>
          )}
        </div>
      </div>

      {/* Verification Form Modal */}
      <CAPVerificationForm
        capId={cap.id}
        findingId={cap.findingId}
        open={showVerificationForm}
        onOpenChange={setShowVerificationForm}
        onSuccess={onStatusChange}
      />
    </div>
  );
}
