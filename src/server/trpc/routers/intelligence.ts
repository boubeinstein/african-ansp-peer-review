/**
 * Intelligence Router - Programme-Level Findings & CAP Trends
 *
 * Aggregates findings and corrective action plan data across all reviews
 * for the Programme Intelligence page "Findings & CAP Trends" tab.
 */

import { router, adminProcedure } from "../trpc";
import { FindingSeverity, FindingType, FindingStatus, CAPStatus } from "@prisma/client";
import { subMonths, startOfMonth, endOfMonth, differenceInDays, format } from "date-fns";

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

// =============================================================================
// HELPERS
// =============================================================================

const CLOSED_STATUSES: FindingStatus[] = ["CLOSED", "DEFERRED"];
const CAP_DONE_STATUSES: CAPStatus[] = ["COMPLETED", "VERIFIED", "CLOSED"];

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
  getFindingsAndCAPTrends: adminProcedure.query(async ({ ctx }) => {
    const { db } = ctx;
    const now = new Date();

    // ------------------------------------------------------------------
    // 1. SUMMARY KPIs (parallelised)
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
      db.finding.count(),
      db.finding.count({ where: { status: { notIn: CLOSED_STATUSES } } }),
      db.finding.count({ where: { status: "CLOSED" } }),
      db.finding.count({
        where: { severity: "CRITICAL", status: { notIn: CLOSED_STATUSES } },
      }),
      db.correctiveActionPlan.count(),
      db.correctiveActionPlan.count({
        where: {
          status: { notIn: CAP_DONE_STATUSES },
          dueDate: { lt: now },
        },
      }),
      db.correctiveActionPlan.count({
        where: { status: { in: CAP_DONE_STATUSES } },
      }),
    ]);

    // Avg resolution days for closed findings
    const closedFindingDates = await db.finding.findMany({
      where: { status: "CLOSED", closedAt: { not: null } },
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
      where: { status: { in: CAP_DONE_STATUSES } },
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

    for (let i = 11; i >= 0; i--) {
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
        where: { identifiedAt: { gte: windowStart, lte: windowEnd } },
        select: { identifiedAt: true },
      }),
      db.finding.findMany({
        where: { closedAt: { gte: windowStart, lte: windowEnd } },
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
        where: { organizationId: { in: orgIds }, severity: "CRITICAL" },
        _count: true,
      }),
      db.finding.groupBy({
        by: ["organizationId"],
        where: { organizationId: { in: orgIds }, status: { notIn: CLOSED_STATUSES } },
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
      where: { icaoReference: { not: null } },
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
});

export default intelligenceRouter;
