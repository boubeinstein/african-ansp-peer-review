import { z } from "zod";
import { createHash } from "crypto";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import {
  UserRole,
  FindingType,
  FindingSeverity,
  FindingStatus,
  CAPStatus,
  MaturityLevel,
  PrismaClient,
  Prisma,
} from "@prisma/client";
import { aggregateReportData } from "@/lib/report/aggregate-report-data";
import type { ReportContent, EditableSection, ReportVersionEntry } from "@/types/report";

// ============================================================================
// Role Definitions
// ============================================================================

/**
 * Roles that can create and edit reports (Lead Reviewers + Programme Management)
 * Used by canEditReport function for reference documentation
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const REPORT_EDIT_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "LEAD_REVIEWER",
];

/**
 * Roles that can finalize reports
 */
const REPORT_FINALIZE_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "LEAD_REVIEWER",
];

/**
 * Roles that can view all reports across organizations
 */
const REPORT_VIEW_ALL_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "STEERING_COMMITTEE",
  "PROGRAMME_COORDINATOR",
];

/**
 * Roles at organization level that can view their organization's reports
 */
const REPORT_ORG_VIEW_ROLES: UserRole[] = [
  "ANSP_ADMIN",
  "SAFETY_MANAGER",
  "QUALITY_MANAGER",
];

// ============================================================================
// Report Status Type and Transitions
// ============================================================================

type ReportStatus = "DRAFT" | "UNDER_REVIEW" | "FINALIZED";

const REPORT_STATUS_VALUES: ReportStatus[] = ["DRAFT", "UNDER_REVIEW", "FINALIZED"];

/**
 * Valid report status transitions
 */
const VALID_STATUS_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  DRAFT: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["DRAFT", "FINALIZED"],
  FINALIZED: [], // Terminal state
};

function isValidStatusTransition(
  currentStatus: ReportStatus,
  newStatus: ReportStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

// ============================================================================
// Zod Schemas
// ============================================================================

const getByReviewSchema = z.object({
  reviewId: z.string().cuid(),
});

const generateReportSchema = z.object({
  reviewId: z.string().cuid(),
  locale: z.enum(["en", "fr"]).default("en"),
});

const updateReportSchema = z.object({
  reportId: z.string().cuid(),
  executiveSummaryEn: z.string().max(10000).optional(),
  executiveSummaryFr: z.string().max(10000).optional(),
  recommendationsEn: z.string().max(10000).optional(),
  recommendationsFr: z.string().max(10000).optional(),
});

const updateStatusSchema = z.object({
  reportId: z.string().cuid(),
  status: z.enum(["DRAFT", "UNDER_REVIEW", "FINALIZED"]),
});

const getByReviewIdSchema = z.object({
  reviewId: z.string().cuid(),
});

const updateSectionSchema = z.object({
  reviewId: z.string().cuid(),
  sectionKey: z.enum(["executiveSummary", "recommendations", "conclusion"]),
  contentEn: z.string().max(50000).optional(),
  contentFr: z.string().max(50000).optional(),
});

const updateStatusByReviewSchema = z.object({
  reviewId: z.string().cuid(),
  status: z.enum(["DRAFT", "UNDER_REVIEW", "FINALIZED"]),
});

/** Editable section keys in ReportSections */
const EDITABLE_SECTION_KEYS = ["executiveSummary", "recommendations", "conclusion"] as const;

// ============================================================================
// Data Aggregation Helper Functions
// ============================================================================

/**
 * Calculate Effective Implementation (EI) score from assessment responses
 * EI = (SATISFACTORY / (Total - NOT_APPLICABLE)) * 100
 */
async function calculateEIScore(
  db: PrismaClient,
  assessmentId: string
): Promise<{
  overall: number;
  byAuditArea: Record<string, { score: number; total: number; satisfactory: number }>;
  byReviewArea: Record<string, { score: number; total: number; satisfactory: number }>;
}> {
  const responses = await db.assessmentResponse.findMany({
    where: { assessmentId },
    include: {
      question: {
        select: { auditArea: true, reviewArea: true },
      },
    },
  });

  const byAuditArea: Record<string, { satisfactory: number; notSatisfactory: number; notApplicable: number }> = {};
  const byReviewArea: Record<string, { satisfactory: number; notSatisfactory: number; notApplicable: number }> = {};
  let totalSatisfactory = 0;
  let totalApplicable = 0;

  for (const response of responses) {
    const auditArea = response.question.auditArea || "UNKNOWN";
    const reviewArea = response.question.reviewArea || null;

    if (!byAuditArea[auditArea]) {
      byAuditArea[auditArea] = { satisfactory: 0, notSatisfactory: 0, notApplicable: 0 };
    }
    if (reviewArea && !byReviewArea[reviewArea]) {
      byReviewArea[reviewArea] = { satisfactory: 0, notSatisfactory: 0, notApplicable: 0 };
    }

    if (response.responseValue === "SATISFACTORY") {
      byAuditArea[auditArea].satisfactory++;
      if (reviewArea) byReviewArea[reviewArea].satisfactory++;
      totalSatisfactory++;
      totalApplicable++;
    } else if (response.responseValue === "NOT_SATISFACTORY") {
      byAuditArea[auditArea].notSatisfactory++;
      if (reviewArea) byReviewArea[reviewArea].notSatisfactory++;
      totalApplicable++;
    } else if (response.responseValue === "NOT_APPLICABLE") {
      byAuditArea[auditArea].notApplicable++;
      if (reviewArea) byReviewArea[reviewArea].notApplicable++;
    }
  }

  // Calculate scores per audit area
  const auditAreaScores: Record<string, { score: number; total: number; satisfactory: number }> = {};
  for (const [area, counts] of Object.entries(byAuditArea)) {
    const applicable = counts.satisfactory + counts.notSatisfactory;
    auditAreaScores[area] = {
      score: applicable > 0 ? Math.round((counts.satisfactory / applicable) * 100 * 100) / 100 : 0,
      total: applicable,
      satisfactory: counts.satisfactory,
    };
  }

  // Calculate scores per review area
  const reviewAreaScores: Record<string, { score: number; total: number; satisfactory: number }> = {};
  for (const [area, counts] of Object.entries(byReviewArea)) {
    const applicable = counts.satisfactory + counts.notSatisfactory;
    reviewAreaScores[area] = {
      score: applicable > 0 ? Math.round((counts.satisfactory / applicable) * 100 * 100) / 100 : 0,
      total: applicable,
      satisfactory: counts.satisfactory,
    };
  }

  // Calculate overall score
  const overallScore = totalApplicable > 0
    ? Math.round((totalSatisfactory / totalApplicable) * 100 * 100) / 100
    : 0;

  return {
    overall: overallScore,
    byAuditArea: auditAreaScores,
    byReviewArea: reviewAreaScores,
  };
}

/**
 * Calculate SMS maturity levels from assessment responses
 * Returns average maturity per component and overall
 */
async function calculateSMSMaturity(
  db: PrismaClient,
  assessmentId: string
): Promise<{
  overall: MaturityLevel | null;
  overallScore: number;
  byComponent: Record<string, { level: MaturityLevel | null; avgScore: number; count: number }>;
}> {
  const responses = await db.assessmentResponse.findMany({
    where: { assessmentId },
    include: {
      question: {
        select: { smsComponent: true, studyArea: true },
      },
    },
  });

  const levelScores: Record<MaturityLevel, number> = {
    LEVEL_A: 1,
    LEVEL_B: 2,
    LEVEL_C: 3,
    LEVEL_D: 4,
    LEVEL_E: 5,
  };

  const byComponent: Record<string, { totalScore: number; count: number }> = {};
  let totalScore = 0;
  let totalCount = 0;

  for (const response of responses) {
    if (response.maturityLevel) {
      const component = response.question.smsComponent || "UNKNOWN";

      if (!byComponent[component]) {
        byComponent[component] = { totalScore: 0, count: 0 };
      }

      const score = levelScores[response.maturityLevel];
      byComponent[component].totalScore += score;
      byComponent[component].count++;
      totalScore += score;
      totalCount++;
    }
  }

  // Calculate level from average score
  const getLevel = (avgScore: number): MaturityLevel | null => {
    if (avgScore === 0) return null;
    if (avgScore >= 4.5) return "LEVEL_E";
    if (avgScore >= 3.5) return "LEVEL_D";
    if (avgScore >= 2.5) return "LEVEL_C";
    if (avgScore >= 1.5) return "LEVEL_B";
    return "LEVEL_A";
  };

  // Calculate per-component results
  const componentResults: Record<string, { level: MaturityLevel | null; avgScore: number; count: number }> = {};
  for (const [component, data] of Object.entries(byComponent)) {
    const avgScore = data.count > 0 ? data.totalScore / data.count : 0;
    componentResults[component] = {
      level: getLevel(avgScore),
      avgScore: Math.round(avgScore * 100) / 100,
      count: data.count,
    };
  }

  const overallAvgScore = totalCount > 0 ? totalScore / totalCount : 0;

  return {
    overall: getLevel(overallAvgScore),
    overallScore: Math.round(overallAvgScore * 100) / 100,
    byComponent: componentResults,
  };
}

/**
 * Aggregate findings by type, severity, and status
 */
async function aggregateFindings(
  db: PrismaClient,
  reviewId: string
): Promise<{
  total: number;
  byType: Record<FindingType, number>;
  bySeverity: Record<FindingSeverity, number>;
  byStatus: Record<FindingStatus, number>;
  findings: Array<{
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
  }>;
}> {
  const findings = await db.finding.findMany({
    where: { reviewId },
    select: {
      id: true,
      referenceNumber: true,
      titleEn: true,
      titleFr: true,
      findingType: true,
      severity: true,
      status: true,
      criticalElement: true,
      icaoReference: true,
      capRequired: true,
      targetCloseDate: true,
    },
    orderBy: [{ severity: "asc" }, { referenceNumber: "asc" }],
  });

  // Initialize counts
  const byType: Record<FindingType, number> = {
    NON_CONFORMITY: 0,
    OBSERVATION: 0,
    CONCERN: 0,
    RECOMMENDATION: 0,
    GOOD_PRACTICE: 0,
  };

  const bySeverity: Record<FindingSeverity, number> = {
    CRITICAL: 0,
    MAJOR: 0,
    MINOR: 0,
    OBSERVATION: 0,
  };

  const byStatus: Record<FindingStatus, number> = {
    OPEN: 0,
    CAP_REQUIRED: 0,
    CAP_SUBMITTED: 0,
    CAP_ACCEPTED: 0,
    IN_PROGRESS: 0,
    VERIFICATION: 0,
    CLOSED: 0,
    DEFERRED: 0,
  };

  // Count findings
  for (const finding of findings) {
    byType[finding.findingType]++;
    bySeverity[finding.severity]++;
    byStatus[finding.status]++;
  }

  return {
    total: findings.length,
    byType,
    bySeverity,
    byStatus,
    findings,
  };
}

/**
 * Aggregate CAPs by status with overdue calculation
 */
async function aggregateCAPs(
  db: PrismaClient,
  reviewId: string
): Promise<{
  total: number;
  byStatus: Record<CAPStatus, number>;
  overdueCount: number;
  completionRate: number;
  caps: Array<{
    id: string;
    findingRef: string;
    status: CAPStatus;
    dueDate: Date;
    isOverdue: boolean;
    completedAt: Date | null;
    verifiedAt: Date | null;
  }>;
}> {
  const caps = await db.correctiveActionPlan.findMany({
    where: {
      finding: { reviewId },
    },
    include: {
      finding: {
        select: { referenceNumber: true },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const now = new Date();

  // Initialize counts
  const byStatus: Record<CAPStatus, number> = {
    DRAFT: 0,
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    ACCEPTED: 0,
    REJECTED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    VERIFIED: 0,
    CLOSED: 0,
  };

  let overdueCount = 0;
  let completedCount = 0;

  const terminalStatuses: CAPStatus[] = ["COMPLETED", "VERIFIED", "CLOSED"];

  const capResults = caps.map((cap) => {
    byStatus[cap.status]++;

    const isOverdue = cap.dueDate < now && !terminalStatuses.includes(cap.status);
    if (isOverdue) {
      overdueCount++;
    }

    if (terminalStatuses.includes(cap.status)) {
      completedCount++;
    }

    return {
      id: cap.id,
      findingRef: cap.finding.referenceNumber,
      status: cap.status,
      dueDate: cap.dueDate,
      isOverdue,
      completedAt: cap.completedAt,
      verifiedAt: cap.verifiedAt,
    };
  });

  const completionRate = caps.length > 0
    ? Math.round((completedCount / caps.length) * 100)
    : 0;

  return {
    total: caps.length,
    byStatus,
    overdueCount,
    completionRate,
    caps: capResults,
  };
}

// ============================================================================
// Authorization Helpers
// ============================================================================

/**
 * Check if user can view a report
 */
async function canViewReport(
  db: PrismaClient,
  userId: string,
  userRole: UserRole,
  userOrgId: string | null,
  reviewId: string
): Promise<boolean> {
  // Admin roles can view all
  if (REPORT_VIEW_ALL_ROLES.includes(userRole)) {
    return true;
  }

  // Check if user is on the review team
  const isTeamMember = await db.reviewTeamMember.findFirst({
    where: {
      reviewId,
      userId,
    },
  });

  if (isTeamMember) {
    return true;
  }

  // Check if user belongs to host organization
  if (userOrgId && REPORT_ORG_VIEW_ROLES.includes(userRole)) {
    const review = await db.review.findUnique({
      where: { id: reviewId },
      select: { hostOrganizationId: true },
    });

    if (review && review.hostOrganizationId === userOrgId) {
      return true;
    }
  }

  return false;
}

/**
 * Check if user can edit a report
 */
async function canEditReport(
  db: PrismaClient,
  userId: string,
  userRole: UserRole,
  reviewId: string
): Promise<boolean> {
  // Admin roles can edit
  if (["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(userRole)) {
    return true;
  }

  // Lead reviewers can edit if they're the team lead
  if (userRole === "LEAD_REVIEWER") {
    const isLead = await db.reviewTeamMember.findFirst({
      where: {
        reviewId,
        userId,
        role: "LEAD_REVIEWER",
      },
    });
    return !!isLead;
  }

  return false;
}

// ============================================================================
// Maturity Level Mapping
// ============================================================================

/** Convert a single-letter maturity label ("A"-"E") back to the Prisma enum */
function maturityLabelToEnum(label: string): MaturityLevel | null {
  const map: Record<string, MaturityLevel> = {
    A: "LEVEL_A",
    B: "LEVEL_B",
    C: "LEVEL_C",
    D: "LEVEL_D",
    E: "LEVEL_E",
  };
  return map[label] || null;
}

// ============================================================================
// Router
// ============================================================================

export const reportRouter = router({
  /**
   * Generate or regenerate the structured report for a review.
   * Calls aggregateReportData to build the full ReportContent JSON,
   * then upserts the ReviewReport record with scores and content.
   */
  generate: protectedProcedure
    .input(generateReportSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      // 1. Authorization
      const canEdit = await canEditReport(ctx.db, userId, userRole, input.reviewId);
      if (!canEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to generate reports for this review. / Vous n'avez pas la permission de générer des rapports pour cette revue.",
        });
      }

      // 2. Validate review exists and get titles
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        include: {
          hostOrganization: {
            select: { nameEn: true, nameFr: true, organizationCode: true },
          },
        },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found. / Revue non trouvée.",
        });
      }

      // 3. Get generator identity
      const generatorUser = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      const generatedBy = {
        id: userId,
        name: generatorUser
          ? `${generatorUser.firstName} ${generatorUser.lastName}`
          : "System",
        role: userRole,
      };

      // 4. Call aggregation service
      const reportContent = await aggregateReportData(
        ctx.db,
        input.reviewId,
        generatedBy,
        input.locale
      );

      // 5. Extract denormalized scores for quick access
      const overallEI = reportContent.sections.ansAssessment.overallEIScore;
      const smsLevel = reportContent.sections.smsAssessment.overallMaturityLevel;
      const overallMaturity = smsLevel ? maturityLabelToEnum(smsLevel) : null;

      // 6. Generate titles
      const year = new Date().getFullYear();
      const titleEn = `Peer Review Report - ${review.hostOrganization.nameEn} (${review.hostOrganization.organizationCode}) - ${year}`;
      const titleFr = `Rapport de Revue par les Pairs - ${review.hostOrganization.nameFr} (${review.hostOrganization.organizationCode}) - ${year}`;

      // 7. Check if a report already exists
      const existingReport = await ctx.db.reviewReport.findUnique({
        where: { reviewId: input.reviewId },
      });

      let report;

      if (existingReport) {
        // Snapshot the current version into versionHistory
        const contentHash = createHash("sha256")
          .update(JSON.stringify(existingReport.content))
          .digest("hex");

        const snapshotEntry: ReportVersionEntry = {
          version: existingReport.version,
          generatedAt: existingReport.updatedAt.toISOString(),
          generatedBy: (() => {
            const c = existingReport.content as unknown as ReportContent | null;
            return c?.metadata?.generatedBy ?? { id: "unknown", name: "Unknown", role: "SYSTEM" };
          })(),
          status: existingReport.status,
          overallEI: existingReport.overallEI,
          overallMaturity: existingReport.overallMaturity as string | null,
          contentHash,
        };

        const previousHistory = (existingReport.versionHistory as unknown as ReportVersionEntry[]) ?? [];
        const updatedHistory = [...previousHistory, snapshotEntry];

        report = await ctx.db.reviewReport.update({
          where: { reviewId: input.reviewId },
          data: {
            titleEn,
            titleFr,
            content: reportContent as unknown as Prisma.InputJsonValue,
            overallEI,
            overallMaturity,
            version: existingReport.version + 1,
            versionHistory: updatedHistory as unknown as Prisma.InputJsonValue,
            status: "DRAFT",
            draftedAt: new Date(),
            reviewedAt: null,
            finalizedAt: null,
          },
        });
      } else {
        report = await ctx.db.reviewReport.create({
          data: {
            reviewId: input.reviewId,
            titleEn,
            titleFr,
            content: reportContent as unknown as Prisma.InputJsonValue,
            status: "DRAFT",
            draftedAt: new Date(),
            overallEI,
            overallMaturity,
            version: 1,
          },
        });
      }

      return report;
    }),

  /**
   * Get the stored report with its structured content for a review.
   * Returns null if no report has been generated yet.
   */
  getByReviewId: protectedProcedure
    .input(getByReviewIdSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;
      const userOrgId = ctx.session.user.organizationId ?? null;

      // Authorization
      const canView = await canViewReport(
        ctx.db,
        userId,
        userRole,
        userOrgId,
        input.reviewId
      );

      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this report. / Vous n'avez pas la permission de consulter ce rapport.",
        });
      }

      const report = await ctx.db.reviewReport.findUnique({
        where: { reviewId: input.reviewId },
      });

      if (!report) {
        return null;
      }

      return {
        id: report.id,
        reviewId: report.reviewId,
        titleEn: report.titleEn,
        titleFr: report.titleFr,
        status: report.status as ReportStatus,
        overallEI: report.overallEI,
        overallMaturity: report.overallMaturity,
        content: (report.content as unknown as ReportContent) ?? null,
        version: report.version,
        versionHistory: (report.versionHistory as unknown as ReportVersionEntry[]) ?? [],
        draftedAt: report.draftedAt,
        reviewedAt: report.reviewedAt,
        finalizedAt: report.finalizedAt,
        pdfUrl: report.pdfUrl,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      };
    }),

  /**
   * Get report with all aggregated data for a review
   */
  getByReview: protectedProcedure
    .input(getByReviewSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;
      const userOrgId = ctx.session.user.organizationId ?? null;

      // Check view permission
      const canView = await canViewReport(
        ctx.db,
        userId,
        userRole,
        userOrgId,
        input.reviewId
      );

      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this report. / Vous n'avez pas la permission de consulter ce rapport.",
        });
      }

      // Get report - may not exist yet (valid state)
      const report = await ctx.db.reviewReport.findUnique({
        where: { reviewId: input.reviewId },
      });

      // Return null if no report exists yet - this is a valid state
      if (!report) {
        return null;
      }

      // Get review details with team
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        include: {
          hostOrganization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
              organizationCode: true,
              country: true,
            },
          },
          teamMembers: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  title: true,
                },
              },
            },
            orderBy: { role: "asc" },
          },
        },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found. / Revue non trouvée.",
        });
      }

      // Get assessment scores
      const ansAssessment = await ctx.db.assessment.findFirst({
        where: {
          reviewId: input.reviewId,
          questionnaire: { type: "ANS_USOAP_CMA" },
          status: "COMPLETED",
        },
      });

      const smsAssessment = await ctx.db.assessment.findFirst({
        where: {
          reviewId: input.reviewId,
          questionnaire: { type: "SMS_CANSO_SOE" },
          status: "COMPLETED",
        },
      });

      let ansScores: Awaited<ReturnType<typeof calculateEIScore>> | null = null;
      let smsScores: Awaited<ReturnType<typeof calculateSMSMaturity>> | null = null;

      if (ansAssessment) {
        ansScores = await calculateEIScore(ctx.db, ansAssessment.id);
      }

      if (smsAssessment) {
        smsScores = await calculateSMSMaturity(ctx.db, smsAssessment.id);
      }

      // Aggregate findings and CAPs
      const findingsData = await aggregateFindings(ctx.db, input.reviewId);
      const capsData = await aggregateCAPs(ctx.db, input.reviewId);

      return {
        report: {
          id: report.id,
          titleEn: report.titleEn,
          titleFr: report.titleFr,
          executiveSummaryEn: report.executiveSummaryEn,
          executiveSummaryFr: report.executiveSummaryFr,
          status: report.status as ReportStatus,
          draftedAt: report.draftedAt,
          reviewedAt: report.reviewedAt,
          finalizedAt: report.finalizedAt,
          pdfUrl: report.pdfUrl,
          overallEI: report.overallEI,
          overallMaturity: report.overallMaturity,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        },
        review: {
          id: review.id,
          referenceNumber: review.referenceNumber,
          reviewType: review.reviewType,
          status: review.status,
          phase: review.phase,
          plannedStartDate: review.plannedStartDate,
          plannedEndDate: review.plannedEndDate,
          actualStartDate: review.actualStartDate,
          actualEndDate: review.actualEndDate,
          hostOrganization: review.hostOrganization,
        },
        team: review.teamMembers.map((tm) => ({
          userId: tm.userId,
          role: tm.role,
          firstName: tm.user.firstName,
          lastName: tm.user.lastName,
          email: tm.user.email,
          title: tm.user.title,
          confirmedAt: tm.confirmedAt,
        })),
        assessmentScores: {
          ans: ansScores
            ? {
                overallEI: ansScores.overall,
                byAuditArea: ansScores.byAuditArea,
                byReviewArea: ansScores.byReviewArea,
              }
            : null,
          sms: smsScores
            ? {
                overallMaturity: smsScores.overall,
                overallScore: smsScores.overallScore,
                byComponent: smsScores.byComponent,
              }
            : null,
        },
        findings: findingsData,
        caps: capsData,
      };
    }),

  /**
   * Update editable report fields
   */
  update: protectedProcedure
    .input(updateReportSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      // Get report to check review ID
      const report = await ctx.db.reviewReport.findUnique({
        where: { id: input.reportId },
        select: { reviewId: true, status: true },
      });

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Report not found. / Rapport non trouvé.",
        });
      }

      // Check if report is finalized
      if (report.status === "FINALIZED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot edit a finalized report. / Impossible de modifier un rapport finalisé.",
        });
      }

      // Check edit permission
      const canEdit = await canEditReport(ctx.db, userId, userRole, report.reviewId);
      if (!canEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to edit this report. / Vous n'avez pas la permission de modifier ce rapport.",
        });
      }

      // Update report
      const { reportId, ...updateData } = input;
      const updatedReport = await ctx.db.reviewReport.update({
        where: { id: reportId },
        data: updateData,
      });

      return updatedReport;
    }),

  /**
   * Update an editable section (executive summary, recommendations, conclusion)
   * within the stored report content JSON. Only DRAFT reports can be edited.
   */
  updateSection: protectedProcedure
    .input(updateSectionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      // Authorization
      const canEdit = await canEditReport(ctx.db, userId, userRole, input.reviewId);
      if (!canEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to edit this report. / Vous n'avez pas la permission de modifier ce rapport.",
        });
      }

      // Fetch report
      const report = await ctx.db.reviewReport.findUnique({
        where: { reviewId: input.reviewId },
      });

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Report not found. Generate it first. / Rapport non trouvé. Générez-le d'abord.",
        });
      }

      if (report.status === "FINALIZED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot edit a finalized report. / Impossible de modifier un rapport finalisé.",
        });
      }

      const content = report.content as unknown as ReportContent | null;
      if (!content) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Report has no generated content. Generate the report first. / Le rapport n'a pas de contenu généré. Générez le rapport d'abord.",
        });
      }

      // Build the updated section
      const sectionKey = input.sectionKey as (typeof EDITABLE_SECTION_KEYS)[number];
      const currentSection = content.sections[sectionKey] as EditableSection;

      const updatedSection: EditableSection = {
        contentEn: input.contentEn !== undefined ? input.contentEn : currentSection.contentEn,
        contentFr: input.contentFr !== undefined ? input.contentFr : currentSection.contentFr,
        lastEditedBy: userId,
        lastEditedAt: new Date().toISOString(),
      };

      // Merge into content
      const updatedContent: ReportContent = {
        ...content,
        sections: {
          ...content.sections,
          [sectionKey]: updatedSection,
        },
      };

      // Also sync the denormalized executive summary fields if applicable
      const extraData: Record<string, string | null> = {};
      if (sectionKey === "executiveSummary") {
        if (input.contentEn !== undefined) extraData.executiveSummaryEn = input.contentEn;
        if (input.contentFr !== undefined) extraData.executiveSummaryFr = input.contentFr;
      }

      const updatedReport = await ctx.db.reviewReport.update({
        where: { reviewId: input.reviewId },
        data: {
          content: updatedContent as unknown as Prisma.InputJsonValue,
          ...extraData,
        },
      });

      return {
        id: updatedReport.id,
        sectionKey,
        updatedSection,
      };
    }),

  /**
   * Update report status with workflow validation (by reviewId)
   */
  updateReportStatus: protectedProcedure
    .input(updateStatusByReviewSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      // Get current report by reviewId
      const report = await ctx.db.reviewReport.findUnique({
        where: { reviewId: input.reviewId },
        select: { id: true, status: true, content: true },
      });

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Report not found. Generate it first. / Rapport non trouvé. Générez-le d'abord.",
        });
      }

      const currentStatus = report.status as ReportStatus;
      const newStatus = input.status;

      // Validate status transition
      if (!isValidStatusTransition(currentStatus, newStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid status transition from ${currentStatus} to ${newStatus}. / Transition de statut invalide de ${currentStatus} à ${newStatus}.`,
        });
      }

      // For DRAFT → UNDER_REVIEW: check that editable sections have content
      if (newStatus === "UNDER_REVIEW") {
        const content = report.content as unknown as ReportContent | null;
        if (content) {
          const emptySections: string[] = [];
          for (const key of EDITABLE_SECTION_KEYS) {
            const section = content.sections[key] as EditableSection;
            if (!section.contentEn && !section.contentFr) {
              emptySections.push(key);
            }
          }
          if (emptySections.length > 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `The following sections must be filled before submitting for review: ${emptySections.join(", ")}. / Les sections suivantes doivent être remplies avant la soumission pour revue : ${emptySections.join(", ")}.`,
            });
          }
        }
      }

      // Check finalize permission
      if (newStatus === "FINALIZED") {
        if (!REPORT_FINALIZE_ROLES.includes(userRole)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only Lead Reviewers and Programme Management can finalize reports. / Seuls les Réviseurs Principaux et la Direction du Programme peuvent finaliser les rapports.",
          });
        }

        // For LEAD_REVIEWER, check they're the assigned team lead
        if (userRole === "LEAD_REVIEWER") {
          const isLead = await ctx.db.reviewTeamMember.findFirst({
            where: {
              reviewId: input.reviewId,
              userId,
              role: "LEAD_REVIEWER",
            },
          });

          if (!isLead) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only the assigned Lead Reviewer can finalize this report. / Seul le Réviseur Principal assigné peut finaliser ce rapport.",
            });
          }
        }
      } else {
        // Check general edit permission for other transitions
        const canEdit = await canEditReport(ctx.db, userId, userRole, input.reviewId);
        if (!canEdit) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to change the report status. / Vous n'avez pas la permission de modifier le statut du rapport.",
          });
        }
      }

      // Prepare timestamp updates
      const updateData: {
        status: string;
        reviewedAt?: Date;
        finalizedAt?: Date;
      } = { status: newStatus };

      if (newStatus === "UNDER_REVIEW") {
        updateData.reviewedAt = new Date();
      } else if (newStatus === "FINALIZED") {
        updateData.finalizedAt = new Date();
      }

      const updatedReport = await ctx.db.reviewReport.update({
        where: { reviewId: input.reviewId },
        data: updateData,
      });

      return updatedReport;
    }),

  /**
   * Update report status with validation
   */
  updateStatus: protectedProcedure
    .input(updateStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      // Get current report
      const report = await ctx.db.reviewReport.findUnique({
        where: { id: input.reportId },
        select: { reviewId: true, status: true },
      });

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Report not found. / Rapport non trouvé.",
        });
      }

      const currentStatus = report.status as ReportStatus;
      const newStatus = input.status;

      // Validate status transition
      if (!isValidStatusTransition(currentStatus, newStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid status transition from ${currentStatus} to ${newStatus}. / Transition de statut invalide de ${currentStatus} à ${newStatus}.`,
        });
      }

      // Check finalize permission
      if (newStatus === "FINALIZED") {
        if (!REPORT_FINALIZE_ROLES.includes(userRole)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only Lead Reviewers and Programme Management can finalize reports. / Seuls les Réviseurs Principaux et la Direction du Programme peuvent finaliser les rapports.",
          });
        }

        // For LEAD_REVIEWER, check they're the team lead
        if (userRole === "LEAD_REVIEWER") {
          const isLead = await ctx.db.reviewTeamMember.findFirst({
            where: {
              reviewId: report.reviewId,
              userId,
              role: "LEAD_REVIEWER",
            },
          });

          if (!isLead) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only the assigned Lead Reviewer can finalize this report. / Seul le Réviseur Principal assigné peut finaliser ce rapport.",
            });
          }
        }
      } else {
        // Check general edit permission for other status changes
        const canEdit = await canEditReport(ctx.db, userId, userRole, report.reviewId);
        if (!canEdit) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to change the report status. / Vous n'avez pas la permission de modifier le statut du rapport.",
          });
        }
      }

      // Prepare update data
      const updateData: {
        status: string;
        reviewedAt?: Date;
        finalizedAt?: Date;
      } = {
        status: newStatus,
      };

      if (newStatus === "UNDER_REVIEW") {
        updateData.reviewedAt = new Date();
      } else if (newStatus === "FINALIZED") {
        updateData.finalizedAt = new Date();
      }

      // Update status
      const updatedReport = await ctx.db.reviewReport.update({
        where: { id: input.reportId },
        data: updateData,
      });

      return updatedReport;
    }),

  /**
   * Get report statistics across all accessible reports
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const userRole = ctx.session.user.role;
    const userOrgId = ctx.session.user.organizationId ?? null;

    // Build where clause based on user access
    let whereClause = {};

    if (!REPORT_VIEW_ALL_ROLES.includes(userRole)) {
      // Restricted view - only accessible reports
      const accessibleReviewIds: string[] = [];

      // Add reviews where user is team member
      const teamMemberships = await ctx.db.reviewTeamMember.findMany({
        where: { userId },
        select: { reviewId: true },
      });
      accessibleReviewIds.push(...teamMemberships.map((tm) => tm.reviewId));

      // Add reviews for user's organization
      if (userOrgId && REPORT_ORG_VIEW_ROLES.includes(userRole)) {
        const orgReviews = await ctx.db.review.findMany({
          where: { hostOrganizationId: userOrgId },
          select: { id: true },
        });
        accessibleReviewIds.push(...orgReviews.map((r) => r.id));
      }

      whereClause = {
        reviewId: { in: [...new Set(accessibleReviewIds)] },
      };
    }

    // Count by status
    const reports = await ctx.db.reviewReport.findMany({
      where: whereClause,
      select: { status: true },
    });

    const byStatus: Record<ReportStatus, number> = {
      DRAFT: 0,
      UNDER_REVIEW: 0,
      FINALIZED: 0,
    };

    for (const report of reports) {
      const status = report.status as ReportStatus;
      if (REPORT_STATUS_VALUES.includes(status)) {
        byStatus[status]++;
      }
    }

    return {
      total: reports.length,
      byStatus,
    };
  }),

  /**
   * List all accessible reports with summary info
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["DRAFT", "UNDER_REVIEW", "FINALIZED"]).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;
      const userOrgId = ctx.session.user.organizationId ?? null;

      // Build where clause based on user access
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const whereClause: any = {};

      if (!REPORT_VIEW_ALL_ROLES.includes(userRole)) {
        // Restricted view - only accessible reports
        const accessibleReviewIds: string[] = [];

        // Add reviews where user is team member
        const teamMemberships = await ctx.db.reviewTeamMember.findMany({
          where: { userId },
          select: { reviewId: true },
        });
        accessibleReviewIds.push(...teamMemberships.map((tm) => tm.reviewId));

        // Add reviews for user's organization
        if (userOrgId && REPORT_ORG_VIEW_ROLES.includes(userRole)) {
          const orgReviews = await ctx.db.review.findMany({
            where: { hostOrganizationId: userOrgId },
            select: { id: true },
          });
          accessibleReviewIds.push(...orgReviews.map((r) => r.id));
        }

        whereClause.reviewId = { in: [...new Set(accessibleReviewIds)] };
      }

      // Add status filter
      if (input.status) {
        whereClause.status = input.status;
      }

      // Get total count
      const total = await ctx.db.reviewReport.count({ where: whereClause });

      // Get paginated reports
      const reports = await ctx.db.reviewReport.findMany({
        where: whereClause,
        include: {
          review: {
            include: {
              hostOrganization: {
                select: { nameEn: true, nameFr: true, organizationCode: true },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      });

      return {
        reports: reports.map((r) => ({
          id: r.id,
          titleEn: r.titleEn,
          titleFr: r.titleFr,
          status: r.status as ReportStatus,
          overallEI: r.overallEI,
          overallMaturity: r.overallMaturity,
          draftedAt: r.draftedAt,
          finalizedAt: r.finalizedAt,
          review: {
            id: r.review.id,
            referenceNumber: r.review.referenceNumber,
            reviewType: r.review.reviewType,
            hostOrganization: r.review.hostOrganization,
          },
        })),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    }),
});

export type ReportRouter = typeof reportRouter;
