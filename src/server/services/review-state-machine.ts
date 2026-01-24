/**
 * Review Status State Machine
 *
 * Enforces strict status transitions with validation rules.
 * Each transition requires specific conditions to be met.
 */

import { db } from "@/lib/db";
import { ReviewStatus, UserRole, TeamRole } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface TransitionValidation {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface StatusTransition {
  from: ReviewStatus;
  to: ReviewStatus;
  requiredConditions: string[];
  allowedRoles: UserRole[];
  validate: (reviewId: string) => Promise<TransitionValidation>;
}

export interface AvailableTransition {
  targetStatus: ReviewStatus;
  conditions: { label: string; met: boolean }[];
  canTransition: boolean;
  warnings?: string[];
}

// =============================================================================
// TRANSITION DEFINITIONS
// =============================================================================

const TRANSITIONS: StatusTransition[] = [
  // REQUESTED → APPROVED
  {
    from: "REQUESTED",
    to: "APPROVED",
    requiredConditions: ["Steering Committee or Coordinator approval"],
    allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "STEERING_COMMITTEE", "PROGRAMME_COORDINATOR"],
    validate: async () => {
      // Approval is a manual decision, no automated validation needed
      return { valid: true, errors: [] };
    },
  },

  // REQUESTED → CANCELLED (rejection)
  {
    from: "REQUESTED",
    to: "CANCELLED",
    requiredConditions: ["Rejection reason provided"],
    allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "STEERING_COMMITTEE", "PROGRAMME_COORDINATOR"],
    validate: async () => {
      return { valid: true, errors: [] };
    },
  },

  // APPROVED → PLANNING
  {
    from: "APPROVED",
    to: "PLANNING",
    requiredConditions: ["Team assignment initiated"],
    allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"],
    validate: async () => {
      // Transition happens automatically when team assignment starts
      return { valid: true, errors: [] };
    },
  },

  // PLANNING → SCHEDULED
  {
    from: "PLANNING",
    to: "SCHEDULED",
    requiredConditions: [
      "Lead Reviewer assigned",
      "Minimum 2 team members",
      "Planned start date set",
      "Planned end date set",
    ],
    allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"],
    validate: async (reviewId: string) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      const review = await db.review.findUnique({
        where: { id: reviewId },
        include: {
          teamMembers: true,
        },
      });

      if (!review) {
        return { valid: false, errors: ["Review not found"] };
      }

      // Check for Lead Reviewer
      const hasLead = review.teamMembers.some(
        (m) => m.role === TeamRole.LEAD_REVIEWER
      );
      if (!hasLead) {
        errors.push("Lead Reviewer must be assigned");
      }

      // Check minimum team size
      if (review.teamMembers.length < 2) {
        errors.push("Minimum 2 team members required");
      }

      // Check dates
      if (!review.plannedStartDate) {
        errors.push("Planned start date must be set");
      }
      if (!review.plannedEndDate) {
        errors.push("Planned end date must be set");
      }

      // Warnings
      if (review.teamMembers.length < 3) {
        warnings.push("Recommended team size is 3+ reviewers");
      }

      const confirmedCount = review.teamMembers.filter(
        (m) => m.confirmedAt
      ).length;
      if (confirmedCount < review.teamMembers.length) {
        warnings.push(
          `${review.teamMembers.length - confirmedCount} team members have not confirmed`
        );
      }

      return { valid: errors.length === 0, errors, warnings };
    },
  },

  // SCHEDULED → IN_PROGRESS
  {
    from: "SCHEDULED",
    to: "IN_PROGRESS",
    requiredConditions: [
      "Actual start date set",
      "Lead Reviewer confirmed",
      "At least 2 confirmed team members",
    ],
    allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR", "LEAD_REVIEWER"],
    validate: async (reviewId: string) => {
      const errors: string[] = [];

      const review = await db.review.findUnique({
        where: { id: reviewId },
        include: {
          teamMembers: true,
        },
      });

      if (!review) {
        return { valid: false, errors: ["Review not found"] };
      }

      // Check actual start date
      if (!review.actualStartDate) {
        errors.push("Actual start date must be set");
      }

      // Check Lead Reviewer confirmed
      const lead = review.teamMembers.find(
        (m) => m.role === TeamRole.LEAD_REVIEWER
      );
      if (!lead) {
        errors.push("Lead Reviewer must be assigned");
      } else if (!lead.confirmedAt) {
        errors.push("Lead Reviewer must confirm participation");
      }

      // Check confirmed team members
      const confirmedMembers = review.teamMembers.filter((m) => m.confirmedAt);
      if (confirmedMembers.length < 2) {
        errors.push("At least 2 team members must confirm participation");
      }

      return { valid: errors.length === 0, errors };
    },
  },

  // IN_PROGRESS → REPORT_DRAFTING
  {
    from: "IN_PROGRESS",
    to: "REPORT_DRAFTING",
    requiredConditions: [
      "Fieldwork completed",
      "Actual end date set",
    ],
    allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR", "LEAD_REVIEWER"],
    validate: async (reviewId: string) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      const review = await db.review.findUnique({
        where: { id: reviewId },
        include: {
          findings: true,
        },
      });

      if (!review) {
        return { valid: false, errors: ["Review not found"] };
      }

      // Actual end date should be set
      if (!review.actualEndDate) {
        errors.push("Actual end date must be set");
      }

      // Warning if no findings entered
      if (review.findings.length === 0) {
        warnings.push("No findings have been entered yet");
      }

      return { valid: errors.length === 0, errors, warnings };
    },
  },

  // REPORT_DRAFTING → REPORT_REVIEW
  {
    from: "REPORT_DRAFTING",
    to: "REPORT_REVIEW",
    requiredConditions: [
      "At least one finding entered",
      "Draft report available",
    ],
    allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR", "LEAD_REVIEWER"],
    validate: async (reviewId: string) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      const review = await db.review.findUnique({
        where: { id: reviewId },
        include: {
          findings: true,
          report: true,
        },
      });

      if (!review) {
        return { valid: false, errors: ["Review not found"] };
      }

      // Check findings
      if (review.findings.length === 0) {
        errors.push("At least one finding must be entered");
      }

      // Check for non-conformities requiring CAPs
      const nonConformities = review.findings.filter(
        (f) => f.findingType === "NON_CONFORMITY" && f.capRequired
      );

      const findingsWithCAP = await db.finding.count({
        where: {
          reviewId,
          findingType: "NON_CONFORMITY",
          capRequired: true,
          correctiveActionPlan: { isNot: null },
        },
      });

      if (findingsWithCAP < nonConformities.length) {
        warnings.push(
          `${nonConformities.length - findingsWithCAP} non-conformities are missing CAPs`
        );
      }

      // Check draft report
      if (!review.report) {
        warnings.push("Draft report has not been generated");
      }

      return { valid: errors.length === 0, errors, warnings };
    },
  },

  // REPORT_REVIEW → COMPLETED
  {
    from: "REPORT_REVIEW",
    to: "COMPLETED",
    requiredConditions: [
      "Report finalized",
      "All critical CAPs submitted",
    ],
    allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "STEERING_COMMITTEE", "PROGRAMME_COORDINATOR"],
    validate: async (reviewId: string) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      const review = await db.review.findUnique({
        where: { id: reviewId },
        include: {
          report: true,
          findings: {
            where: {
              findingType: "NON_CONFORMITY",
              severity: { in: ["CRITICAL", "MAJOR"] },
              capRequired: true,
            },
            include: {
              correctiveActionPlan: true,
            },
          },
        },
      });

      if (!review) {
        return { valid: false, errors: ["Review not found"] };
      }

      // Check report status
      if (!review.report) {
        errors.push("Report must be generated");
      } else if (review.report.status !== "FINAL" && review.report.status !== "PUBLISHED") {
        warnings.push("Report has not been finalized");
      }

      // Check critical/major CAPs
      const missingCAPs = review.findings.filter(
        (f) => !f.correctiveActionPlan
      );
      if (missingCAPs.length > 0) {
        errors.push(
          `${missingCAPs.length} critical/major findings are missing CAPs`
        );
      }

      // Check CAP status
      const draftCAPs = review.findings.filter(
        (f) => f.correctiveActionPlan?.status === "DRAFT"
      );
      if (draftCAPs.length > 0) {
        errors.push(
          `${draftCAPs.length} CAPs are still in draft status`
        );
      }

      return { valid: errors.length === 0, errors, warnings };
    },
  },

  // Allow cancellation from most states
  ...["APPROVED", "PLANNING", "SCHEDULED"].map((status) => ({
    from: status as ReviewStatus,
    to: "CANCELLED" as ReviewStatus,
    requiredConditions: ["Cancellation reason provided"],
    allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "STEERING_COMMITTEE", "PROGRAMME_COORDINATOR"] as UserRole[],
    validate: async () => ({ valid: true, errors: [] }),
  })),
];

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Get all valid transitions from current status
 */
export function getValidTransitionsFrom(
  currentStatus: ReviewStatus
): ReviewStatus[] {
  return TRANSITIONS
    .filter((t) => t.from === currentStatus)
    .map((t) => t.to);
}

/**
 * Check if a specific transition is valid and get detailed conditions
 */
export async function canTransition(
  reviewId: string,
  targetStatus: ReviewStatus,
  userRole: UserRole
): Promise<{
  allowed: boolean;
  errors: string[];
  warnings?: string[];
  conditions: { label: string; met: boolean }[];
}> {
  // Get current review status
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { status: true },
  });

  if (!review) {
    return {
      allowed: false,
      errors: ["Review not found"],
      conditions: [],
    };
  }

  // Find the transition definition
  const transition = TRANSITIONS.find(
    (t) => t.from === review.status && t.to === targetStatus
  );

  if (!transition) {
    return {
      allowed: false,
      errors: [
        `Invalid transition: ${review.status} → ${targetStatus}`,
        `Valid transitions from ${review.status}: ${getValidTransitionsFrom(review.status).join(", ") || "none"}`,
      ],
      conditions: [],
    };
  }

  // Check role permission
  if (!transition.allowedRoles.includes(userRole)) {
    return {
      allowed: false,
      errors: [
        `Your role (${userRole}) cannot perform this transition`,
        `Required roles: ${transition.allowedRoles.join(", ")}`,
      ],
      conditions: [],
    };
  }

  // Run validation
  const validation = await transition.validate(reviewId);

  // Build conditions list
  const conditions = transition.requiredConditions.map((label) => {
    // Determine if condition is met based on errors
    const errorMatches = validation.errors.some((e) =>
      e.toLowerCase().includes(label.toLowerCase().split(" ")[0])
    );
    return {
      label,
      met: !errorMatches,
    };
  });

  return {
    allowed: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
    conditions,
  };
}

/**
 * Get all available transitions from current status with validation
 */
export async function getAvailableTransitions(
  reviewId: string,
  userRole: UserRole
): Promise<AvailableTransition[]> {
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { status: true },
  });

  if (!review) {
    return [];
  }

  const possibleTransitions = TRANSITIONS.filter(
    (t) => t.from === review.status
  );

  const results: AvailableTransition[] = [];

  for (const transition of possibleTransitions) {
    // Check role
    if (!transition.allowedRoles.includes(userRole)) {
      continue; // Skip transitions user can't perform
    }

    const validation = await transition.validate(reviewId);

    const conditions = transition.requiredConditions.map((label) => {
      const errorMatches = validation.errors.some((e) =>
        e.toLowerCase().includes(label.toLowerCase().split(" ")[0])
      );
      return {
        label,
        met: !errorMatches,
      };
    });

    results.push({
      targetStatus: transition.to,
      conditions,
      canTransition: validation.valid,
      warnings: validation.warnings,
    });
  }

  return results;
}

/**
 * Execute a status transition with validation
 */
export async function executeTransition(
  reviewId: string,
  targetStatus: ReviewStatus,
  userId: string,
  userRole: UserRole,
  metadata?: { reason?: string; notes?: string }
): Promise<{ success: boolean; review?: Awaited<ReturnType<typeof db.review.update>>; previousStatus?: ReviewStatus; errors?: string[] }> {
  // Validate transition
  const check = await canTransition(reviewId, targetStatus, userRole);

  if (!check.allowed) {
    return {
      success: false,
      errors: check.errors,
    };
  }

  // Get current review for history
  const currentReview = await db.review.findUnique({
    where: { id: reviewId },
  });

  if (!currentReview) {
    return {
      success: false,
      errors: ["Review not found"],
    };
  }

  // Build update data
  const updateData: Record<string, unknown> = {
    status: targetStatus,
  };

  // Handle specific transitions
  if (targetStatus === "IN_PROGRESS" && !currentReview.actualStartDate) {
    updateData.actualStartDate = new Date();
  }

  if (targetStatus === "REPORT_DRAFTING" && !currentReview.actualEndDate) {
    updateData.actualEndDate = new Date();
  }

  if (targetStatus === "CANCELLED" && metadata?.reason) {
    updateData.specialRequirements = currentReview.specialRequirements
      ? `${currentReview.specialRequirements}\n\nCancellation reason: ${metadata.reason}`
      : `Cancellation reason: ${metadata.reason}`;
  }

  // Execute update
  const updatedReview = await db.review.update({
    where: { id: reviewId },
    data: updateData,
    include: {
      hostOrganization: {
        select: {
          id: true,
          nameEn: true,
          organizationCode: true,
        },
      },
      teamMembers: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  // TODO: Create audit log entry
  // await db.auditLog.create({
  //   data: {
  //     action: "STATUS_TRANSITION",
  //     entityType: "Review",
  //     entityId: reviewId,
  //     userId,
  //     details: {
  //       from: currentReview.status,
  //       to: targetStatus,
  //       ...metadata,
  //     },
  //   },
  // });

  return {
    success: true,
    review: updatedReview,
    previousStatus: currentReview.status,
  };
}

/**
 * Get status flow documentation
 */
export function getStatusFlow(): {
  status: ReviewStatus;
  nextStatuses: ReviewStatus[];
  description: string;
}[] {
  const statuses: ReviewStatus[] = [
    "REQUESTED",
    "APPROVED",
    "PLANNING",
    "SCHEDULED",
    "IN_PROGRESS",
    "REPORT_DRAFTING",
    "REPORT_REVIEW",
    "COMPLETED",
    "CANCELLED",
  ];

  const descriptions: Record<ReviewStatus, string> = {
    REQUESTED: "Review has been requested by host organization",
    APPROVED: "Request approved, ready for team planning",
    PLANNING: "Team assignment in progress",
    SCHEDULED: "Team assigned, dates confirmed",
    IN_PROGRESS: "On-site review underway",
    REPORT_DRAFTING: "Fieldwork complete, drafting report",
    REPORT_REVIEW: "Draft report under review",
    COMPLETED: "Review finalized and closed",
    CANCELLED: "Review cancelled",
  };

  return statuses.map((status) => ({
    status,
    nextStatuses: getValidTransitionsFrom(status),
    description: descriptions[status],
  }));
}
