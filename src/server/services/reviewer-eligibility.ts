import { db } from "@/lib/db";
import { TeamRole } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

interface LeadReviewerValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  canOverride: boolean;
  profile?: {
    id: string;
    fullName: string;
    isLeadQualified: boolean;
    reviewsCompleted: number;
    reviewsAsLead: number;
    status: string;
  };
}

interface EligibilityResult {
  reviewers: ReviewerWithDetails[];
  hostTeam: { id: string; code: string; nameEn: string } | null;
  totalEligible: number;
}

interface ReviewerWithDetails {
  id: string;
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    organization: {
      id: string;
      code: string;
      nameEn: string;
      regionalTeamId: string | null;
    };
  };
  status: string;
  expertiseAreas: string[];
  isAvailable: boolean;
  // Eligibility flags
  isSameTeam: boolean;
  isSameOrg: boolean;
  isEligible: boolean;
  ineligibilityReason?: string;
}

/**
 * Get eligible reviewers for a review based on team membership rules
 *
 * Rule 1: SAME TEAM - Reviewer must be from same team as host ANSP
 * Rule 2: NO SELF-REVIEW - Reviewer cannot be from host organization
 */
export async function getEligibleReviewers(
  reviewId: string,
  includeCrossTeam: boolean = false
): Promise<EligibilityResult> {
  // Get review with host organization and team
  const review = await db.review.findUniqueOrThrow({
    where: { id: reviewId },
    include: {
      hostOrganization: {
        include: { regionalTeam: true },
      },
    },
  });

  const hostOrgId = review.hostOrganizationId;
  const hostTeamId = review.hostOrganization.regionalTeamId;
  const hostTeam = review.hostOrganization.regionalTeam;

  // Current date for availability filtering
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of day for accurate comparison

  // Get all certified/lead-qualified reviewers with date-aware availability filtering
  // Logic: isAvailable = true AND (availableFrom is null OR <= today) AND (availableTo is null OR >= today)
  const allReviewers = await db.reviewerProfile.findMany({
    where: {
      status: { in: ["CERTIFIED", "LEAD_QUALIFIED"] },
      isAvailable: true,
      // Date range filtering: today must fall within the availability window (or no window set)
      AND: [
        // Start date check: null (no restriction) OR today is on or after start
        {
          OR: [
            { availableFrom: null },
            { availableFrom: { lte: today } },
          ],
        },
        // End date check: null (no restriction) OR today is on or before end
        {
          OR: [
            { availableTo: null },
            { availableTo: { gte: today } },
          ],
        },
      ],
    },
    include: {
      user: {
        include: {
          organization: {
            include: { regionalTeam: true },
          },
        },
      },
      languages: true,
    },
  });

  // Apply eligibility rules
  const reviewersWithEligibility: ReviewerWithDetails[] = allReviewers.map(
    (reviewer) => {
      const reviewerOrgId = reviewer.user.organizationId;
      const reviewerTeamId = reviewer.user.organization?.regionalTeamId;

      const isSameOrg = reviewerOrgId === hostOrgId;
      const isSameTeam = hostTeamId !== null && reviewerTeamId === hostTeamId;

      let isEligible = true;
      let ineligibilityReason: string | undefined;

      // Rule 2: No self-review
      if (isSameOrg) {
        isEligible = false;
        ineligibilityReason = "Cannot review own organization";
      }
      // Rule 1: Same team required (unless cross-team included)
      else if (!isSameTeam && !includeCrossTeam) {
        isEligible = false;
        ineligibilityReason = "Different team - requires cross-team approval";
      }

      return {
        id: reviewer.id,
        userId: reviewer.userId,
        user: {
          firstName: reviewer.user.firstName,
          lastName: reviewer.user.lastName,
          organization: {
            id: reviewer.user.organization?.id ?? "",
            code: reviewer.user.organization?.organizationCode ?? "",
            nameEn: reviewer.user.organization?.nameEn ?? "",
            regionalTeamId: reviewer.user.organization?.regionalTeamId ?? null,
          },
        },
        status: reviewer.status,
        expertiseAreas: reviewer.expertiseAreas,
        isAvailable: reviewer.isAvailable,
        isSameTeam,
        isSameOrg,
        isEligible,
        ineligibilityReason,
      };
    }
  );

  // Filter to eligible only (or all if cross-team included)
  const eligibleReviewers = reviewersWithEligibility.filter((r) =>
    includeCrossTeam ? !r.isSameOrg : r.isEligible
  );

  return {
    reviewers: eligibleReviewers,
    hostTeam: hostTeam
      ? {
          id: hostTeam.id,
          code: hostTeam.code,
          nameEn: hostTeam.nameEn,
        }
      : null,
    totalEligible: eligibleReviewers.filter((r) => r.isEligible).length,
  };
}

/**
 * Validate reviewer assignment against eligibility rules
 */
export async function validateReviewerAssignment(
  reviewId: string,
  reviewerProfileId: string,
  crossTeamJustification?: string,
  approverId?: string
): Promise<{ valid: boolean; isCrossTeam: boolean; error?: string }> {
  const review = await db.review.findUniqueOrThrow({
    where: { id: reviewId },
    include: {
      hostOrganization: { select: { id: true, regionalTeamId: true } },
    },
  });

  const reviewer = await db.reviewerProfile.findUniqueOrThrow({
    where: { id: reviewerProfileId },
    include: {
      user: {
        include: {
          organization: { select: { id: true, regionalTeamId: true } },
        },
      },
    },
  });

  const hostOrgId = review.hostOrganization.id;
  const hostTeamId = review.hostOrganization.regionalTeamId;
  const reviewerOrgId = reviewer.user.organization?.id;
  const reviewerTeamId = reviewer.user.organization?.regionalTeamId;

  // Rule 2: No self-review (hard block)
  if (reviewerOrgId === hostOrgId) {
    return {
      valid: false,
      isCrossTeam: false,
      error: "Reviewer cannot review their own organization",
    };
  }

  // Rule 1: Same team check
  const isCrossTeam = hostTeamId !== reviewerTeamId;

  if (isCrossTeam) {
    // Rule 3: Cross-team requires justification
    if (!crossTeamJustification || crossTeamJustification.trim().length < 10) {
      return {
        valid: false,
        isCrossTeam: true,
        error:
          "Cross-team assignment requires justification (min 10 characters)",
      };
    }
    if (!approverId) {
      return {
        valid: false,
        isCrossTeam: true,
        error: "Cross-team assignment requires Programme Coordinator approval",
      };
    }
  }

  return { valid: true, isCrossTeam };
}

// =============================================================================
// LEAD REVIEWER VALIDATION
// =============================================================================

/**
 * Minimum number of reviews required to be a Lead Reviewer
 */
const MIN_REVIEWS_FOR_LEAD = 3;

/**
 * Validate Lead Reviewer assignment against eligibility rules
 *
 * Rules:
 * 1. Must have LEAD_QUALIFIED status or isLeadQualified flag
 * 2. Must have completed at least 3 reviews as regular reviewer
 * 3. Must not have conflict of interest with host organization
 * 4. Only one Lead Reviewer per review (existing lead check)
 * 5. Programme Coordinator can approve exceptions
 */
export async function validateLeadReviewerAssignment(
  reviewerProfileId: string,
  reviewId: string,
  options?: {
    /** Skip the "only one lead" check (for replacement scenarios) */
    skipExistingLeadCheck?: boolean;
    /** The ID of the member being replaced (to exclude from check) */
    replacingMemberId?: string;
  }
): Promise<LeadReviewerValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get reviewer profile with full details
  const profile = await db.reviewerProfile.findUnique({
    where: { id: reviewerProfileId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          organizationId: true,
        },
      },
      homeOrganization: {
        select: { id: true },
      },
    },
  });

  if (!profile) {
    return {
      valid: false,
      errors: ["Reviewer profile not found"],
      warnings: [],
      canOverride: false,
    };
  }

  const fullName = `${profile.user.firstName} ${profile.user.lastName}`;

  // Get review details
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      hostOrganizationId: true,
      hostOrganization: {
        select: { nameEn: true },
      },
    },
  });

  if (!review) {
    return {
      valid: false,
      errors: ["Review not found"],
      warnings: [],
      canOverride: false,
      profile: {
        id: profile.id,
        fullName,
        isLeadQualified: profile.isLeadQualified,
        reviewsCompleted: profile.reviewsCompleted,
        reviewsAsLead: profile.reviewsAsLead,
        status: profile.status,
      },
    };
  }

  // Rule 1: Must be Lead Qualified
  const isQualified = profile.isLeadQualified || profile.status === "LEAD_QUALIFIED";
  if (!isQualified) {
    errors.push("Reviewer must have Lead Qualified status");
  }

  // Rule 2: Minimum experience (at least 3 reviews completed)
  if (profile.reviewsCompleted < MIN_REVIEWS_FOR_LEAD) {
    errors.push(
      `Lead Reviewer must have completed at least ${MIN_REVIEWS_FOR_LEAD} reviews (has ${profile.reviewsCompleted})`
    );
  }

  // Rule 3: Check COI - Home organization
  const reviewerOrgId = profile.homeOrganizationId || profile.user.organizationId;
  if (reviewerOrgId === review.hostOrganizationId) {
    errors.push(
      `Lead Reviewer cannot be from host organization (${review.hostOrganization?.nameEn})`
    );
  }

  // Rule 3: Check COI - Declared conflicts
  const activeCOI = await db.reviewerCOI.findFirst({
    where: {
      reviewerProfileId: reviewerProfileId,
      organizationId: review.hostOrganizationId,
      isActive: true,
      OR: [
        { endDate: null },
        { endDate: { gt: new Date() } },
      ],
    },
  });

  if (activeCOI) {
    // Check if there's an approved override for this specific review
    const override = await db.cOIOverride.findFirst({
      where: {
        reviewerProfileId: reviewerProfileId,
        organizationId: review.hostOrganizationId,
        reviewId: reviewId,
        isRevoked: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!override) {
      errors.push(
        `Reviewer has a declared conflict of interest with ${review.hostOrganization?.nameEn}`
      );
    } else {
      warnings.push("COI override has been approved for this assignment");
    }
  }

  // Rule 4: Only one Lead Reviewer per review
  if (!options?.skipExistingLeadCheck) {
    const existingLeadQuery: Parameters<typeof db.reviewTeamMember.findFirst>[0] = {
      where: {
        reviewId,
        role: "LEAD_REVIEWER" as TeamRole,
        invitationStatus: { notIn: ["DECLINED", "WITHDRAWN"] },
      },
    };

    // Exclude the member being replaced
    if (options?.replacingMemberId) {
      existingLeadQuery.where = {
        ...existingLeadQuery.where,
        id: { not: options.replacingMemberId },
      };
    }

    // Also exclude if the same reviewer is already assigned (e.g., role change scenario)
    existingLeadQuery.where = {
      ...existingLeadQuery.where,
      reviewerProfileId: { not: reviewerProfileId },
    };

    const existingLead = await db.reviewTeamMember.findFirst(existingLeadQuery);

    if (existingLead) {
      errors.push("Review already has a Lead Reviewer assigned");
    }
  }

  // Determine if errors can be overridden by Programme Coordinator
  // Only qualification and experience errors can be overridden, not COI or duplicate lead
  const canOverride =
    errors.length > 0 &&
    errors.every(
      (e) =>
        e.includes("Lead Qualified status") ||
        e.includes("completed at least")
    );

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    canOverride,
    profile: {
      id: profile.id,
      fullName,
      isLeadQualified: profile.isLeadQualified,
      reviewsCompleted: profile.reviewsCompleted,
      reviewsAsLead: profile.reviewsAsLead,
      status: profile.status,
    },
  };
}

/**
 * Get lead qualification requirements summary for a reviewer
 */
export async function getLeadQualificationStatus(
  reviewerProfileId: string
): Promise<{
  isQualified: boolean;
  requirements: {
    name: string;
    met: boolean;
    current: string;
    required: string;
  }[];
}> {
  const profile = await db.reviewerProfile.findUnique({
    where: { id: reviewerProfileId },
    select: {
      status: true,
      isLeadQualified: true,
      reviewsCompleted: true,
      reviewsAsLead: true,
      certifications: {
        where: {
          certificationType: "LEAD_REVIEWER",
          OR: [
            { expiryDate: null },
            { expiryDate: { gt: new Date() } },
          ],
        },
      },
    },
  });

  if (!profile) {
    return {
      isQualified: false,
      requirements: [],
    };
  }

  const hasLeadStatus = profile.isLeadQualified || profile.status === "LEAD_QUALIFIED";
  const hasMinReviews = profile.reviewsCompleted >= MIN_REVIEWS_FOR_LEAD;
  const hasLeadCert = profile.certifications.length > 0;

  const requirements = [
    {
      name: "Lead Qualified Status",
      met: hasLeadStatus,
      current: hasLeadStatus ? "Yes" : "No",
      required: "Yes",
    },
    {
      name: "Minimum Reviews Completed",
      met: hasMinReviews,
      current: `${profile.reviewsCompleted} reviews`,
      required: `${MIN_REVIEWS_FOR_LEAD} reviews`,
    },
    {
      name: "Lead Reviewer Certification",
      met: hasLeadCert,
      current: hasLeadCert ? "Active" : "None",
      required: "Valid certification",
    },
  ];

  return {
    isQualified: hasLeadStatus && hasMinReviews,
    requirements,
  };
}
