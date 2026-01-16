/**
 * Database Query Helpers for Reviewer Profile Module
 *
 * Provides reusable database operations for reviewer profiles,
 * aligned with ICAO Doc 9734 and CANSO standards.
 */

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// ============================================
// REVIEWER PROFILE INCLUDE RELATIONS
// ============================================

/**
 * Standard include for full reviewer profile with all relations
 */
export const reviewerProfileInclude = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      title: true,
    },
  },
  homeOrganization: {
    select: {
      id: true,
      nameEn: true,
      nameFr: true,
      icaoCode: true,
      country: true,
      region: true,
    },
  },
  expertiseRecords: {
    orderBy: { area: "asc" as const },
  },
  languages: {
    orderBy: { language: "asc" as const },
  },
  certifications: {
    where: { isValid: true },
    orderBy: { issueDate: "desc" as const },
  },
  trainingRecords: {
    orderBy: { startDate: "desc" as const },
  },
  availabilityPeriods: {
    where: {
      endDate: { gte: new Date() },
    },
    orderBy: { startDate: "asc" as const },
  },
  conflictsOfInterest: {
    where: { isActive: true },
    include: {
      organization: {
        select: {
          id: true,
          nameEn: true,
          nameFr: true,
          icaoCode: true,
        },
      },
    },
  },
} satisfies Prisma.ReviewerProfileInclude;

/**
 * Minimal include for list views
 */
export const reviewerProfileListInclude = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  homeOrganization: {
    select: {
      id: true,
      nameEn: true,
      nameFr: true,
      icaoCode: true,
      country: true,
    },
  },
  expertiseRecords: {
    select: {
      area: true,
      proficiencyLevel: true,
    },
  },
  languages: {
    select: {
      language: true,
      proficiency: true,
    },
  },
} satisfies Prisma.ReviewerProfileInclude;

// ============================================
// SINGLE REVIEWER QUERIES
// ============================================

/**
 * Get a reviewer profile by ID with full relations
 */
export async function getReviewerById(id: string) {
  return db.reviewerProfile.findUnique({
    where: { id },
    include: reviewerProfileInclude,
  });
}

/**
 * Get a reviewer profile by user ID
 */
export async function getReviewerByUserId(userId: string) {
  return db.reviewerProfile.findUnique({
    where: { userId },
    include: reviewerProfileInclude,
  });
}

/**
 * Check if a user has a reviewer profile
 */
export async function hasReviewerProfile(userId: string) {
  const profile = await db.reviewerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return !!profile;
}

// ============================================
// SEARCH AND FILTER QUERIES
// ============================================

export interface ReviewerSearchParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: string[];
  selectionStatus?: string[];
  reviewerType?: string[];
  expertiseAreas?: string[];
  languages?: string[];
  organizationId?: string;
  excludeOrganizationId?: string;
  availableFrom?: Date;
  availableTo?: Date;
  isLeadQualified?: boolean;
  isAvailable?: boolean;
}

/**
 * Search and filter reviewer profiles with pagination
 */
export async function searchReviewers(params: ReviewerSearchParams) {
  const {
    page = 1,
    pageSize = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
    search,
    status,
    selectionStatus,
    reviewerType,
    expertiseAreas,
    languages,
    organizationId,
    excludeOrganizationId,
    availableFrom,
    availableTo,
    isLeadQualified,
    isAvailable,
  } = params;

  const where: Prisma.ReviewerProfileWhereInput = {
    // Text search across multiple fields
    ...(search && {
      OR: [
        {
          user: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        {
          homeOrganization: {
            OR: [
              { nameEn: { contains: search, mode: "insensitive" } },
              { nameFr: { contains: search, mode: "insensitive" } },
              { icaoCode: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        { currentPosition: { contains: search, mode: "insensitive" } },
      ],
    }),

    // Status filters
    ...(status?.length && {
      status: { in: status as Prisma.EnumReviewerStatusFilter["in"] },
    }),
    ...(selectionStatus?.length && {
      selectionStatus: {
        in: selectionStatus as Prisma.EnumReviewerSelectionStatusFilter["in"],
      },
    }),
    ...(reviewerType?.length && {
      reviewerType: {
        in: reviewerType as Prisma.EnumReviewerTypeFilter["in"],
      },
    }),

    // Organization filters
    ...(organizationId && { homeOrganizationId: organizationId }),
    ...(excludeOrganizationId && {
      AND: [
        { homeOrganizationId: { not: excludeOrganizationId } },
        {
          conflictsOfInterest: {
            none: {
              organizationId: excludeOrganizationId,
              isActive: true,
            },
          },
        },
      ],
    }),

    // Qualification filters
    ...(isLeadQualified !== undefined && { isLeadQualified }),
    ...(isAvailable !== undefined && { isAvailable }),

    // Expertise filter
    ...(expertiseAreas?.length && {
      expertiseRecords: {
        some: {
          area: { in: expertiseAreas as Prisma.EnumExpertiseAreaFilter["in"] },
        },
      },
    }),

    // Language filter
    ...(languages?.length && {
      languages: {
        some: {
          language: { in: languages as Prisma.EnumLanguageFilter["in"] },
        },
      },
    }),

    // Availability filter
    ...(availableFrom &&
      availableTo && {
        availabilityPeriods: {
          some: {
            availabilityType: "AVAILABLE",
            startDate: { lte: availableFrom },
            endDate: { gte: availableTo },
          },
        },
      }),
  };

  // Build orderBy based on sortBy field
  let orderBy: Prisma.ReviewerProfileOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

  // Handle special sort cases
  if (sortBy === "name") {
    orderBy = { user: { lastName: sortOrder } };
  } else if (sortBy === "organization") {
    orderBy = { homeOrganization: { nameEn: sortOrder } };
  } else if (sortBy === "experience") {
    orderBy = { yearsExperience: sortOrder };
  }

  const [items, total] = await Promise.all([
    db.reviewerProfile.findMany({
      where,
      include: reviewerProfileListInclude,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.reviewerProfile.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================
// CONFLICT OF INTEREST CHECKS
// ============================================

export interface COICheckResult {
  hasConflict: boolean;
  severity?: "HARD_BLOCK" | "SOFT_BLOCK" | "WARNING";
  reason?: string;
  description?: string;
  coiId?: string;
}

/**
 * Check if a reviewer has a conflict of interest with a target organization
 */
export async function checkCOIConflict(
  reviewerId: string,
  targetOrganizationId: string
): Promise<COICheckResult> {
  const reviewer = await db.reviewerProfile.findUnique({
    where: { id: reviewerId },
    include: {
      homeOrganization: { select: { id: true, nameEn: true } },
      conflictsOfInterest: {
        where: { isActive: true },
        include: {
          organization: { select: { id: true, nameEn: true } },
        },
      },
    },
  });

  if (!reviewer) {
    return { hasConflict: false };
  }

  // Check home organization conflict (hard block)
  if (reviewer.homeOrganizationId === targetOrganizationId) {
    return {
      hasConflict: true,
      severity: "HARD_BLOCK",
      reason: "HOME_ORGANIZATION",
      description: "Reviewer cannot review their home organization",
    };
  }

  // Check manually declared COI entries
  const manualConflict = reviewer.conflictsOfInterest.find(
    (coi) => coi.organizationId === targetOrganizationId
  );

  if (manualConflict) {
    // Map COI type to severity
    const severityMap: Record<string, COICheckResult["severity"]> = {
      EMPLOYMENT: "HARD_BLOCK",
      FINANCIAL: "HARD_BLOCK",
      CONTRACTUAL: "SOFT_BLOCK",
      PERSONAL: "SOFT_BLOCK",
      PREVIOUS_REVIEW: "WARNING",
      OTHER: "WARNING",
    };

    return {
      hasConflict: true,
      severity: severityMap[manualConflict.coiType] || "WARNING",
      reason: manualConflict.coiType,
      description: manualConflict.reason || undefined,
      coiId: manualConflict.id,
    };
  }

  return { hasConflict: false };
}

/**
 * Get all COI conflicts for a reviewer
 */
export async function getReviewerCOIs(reviewerId: string) {
  return db.reviewerCOI.findMany({
    where: {
      reviewerProfileId: reviewerId,
      isActive: true,
    },
    include: {
      organization: {
        select: {
          id: true,
          nameEn: true,
          nameFr: true,
          icaoCode: true,
          country: true,
        },
      },
    },
    orderBy: { startDate: "desc" },
  });
}

// ============================================
// STATISTICS AND AGGREGATIONS
// ============================================

/**
 * Get aggregated statistics for reviewer profiles
 */
export async function getReviewerStats() {
  const [total, byStatus, bySelectionStatus, byReviewerType, byExpertise] =
    await Promise.all([
      db.reviewerProfile.count(),
      db.reviewerProfile.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      db.reviewerProfile.groupBy({
        by: ["selectionStatus"],
        _count: { selectionStatus: true },
      }),
      db.reviewerProfile.groupBy({
        by: ["reviewerType"],
        _count: { reviewerType: true },
      }),
      db.reviewerExpertise.groupBy({
        by: ["area"],
        _count: { area: true },
      }),
    ]);

  const selectedCount = await db.reviewerProfile.count({
    where: { selectionStatus: "SELECTED" },
  });

  const leadQualifiedCount = await db.reviewerProfile.count({
    where: { isLeadQualified: true },
  });

  return {
    total,
    selected: selectedCount,
    leadQualified: leadQualifiedCount,
    byStatus: byStatus.reduce(
      (acc, curr) => {
        acc[curr.status] = curr._count.status;
        return acc;
      },
      {} as Record<string, number>
    ),
    bySelectionStatus: bySelectionStatus.reduce(
      (acc, curr) => {
        acc[curr.selectionStatus] = curr._count.selectionStatus;
        return acc;
      },
      {} as Record<string, number>
    ),
    byReviewerType: byReviewerType.reduce(
      (acc, curr) => {
        acc[curr.reviewerType] = curr._count.reviewerType;
        return acc;
      },
      {} as Record<string, number>
    ),
    byExpertise: byExpertise.reduce(
      (acc, curr) => {
        acc[curr.area] = curr._count.area;
        return acc;
      },
      {} as Record<string, number>
    ),
  };
}

// ============================================
// AVAILABILITY QUERIES
// ============================================

/**
 * Get available reviewers for a date range
 */
export async function getAvailableReviewers(
  startDate: Date,
  endDate: Date,
  options?: {
    expertiseAreas?: string[];
    languages?: string[];
    excludeOrganizationId?: string;
    requireLeadQualified?: boolean;
  }
) {
  const where: Prisma.ReviewerProfileWhereInput = {
    selectionStatus: "SELECTED",
    isAvailable: true,
    availabilityPeriods: {
      some: {
        availabilityType: "AVAILABLE",
        startDate: { lte: startDate },
        endDate: { gte: endDate },
      },
    },
    ...(options?.excludeOrganizationId && {
      AND: [
        { homeOrganizationId: { not: options.excludeOrganizationId } },
        {
          conflictsOfInterest: {
            none: {
              organizationId: options.excludeOrganizationId,
              isActive: true,
            },
          },
        },
      ],
    }),
    ...(options?.requireLeadQualified && { isLeadQualified: true }),
    ...(options?.expertiseAreas?.length && {
      expertiseRecords: {
        some: {
          area: {
            in: options.expertiseAreas as Prisma.EnumExpertiseAreaFilter["in"],
          },
        },
      },
    }),
    ...(options?.languages?.length && {
      languages: {
        some: {
          language: {
            in: options.languages as Prisma.EnumLanguageFilter["in"],
          },
        },
      },
    }),
  };

  return db.reviewerProfile.findMany({
    where,
    include: reviewerProfileListInclude,
    orderBy: { reviewsCompleted: "desc" },
  });
}

// ============================================
// EXPERTISE QUERIES
// ============================================

/**
 * Get reviewers by expertise area
 */
export async function getReviewersByExpertise(area: string) {
  return db.reviewerProfile.findMany({
    where: {
      selectionStatus: "SELECTED",
      expertiseRecords: {
        some: {
          area: area as Prisma.EnumExpertiseAreaFilter["equals"],
          proficiencyLevel: { in: ["PROFICIENT", "EXPERT"] },
        },
      },
    },
    include: reviewerProfileListInclude,
    orderBy: { reviewsCompleted: "desc" },
  });
}

/**
 * Get expertise distribution for an organization's reviewers
 */
export async function getOrganizationExpertiseDistribution(
  organizationId: string
) {
  const reviewers = await db.reviewerProfile.findMany({
    where: { homeOrganizationId: organizationId },
    include: {
      expertiseRecords: {
        select: { area: true, proficiencyLevel: true },
      },
    },
  });

  const distribution: Record<string, Record<string, number>> = {};

  for (const reviewer of reviewers) {
    for (const expertise of reviewer.expertiseRecords) {
      if (!distribution[expertise.area]) {
        distribution[expertise.area] = {};
      }
      distribution[expertise.area][expertise.proficiencyLevel] =
        (distribution[expertise.area][expertise.proficiencyLevel] || 0) + 1;
    }
  }

  return distribution;
}
