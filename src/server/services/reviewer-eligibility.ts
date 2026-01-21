import { db } from "@/lib/db";

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

  // Get all certified/lead-qualified reviewers
  const allReviewers = await db.reviewerProfile.findMany({
    where: {
      status: { in: ["CERTIFIED", "LEAD_QUALIFIED"] },
      isAvailable: true,
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
            code: reviewer.user.organization?.icaoCode ?? "",
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
