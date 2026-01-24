/**
 * Dashboard Router - Role-Based KPI System
 *
 * Provides role-specific dashboard statistics, recent activity,
 * and quick actions aligned with ICAO/CANSO requirements.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { UserRole, FindingSeverity } from "@prisma/client";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Programme-level admin roles (see full programme metrics)
 */
const PROGRAMME_ADMIN_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "STEERING_COMMITTEE",
];

/**
 * Coordinator roles (manage reviews and teams)
 */
const COORDINATOR_ROLES: UserRole[] = ["PROGRAMME_COORDINATOR"];

/**
 * Reviewer roles (conduct peer reviews)
 */
const REVIEWER_ROLES: UserRole[] = ["LEAD_REVIEWER", "PEER_REVIEWER"];

/**
 * ANSP organization roles (manage own org assessments/reviews)
 */
const ANSP_ROLES: UserRole[] = ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"];

// =============================================================================
// TYPES
// =============================================================================

interface ProgrammeStats {
  totalAnsps: number;
  activeParticipants: number;
  totalAssessments: number;
  totalReviews: number;
  openFindingsBySeverity: Record<FindingSeverity, number>;
  overdueCaps: number;
  averageEIScore: number | null;
  pendingJoinRequests: number;
}

interface CoordinatorStats {
  reviewsCoordinating: {
    total: number;
    scheduled: number;
    inProgress: number;
    completed: number;
  };
  pendingTeamAssignments: number;
  findingsAwaitingReview: number;
  capsRequiringAttention: {
    overdue: number;
    pendingVerification: number;
  };
}

interface ReviewerStats {
  assignedReviews: {
    upcoming: number;
    inProgress: number;
    completed: number;
  };
  findingsRaised: {
    open: number;
    closed: number;
  };
  availabilityStatus: string;
}

interface AnspStats {
  assessments: {
    draft: number;
    submitted: number;
    underReview: number;
    completed: number;
  };
  latestEIScore: number | null;
  eiScoreTrend: number | null;
  eiStatus: "preliminary" | "validated" | null;
  eiAssessmentTitle: string | null;
  peerReviews: {
    asHost: number;
    findingsCount: number;
    openCaps: number;
  };
  capsByStatus: Record<string, number>;
  overdueCaps: number;
}

interface LimitedStats {
  submittedAssessments: number;
  trainingModulesAvailable: number;
}

type DashboardStats =
  | { role: "PROGRAMME_ADMIN"; stats: ProgrammeStats }
  | { role: "COORDINATOR"; stats: CoordinatorStats }
  | { role: "REVIEWER"; stats: ReviewerStats }
  | { role: "ANSP"; stats: AnspStats }
  | { role: "LIMITED"; stats: LimitedStats };

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  entityId?: string;
  entityType?: string;
}

interface QuickAction {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  href: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getRoleCategory(role: UserRole): "PROGRAMME_ADMIN" | "COORDINATOR" | "REVIEWER" | "ANSP" | "LIMITED" {
  if (PROGRAMME_ADMIN_ROLES.includes(role)) return "PROGRAMME_ADMIN";
  if (COORDINATOR_ROLES.includes(role)) return "COORDINATOR";
  if (REVIEWER_ROLES.includes(role)) return "REVIEWER";
  if (ANSP_ROLES.includes(role)) return "ANSP";
  return "LIMITED";
}

// =============================================================================
// ROUTER
// =============================================================================

export const dashboardRouter = router({
  /**
   * Get role-based dashboard statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }): Promise<DashboardStats> => {
    const { db, user } = ctx;
    const userRole = user.role;
    const userId = user.id;
    const organizationId = user.organizationId;
    const roleCategory = getRoleCategory(userRole);

    // =========================================================================
    // PROGRAMME ADMIN STATS
    // =========================================================================
    if (roleCategory === "PROGRAMME_ADMIN") {
      const [
        totalAnsps,
        activeParticipants,
        totalAssessments,
        totalReviews,
        openFindings,
        overdueCaps,
        eiScores,
        pendingJoinRequests,
      ] = await Promise.all([
        // Total ANSPs (all organizations)
        db.organization.count(),
        // Active participants (users with isActive = true)
        db.user.count({
          where: { isActive: true },
        }),
        // Total assessments
        db.assessment.count(),
        // Total reviews
        db.review.count(),
        // Open findings by severity
        db.finding.groupBy({
          by: ["severity"],
          where: {
            status: { notIn: ["CLOSED", "DEFERRED"] },
          },
          _count: true,
        }),
        // Overdue CAPs
        db.correctiveActionPlan.count({
          where: {
            status: { notIn: ["COMPLETED", "VERIFIED", "CLOSED"] },
            dueDate: { lt: new Date() },
          },
        }),
        // Average EI score (from completed assessments)
        db.assessment.aggregate({
          where: {
            status: "COMPLETED",
            eiScore: { not: null },
          },
          _avg: { eiScore: true },
        }),
        // Pending join requests
        db.joinRequest.count({
          where: { status: "PENDING" },
        }),
      ]);

      // Transform findings by severity
      const openFindingsBySeverity: Record<FindingSeverity, number> = {
        CRITICAL: 0,
        MAJOR: 0,
        MINOR: 0,
        OBSERVATION: 0,
      };
      openFindings.forEach((f: { severity: FindingSeverity; _count: number }) => {
        openFindingsBySeverity[f.severity] = f._count;
      });

      return {
        role: "PROGRAMME_ADMIN",
        stats: {
          totalAnsps,
          activeParticipants,
          totalAssessments,
          totalReviews,
          openFindingsBySeverity,
          overdueCaps,
          averageEIScore: eiScores._avg.eiScore,
          pendingJoinRequests,
        },
      };
    }

    // =========================================================================
    // COORDINATOR STATS
    // =========================================================================
    if (roleCategory === "COORDINATOR") {
      const [
        reviewStats,
        pendingTeamAssignments,
        findingsAwaitingReview,
        overdueCaps,
        pendingVerificationCaps,
      ] = await Promise.all([
        // Reviews by status (coordinator sees all)
        db.review.groupBy({
          by: ["status"],
          _count: true,
        }),
        // Reviews without team leads assigned
        db.review.count({
          where: {
            status: { in: ["APPROVED", "PLANNING"] },
            teamMembers: {
              none: { role: "LEAD_REVIEWER" },
            },
          },
        }),
        // Findings awaiting review (OPEN status)
        db.finding.count({
          where: {
            status: "OPEN",
          },
        }),
        // Overdue CAPs
        db.correctiveActionPlan.count({
          where: {
            status: { notIn: ["COMPLETED", "VERIFIED", "CLOSED"] },
            dueDate: { lt: new Date() },
          },
        }),
        // CAPs pending verification (COMPLETED but not VERIFIED)
        db.correctiveActionPlan.count({
          where: {
            status: "COMPLETED",
          },
        }),
      ]);

      // Transform review stats
      const reviewsCoordinating = {
        total: 0,
        scheduled: 0,
        inProgress: 0,
        completed: 0,
      };

      reviewStats.forEach((r: { status: string; _count: number }) => {
        reviewsCoordinating.total += r._count;
        if (["APPROVED", "PLANNING"].includes(r.status)) {
          reviewsCoordinating.scheduled += r._count;
        } else if (["IN_PROGRESS", "REPORT_DRAFTING", "REPORT_REVIEW"].includes(r.status)) {
          reviewsCoordinating.inProgress += r._count;
        } else if (r.status === "COMPLETED") {
          reviewsCoordinating.completed += r._count;
        }
      });

      return {
        role: "COORDINATOR",
        stats: {
          reviewsCoordinating,
          pendingTeamAssignments,
          findingsAwaitingReview,
          capsRequiringAttention: {
            overdue: overdueCaps,
            pendingVerification: pendingVerificationCaps,
          },
        },
      };
    }

    // =========================================================================
    // REVIEWER STATS
    // =========================================================================
    if (roleCategory === "REVIEWER") {
      // Get reviewer profile with team assignments
      const reviewerProfile = await db.reviewerProfile.findUnique({
        where: { userId },
        include: {
          teamAssignments: {
            include: {
              review: true,
            },
          },
        },
      });

      // Default stats if no profile
      if (!reviewerProfile) {
        return {
          role: "REVIEWER",
          stats: {
            assignedReviews: { upcoming: 0, inProgress: 0, completed: 0 },
            findingsRaised: { open: 0, closed: 0 },
            availabilityStatus: "NOT_REGISTERED",
          },
        };
      }

      // Count reviews by status
      const assignedReviews = { upcoming: 0, inProgress: 0, completed: 0 };
      reviewerProfile.teamAssignments.forEach((assignment) => {
        const status = assignment.review.status;
        if (["APPROVED", "PLANNING"].includes(status)) {
          assignedReviews.upcoming += 1;
        } else if (["IN_PROGRESS", "REPORT_DRAFTING", "REPORT_REVIEW"].includes(status)) {
          assignedReviews.inProgress += 1;
        } else if (status === "COMPLETED") {
          assignedReviews.completed += 1;
        }
      });

      // Get findings count - use organizationId as a proxy since there's no direct "raised by" field
      // For now, just return totals for the reviews the reviewer is assigned to
      const reviewIds = reviewerProfile.teamAssignments.map((a) => a.reviewId);
      const [openFindings, closedFindings] = await Promise.all([
        db.finding.count({
          where: {
            reviewId: { in: reviewIds },
            status: { notIn: ["CLOSED", "DEFERRED"] },
          },
        }),
        db.finding.count({
          where: {
            reviewId: { in: reviewIds },
            status: "CLOSED",
          },
        }),
      ]);

      // Get availability status
      const availabilityStatus = reviewerProfile.isAvailable ? "AVAILABLE" : "UNAVAILABLE";

      return {
        role: "REVIEWER",
        stats: {
          assignedReviews,
          findingsRaised: { open: openFindings, closed: closedFindings },
          availabilityStatus,
        },
      };
    }

    // =========================================================================
    // ANSP STATS
    // =========================================================================
    if (roleCategory === "ANSP" && organizationId) {
      const [
        assessmentStats,
        latestAssessment,
        previousAssessment,
        reviewsAsHost,
        findingsCount,
        openCaps,
        capsByStatus,
        overdueCaps,
      ] = await Promise.all([
        // Assessments by status
        db.assessment.groupBy({
          by: ["status"],
          where: { organizationId },
          _count: true,
        }),
        // Latest assessment with EI score (SUBMITTED, UNDER_REVIEW, or COMPLETED)
        db.assessment.findFirst({
          where: {
            organizationId,
            status: { in: ["SUBMITTED", "UNDER_REVIEW", "COMPLETED"] },
            eiScore: { not: null },
          },
          orderBy: [
            { submittedAt: "desc" },
            { completedAt: "desc" },
          ],
          select: {
            eiScore: true,
            status: true,
            title: true,
          },
        }),
        // Previous assessment with EI score for trend
        db.assessment.findFirst({
          where: {
            organizationId,
            status: { in: ["SUBMITTED", "UNDER_REVIEW", "COMPLETED"] },
            eiScore: { not: null },
          },
          orderBy: [
            { submittedAt: "desc" },
            { completedAt: "desc" },
          ],
          skip: 1,
          select: {
            eiScore: true,
          },
        }),
        // Reviews where this org is host
        db.review.count({
          where: { hostOrganizationId: organizationId },
        }),
        // Findings for this org's reviews
        db.finding.count({
          where: {
            review: { hostOrganizationId: organizationId },
          },
        }),
        // Open CAPs for this org
        db.correctiveActionPlan.count({
          where: {
            finding: {
              review: { hostOrganizationId: organizationId },
            },
            status: { notIn: ["COMPLETED", "VERIFIED", "CLOSED"] },
          },
        }),
        // CAPs by status
        db.correctiveActionPlan.groupBy({
          by: ["status"],
          where: {
            finding: {
              review: { hostOrganizationId: organizationId },
            },
          },
          _count: true,
        }),
        // Overdue CAPs
        db.correctiveActionPlan.count({
          where: {
            finding: {
              review: { hostOrganizationId: organizationId },
            },
            status: { notIn: ["COMPLETED", "VERIFIED", "CLOSED"] },
            dueDate: { lt: new Date() },
          },
        }),
      ]);

      // Transform assessment stats
      const assessments = { draft: 0, submitted: 0, underReview: 0, completed: 0 };
      assessmentStats.forEach((a: { status: string; _count: number }) => {
        switch (a.status) {
          case "DRAFT":
            assessments.draft = a._count;
            break;
          case "SUBMITTED":
            assessments.submitted = a._count;
            break;
          case "UNDER_REVIEW":
            assessments.underReview = a._count;
            break;
          case "COMPLETED":
            assessments.completed = a._count;
            break;
        }
      });

      // Get EI scores directly from assessment
      const latestEIScore = latestAssessment?.eiScore ?? null;
      const previousEIScore = previousAssessment?.eiScore ?? null;
      const eiScoreTrend =
        latestEIScore !== null && previousEIScore !== null
          ? latestEIScore - previousEIScore
          : null;
      // Determine if EI is preliminary (SUBMITTED/UNDER_REVIEW) or validated (COMPLETED)
      const eiStatus: "preliminary" | "validated" | null = latestAssessment
        ? latestAssessment.status === "COMPLETED"
          ? "validated"
          : "preliminary"
        : null;
      const eiAssessmentTitle = latestAssessment?.title ?? null;

      // Transform CAPs by status
      const capsStatusMap: Record<string, number> = {};
      capsByStatus.forEach((c: { status: string; _count: number }) => {
        capsStatusMap[c.status] = c._count;
      });

      return {
        role: "ANSP",
        stats: {
          assessments,
          latestEIScore,
          eiScoreTrend,
          eiStatus,
          eiAssessmentTitle,
          peerReviews: {
            asHost: reviewsAsHost,
            findingsCount,
            openCaps,
          },
          capsByStatus: capsStatusMap,
          overdueCaps,
        },
      };
    }

    // =========================================================================
    // LIMITED STATS (STAFF / OBSERVER)
    // =========================================================================
    const [submittedAssessments, trainingModules] = await Promise.all([
      organizationId
        ? db.assessment.count({
            where: {
              organizationId,
              status: { in: ["SUBMITTED", "UNDER_REVIEW", "COMPLETED"] },
            },
          })
        : Promise.resolve(0),
      db.trainingModule.count(),
    ]);

    return {
      role: "LIMITED",
      stats: {
        submittedAssessments,
        trainingModulesAvailable: trainingModules,
      },
    };
  }),

  /**
   * Get recent activity relevant to user's role and organization
   */
  getRecentActivity: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(10),
      }).optional()
    )
    .query(async ({ ctx, input }): Promise<ActivityItem[]> => {
      const { db, user } = ctx;
      const limit = input?.limit ?? 10;
      const organizationId = user.organizationId;
      const roleCategory = getRoleCategory(user.role);

      const activities: ActivityItem[] = [];

      // For admin/coordinator - show programme-wide activity
      if (roleCategory === "PROGRAMME_ADMIN" || roleCategory === "COORDINATOR") {
        // Recent assessments submitted
        const recentAssessments = await db.assessment.findMany({
          where: { status: "SUBMITTED" },
          orderBy: { submittedAt: "desc" },
          take: 5,
          include: {
            organization: { select: { nameEn: true, organizationCode: true } },
          },
        });

        recentAssessments.forEach((a) => {
          activities.push({
            id: `assessment-${a.id}`,
            type: "assessment_submitted",
            title: `Assessment submitted`,
            description: `${a.organization.nameEn} (${a.organization.organizationCode || "N/A"})`,
            timestamp: a.submittedAt || a.updatedAt,
            entityId: a.id,
            entityType: "assessment",
          });
        });

        // Recent reviews scheduled
        const recentReviews = await db.review.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            hostOrganization: { select: { nameEn: true, organizationCode: true } },
          },
        });

        recentReviews.forEach((r) => {
          activities.push({
            id: `review-${r.id}`,
            type: "review_scheduled",
            title: `Review ${r.status.toLowerCase().replace("_", " ")}`,
            description: `${r.hostOrganization.nameEn} - ${r.referenceNumber}`,
            timestamp: r.createdAt,
            entityId: r.id,
            entityType: "review",
          });
        });

        // Recent findings
        const recentFindings = await db.finding.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            review: {
              include: {
                hostOrganization: { select: { nameEn: true } },
              },
            },
          },
        });

        recentFindings.forEach((f) => {
          activities.push({
            id: `finding-${f.id}`,
            type: "finding_created",
            title: `${f.severity} finding raised`,
            description: f.review.hostOrganization.nameEn,
            timestamp: f.createdAt,
            entityId: f.id,
            entityType: "finding",
          });
        });
      }

      // For ANSP roles - show org-specific activity
      if ((roleCategory === "ANSP" || roleCategory === "LIMITED") && organizationId) {
        // Own assessments activity
        const orgAssessments = await db.assessment.findMany({
          where: { organizationId },
          orderBy: { updatedAt: "desc" },
          take: 5,
        });

        orgAssessments.forEach((a) => {
          activities.push({
            id: `assessment-${a.id}`,
            type: "assessment_updated",
            title: `Assessment ${a.status.toLowerCase().replace("_", " ")}`,
            description: a.referenceNumber || "Self-assessment",
            timestamp: a.updatedAt,
            entityId: a.id,
            entityType: "assessment",
          });
        });

        // Reviews where org is host
        const orgReviews = await db.review.findMany({
          where: { hostOrganizationId: organizationId },
          orderBy: { updatedAt: "desc" },
          take: 5,
        });

        orgReviews.forEach((r) => {
          activities.push({
            id: `review-${r.id}`,
            type: "review_status_changed",
            title: `Peer review ${r.status.toLowerCase().replace("_", " ")}`,
            description: r.referenceNumber,
            timestamp: r.updatedAt,
            entityId: r.id,
            entityType: "review",
          });
        });

        // CAP updates
        const orgCaps = await db.correctiveActionPlan.findMany({
          where: {
            finding: {
              review: { hostOrganizationId: organizationId },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 5,
          include: {
            finding: { select: { referenceNumber: true } },
          },
        });

        orgCaps.forEach((c) => {
          activities.push({
            id: `cap-${c.id}`,
            type: "cap_status_changed",
            title: `CAP ${c.status.toLowerCase().replace("_", " ")}`,
            description: c.finding.referenceNumber,
            timestamp: c.updatedAt,
            entityId: c.id,
            entityType: "cap",
          });
        });
      }

      // For reviewers - show assigned review activity
      if (roleCategory === "REVIEWER") {
        const reviewerProfile = await db.reviewerProfile.findUnique({
          where: { userId: user.id },
        });

        if (reviewerProfile) {
          const reviewMemberships = await db.reviewTeamMember.findMany({
            where: { reviewerProfileId: reviewerProfile.id },
            include: {
              review: {
                include: {
                  hostOrganization: { select: { nameEn: true } },
                },
              },
            },
            orderBy: { review: { updatedAt: "desc" } },
            take: 5,
          });

          reviewMemberships.forEach((m) => {
            activities.push({
              id: `review-${m.review.id}`,
              type: "review_assigned",
              title: `Assigned to review`,
              description: `${m.review.hostOrganization.nameEn} - ${m.review.referenceNumber}`,
              timestamp: m.review.updatedAt,
              entityId: m.review.id,
              entityType: "review",
            });
          });
        }
      }

      // Sort by timestamp and limit
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    }),

  /**
   * Get role-appropriate quick actions
   */
  getQuickActions: protectedProcedure.query(async ({ ctx }): Promise<QuickAction[]> => {
    const { user } = ctx;
    const roleCategory = getRoleCategory(user.role);
    const actions: QuickAction[] = [];

    // Programme Admin actions
    if (roleCategory === "PROGRAMME_ADMIN") {
      actions.push(
        {
          id: "manage-organizations",
          titleKey: "manageOrganizations",
          descriptionKey: "manageOrganizationsDesc",
          icon: "Building2",
          href: "/organizations",
        },
        {
          id: "view-analytics",
          titleKey: "viewAnalytics",
          descriptionKey: "viewAnalyticsDesc",
          icon: "BarChart3",
          href: "/analytics",
        },
        {
          id: "system-settings",
          titleKey: "systemSettings",
          descriptionKey: "systemSettingsDesc",
          icon: "Settings",
          href: "/settings",
        },
        {
          id: "manage-users",
          titleKey: "manageUsers",
          descriptionKey: "manageUsersDesc",
          icon: "Users",
          href: "/admin/users",
        }
      );
    }

    // Coordinator actions
    if (roleCategory === "COORDINATOR") {
      actions.push(
        {
          id: "assign-teams",
          titleKey: "assignTeams",
          descriptionKey: "assignTeamsDesc",
          icon: "Users",
          href: "/reviews?filter=pending-team",
        },
        {
          id: "review-findings",
          titleKey: "reviewFindings",
          descriptionKey: "reviewFindingsDesc",
          icon: "Search",
          href: "/findings",
        },
        {
          id: "generate-reports",
          titleKey: "generateReports",
          descriptionKey: "generateReportsDesc",
          icon: "FileText",
          href: "/reports",
        },
        {
          id: "schedule-review",
          titleKey: "scheduleReview",
          descriptionKey: "scheduleReviewDesc",
          icon: "Calendar",
          href: "/reviews/new",
        }
      );
    }

    // Reviewer actions
    if (roleCategory === "REVIEWER") {
      actions.push(
        {
          id: "my-reviews",
          titleKey: "myReviews",
          descriptionKey: "myReviewsDesc",
          icon: "ClipboardCheck",
          href: "/reviews?filter=my-reviews",
        },
        {
          id: "update-availability",
          titleKey: "updateAvailability",
          descriptionKey: "updateAvailabilityDesc",
          icon: "Calendar",
          href: "/reviewers/profile",
        },
        {
          id: "training",
          titleKey: "training",
          descriptionKey: "trainingDesc",
          icon: "GraduationCap",
          href: "/training",
        }
      );
    }

    // ANSP actions
    if (roleCategory === "ANSP") {
      actions.push(
        {
          id: "start-assessment",
          titleKey: "startAssessment",
          descriptionKey: "startAssessmentDesc",
          icon: "FileText",
          href: "/assessments/new",
        },
        {
          id: "view-findings",
          titleKey: "viewFindings",
          descriptionKey: "viewFindingsDesc",
          icon: "AlertTriangle",
          href: "/findings",
        },
        {
          id: "manage-caps",
          titleKey: "manageCaps",
          descriptionKey: "manageCapsDesc",
          icon: "ClipboardList",
          href: "/caps",
        },
        {
          id: "organization-profile",
          titleKey: "organizationProfile",
          descriptionKey: "organizationProfileDesc",
          icon: "Building2",
          href: "/organization",
        }
      );
    }

    // Limited role actions
    if (roleCategory === "LIMITED") {
      actions.push(
        {
          id: "view-assessments",
          titleKey: "viewAssessments",
          descriptionKey: "viewAssessmentsDesc",
          icon: "FileText",
          href: "/assessments",
        },
        {
          id: "training",
          titleKey: "training",
          descriptionKey: "trainingDesc",
          icon: "GraduationCap",
          href: "/training",
        }
      );
    }

    return actions;
  }),
});

export default dashboardRouter;
