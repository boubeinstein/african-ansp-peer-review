/**
 * Intelligence Router - Programme-Level Analytics
 *
 * Aggregates findings, CAP, and Abuja Safety Target data across all reviews
 * for the Programme Intelligence page tabs.
 */

import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../trpc";
import { FindingSeverity, FindingType, FindingStatus, CAPStatus, AfricanRegion, MaturityLevel, ReviewStatus, ParticipationStatus } from "@prisma/client";
import { subMonths, startOfMonth, endOfMonth, differenceInDays, format } from "date-fns";

// =============================================================================
// INPUT SCHEMA
// =============================================================================

const filtersSchema = z.object({
  region: z.nativeEnum(AfricanRegion).optional(),
  teamNumber: z.number().min(1).max(5).optional(),
  months: z.number().min(1).max(120).optional(), // undefined = all time
}).optional();

// =============================================================================
// TYPES
// =============================================================================

interface SummaryKPIs {
  totalFindings: number;
  openFindings: number;
  closedFindings: number;
  criticalOpen: number;
  avgResolutionDays: number | null;
  totalCAPs: number;
  capsOnTime: number;
  capsOverdue: number;
  capCompletionRate: number;
}

interface DistributionItem {
  severity?: string;
  type?: string;
  status?: string;
  count: number;
  percentage: number;
}

interface FindingsByReviewArea {
  area: string;
  total: number;
  critical: number;
  major: number;
  minor: number;
  observation: number;
}

interface MonthlyTrendItem {
  month: string;
  opened: number;
  closed: number;
  netOpen: number;
}

interface CAPClosureItem {
  severity: string;
  avgDays: number;
  count: number;
}

interface OrgFindingSummary {
  organizationId: string;
  nameEn: string;
  nameFr: string;
  total: number;
  critical: number;
  open: number;
}

interface RecurringPattern {
  icaoReference: string;
  count: number;
  organizations: number;
}

// -- Abuja Target #15 types --

interface AST151KPI {
  label: string;
  target: number;
  current: number;
  percentage: number;
  trend?: { month: string; count: number }[];
}

interface AST151 {
  targetDate: string;
  kpi01: AST151KPI;
  kpi02: AST151KPI;
  byRegion: { region: string; total: number; joined: number; reviewed: number }[];
}

interface AST152Milestone {
  targetDate: string;
  target: number;
  label: string;
  achieved: number;
  percentage: number;
  inProgress?: number;
  notStarted?: number;
}

interface AST152 {
  milestone2025: AST152Milestone;
  milestone2028: AST152Milestone;
  maturityDistribution: { level: string; count: number; percentage: number }[];
  byRegion: { region: string; avgMaturity: string; achieved50: number; total: number }[];
}

interface AST153 {
  targetDate: string;
  label: string;
  readinessLevels: {
    high: number;
    medium: number;
    low: number;
    notStarted: number;
  };
}

interface OrgDetail {
  id: string;
  nameEn: string;
  nameFr: string;
  country: string;
  region: string;
  participationStatus: string;
  joinedAt: string | null;
  hasCompletedReview: boolean;
  latestSMSMaturity: string | null;
  latestEIScore: number | null;
  reviewCount: number;
}

// =============================================================================
// HELPERS
// =============================================================================

const CLOSED_STATUSES: FindingStatus[] = ["CLOSED", "DEFERRED"];
const CAP_DONE_STATUSES: CAPStatus[] = ["COMPLETED", "VERIFIED", "CLOSED"];

// Abuja Target constants
const TOTAL_AFRICAN_ANSPS = 54;
const ACTIVE_PARTICIPATION: ParticipationStatus[] = ["ACTIVE", "APPROVED"];
const COMPLETED_REVIEW: ReviewStatus = "COMPLETED";

// Maturity ordering: A(20%) < B(40%) < C(60%) < D(80%) < E(100%)
const MATURITY_ORDER: Record<MaturityLevel, number> = {
  LEVEL_A: 1,
  LEVEL_B: 2,
  LEVEL_C: 3,
  LEVEL_D: 4,
  LEVEL_E: 5,
};

// Display label for maturity levels (strip LEVEL_ prefix)
function maturityLabel(level: MaturityLevel): string {
  return level.replace("LEVEL_", "");
}

function maturityAtLeast(level: MaturityLevel, threshold: MaturityLevel): boolean {
  return MATURITY_ORDER[level] >= MATURITY_ORDER[threshold];
}

function pct(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
}

// =============================================================================
// ROUTER
// =============================================================================

export const intelligenceRouter = router({
  /**
   * Aggregated findings and CAP trend data for programme intelligence.
   */
  getFindingsAndCAPTrends: adminProcedure
    .input(filtersSchema)
    .query(async ({ ctx, input }) => {
    const { db } = ctx;
    const now = new Date();

    // Build org filter from region/team
    const orgWhere: Record<string, unknown> = {};
    if (input?.region) orgWhere.region = input.region;
    if (input?.teamNumber) orgWhere.peerReviewTeam = input.teamNumber;

    const hasOrgFilter = Object.keys(orgWhere).length > 0;

    // Pre-fetch org IDs matching filters (only when filtering)
    let filteredOrgIds: string[] | undefined;
    if (hasOrgFilter) {
      const filteredOrgs = await db.organization.findMany({
        where: orgWhere,
        select: { id: true },
      });
      filteredOrgIds = filteredOrgs.map((o: { id: string }) => o.id);
    }

    // Base finding where clause
    const findingWhere = filteredOrgIds
      ? { organizationId: { in: filteredOrgIds } }
      : {};

    // Base CAP where clause (via finding → organization)
    const capWhere = filteredOrgIds
      ? { finding: { organizationId: { in: filteredOrgIds } } }
      : {};

    // ------------------------------------------------------------------
    // 1. SUMMARY KPIs (parallelized)
    // ------------------------------------------------------------------
    const [
      totalFindings,
      openFindings,
      closedFindings,
      criticalOpen,
      totalCAPs,
      capsOverdue,
      capsCompletedOrClosed,
    ] = await Promise.all([
      db.finding.count({ where: findingWhere }),
      db.finding.count({ where: { ...findingWhere, status: { notIn: CLOSED_STATUSES } } }),
      db.finding.count({ where: { ...findingWhere, status: "CLOSED" } }),
      db.finding.count({
        where: { ...findingWhere, severity: "CRITICAL", status: { notIn: CLOSED_STATUSES } },
      }),
      db.correctiveActionPlan.count({ where: capWhere }),
      db.correctiveActionPlan.count({
        where: {
          ...capWhere,
          status: { notIn: CAP_DONE_STATUSES },
          dueDate: { lt: now },
        },
      }),
      db.correctiveActionPlan.count({
        where: { ...capWhere, status: { in: CAP_DONE_STATUSES } },
      }),
    ]);

    // Avg resolution days for closed findings
    const closedFindingDates = await db.finding.findMany({
      where: { ...findingWhere, status: "CLOSED", closedAt: { not: null } },
      select: { identifiedAt: true, closedAt: true },
    });

    let avgResolutionDays: number | null = null;
    if (closedFindingDates.length > 0) {
      const totalDays = closedFindingDates.reduce((sum, f) => {
        return sum + differenceInDays(f.closedAt!, f.identifiedAt);
      }, 0);
      avgResolutionDays = Math.round(totalDays / closedFindingDates.length);
    }

    // CAPs closed on time: effective close date <= dueDate
    const allDoneCaps = await db.correctiveActionPlan.findMany({
      where: { ...capWhere, status: { in: CAP_DONE_STATUSES } },
      select: { dueDate: true, closedAt: true, completedAt: true },
    });
    const capsOnTime = allDoneCaps.filter((c) => {
      const effectiveClose = c.closedAt ?? c.completedAt;
      return effectiveClose && effectiveClose <= c.dueDate;
    }).length;

    const capCompletionRate = pct(capsCompletedOrClosed, totalCAPs);

    const summary: SummaryKPIs = {
      totalFindings,
      openFindings,
      closedFindings,
      criticalOpen,
      avgResolutionDays,
      totalCAPs,
      capsOnTime,
      capsOverdue,
      capCompletionRate,
    };

    // ------------------------------------------------------------------
    // 2. FINDINGS BY SEVERITY
    // ------------------------------------------------------------------
    const severityGroups = await db.finding.groupBy({
      by: ["severity"],
      where: findingWhere,
      _count: true,
    });

    const findingsBySeverity: DistributionItem[] = severityGroups.map(
      (g: { severity: FindingSeverity; _count: number }) => ({
        severity: g.severity,
        count: g._count,
        percentage: pct(g._count, totalFindings),
      })
    );

    // ------------------------------------------------------------------
    // 3. FINDINGS BY TYPE
    // ------------------------------------------------------------------
    const typeGroups = await db.finding.groupBy({
      by: ["findingType"],
      where: findingWhere,
      _count: true,
    });

    const findingsByType: DistributionItem[] = typeGroups.map(
      (g: { findingType: FindingType; _count: number }) => ({
        type: g.findingType,
        count: g._count,
        percentage: pct(g._count, totalFindings),
      })
    );

    // ------------------------------------------------------------------
    // 4. FINDINGS BY REVIEW AREA
    // ------------------------------------------------------------------
    const findingsWithArea = await db.finding.findMany({
      where: findingWhere,
      select: {
        reviewArea: true,
        severity: true,
        review: { select: { areasInScope: true } },
      },
    });

    const areaMap = new Map<string, FindingsByReviewArea>();
    for (const f of findingsWithArea) {
      const area = f.reviewArea ?? f.review.areasInScope[0] ?? "GENERAL";
      let entry = areaMap.get(area);
      if (!entry) {
        entry = { area, total: 0, critical: 0, major: 0, minor: 0, observation: 0 };
        areaMap.set(area, entry);
      }
      entry.total++;
      if (f.severity === "CRITICAL") entry.critical++;
      else if (f.severity === "MAJOR") entry.major++;
      else if (f.severity === "MINOR") entry.minor++;
      else if (f.severity === "OBSERVATION") entry.observation++;
    }

    const findingsByReviewArea = Array.from(areaMap.values()).sort(
      (a, b) => b.total - a.total
    );

    // ------------------------------------------------------------------
    // 5. MONTHLY TREND (last 12 calendar months)
    // ------------------------------------------------------------------
    const monthlyTrend: MonthlyTrendItem[] = [];
    const monthBoundaries: { start: Date; end: Date; label: string }[] = [];
    const trendMonths = input?.months ?? 12;

    for (let i = trendMonths - 1; i >= 0; i--) {
      const d = subMonths(now, i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      monthBoundaries.push({ start, end, label: format(d, "MMM yyyy") });
    }

    // Fetch all opened/closed dates in the 12-month window for efficiency
    const windowStart = monthBoundaries[0].start;
    const windowEnd = monthBoundaries[monthBoundaries.length - 1].end;

    const [openedInWindow, closedInWindow] = await Promise.all([
      db.finding.findMany({
        where: { ...findingWhere, identifiedAt: { gte: windowStart, lte: windowEnd } },
        select: { identifiedAt: true },
      }),
      db.finding.findMany({
        where: { ...findingWhere, closedAt: { gte: windowStart, lte: windowEnd } },
        select: { closedAt: true },
      }),
    ]);

    for (const mb of monthBoundaries) {
      const opened = openedInWindow.filter(
        (f) => f.identifiedAt >= mb.start && f.identifiedAt <= mb.end
      ).length;
      const closed = closedInWindow.filter(
        (f) => f.closedAt && f.closedAt >= mb.start && f.closedAt <= mb.end
      ).length;
      monthlyTrend.push({
        month: mb.label,
        opened,
        closed,
        netOpen: opened - closed,
      });
    }

    // ------------------------------------------------------------------
    // 6. CAPs BY STATUS
    // ------------------------------------------------------------------
    const capStatusGroups = await db.correctiveActionPlan.groupBy({
      by: ["status"],
      where: capWhere,
      _count: true,
    });

    const capsByStatus: DistributionItem[] = capStatusGroups.map(
      (g: { status: CAPStatus; _count: number }) => ({
        status: g.status,
        count: g._count,
        percentage: pct(g._count, totalCAPs),
      })
    );

    // ------------------------------------------------------------------
    // 7. CAP CLOSURE PERFORMANCE by finding severity
    // ------------------------------------------------------------------
    const closedCapsWithSeverity = await db.correctiveActionPlan.findMany({
      where: {
        ...capWhere,
        status: { in: CAP_DONE_STATUSES },
        OR: [{ closedAt: { not: null } }, { completedAt: { not: null } }],
      },
      select: {
        createdAt: true,
        closedAt: true,
        completedAt: true,
        finding: { select: { severity: true } },
      },
    });

    const severityBuckets = new Map<string, { totalDays: number; count: number }>();
    for (const cap of closedCapsWithSeverity) {
      const effectiveClose = cap.closedAt ?? cap.completedAt;
      if (!effectiveClose) continue;
      const days = differenceInDays(effectiveClose, cap.createdAt);
      const sev = cap.finding.severity;
      const bucket = severityBuckets.get(sev) ?? { totalDays: 0, count: 0 };
      bucket.totalDays += days;
      bucket.count++;
      severityBuckets.set(sev, bucket);
    }

    const capClosurePerformance: CAPClosureItem[] = Array.from(
      severityBuckets.entries()
    ).map(([severity, { totalDays, count }]) => ({
      severity,
      avgDays: Math.round(totalDays / count),
      count,
    }));

    // ------------------------------------------------------------------
    // 8. TOP 10 ORGANIZATIONS BY FINDING COUNT
    // ------------------------------------------------------------------
    const orgGroups = await db.finding.groupBy({
      by: ["organizationId"],
      where: findingWhere,
      _count: true,
      orderBy: { _count: { organizationId: "desc" } },
      take: 10,
    });

    const orgIds = orgGroups.map(
      (g: { organizationId: string }) => g.organizationId
    );

    const [orgs, criticalByOrg, openByOrg] = await Promise.all([
      db.organization.findMany({
        where: { id: { in: orgIds } },
        select: { id: true, nameEn: true, nameFr: true },
      }),
      db.finding.groupBy({
        by: ["organizationId"],
        where: { ...findingWhere, organizationId: { in: orgIds }, severity: "CRITICAL" },
        _count: true,
      }),
      db.finding.groupBy({
        by: ["organizationId"],
        where: { ...findingWhere, organizationId: { in: orgIds }, status: { notIn: CLOSED_STATUSES } },
        _count: true,
      }),
    ]);

    const orgNameMap = new Map(
      orgs.map((o: { id: string; nameEn: string; nameFr: string }) => [
        o.id,
        { nameEn: o.nameEn, nameFr: o.nameFr },
      ])
    );
    const criticalMap = new Map(
      criticalByOrg.map((g: { organizationId: string; _count: number }) => [
        g.organizationId,
        g._count,
      ])
    );
    const openMap = new Map(
      openByOrg.map((g: { organizationId: string; _count: number }) => [
        g.organizationId,
        g._count,
      ])
    );

    const topOrganizationsByFindings: OrgFindingSummary[] = orgGroups.map(
      (g: { organizationId: string; _count: number }) => {
        const names = orgNameMap.get(g.organizationId) ?? {
          nameEn: "Unknown",
          nameFr: "Inconnu",
        };
        return {
          organizationId: g.organizationId,
          nameEn: names.nameEn,
          nameFr: names.nameFr,
          total: g._count,
          critical: criticalMap.get(g.organizationId) ?? 0,
          open: openMap.get(g.organizationId) ?? 0,
        };
      }
    );

    // ------------------------------------------------------------------
    // 9. RECURRING PATTERNS (top ICAO references)
    // ------------------------------------------------------------------
    const findingsWithIcao = await db.finding.findMany({
      where: { ...findingWhere, icaoReference: { not: null } },
      select: { icaoReference: true, organizationId: true },
    });

    const icaoMap = new Map<string, { count: number; orgSet: Set<string> }>();
    for (const f of findingsWithIcao) {
      if (!f.icaoReference) continue;
      let entry = icaoMap.get(f.icaoReference);
      if (!entry) {
        entry = { count: 0, orgSet: new Set() };
        icaoMap.set(f.icaoReference, entry);
      }
      entry.count++;
      entry.orgSet.add(f.organizationId);
    }

    const recurringPatterns: RecurringPattern[] = Array.from(icaoMap.entries())
      .map(([icaoReference, { count, orgSet }]) => ({
        icaoReference,
        count,
        organizations: orgSet.size,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // ------------------------------------------------------------------
    // RESPONSE
    // ------------------------------------------------------------------
    return {
      summary,
      findingsBySeverity,
      findingsByType,
      findingsByReviewArea,
      monthlyTrend,
      capsByStatus,
      capClosurePerformance,
      topOrganizationsByFindings,
      recurringPatterns,
    };
  }),

  /**
   * Abuja Safety Target #15 — ANSP certification via peer review programme.
   *
   * Returns KPIs for 3 sub-targets:
   *   AST 15.1 — Programme participation
   *   AST 15.2 — SMS maturity milestones (50% by 2025, 100% by 2028)
   *   AST 15.3 — Certification readiness (by 2036)
   */
  getAbujaTarget15: protectedProcedure.query(async ({ ctx }) => {
    const { db } = ctx;

    // ------------------------------------------------------------------
    // Fetch all organizations with their reviews & latest SMS assessment
    // ------------------------------------------------------------------
    const allOrgs = await db.organization.findMany({
      select: {
        id: true,
        nameEn: true,
        nameFr: true,
        country: true,
        region: true,
        participationStatus: true,
        joinedProgrammeAt: true,
        reviewsAsHost: {
          select: { id: true, status: true },
        },
        assessments: {
          where: {
            status: "COMPLETED",
            questionnaire: { type: "SMS_CANSO_SOE" },
          },
          orderBy: { completedAt: "desc" },
          take: 1,
          select: {
            maturityLevel: true,
            eiScore: true,
            completedAt: true,
          },
        },
      },
    });

    const registeredANSPs = allOrgs.length;

    // ------------------------------------------------------------------
    // AST 15.1 — Programme Participation
    // ------------------------------------------------------------------
    const joinedOrgs = allOrgs.filter((o) =>
      ACTIVE_PARTICIPATION.includes(o.participationStatus)
    );

    const reviewedOrgs = allOrgs.filter((o) =>
      o.reviewsAsHost.some((r) => r.status === COMPLETED_REVIEW)
    );

    // Monthly cumulative enrollment trend (based on joinedProgrammeAt)
    const orgsWithJoinDate = allOrgs
      .filter((o) => o.joinedProgrammeAt !== null)
      .sort(
        (a, b) =>
          a.joinedProgrammeAt!.getTime() - b.joinedProgrammeAt!.getTime()
      );

    const enrollmentTrend: { month: string; count: number }[] = [];
    if (orgsWithJoinDate.length > 0) {
      const earliest = orgsWithJoinDate[0].joinedProgrammeAt!;
      const now = new Date();
      let cursor = startOfMonth(earliest);
      const end = endOfMonth(now);

      while (cursor <= end) {
        const monthEnd = endOfMonth(cursor);
        const cumulative = orgsWithJoinDate.filter(
          (o) => o.joinedProgrammeAt! <= monthEnd
        ).length;
        enrollmentTrend.push({
          month: format(cursor, "MMM yyyy"),
          count: cumulative,
        });
        cursor = startOfMonth(subMonths(cursor, -1));
      }
    }

    // By region for AST 15.1
    const regionMap151 = new Map<
      string,
      { total: number; joined: number; reviewed: number }
    >();
    for (const o of allOrgs) {
      const entry = regionMap151.get(o.region) ?? {
        total: 0,
        joined: 0,
        reviewed: 0,
      };
      entry.total++;
      if (ACTIVE_PARTICIPATION.includes(o.participationStatus)) {
        entry.joined++;
      }
      if (o.reviewsAsHost.some((r) => r.status === COMPLETED_REVIEW)) {
        entry.reviewed++;
      }
      regionMap151.set(o.region, entry);
    }

    const ast151: AST151 = {
      targetDate: "2024-12-31",
      kpi01: {
        label: "ANSPs in Programme",
        target: TOTAL_AFRICAN_ANSPS,
        current: joinedOrgs.length,
        percentage: pct(joinedOrgs.length, TOTAL_AFRICAN_ANSPS),
        trend: enrollmentTrend,
      },
      kpi02: {
        label: "ANSPs Reviewed",
        target: TOTAL_AFRICAN_ANSPS,
        current: reviewedOrgs.length,
        percentage: pct(reviewedOrgs.length, TOTAL_AFRICAN_ANSPS),
      },
      byRegion: Array.from(regionMap151.entries()).map(
        ([region, { total, joined, reviewed }]) => ({
          region,
          total,
          joined,
          reviewed,
        })
      ),
    };

    // ------------------------------------------------------------------
    // AST 15.2 — SMS Maturity
    // ------------------------------------------------------------------
    // Categorize orgs by latest SMS maturity
    type OrgWithMaturity = {
      orgId: string;
      maturityLevel: MaturityLevel | null;
      region: string;
    };

    const orgMaturityData: OrgWithMaturity[] = allOrgs.map((o) => ({
      orgId: o.id,
      maturityLevel: o.assessments[0]?.maturityLevel ?? null,
      region: o.region,
    }));

    // 50% maturity = Level C or above
    const achieved50 = orgMaturityData.filter(
      (o) => o.maturityLevel && maturityAtLeast(o.maturityLevel, "LEVEL_C")
    ).length;
    const inProgress50 = orgMaturityData.filter(
      (o) =>
        o.maturityLevel &&
        !maturityAtLeast(o.maturityLevel, "LEVEL_C")
    ).length;
    const notStartedSMS = orgMaturityData.filter(
      (o) => o.maturityLevel === null
    ).length;

    // 100% maturity = Level E
    const achievedE = orgMaturityData.filter(
      (o) => o.maturityLevel === "LEVEL_E"
    ).length;

    // Maturity distribution (A through E)
    const maturityCounts = new Map<string, number>();
    for (const level of ["LEVEL_A", "LEVEL_B", "LEVEL_C", "LEVEL_D", "LEVEL_E"] as MaturityLevel[]) {
      maturityCounts.set(level, 0);
    }
    for (const o of orgMaturityData) {
      if (o.maturityLevel) {
        maturityCounts.set(
          o.maturityLevel,
          (maturityCounts.get(o.maturityLevel) ?? 0) + 1
        );
      }
    }
    const orgsWithMaturity = orgMaturityData.filter(
      (o) => o.maturityLevel !== null
    ).length;

    const maturityDistribution = Array.from(maturityCounts.entries()).map(
      ([level, count]) => ({
        level: maturityLabel(level as MaturityLevel),
        count,
        percentage: pct(count, orgsWithMaturity || 1),
      })
    );

    // By region for AST 15.2
    const regionMap152 = new Map<
      string,
      { levels: number[]; achieved50: number; total: number }
    >();
    for (const o of orgMaturityData) {
      const entry = regionMap152.get(o.region) ?? {
        levels: [],
        achieved50: 0,
        total: 0,
      };
      entry.total++;
      if (o.maturityLevel) {
        entry.levels.push(MATURITY_ORDER[o.maturityLevel]);
        if (maturityAtLeast(o.maturityLevel, "LEVEL_C")) {
          entry.achieved50++;
        }
      }
      regionMap152.set(o.region, entry);
    }

    const ast152: AST152 = {
      milestone2025: {
        targetDate: "2025-12-31",
        target: 50,
        label: "50% SMS Maturity by Dec 2025",
        achieved: achieved50,
        inProgress: inProgress50,
        notStarted: notStartedSMS,
        percentage: pct(achieved50, registeredANSPs),
      },
      milestone2028: {
        targetDate: "2028-12-31",
        target: 100,
        label: "100% SMS Maturity by Dec 2028",
        achieved: achievedE,
        percentage: pct(achievedE, registeredANSPs),
      },
      maturityDistribution,
      byRegion: Array.from(regionMap152.entries()).map(
        ([region, { levels, achieved50: a50, total }]) => {
          // Average maturity: compute mean of ordinal values and map back
          const avgOrd =
            levels.length > 0
              ? Math.round(
                  levels.reduce((s, v) => s + v, 0) / levels.length
                )
              : 0;
          const ordToLabel: Record<number, string> = {
            0: "-",
            1: "A",
            2: "B",
            3: "C",
            4: "D",
            5: "E",
          };
          return {
            region,
            avgMaturity: ordToLabel[avgOrd] ?? "-",
            achieved50: a50,
            total,
          };
        }
      ),
    };

    // ------------------------------------------------------------------
    // AST 15.3 — Certification Readiness
    // ------------------------------------------------------------------
    let high = 0;
    let medium = 0;
    let low = 0;
    let notStarted = 0;

    for (const o of allOrgs) {
      const hasCompletedReview = o.reviewsAsHost.some(
        (r) => r.status === COMPLETED_REVIEW
      );
      const latestMaturity = o.assessments[0]?.maturityLevel ?? null;
      const isActive = ACTIVE_PARTICIPATION.includes(o.participationStatus);

      if (
        hasCompletedReview &&
        latestMaturity &&
        maturityAtLeast(latestMaturity, "LEVEL_D")
      ) {
        high++;
      } else if (
        o.reviewsAsHost.some(
          (r) =>
            r.status === "IN_PROGRESS" ||
            r.status === "REPORT_DRAFTING" ||
            r.status === "REPORT_REVIEW"
        ) ||
        (latestMaturity && maturityAtLeast(latestMaturity, "LEVEL_C"))
      ) {
        medium++;
      } else if (isActive) {
        low++;
      } else {
        notStarted++;
      }
    }

    const ast153: AST153 = {
      targetDate: "2036-12-31",
      label: "ANSP Certification by Dec 2036",
      readinessLevels: { high, medium, low, notStarted },
    };

    // ------------------------------------------------------------------
    // Organization-level drill-down details
    // ------------------------------------------------------------------
    const organizationDetails: OrgDetail[] = allOrgs.map((o) => ({
      id: o.id,
      nameEn: o.nameEn,
      nameFr: o.nameFr,
      country: o.country,
      region: o.region,
      participationStatus: o.participationStatus,
      joinedAt: o.joinedProgrammeAt?.toISOString() ?? null,
      hasCompletedReview: o.reviewsAsHost.some(
        (r) => r.status === COMPLETED_REVIEW
      ),
      latestSMSMaturity: o.assessments[0]?.maturityLevel
        ? maturityLabel(o.assessments[0].maturityLevel)
        : null,
      latestEIScore: o.assessments[0]?.eiScore ?? null,
      reviewCount: o.reviewsAsHost.length,
    }));

    // ------------------------------------------------------------------
    // RESPONSE
    // ------------------------------------------------------------------
    return {
      totalANSPs: TOTAL_AFRICAN_ANSPS,
      registeredANSPs,
      ast151,
      ast152,
      ast153,
      organizationDetails,
    };
  }),
});

export default intelligenceRouter;
