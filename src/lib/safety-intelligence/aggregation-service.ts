// =============================================================================
// CROSS-ANSP SAFETY INTELLIGENCE — DATA AGGREGATION SERVICE
//
// Server-side queries that compute cross-ANSP analytics from Prisma.
// All functions accept a Prisma client instance and optional team filter.
// =============================================================================

import type { PrismaClient, MaturityLevel } from "@prisma/client";
import type {
  ProgrammeKPIs,
  ANSPPerformanceRecord,
  RegionalTeamSummary,
  FindingPatternData,
  SystemicIssue,
  TrendDataPoint,
  CAPAnalytics,
} from "@/types/safety-intelligence";

type DB = PrismaClient;

// =============================================================================
// HELPERS
// =============================================================================

function maturityToNumeric(level: MaturityLevel | null): number | null {
  const map: Record<string, number> = {
    LEVEL_A: 1,
    LEVEL_B: 2,
    LEVEL_C: 3,
    LEVEL_D: 4,
    LEVEL_E: 5,
  };
  return level ? map[level] ?? null : null;
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function parseCategoryScores(raw: unknown): Record<string, number> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const result: Record<string, number> = {};
    for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof val === "number") {
        result[key] = val;
      }
    }
    return result;
  }
  return {};
}

/** Get the start of a quarter N quarters ago from now */
function quarterStart(quartersAgo: number): Date {
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const currentYear = now.getFullYear();

  const targetQuarter = currentQuarter - quartersAgo;
  const year = currentYear + Math.floor(targetQuarter / 4);
  const quarter = ((targetQuarter % 4) + 4) % 4;

  return new Date(year, quarter * 3, 1);
}

function formatQuarterLabel(date: Date): string {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `Q${q} ${date.getFullYear()}`;
}

/** Build org-scoped where clause for team filtering */
async function getTeamOrgIds(
  db: DB,
  teamId?: string
): Promise<string[] | undefined> {
  if (!teamId) return undefined;
  const orgs = await db.organization.findMany({
    where: { regionalTeamId: teamId },
    select: { id: true },
  });
  return orgs.map((o) => o.id);
}

// =============================================================================
// 1. PROGRAMME KPIs
// =============================================================================

export async function getProgrammeKPIs(
  db: DB,
  teamId?: string
): Promise<ProgrammeKPIs> {
  const orgIds = await getTeamOrgIds(db, teamId);
  const orgFilter = orgIds ? { id: { in: orgIds } } : {};
  const orgIdFilter = orgIds ? { organizationId: { in: orgIds } } : {};

  // Parallel queries
  const [
    totalOrganizations,
    reviewCounts,
    assessments,
    findingCounts,
    capData,
    totalReviewers,
  ] = await Promise.all([
    // Organization count
    db.organization.count({ where: orgFilter }),

    // Review counts — reviews where host org is in scope
    db.review.groupBy({
      by: ["status"],
      where: orgIds
        ? { hostOrganizationId: { in: orgIds } }
        : {},
      _count: true,
    }),

    // Latest completed assessments for EI and SMS averages
    db.assessment.findMany({
      where: {
        ...orgIdFilter,
        status: "COMPLETED",
      },
      select: {
        organizationId: true,
        eiScore: true,
        maturityLevel: true,
        completedAt: true,
        questionnaire: { select: { type: true } },
      },
      orderBy: { completedAt: "desc" },
    }),

    // Finding counts
    db.finding.groupBy({
      by: ["status", "severity"],
      where: orgIdFilter,
      _count: true,
    }),

    // CAP data for closure rate and overdue
    db.correctiveActionPlan.findMany({
      where: orgIds
        ? { finding: { organizationId: { in: orgIds } } }
        : {},
      select: {
        status: true,
        dueDate: true,
      },
    }),

    // Active reviewer count
    db.reviewerProfile.count({
      where: orgIds
        ? { homeOrganizationId: { in: orgIds } }
        : {},
    }),
  ]);

  // Process review counts
  const totalReviews = reviewCounts.reduce((sum, r) => sum + r._count, 0);
  const completedReviews =
    reviewCounts.find((r) => r.status === "COMPLETED")?._count ?? 0;
  const cancelledReviews =
    reviewCounts.find((r) => r.status === "CANCELLED")?._count ?? 0;
  const activeReviews = totalReviews - completedReviews - cancelledReviews;

  // Deduplicate: latest assessment per org per type
  const latestANS = new Map<string, { eiScore: number | null; completedAt: Date | null }>();
  const latestSMS = new Map<string, { maturityLevel: MaturityLevel | null; completedAt: Date | null }>();

  for (const a of assessments) {
    if (a.questionnaire.type === "ANS_USOAP_CMA" && !latestANS.has(a.organizationId)) {
      latestANS.set(a.organizationId, { eiScore: a.eiScore, completedAt: a.completedAt });
    }
    if (a.questionnaire.type === "SMS_CANSO_SOE" && !latestSMS.has(a.organizationId)) {
      latestSMS.set(a.organizationId, { maturityLevel: a.maturityLevel, completedAt: a.completedAt });
    }
  }

  const eiScores = [...latestANS.values()]
    .map((v) => v.eiScore)
    .filter((s): s is number => s !== null);
  const smsScores = [...latestSMS.values()]
    .map((v) => maturityToNumeric(v.maturityLevel))
    .filter((s): s is number => s !== null);

  // Finding aggregations
  let totalFindings = 0;
  let openFindings = 0;
  let criticalFindings = 0;
  for (const f of findingCounts) {
    totalFindings += f._count;
    if (f.status !== "CLOSED") {
      openFindings += f._count;
    }
    if (f.severity === "CRITICAL") {
      criticalFindings += f._count;
    }
  }

  // CAP aggregations
  const now = new Date();
  const totalCAPs = capData.length;
  const closedCAPs = capData.filter(
    (c) => c.status === "CLOSED" || c.status === "VERIFIED"
  ).length;
  const overdueCAPs = capData.filter(
    (c) =>
      c.dueDate < now &&
      c.status !== "CLOSED" &&
      c.status !== "VERIFIED"
  ).length;

  // Quarter-over-quarter trends
  const currentQStart = quarterStart(0);
  const prevQStart = quarterStart(1);
  const _prevPrevQStart = quarterStart(2);

  const currentQEI: number[] = [];
  const prevQEI: number[] = [];
  const currentQSMS: number[] = [];
  const prevQSMS: number[] = [];

  for (const a of assessments) {
    const completed = a.completedAt;
    if (!completed) continue;

    if (a.questionnaire.type === "ANS_USOAP_CMA" && a.eiScore !== null) {
      if (completed >= currentQStart) currentQEI.push(a.eiScore);
      else if (completed >= prevQStart && completed < currentQStart) prevQEI.push(a.eiScore);
    }
    if (a.questionnaire.type === "SMS_CANSO_SOE") {
      const numeric = maturityToNumeric(a.maturityLevel);
      if (numeric !== null) {
        if (completed >= currentQStart) currentQSMS.push(numeric);
        else if (completed >= prevQStart && completed < currentQStart) prevQSMS.push(numeric);
      }
    }
  }

  const avgCurrentEI = average(currentQEI);
  const avgPrevEI = average(prevQEI);
  const avgCurrentSMS = average(currentQSMS);
  const avgPrevSMS = average(prevQSMS);

  return {
    totalOrganizations,
    totalReviews,
    activeReviews,
    completedReviews,
    averageEIScore: average(eiScores),
    averageSMSMaturity: average(smsScores),
    totalFindings,
    openFindings,
    criticalFindings,
    totalCAPs,
    overdueCAPs,
    averageCAPClosureRate: totalCAPs > 0
      ? Math.round((closedCAPs / totalCAPs) * 100 * 100) / 100
      : null,
    totalReviewers,
    eiTrendVsPrevQuarter:
      avgCurrentEI !== null && avgPrevEI !== null
        ? Math.round((avgCurrentEI - avgPrevEI) * 100) / 100
        : null,
    smsTrendVsPrevQuarter:
      avgCurrentSMS !== null && avgPrevSMS !== null
        ? Math.round((avgCurrentSMS - avgPrevSMS) * 100) / 100
        : null,
  };
}

// =============================================================================
// 2. ANSP PERFORMANCE
// =============================================================================

export async function getANSPPerformance(
  db: DB,
  teamId?: string
): Promise<ANSPPerformanceRecord[]> {
  const orgFilter = teamId ? { regionalTeamId: teamId } : {};

  const organizations = await db.organization.findMany({
    where: orgFilter,
    select: {
      id: true,
      nameEn: true,
      nameFr: true,
      organizationCode: true,
      country: true,
      region: true,
      regionalTeamId: true,
      regionalTeam: {
        select: { teamNumber: true },
      },
      assessments: {
        where: { status: "COMPLETED" },
        select: {
          eiScore: true,
          maturityLevel: true,
          categoryScores: true,
          completedAt: true,
          questionnaire: { select: { type: true } },
        },
        orderBy: { completedAt: "desc" },
      },
      findings: {
        select: {
          severity: true,
          status: true,
          correctiveActionPlan: {
            select: { status: true },
          },
        },
      },
      reviewsAsHost: {
        where: { status: "COMPLETED" },
        select: {
          actualEndDate: true,
        },
        orderBy: { actualEndDate: "desc" },
      },
    },
  });

  return organizations
    .map((org) => {
      // Latest ANS assessment
      const latestANS = org.assessments.find(
        (a) => a.questionnaire.type === "ANS_USOAP_CMA"
      );
      // Second latest ANS for trend
      const prevANS = org.assessments.filter(
        (a) => a.questionnaire.type === "ANS_USOAP_CMA"
      )[1];

      // Latest SMS assessment
      const latestSMS = org.assessments.find(
        (a) => a.questionnaire.type === "SMS_CANSO_SOE"
      );

      // Findings
      const totalFindings = org.findings.length;
      const openFindings = org.findings.filter(
        (f) => f.status !== "CLOSED"
      ).length;
      const criticalFindings = org.findings.filter(
        (f) => f.severity === "CRITICAL"
      ).length;
      const majorFindings = org.findings.filter(
        (f) => f.severity === "MAJOR"
      ).length;

      // CAP closure rate
      const caps = org.findings
        .map((f) => f.correctiveActionPlan)
        .filter((c): c is NonNullable<typeof c> => c !== null);
      const closedCaps = caps.filter(
        (c) => c.status === "CLOSED" || c.status === "VERIFIED"
      ).length;

      // EI trend
      const eiTrend =
        latestANS?.eiScore !== null &&
        latestANS?.eiScore !== undefined &&
        prevANS?.eiScore !== null &&
        prevANS?.eiScore !== undefined
          ? Math.round((latestANS.eiScore - prevANS.eiScore) * 100) / 100
          : null;

      return {
        organizationId: org.id,
        organizationCode: org.organizationCode,
        nameEn: org.nameEn,
        nameFr: org.nameFr,
        country: org.country,
        region: org.region,
        teamId: org.regionalTeamId,
        teamNumber: org.regionalTeam?.teamNumber ?? null,
        latestEIScore: latestANS?.eiScore ?? null,
        eiScoreByArea: parseCategoryScores(latestANS?.categoryScores),
        eiTrend,
        latestSMSMaturity: maturityToNumeric(latestSMS?.maturityLevel ?? null),
        latestMaturityLevel: latestSMS?.maturityLevel ?? null,
        smsScoreByComponent: parseCategoryScores(latestSMS?.categoryScores),
        totalFindings,
        openFindings,
        criticalFindings,
        majorFindings,
        capClosureRate:
          caps.length > 0
            ? Math.round((closedCaps / caps.length) * 100 * 100) / 100
            : null,
        reviewsCompleted: org.reviewsAsHost.length,
        lastReviewDate: org.reviewsAsHost[0]?.actualEndDate ?? null,
      };
    })
    .sort((a, b) => (b.latestEIScore ?? 0) - (a.latestEIScore ?? 0));
}

// =============================================================================
// 3. REGIONAL TEAM SUMMARIES
// =============================================================================

export async function getRegionalTeamSummaries(
  db: DB
): Promise<RegionalTeamSummary[]> {
  const teams = await db.regionalTeam.findMany({
    where: { isActive: true },
    select: {
      id: true,
      teamNumber: true,
      code: true,
      nameEn: true,
      nameFr: true,
      leadOrganizationId: true,
      leadOrganization: { select: { nameEn: true } },
      memberOrganizations: {
        select: { id: true },
      },
    },
  });

  // Get performance data for all orgs at once
  const allPerformance = await getANSPPerformance(db);
  const _perfByOrg = new Map(allPerformance.map((p) => [p.organizationId, p]));

  return teams.map((team) => {
    const memberIds = new Set(team.memberOrganizations.map((m) => m.id));
    const members = allPerformance.filter((p) => memberIds.has(p.organizationId));

    const eiScores = members
      .map((m) => m.latestEIScore)
      .filter((s): s is number => s !== null);
    const smsScores = members
      .map((m) => m.latestSMSMaturity)
      .filter((s): s is number => s !== null);

    // Per-audit-area averages
    const eiByAuditArea: Record<string, number[]> = {};
    const smsByComponent: Record<string, number[]> = {};

    for (const member of members) {
      for (const [area, score] of Object.entries(member.eiScoreByArea)) {
        if (!eiByAuditArea[area]) eiByAuditArea[area] = [];
        eiByAuditArea[area].push(score);
      }
      for (const [comp, score] of Object.entries(member.smsScoreByComponent)) {
        if (!smsByComponent[comp]) smsByComponent[comp] = [];
        smsByComponent[comp].push(score);
      }
    }

    const eiByAreaAvg: Record<string, number> = {};
    for (const [area, scores] of Object.entries(eiByAuditArea)) {
      const avg = average(scores);
      if (avg !== null) eiByAreaAvg[area] = Math.round(avg * 100) / 100;
    }

    const smsByCompAvg: Record<string, number> = {};
    for (const [comp, scores] of Object.entries(smsByComponent)) {
      const avg = average(scores);
      if (avg !== null) smsByCompAvg[comp] = Math.round(avg * 100) / 100;
    }

    // CAP closure rates
    const capRates = members
      .map((m) => m.capClosureRate)
      .filter((r): r is number => r !== null);

    return {
      teamId: team.id,
      teamNumber: team.teamNumber,
      teamCode: team.code,
      nameEn: team.nameEn,
      nameFr: team.nameFr,
      leadOrganizationId: team.leadOrganizationId,
      leadOrganizationName: team.leadOrganization.nameEn,
      memberCount: memberIds.size,
      averageEIScore:
        average(eiScores) !== null
          ? Math.round(average(eiScores)! * 100) / 100
          : null,
      averageSMSMaturity:
        average(smsScores) !== null
          ? Math.round(average(smsScores)! * 100) / 100
          : null,
      totalFindings: members.reduce((sum, m) => sum + m.totalFindings, 0),
      criticalFindings: members.reduce((sum, m) => sum + m.criticalFindings, 0),
      averageCAPClosureRate:
        average(capRates) !== null
          ? Math.round(average(capRates)! * 100) / 100
          : null,
      eiByAuditArea: eiByAreaAvg,
      smsByComponent: smsByCompAvg,
      eiRange:
        eiScores.length > 0
          ? {
              min: Math.min(...eiScores),
              max: Math.max(...eiScores),
              avg: Math.round(average(eiScores)! * 100) / 100,
            }
          : { min: 0, max: 0, avg: 0 },
      smsRange:
        smsScores.length > 0
          ? {
              min: Math.min(...smsScores),
              max: Math.max(...smsScores),
              avg: Math.round(average(smsScores)! * 100) / 100,
            }
          : { min: 0, max: 0, avg: 0 },
    };
  });
}

// =============================================================================
// 4. FINDING PATTERNS
// =============================================================================

export async function getFindingPatterns(
  db: DB,
  teamId?: string
): Promise<FindingPatternData[]> {
  const orgIds = await getTeamOrgIds(db, teamId);

  const findings = await db.finding.findMany({
    where: orgIds ? { organizationId: { in: orgIds } } : {},
    select: {
      severity: true,
      question: { select: { auditArea: true } },
      criticalElement: true,
    },
  });

  // Group by audit area
  const byArea = new Map<
    string,
    { critical: number; major: number; minor: number; observation: number }
  >();

  for (const f of findings) {
    const area = f.question?.auditArea ?? f.criticalElement ?? "UNKNOWN";
    if (!byArea.has(area)) {
      byArea.set(area, { critical: 0, major: 0, minor: 0, observation: 0 });
    }
    const counts = byArea.get(area)!;
    switch (f.severity) {
      case "CRITICAL":
        counts.critical++;
        break;
      case "MAJOR":
        counts.major++;
        break;
      case "MINOR":
        counts.minor++;
        break;
      case "OBSERVATION":
        counts.observation++;
        break;
    }
  }

  return [...byArea.entries()]
    .map(([area, counts]) => ({
      auditArea: area,
      criticalCount: counts.critical,
      majorCount: counts.major,
      minorCount: counts.minor,
      observationCount: counts.observation,
      totalCount:
        counts.critical + counts.major + counts.minor + counts.observation,
    }))
    .sort((a, b) => b.totalCount - a.totalCount);
}

// =============================================================================
// 5. SYSTEMIC ISSUES
// =============================================================================

export async function getSystemicIssues(
  db: DB,
  teamId?: string
): Promise<SystemicIssue[]> {
  const orgIds = await getTeamOrgIds(db, teamId);

  const findings = await db.finding.findMany({
    where: orgIds ? { organizationId: { in: orgIds } } : {},
    select: {
      id: true,
      organizationId: true,
      severity: true,
      titleEn: true,
      titleFr: true,
      criticalElement: true,
      createdAt: true,
      question: { select: { auditArea: true, id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by question ID (or by audit area + criticalElement if no question)
  const groups = new Map<
    string,
    {
      key: string;
      auditArea: string | null;
      criticalElement: string | null;
      titleEn: string;
      titleFr: string;
      severity: (typeof findings)[number]["severity"];
      orgIds: Set<string>;
      dates: Date[];
    }
  >();

  for (const f of findings) {
    const key = f.question?.id ?? `${f.question?.auditArea ?? "NONE"}_${f.criticalElement ?? "NONE"}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        auditArea: f.question?.auditArea ?? null,
        criticalElement: f.criticalElement,
        titleEn: f.titleEn,
        titleFr: f.titleFr,
        severity: f.severity,
        orgIds: new Set(),
        dates: [],
      });
    }

    const group = groups.get(key)!;
    group.orgIds.add(f.organizationId);
    group.dates.push(f.createdAt);

    // Keep the highest severity
    const severityOrder = { CRITICAL: 4, MAJOR: 3, MINOR: 2, OBSERVATION: 1 };
    if (severityOrder[f.severity] > severityOrder[group.severity]) {
      group.severity = f.severity;
    }
  }

  // Filter to issues affecting 3+ organizations
  const systemic = [...groups.values()]
    .filter((g) => g.orgIds.size >= 3)
    .sort((a, b) => b.orgIds.size - a.orgIds.size)
    .slice(0, 10);

  // Determine trends: compare first half vs second half of occurrence dates
  return systemic.map((g) => {
    const sortedDates = g.dates.sort((a, b) => a.getTime() - b.getTime());
    const midIdx = Math.floor(sortedDates.length / 2);
    const firstHalf = sortedDates.slice(0, midIdx);
    const secondHalf = sortedDates.slice(midIdx);

    let trend: "improving" | "stable" | "worsening" = "stable";
    if (firstHalf.length > 0 && secondHalf.length > 0) {
      // Compare occurrence rate (count per time span)
      const firstSpan =
        firstHalf.length > 1
          ? firstHalf[firstHalf.length - 1].getTime() - firstHalf[0].getTime()
          : 1;
      const secondSpan =
        secondHalf.length > 1
          ? secondHalf[secondHalf.length - 1].getTime() - secondHalf[0].getTime()
          : 1;
      const firstRate = firstHalf.length / (firstSpan || 1);
      const secondRate = secondHalf.length / (secondSpan || 1);

      if (secondRate > firstRate * 1.2) trend = "worsening";
      else if (secondRate < firstRate * 0.8) trend = "improving";
    }

    return {
      id: g.key,
      auditArea: g.auditArea,
      criticalElement: g.criticalElement,
      titleEn: g.titleEn,
      titleFr: g.titleFr,
      severity: g.severity,
      affectedOrganizations: g.orgIds.size,
      trend,
      firstIdentified: sortedDates[0],
    };
  });
}

// =============================================================================
// 6. TREND DATA
// =============================================================================

export async function getTrendData(
  db: DB,
  teamId?: string
): Promise<TrendDataPoint[]> {
  const orgIds = await getTeamOrgIds(db, teamId);
  const orgIdFilter = orgIds ? { organizationId: { in: orgIds } } : {};

  // Get 6 quarter boundaries
  const quarters: { start: Date; end: Date; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = quarterStart(i);
    const end = quarterStart(i - 1);
    quarters.push({ start, end, label: formatQuarterLabel(start) });
  }

  const sixQuartersAgo = quarters[0].start;

  // Fetch all data within the 6-quarter window
  const [assessments, findings, caps, reviews] = await Promise.all([
    db.assessment.findMany({
      where: {
        ...orgIdFilter,
        status: "COMPLETED",
        completedAt: { gte: sixQuartersAgo },
      },
      select: {
        eiScore: true,
        maturityLevel: true,
        completedAt: true,
        questionnaire: { select: { type: true } },
      },
    }),
    db.finding.findMany({
      where: {
        ...orgIdFilter,
        createdAt: { gte: sixQuartersAgo },
      },
      select: { createdAt: true },
    }),
    db.correctiveActionPlan.findMany({
      where: {
        ...(orgIds
          ? { finding: { organizationId: { in: orgIds } } }
          : {}),
        createdAt: { gte: sixQuartersAgo },
      },
      select: { status: true, createdAt: true },
    }),
    db.review.findMany({
      where: {
        ...(orgIds
          ? { hostOrganizationId: { in: orgIds } }
          : {}),
        status: "COMPLETED",
        actualEndDate: { gte: sixQuartersAgo },
      },
      select: { actualEndDate: true },
    }),
  ]);

  return quarters.map(({ start, end, label }) => {
    const inQuarter = (date: Date | null) =>
      date !== null && date >= start && date < end;

    // EI scores in this quarter
    const qEI = assessments
      .filter(
        (a) =>
          a.questionnaire.type === "ANS_USOAP_CMA" &&
          inQuarter(a.completedAt)
      )
      .map((a) => a.eiScore)
      .filter((s): s is number => s !== null);

    // SMS scores in this quarter
    const qSMS = assessments
      .filter(
        (a) =>
          a.questionnaire.type === "SMS_CANSO_SOE" &&
          inQuarter(a.completedAt)
      )
      .map((a) => maturityToNumeric(a.maturityLevel))
      .filter((s): s is number => s !== null);

    // Findings in this quarter
    const qFindings = findings.filter((f) => inQuarter(f.createdAt)).length;

    // CAP closure rate in this quarter
    const qCAPs = caps.filter((c) => inQuarter(c.createdAt));
    const qCAPsClosed = qCAPs.filter(
      (c) => c.status === "CLOSED" || c.status === "VERIFIED"
    ).length;

    // Reviews completed in this quarter
    const qReviews = reviews.filter((r) =>
      inQuarter(r.actualEndDate)
    ).length;

    return {
      period: label,
      periodStart: start,
      averageEIScore:
        average(qEI) !== null
          ? Math.round(average(qEI)! * 100) / 100
          : null,
      averageSMSMaturity:
        average(qSMS) !== null
          ? Math.round(average(qSMS)! * 100) / 100
          : null,
      totalFindings: qFindings,
      capClosureRate:
        qCAPs.length > 0
          ? Math.round((qCAPsClosed / qCAPs.length) * 100 * 100) / 100
          : null,
      reviewsCompleted: qReviews,
    };
  });
}

// =============================================================================
// 7. CAP ANALYTICS
// =============================================================================

export async function getCAPAnalytics(
  db: DB,
  teamId?: string
): Promise<CAPAnalytics> {
  const orgIds = await getTeamOrgIds(db, teamId);

  const caps = await db.correctiveActionPlan.findMany({
    where: orgIds
      ? { finding: { organizationId: { in: orgIds } } }
      : {},
    select: {
      status: true,
      dueDate: true,
      createdAt: true,
      closedAt: true,
      finding: {
        select: {
          organization: {
            select: {
              id: true,
              regionalTeamId: true,
              regionalTeam: {
                select: {
                  id: true,
                  teamNumber: true,
                  nameEn: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const now = new Date();
  const totalCAPs = caps.length;
  const closedCAPs = caps.filter(
    (c) => c.status === "CLOSED" || c.status === "VERIFIED"
  ).length;
  const overdueCAPs = caps.filter(
    (c) =>
      c.dueDate < now &&
      c.status !== "CLOSED" &&
      c.status !== "VERIFIED"
  ).length;

  // Average closure time
  const closureTimes = caps
    .filter((c) => c.closedAt !== null)
    .map((c) => {
      const days =
        (c.closedAt!.getTime() - c.createdAt.getTime()) /
        (1000 * 60 * 60 * 24);
      return Math.round(days);
    });

  // Closure rate by team
  const teamMap = new Map<
    string,
    { teamId: string; teamNumber: number; teamName: string; total: number; closed: number }
  >();

  for (const cap of caps) {
    const team = cap.finding.organization.regionalTeam;
    if (!team) continue;

    if (!teamMap.has(team.id)) {
      teamMap.set(team.id, {
        teamId: team.id,
        teamNumber: team.teamNumber,
        teamName: team.nameEn,
        total: 0,
        closed: 0,
      });
    }

    const entry = teamMap.get(team.id)!;
    entry.total++;
    if (cap.status === "CLOSED" || cap.status === "VERIFIED") {
      entry.closed++;
    }
  }

  const closureRateByTeam = [...teamMap.values()]
    .map((t) => ({
      teamId: t.teamId,
      teamNumber: t.teamNumber,
      teamName: t.teamName,
      closureRate:
        t.total > 0
          ? Math.round((t.closed / t.total) * 100 * 100) / 100
          : 0,
      totalCAPs: t.total,
    }))
    .sort((a, b) => a.teamNumber - b.teamNumber);

  // Closure rate distribution by organization
  const orgCAPMap = new Map<string, { total: number; closed: number }>();
  for (const cap of caps) {
    const orgId = cap.finding.organization.id;
    if (!orgCAPMap.has(orgId)) {
      orgCAPMap.set(orgId, { total: 0, closed: 0 });
    }
    const entry = orgCAPMap.get(orgId)!;
    entry.total++;
    if (cap.status === "CLOSED" || cap.status === "VERIFIED") {
      entry.closed++;
    }
  }

  const bands = [
    { range: "90-100%", min: 90, max: 101 },
    { range: "75-89%", min: 75, max: 90 },
    { range: "50-74%", min: 50, max: 75 },
    { range: "25-49%", min: 25, max: 50 },
    { range: "0-24%", min: 0, max: 25 },
  ];

  const closureRateDistribution = bands.map((band) => {
    const count = [...orgCAPMap.values()].filter((o) => {
      const rate = o.total > 0 ? (o.closed / o.total) * 100 : 0;
      return rate >= band.min && rate < band.max;
    }).length;
    return { range: band.range, count };
  });

  return {
    totalCAPs,
    closedCAPs,
    overdueCAPs,
    averageClosureTimeDays:
      closureTimes.length > 0
        ? Math.round(
            (closureTimes.reduce((a, b) => a + b, 0) / closureTimes.length) *
              100
          ) / 100
        : null,
    closureRateByTeam,
    closureRateDistribution,
  };
}
