/**
 * Report Generator Service
 *
 * Generates professional PDF reports for completed peer reviews.
 */

import React from "react";
import { Document, Page, View, Text, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { styles, labels, colors } from "./styles";
import type { ReviewReportData, FindingsSummary as FindingsSummaryType, CAPSummary } from "./types";
import {
  CoverPage,
  ExecutiveSummary,
  TeamSection,
  ScopeSection,
  FindingsSummary,
  DetailedFindings,
  CAPSection,
  BestPracticesSection,
  ConclusionSection,
  AnnexesSection,
  AnnexInterviews,
  AnnexDocuments,
  AnnexAcronyms,
} from "./components";

// =============================================================================
// PAGE WRAPPER WITH HEADER/FOOTER
// =============================================================================

interface ReportPageProps {
  review: ReviewReportData;
  locale: "en" | "fr";
  children: React.ReactNode;
}

function ReportPage({ review, locale, children }: ReportPageProps) {
  const t = labels[locale];

  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header} fixed>
        <Text style={styles.headerText}>AAPRP</Text>
        <Text style={styles.headerText}>
          {review.reference} | {review.hostOrganization.name}
        </Text>
      </View>

      {/* Content */}
      {children}

      {/* Footer */}
      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>
          {review.classification ? `${review.classification} | ` : ""}
          {t.preparedBy}
        </Text>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `${t.page} ${pageNumber} ${t.of} ${totalPages}`
          }
        />
      </View>
    </Page>
  );
}

// =============================================================================
// REPORT DOCUMENT
// =============================================================================

interface ReportDocumentProps {
  review: ReviewReportData;
  locale: "en" | "fr";
}

function ReportDocument({ review, locale }: ReportDocumentProps) {
  return (
    <Document
      title={`Peer Review Report - ${review.reference}`}
      author="AAPRP"
      subject={`Peer Review of ${review.hostOrganization.name}`}
      keywords="peer review, AAPRP, aviation safety, ANSP"
      creator="African ANSP Peer Review Programme"
      producer="AAPRP Report Generator"
    >
      {/* Cover Page */}
      <CoverPage review={review} locale={locale} />

      {/* Executive Summary */}
      <ReportPage review={review} locale={locale}>
        <ExecutiveSummary review={review} locale={locale} />
      </ReportPage>

      {/* Review Team */}
      <ReportPage review={review} locale={locale}>
        <TeamSection review={review} locale={locale} />
      </ReportPage>

      {/* Scope & Methodology */}
      <ReportPage review={review} locale={locale}>
        <ScopeSection review={review} locale={locale} />
      </ReportPage>

      {/* Findings Summary */}
      <ReportPage review={review} locale={locale}>
        <FindingsSummary review={review} locale={locale} />
      </ReportPage>

      {/* Detailed Findings */}
      <ReportPage review={review} locale={locale}>
        <DetailedFindings review={review} locale={locale} />
      </ReportPage>

      {/* CAP Section */}
      <ReportPage review={review} locale={locale}>
        <CAPSection review={review} locale={locale} />
      </ReportPage>

      {/* Best Practices */}
      {review.bestPractices.length > 0 && (
        <ReportPage review={review} locale={locale}>
          <BestPracticesSection review={review} locale={locale} />
        </ReportPage>
      )}

      {/* Conclusion */}
      <ReportPage review={review} locale={locale}>
        <ConclusionSection review={review} locale={locale} />
      </ReportPage>

      {/* Annexes */}
      <ReportPage review={review} locale={locale}>
        <AnnexesSection review={review} locale={locale} />
      </ReportPage>

      {/* Annex A: Interviews */}
      <ReportPage review={review} locale={locale}>
        <AnnexInterviews review={review} locale={locale} />
      </ReportPage>

      {/* Annex B: Documents */}
      <ReportPage review={review} locale={locale}>
        <AnnexDocuments review={review} locale={locale} />
      </ReportPage>

      {/* Annex C: Acronyms */}
      <ReportPage review={review} locale={locale}>
        <AnnexAcronyms review={review} locale={locale} />
      </ReportPage>
    </Document>
  );
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getReviewWithAllDetails(reviewId: string): Promise<ReviewReportData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      hostOrganization: true,
      teamMembers: {
        include: {
          user: true,
          reviewerProfile: {
            include: {
              homeOrganization: true,
            },
          },
        },
      },
      findings: {
        include: {
          correctiveActionPlan: {
            include: {
              milestones: true,
            },
          },
        },
      },
    },
  }) as any;

  if (!review) {
    throw new Error(`Review not found: ${reviewId}`);
  }

  // Find lead reviewer
  const leadMember = review.teamMembers.find(
    (m: { role: string }) => m.role === "LEAD_REVIEWER"
  );
  if (!leadMember) {
    throw new Error("Review must have a lead reviewer");
  }

  // Transform team members
  const teamMembers = review.teamMembers
    .filter((m: { role: string }) => m.role !== "LEAD_REVIEWER")
    .map((m: { id: string; user: { firstName: string | null; lastName: string | null }; reviewerProfile: { homeOrganization: { name: string } | null; expertiseAreas: string[] } | null; role: string }) => ({
      id: m.id,
      firstName: m.user.firstName || "",
      lastName: m.user.lastName || "",
      organization: m.reviewerProfile?.homeOrganization?.name || "",
      role: m.role,
      expertise: m.reviewerProfile?.expertiseAreas || [],
    }));

  // Transform findings - use English locale by default, the actual locale is used in rendering
  const findings = review.findings.map((f: {
    id: string;
    referenceNumber: string;
    titleEn: string;
    severity: string;
    findingType: string;
    descriptionEn: string;
    evidenceEn: string | null;
    icaoReference: string | null;
    capRequired: boolean;
    correctiveActionPlan: { rootCauseEn: string } | null;
  }) => ({
    id: f.id,
    reference: f.referenceNumber,
    title: f.titleEn,
    severity: f.severity as "CRITICAL" | "MAJOR" | "MINOR" | "OBSERVATION",
    type: f.findingType as "NON_CONFORMITY" | "CONCERN" | "OBSERVATION" | "GOOD_PRACTICE",
    auditArea: "General", // Will need to determine from question or other source
    description: f.descriptionEn,
    evidence: f.evidenceEn || "",
    icaoReference: f.icaoReference || undefined,
    capRequired: f.capRequired,
    rootCause: f.correctiveActionPlan?.rootCauseEn || undefined,
    recommendation: undefined,
  }));

  // Calculate findings summary
  const findingsSummary: FindingsSummaryType = {
    total: findings.filter((f: { type: string }) => f.type !== "GOOD_PRACTICE").length,
    bySeverity: {
      critical: findings.filter((f: { severity: string; type: string }) => f.severity === "CRITICAL" && f.type !== "GOOD_PRACTICE").length,
      major: findings.filter((f: { severity: string; type: string }) => f.severity === "MAJOR" && f.type !== "GOOD_PRACTICE").length,
      minor: findings.filter((f: { severity: string; type: string }) => f.severity === "MINOR" && f.type !== "GOOD_PRACTICE").length,
      observation: findings.filter((f: { severity: string; type: string }) => f.severity === "OBSERVATION" && f.type !== "GOOD_PRACTICE").length,
    },
    byArea: findings
      .filter((f: { type: string }) => f.type !== "GOOD_PRACTICE")
      .reduce(
        (acc: Record<string, number>, f: { auditArea: string }) => {
          acc[f.auditArea] = (acc[f.auditArea] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    goodPractices: findings.filter((f: { type: string }) => f.type === "GOOD_PRACTICE").length,
  };

  // Transform CAPs
  const caps = review.findings
    .filter((f: { capRequired: boolean; correctiveActionPlan: unknown }) => f.capRequired && f.correctiveActionPlan)
    .map((f: {
      referenceNumber: string;
      titleEn: string;
      correctiveActionPlan: {
        id: string;
        status: string;
        targetDate: Date | null;
        progress: number;
        descriptionEn: string | null;
      } | null;
    }) => {
      const cap = f.correctiveActionPlan!;
      const isOverdue = cap.targetDate && new Date(cap.targetDate) < new Date() && cap.status !== "VERIFIED";
      return {
        id: cap.id,
        reference: `CAP-${cap.id.slice(-6).toUpperCase()}`,
        findingReference: f.referenceNumber,
        findingTitle: f.titleEn,
        status: (isOverdue ? "OVERDUE" : cap.status) as "PENDING" | "IN_PROGRESS" | "SUBMITTED" | "ACCEPTED" | "VERIFIED" | "OVERDUE",
        dueDate: cap.targetDate || new Date(),
        progress: cap.progress || 0,
        description: cap.descriptionEn || undefined,
      };
    });

  // Calculate CAP summary
  const capSummary: CAPSummary = {
    total: caps.length,
    byStatus: {
      pending: caps.filter((c: { status: string }) => c.status === "PENDING").length,
      inProgress: caps.filter((c: { status: string }) => c.status === "IN_PROGRESS").length,
      submitted: caps.filter((c: { status: string }) => c.status === "SUBMITTED").length,
      accepted: caps.filter((c: { status: string }) => c.status === "ACCEPTED").length,
      verified: caps.filter((c: { status: string }) => c.status === "VERIFIED").length,
      overdue: caps.filter((c: { status: string }) => c.status === "OVERDUE").length,
    },
    averageProgress: caps.length > 0 ? caps.reduce((sum: number, c: { progress: number }) => sum + c.progress, 0) / caps.length : 0,
  };

  // Best practices
  const bestPractices = findings
    .filter((f: { type: string }) => f.type === "GOOD_PRACTICE")
    .map((f: { id: string; reference: string; title: string; auditArea: string; description: string; evidence: string; recommendation?: string }) => ({
      id: f.id,
      reference: f.reference,
      title: f.title,
      auditArea: f.auditArea,
      description: f.description,
      benefit: f.evidence,
      applicability: f.recommendation || "Applicable to similar ANSP environments",
    }));

  return {
    id: review.id,
    reference: review.referenceNumber,
    hostOrganization: {
      id: review.hostOrganization.id,
      name: review.hostOrganization.name,
      shortName: review.hostOrganization.shortName || "",
      country: review.hostOrganization.country || "",
      type: review.hostOrganization.type || "",
    },
    status: review.status,
    classification: undefined,
    startDate: review.actualStartDate || review.plannedStartDate || new Date(),
    endDate: review.actualEndDate || review.plannedEndDate || new Date(),
    reportDate: new Date(),
    leadReviewer: {
      id: leadMember.id,
      firstName: leadMember.user.firstName || "",
      lastName: leadMember.user.lastName || "",
      organization: leadMember.reviewerProfile?.homeOrganization?.name || "",
      role: "LEAD_REVIEWER",
      expertise: leadMember.reviewerProfile?.expertiseAreas || [],
    },
    teamMembers,
    areasInScope: review.areasInScope || [],
    documentsExamined: [],
    interviewsConducted: [],
    facilitiesVisited: [],
    overallAssessment: review.objectives || "",
    keyStrengths: [],
    areasForImprovement: [],
    findings,
    findingsSummary,
    caps,
    capSummary,
    bestPractices,
    recommendations: [],
    acknowledgments: undefined,
    acronyms: [],
  };
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Generate a PDF report for a peer review.
 *
 * @param reviewId - The ID of the review to generate a report for
 * @param locale - The language for the report (en or fr)
 * @returns Buffer containing the PDF data
 */
export async function generateReviewReport(
  reviewId: string,
  locale: "en" | "fr" = "en"
): Promise<Buffer> {
  // Fetch review data
  const review = await getReviewWithAllDetails(reviewId);

  // Generate PDF
  const pdfBuffer = await renderToBuffer(
    <ReportDocument review={review} locale={locale} />
  );

  return Buffer.from(pdfBuffer);
}

/**
 * Get the filename for a review report.
 */
export function getReportFilename(reference: string, locale: "en" | "fr"): string {
  const dateStr = new Date().toISOString().split("T")[0];
  return `AAPRP-Report-${reference}-${locale.toUpperCase()}-${dateStr}.pdf`;
}
