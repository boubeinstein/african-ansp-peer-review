/**
 * COI Detection Service
 *
 * Handles automatic detection of conflicts and COI checking for reviewers.
 * Implements business rules for HOME_ORGANIZATION and RECENT_REVIEW detection.
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import type { COIType, COISeverity } from "@prisma/client";
import {
  COI_TYPE_CONFIG,
  RECENT_REVIEW_COOLDOWN_YEARS,
  type COICheckResult,
  type COIConflictDetail,
  type COIOverrideInfo,
  type TeamCOICheckResult,
  type ReviewerEligibility,
  isOverrideValid,
} from "./types";

// =============================================================================
// COI CHECK FUNCTIONS
// =============================================================================

/**
 * Check COI for a single reviewer against an organization
 */
export async function checkReviewerCOI(
  db: PrismaClient,
  reviewerProfileId: string,
  targetOrgId: string,
  reviewId?: string
): Promise<COICheckResult> {
  // Get reviewer profile with organization and past review assignments
  const reviewer = await db.reviewerProfile.findUnique({
    where: { id: reviewerProfileId },
    include: {
      teamAssignments: {
        where: {
          review: {
            hostOrganizationId: targetOrgId,
            status: { in: ["COMPLETED", "REPORT_DRAFTING", "REPORT_REVIEW"] },
          },
        },
        include: {
          review: {
            select: {
              id: true,
              actualEndDate: true,
            },
          },
        },
      },
    },
  });

  if (!reviewer) {
    throw new Error(`Reviewer profile not found: ${reviewerProfileId}`);
  }

  const conflicts: COIConflictDetail[] = [];

  // --- AUTO-DETECT: HOME_ORGANIZATION ---
  if (reviewer.homeOrganizationId === targetOrgId) {
    conflicts.push({
      id: `auto-home-${reviewerProfileId}-${targetOrgId}`,
      type: "HOME_ORGANIZATION",
      severity: "HARD_BLOCK",
      reasonEn: "Reviewer's current employer",
      reasonFr: "Employeur actuel de l'évaluateur",
      isAutoDetected: true,
      startDate: new Date(),
      endDate: null,
      config: COI_TYPE_CONFIG.HOME_ORGANIZATION,
    });
  }

  // --- AUTO-DETECT: RECENT_REVIEW ---
  const cooldownDate = new Date();
  cooldownDate.setFullYear(cooldownDate.getFullYear() - RECENT_REVIEW_COOLDOWN_YEARS);

  const recentReviews = reviewer.teamAssignments.filter((ta) => {
    if (!ta.review.actualEndDate) return false;
    return new Date(ta.review.actualEndDate) > cooldownDate;
  });

  if (recentReviews.length > 0) {
    const mostRecentReview = recentReviews.reduce((latest, current) => {
      const currentDate = current.review.actualEndDate ? new Date(current.review.actualEndDate) : new Date(0);
      const latestDate = latest.review.actualEndDate ? new Date(latest.review.actualEndDate) : new Date(0);
      return currentDate > latestDate ? current : latest;
    });

    conflicts.push({
      id: `auto-recent-${reviewerProfileId}-${targetOrgId}`,
      type: "RECENT_REVIEW",
      severity: "SOFT_WARNING",
      reasonEn: `Reviewed this organization within the last ${RECENT_REVIEW_COOLDOWN_YEARS} years`,
      reasonFr: `A évalué cette organisation au cours des ${RECENT_REVIEW_COOLDOWN_YEARS} dernières années`,
      isAutoDetected: true,
      startDate: mostRecentReview.review.actualEndDate || new Date(),
      endDate: null,
      config: COI_TYPE_CONFIG.RECENT_REVIEW,
    });
  }

  // --- LOAD MANUAL COIs FROM DATABASE ---
  const manualCOIs = await db.reviewerCOI.findMany({
    where: {
      reviewerProfileId,
      organizationId: targetOrgId,
      isActive: true,
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } },
      ],
    },
    select: {
      id: true,
      coiType: true,
      severity: true,
      reasonEn: true,
      reasonFr: true,
      isAutoDetected: true,
      startDate: true,
      endDate: true,
    },
  });

  for (const coi of manualCOIs) {
    // Avoid duplicates for auto-detected types
    if (coi.isAutoDetected && (coi.coiType === "HOME_ORGANIZATION" || coi.coiType === "RECENT_REVIEW")) {
      continue;
    }

    conflicts.push({
      id: coi.id,
      type: coi.coiType,
      severity: coi.severity,
      reasonEn: coi.reasonEn,
      reasonFr: coi.reasonFr,
      isAutoDetected: coi.isAutoDetected,
      startDate: coi.startDate,
      endDate: coi.endDate,
      config: COI_TYPE_CONFIG[coi.coiType],
    });
  }

  // --- CHECK FOR EXISTING VALID OVERRIDE ---
  let activeOverride: COIOverrideInfo | null = null;

  const override = await db.cOIOverride.findFirst({
    where: {
      reviewerProfileId,
      organizationId: targetOrgId,
      isRevoked: false,
      OR: [
        { reviewId: reviewId || null },
        { reviewId: null }, // General overrides
      ],
    },
    include: {
      approvedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { approvedAt: "desc" },
  });

  if (override) {
    const isExpired = override.expiresAt ? new Date(override.expiresAt) < new Date() : false;
    const isValid = isOverrideValid(override);

    if (isValid) {
      activeOverride = {
        id: override.id,
        justification: override.justification,
        approvedById: override.approvedById,
        approvedByName: `${override.approvedBy.firstName} ${override.approvedBy.lastName}`,
        approvedAt: override.approvedAt,
        expiresAt: override.expiresAt,
        isRevoked: override.isRevoked,
        isExpired,
        isValid,
      };
    }
  }

  // --- CATEGORIZE CONFLICTS ---
  const hardBlocks = conflicts.filter((c) => c.severity === "HARD_BLOCK");
  const softWarnings = conflicts.filter((c) => c.severity === "SOFT_WARNING");

  // --- DETERMINE STATUS ---
  const hasConflict = conflicts.length > 0;
  const hasHardBlock = hardBlocks.length > 0;
  const hasSoftWarning = softWarnings.length > 0;

  // Can proceed with override only if:
  // 1. There are soft warnings but no hard blocks
  // 2. AND there's an active valid override
  const canProceedWithOverride = !hasHardBlock && hasSoftWarning && !!activeOverride;

  return {
    reviewerProfileId,
    organizationId: targetOrgId,
    hasConflict,
    hasHardBlock,
    hasSoftWarning,
    canProceedWithOverride,
    conflicts,
    hardBlocks,
    softWarnings,
    activeOverride,
  };
}

/**
 * Check COI for a team of reviewers against an organization
 */
export async function checkTeamCOI(
  db: PrismaClient,
  reviewerProfileIds: string[],
  targetOrgId: string,
  reviewId?: string
): Promise<TeamCOICheckResult> {
  // Get organization name
  const org = await db.organization.findUnique({
    where: { id: targetOrgId },
    select: { nameEn: true },
  });

  if (!org) {
    throw new Error(`Organization not found: ${targetOrgId}`);
  }

  // Get reviewer names
  const reviewers = await db.reviewerProfile.findMany({
    where: { id: { in: reviewerProfileIds } },
    select: {
      id: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const reviewerMap = new Map(
    reviewers.map((r) => [r.id, `${r.user.firstName} ${r.user.lastName}`])
  );

  // Check each reviewer
  const results: ReviewerEligibility[] = [];
  const blockedReviewerIds: string[] = [];
  const warningReviewerIds: string[] = [];

  for (const reviewerProfileId of reviewerProfileIds) {
    const checkResult = await checkReviewerCOI(db, reviewerProfileId, targetOrgId, reviewId);

    let status: ReviewerEligibility["status"];
    if (checkResult.hasHardBlock) {
      status = "blocked";
      blockedReviewerIds.push(reviewerProfileId);
    } else if (checkResult.canProceedWithOverride) {
      status = "override_active";
    } else if (checkResult.hasSoftWarning) {
      status = "warning";
      warningReviewerIds.push(reviewerProfileId);
    } else {
      status = "eligible";
    }

    results.push({
      reviewerProfileId,
      reviewerName: reviewerMap.get(reviewerProfileId) || "Unknown",
      status,
      checkResult,
    });
  }

  // Summarize
  const summary = {
    total: results.length,
    eligible: results.filter((r) => r.status === "eligible").length,
    blocked: results.filter((r) => r.status === "blocked").length,
    warning: results.filter((r) => r.status === "warning").length,
    overrideActive: results.filter((r) => r.status === "override_active").length,
  };

  return {
    organizationId: targetOrgId,
    organizationName: org.nameEn,
    reviewers: results,
    summary,
    canProceed: summary.blocked === 0,
    blockedReviewerIds,
    warningReviewerIds,
  };
}

// =============================================================================
// AUTO-DETECTION SYNC FUNCTIONS
// =============================================================================

/**
 * Sync auto-detected COIs for a reviewer
 * Called when reviewer profile is created or updated
 */
export async function syncAutoDetectedCOIs(
  db: PrismaClient,
  reviewerProfileId: string
): Promise<{
  created: number;
  deactivated: number;
}> {
  const reviewer = await db.reviewerProfile.findUnique({
    where: { id: reviewerProfileId },
    include: {
      teamAssignments: {
        where: {
          review: {
            status: { in: ["COMPLETED", "REPORT_DRAFTING", "REPORT_REVIEW"] },
          },
        },
        include: {
          review: {
            select: {
              id: true,
              hostOrganizationId: true,
              actualEndDate: true,
            },
          },
        },
      },
    },
  });

  if (!reviewer) {
    throw new Error(`Reviewer profile not found: ${reviewerProfileId}`);
  }

  let created = 0;
  let deactivated = 0;

  // --- SYNC HOME_ORGANIZATION COI ---
  // Check if HOME_ORGANIZATION COI exists
  const existingHomeCOI = await db.reviewerCOI.findFirst({
    where: {
      reviewerProfileId,
      coiType: "HOME_ORGANIZATION",
      isAutoDetected: true,
    },
  });

  if (existingHomeCOI) {
    // Check if still valid (matches current home org)
    if (existingHomeCOI.organizationId !== reviewer.homeOrganizationId) {
      // Deactivate old HOME_ORGANIZATION COI
      await db.reviewerCOI.update({
        where: { id: existingHomeCOI.id },
        data: {
          isActive: false,
          endDate: new Date(),
        },
      });
      deactivated++;

      // Create new one for current home org
      await db.reviewerCOI.create({
        data: {
          reviewerProfileId,
          organizationId: reviewer.homeOrganizationId,
          coiType: "HOME_ORGANIZATION",
          severity: "HARD_BLOCK",
          reasonEn: "Reviewer's current employer",
          reasonFr: "Employeur actuel de l'évaluateur",
          isAutoDetected: true,
          autoDetectedAt: new Date(),
        },
      });
      created++;
    }
  } else {
    // Create HOME_ORGANIZATION COI
    await db.reviewerCOI.create({
      data: {
        reviewerProfileId,
        organizationId: reviewer.homeOrganizationId,
        coiType: "HOME_ORGANIZATION",
        severity: "HARD_BLOCK",
        reasonEn: "Reviewer's current employer",
        reasonFr: "Employeur actuel de l'évaluateur",
        isAutoDetected: true,
        autoDetectedAt: new Date(),
      },
    });
    created++;
  }

  // --- SYNC RECENT_REVIEW COIs ---
  const cooldownDate = new Date();
  cooldownDate.setFullYear(cooldownDate.getFullYear() - RECENT_REVIEW_COOLDOWN_YEARS);

  // Get organizations reviewed within cooldown period
  const recentReviewOrgs = new Set<string>();
  for (const ta of reviewer.teamAssignments) {
    if (ta.review.actualEndDate && new Date(ta.review.actualEndDate) > cooldownDate) {
      recentReviewOrgs.add(ta.review.hostOrganizationId);
    }
  }

  // Get existing RECENT_REVIEW COIs
  const existingRecentCOIs = await db.reviewerCOI.findMany({
    where: {
      reviewerProfileId,
      coiType: "RECENT_REVIEW",
      isAutoDetected: true,
    },
  });

  // Deactivate COIs for orgs no longer in cooldown
  for (const coi of existingRecentCOIs) {
    if (!recentReviewOrgs.has(coi.organizationId)) {
      await db.reviewerCOI.update({
        where: { id: coi.id },
        data: {
          isActive: false,
          endDate: new Date(),
        },
      });
      deactivated++;
    }
  }

  // Create new COIs for newly cooled orgs
  const existingOrgIds = new Set(existingRecentCOIs.map((c) => c.organizationId));
  for (const orgId of recentReviewOrgs) {
    if (!existingOrgIds.has(orgId)) {
      await db.reviewerCOI.create({
        data: {
          reviewerProfileId,
          organizationId: orgId,
          coiType: "RECENT_REVIEW",
          severity: "SOFT_WARNING",
          reasonEn: `Reviewed this organization within the last ${RECENT_REVIEW_COOLDOWN_YEARS} years`,
          reasonFr: `A évalué cette organisation au cours des ${RECENT_REVIEW_COOLDOWN_YEARS} dernières années`,
          isAutoDetected: true,
          autoDetectedAt: new Date(),
        },
      });
      created++;
    }
  }

  return { created, deactivated };
}

/**
 * Get COI statistics
 */
export async function getCOIStats(
  db: PrismaClient,
  filters?: {
    reviewerProfileId?: string;
    organizationId?: string;
  }
) {
  const where: Prisma.ReviewerCOIWhereInput = {};

  if (filters?.reviewerProfileId) {
    where.reviewerProfileId = filters.reviewerProfileId;
  }
  if (filters?.organizationId) {
    where.organizationId = filters.organizationId;
  }

  const [total, active, byType, bySeverity, autoDetected, activeOverrides] = await Promise.all([
    db.reviewerCOI.count({ where }),
    db.reviewerCOI.count({ where: { ...where, isActive: true } }),
    db.reviewerCOI.groupBy({
      by: ["coiType"],
      where,
      _count: true,
    }),
    db.reviewerCOI.groupBy({
      by: ["severity"],
      where,
      _count: true,
    }),
    db.reviewerCOI.count({ where: { ...where, isAutoDetected: true } }),
    db.cOIOverride.count({
      where: {
        isRevoked: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
      },
    }),
  ]);

  const typeMap: Record<COIType, number> = {
    // Legacy types
    EMPLOYMENT: 0,
    FINANCIAL: 0,
    CONTRACTUAL: 0,
    PERSONAL: 0,
    PREVIOUS_REVIEW: 0,
    // Current types
    HOME_ORGANIZATION: 0,
    FAMILY_RELATIONSHIP: 0,
    FORMER_EMPLOYEE: 0,
    BUSINESS_INTEREST: 0,
    RECENT_REVIEW: 0,
    OTHER: 0,
  };
  for (const t of byType) {
    typeMap[t.coiType] = t._count;
  }

  const severityMap: Record<COISeverity, number> = {
    HARD_BLOCK: 0,
    SOFT_WARNING: 0,
  };
  for (const s of bySeverity) {
    severityMap[s.severity] = s._count;
  }

  return {
    total,
    active,
    inactive: total - active,
    byType: typeMap,
    bySeverity: severityMap,
    autoDetected,
    manuallyDeclared: total - autoDetected,
    activeOverrides,
  };
}
