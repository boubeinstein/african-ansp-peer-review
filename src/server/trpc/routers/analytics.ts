/**
 * Analytics Router - Programme Coordinator Dashboard
 *
 * Provides comprehensive analytics and metrics for programme oversight:
 * - Review statistics and trends
 * - Finding statistics and distribution
 * - CAP statistics and tracking
 * - Team performance metrics
 */

import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { FindingSeverity, ReviewStatus, CAPStatus, FindingType } from "@prisma/client";
import { subMonths, startOfMonth, endOfMonth, differenceInDays } from "date-fns";

// =============================================================================
// TYPES
// =============================================================================

interface ReviewStatusCount {
  status: ReviewStatus;
  count: number;
}

interface ReviewsByMonth {
  month: string;
  year: number;
  count: number;
}

interface ReviewStatistics {
  total: number;
  byStatus: ReviewStatusCount[];
  byOrganization: { organizationId: string; organizationName: string; count: number }[];
  averageDurationDays: number | null;
  reviewsByMonth: ReviewsByMonth[];
}

interface FindingsByArea {
  area: string;
  count: number;
  critical: number;
  major: number;
  minor: number;
  observation: number;
}

interface FindingsByMonth {
  month: string;
  year: number;
  total: number;
  critical: number;
  major: number;
  minor: number;
  observation: number;
}

interface FindingStatistics {
  total: number;
  bySeverity: { severity: FindingSeverity; count: number }[];
  byType: { type: FindingType; count: number }[];
  byArea: FindingsByArea[];
  trends: FindingsByMonth[];
  closedCount: number;
  openCount: number;
  averageResolutionDays: number | null;
}

interface CAPStatusCount {
  status: CAPStatus;
  count: number;
}

interface OverdueCAP {
  id: string;
  findingReference: string;
  findingTitle: string;
  organizationName: string;
  dueDate: Date;
  daysOverdue: number;
  status: CAPStatus;
}

interface CAPStatistics {
  total: number;
  byStatus: CAPStatusCount[];
  overdueCount: number;
  overdueCaps: OverdueCAP[];
  averageClosureTimeDays: number | null;
  completionRate: number;
  pendingVerification: number;
}

interface ReviewerPerformance {
  reviewerId: string;
  reviewerName: string;
  organizationName: string;
  reviewsCompleted: number;
  reviewsInProgress: number;
  findingsRaised: number;
  isAvailable: boolean;
}

interface TeamPerformance {
  totalReviewers: number;
  availableReviewers: number;
  reviewerPerformance: ReviewerPerformance[];
  averageFindingsPerReview: number | null;
  averageReviewsPerReviewer: number | null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getMonthName(monthIndex: number): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return months[monthIndex] || "Unknown";
}

// =============================================================================
// ROUTER
// =============================================================================

export const analyticsRouter = router({
  /**
   * Get comprehensive review statistics
   */
  getReviewStatistics: adminProcedure
    .input(
      z.object({
        months: z.number().min(1).max(24).default(12),
      }).optional()
    )
    .query(async ({ ctx }): Promise<ReviewStatistics> => {
      const { db } = ctx;

      // Get total reviews
      const total = await db.review.count();

      // Get reviews by status
      const reviewsByStatus = await db.review.groupBy({
        by: ["status"],
        _count: true,
      });

      const byStatus: ReviewStatusCount[] = reviewsByStatus.map(
        (r: { status: ReviewStatus; _count: number }) => ({
          status: r.status,
          count: r._count,
        })
      );

      // Get reviews by organization
      const reviewsByOrg = await db.review.groupBy({
        by: ["hostOrganizationId"],
        _count: true,
        orderBy: { _count: { hostOrganizationId: "desc" } },
        take: 10,
      });

      const orgIds = reviewsByOrg.map((r: { hostOrganizationId: string }) => r.hostOrganizationId);
      const organizations = await db.organization.findMany({
        where: { id: { in: orgIds } },
        select: { id: true, nameEn: true },
      });

      const orgMap = new Map(organizations.map((o: { id: string; nameEn: string }) => [o.id, o.nameEn]));

      const byOrganization = reviewsByOrg.map(
        (r: { hostOrganizationId: string; _count: number }) => ({
          organizationId: r.hostOrganizationId,
          organizationName: orgMap.get(r.hostOrganizationId) || "Unknown",
          count: r._count,
        })
      );

      // Calculate average review duration (for completed reviews)
      const completedReviews = await db.review.findMany({
        where: {
          status: "COMPLETED",
          actualStartDate: { not: null },
          actualEndDate: { not: null },
        },
        select: {
          actualStartDate: true,
          actualEndDate: true,
        },
      });

      let averageDurationDays: number | null = null;
      if (completedReviews.length > 0) {
        const totalDays = completedReviews.reduce((sum, r) => {
          if (r.actualStartDate && r.actualEndDate) {
            return sum + differenceInDays(r.actualEndDate, r.actualStartDate);
          }
          return sum;
        }, 0);
        averageDurationDays = Math.round(totalDays / completedReviews.length);
      }

      // Get reviews by month (trend)
      const monthsToFetch = 12;
      const reviewsByMonth: ReviewsByMonth[] = [];
      for (let i = 0; i < monthsToFetch; i++) {
        const monthDate = subMonths(new Date(), monthsToFetch - 1 - i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const count = await db.review.count({
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        });

        reviewsByMonth.push({
          month: getMonthName(monthDate.getMonth()),
          year: monthDate.getFullYear(),
          count,
        });
      }

      return {
        total,
        byStatus,
        byOrganization,
        averageDurationDays,
        reviewsByMonth,
      };
    }),

  /**
   * Get comprehensive finding statistics
   */
  getFindingStatistics: adminProcedure
    .input(
      z.object({
        months: z.number().min(1).max(24).default(12),
      }).optional()
    )
    .query(async ({ ctx, input }): Promise<FindingStatistics> => {
      const { db } = ctx;
      const monthsToFetch = input?.months ?? 12;

      // Get total findings
      const total = await db.finding.count();

      // Get findings by severity
      const findingsBySeverity = await db.finding.groupBy({
        by: ["severity"],
        _count: true,
      });

      const bySeverity = findingsBySeverity.map(
        (f: { severity: FindingSeverity; _count: number }) => ({
          severity: f.severity,
          count: f._count,
        })
      );

      // Get findings by type
      const findingsByType = await db.finding.groupBy({
        by: ["findingType"],
        _count: true,
      });

      const byType = findingsByType.map(
        (f: { findingType: FindingType; _count: number }) => ({
          type: f.findingType,
          count: f._count,
        })
      );

      // Get findings by review area (prefer finding.reviewArea, fall back to review.areasInScope)
      const findingsWithReview = await db.finding.findMany({
        select: {
          reviewArea: true,
          severity: true,
          review: {
            select: { areasInScope: true },
          },
        },
      });

      const areaMap = new Map<string, FindingsByArea>();
      findingsWithReview.forEach((f) => {
        const area = f.reviewArea || f.review.areasInScope[0] || "General";
        if (!areaMap.has(area)) {
          areaMap.set(area, {
            area,
            count: 0,
            critical: 0,
            major: 0,
            minor: 0,
            observation: 0,
          });
        }
        const areaStats = areaMap.get(area)!;
        areaStats.count++;
        switch (f.severity) {
          case "CRITICAL":
            areaStats.critical++;
            break;
          case "MAJOR":
            areaStats.major++;
            break;
          case "MINOR":
            areaStats.minor++;
            break;
          case "OBSERVATION":
            areaStats.observation++;
            break;
        }
      });

      const byArea = Array.from(areaMap.values()).sort((a, b) => b.count - a.count);

      // Get finding trends by month
      const trends: FindingsByMonth[] = [];
      for (let i = 0; i < monthsToFetch; i++) {
        const monthDate = subMonths(new Date(), monthsToFetch - 1 - i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const monthFindings = await db.finding.groupBy({
          by: ["severity"],
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          _count: true,
        });

        const monthData: FindingsByMonth = {
          month: getMonthName(monthDate.getMonth()),
          year: monthDate.getFullYear(),
          total: 0,
          critical: 0,
          major: 0,
          minor: 0,
          observation: 0,
        };

        monthFindings.forEach((f: { severity: FindingSeverity; _count: number }) => {
          monthData.total += f._count;
          switch (f.severity) {
            case "CRITICAL":
              monthData.critical = f._count;
              break;
            case "MAJOR":
              monthData.major = f._count;
              break;
            case "MINOR":
              monthData.minor = f._count;
              break;
            case "OBSERVATION":
              monthData.observation = f._count;
              break;
          }
        });

        trends.push(monthData);
      }

      // Get open/closed counts
      const openCount = await db.finding.count({
        where: {
          status: { notIn: ["CLOSED", "DEFERRED"] },
        },
      });

      const closedCount = await db.finding.count({
        where: { status: "CLOSED" },
      });

      // Calculate average resolution time
      const closedFindings = await db.finding.findMany({
        where: {
          status: "CLOSED",
          closedAt: { not: null },
        },
        select: {
          identifiedAt: true,
          closedAt: true,
        },
      });

      let averageResolutionDays: number | null = null;
      if (closedFindings.length > 0) {
        const totalDays = closedFindings.reduce((sum, f) => {
          if (f.closedAt) {
            return sum + differenceInDays(f.closedAt, f.identifiedAt);
          }
          return sum;
        }, 0);
        averageResolutionDays = Math.round(totalDays / closedFindings.length);
      }

      return {
        total,
        bySeverity,
        byType,
        byArea,
        trends,
        openCount,
        closedCount,
        averageResolutionDays,
      };
    }),

  /**
   * Get comprehensive CAP statistics
   */
  getCAPStatistics: adminProcedure.query(async ({ ctx }): Promise<CAPStatistics> => {
    const { db } = ctx;
    const now = new Date();

    // Get total CAPs
    const total = await db.correctiveActionPlan.count();

    // Get CAPs by status
    const capsByStatus = await db.correctiveActionPlan.groupBy({
      by: ["status"],
      _count: true,
    });

    const byStatus: CAPStatusCount[] = capsByStatus.map(
      (c: { status: CAPStatus; _count: number }) => ({
        status: c.status,
        count: c._count,
      })
    );

    // Get overdue CAPs
    const overdueCapRecords = await db.correctiveActionPlan.findMany({
      where: {
        status: { notIn: ["COMPLETED", "VERIFIED", "CLOSED"] },
        dueDate: { lt: now },
      },
      include: {
        finding: {
          include: {
            review: {
              include: {
                hostOrganization: {
                  select: { nameEn: true },
                },
              },
            },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const overdueCaps: OverdueCAP[] = overdueCapRecords.map((c) => ({
      id: c.id,
      findingReference: c.finding.referenceNumber,
      findingTitle: c.finding.titleEn,
      organizationName: c.finding.review.hostOrganization.nameEn,
      dueDate: c.dueDate,
      daysOverdue: differenceInDays(now, c.dueDate),
      status: c.status,
    }));

    // Calculate average closure time
    const closedCaps = await db.correctiveActionPlan.findMany({
      where: {
        status: { in: ["VERIFIED", "CLOSED"] },
        closedAt: { not: null },
      },
      select: {
        createdAt: true,
        closedAt: true,
      },
    });

    let averageClosureTimeDays: number | null = null;
    if (closedCaps.length > 0) {
      const totalDays = closedCaps.reduce((sum, c) => {
        if (c.closedAt) {
          return sum + differenceInDays(c.closedAt, c.createdAt);
        }
        return sum;
      }, 0);
      averageClosureTimeDays = Math.round(totalDays / closedCaps.length);
    }

    // Calculate completion rate
    const completedOrVerified = await db.correctiveActionPlan.count({
      where: { status: { in: ["COMPLETED", "VERIFIED", "CLOSED"] } },
    });

    const completionRate = total > 0 ? Math.round((completedOrVerified / total) * 100) : 0;

    // Get CAPs pending verification
    const pendingVerification = await db.correctiveActionPlan.count({
      where: { status: "COMPLETED" },
    });

    return {
      total,
      byStatus,
      overdueCount: overdueCapRecords.length,
      overdueCaps,
      averageClosureTimeDays,
      completionRate,
      pendingVerification,
    };
  }),

  /**
   * Get team performance metrics
   */
  getTeamPerformance: adminProcedure.query(async ({ ctx }): Promise<TeamPerformance> => {
    const { db } = ctx;

    // Get all reviewers with their profiles
    const reviewerProfiles = await db.reviewerProfile.findMany({
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
        homeOrganization: {
          select: { nameEn: true },
        },
        teamAssignments: {
          include: {
            review: {
              select: { status: true },
            },
          },
        },
      },
    });

    // Get findings count per reviewer (via their reviews)
    const reviewerPerformance: ReviewerPerformance[] = await Promise.all(
      reviewerProfiles.map(async (profile) => {
        const reviewIds = profile.teamAssignments.map((a) => a.reviewId);

        // Count findings in reviews where this reviewer participated
        const findingsCount = reviewIds.length > 0
          ? await db.finding.count({
              where: { reviewId: { in: reviewIds } },
            })
          : 0;

        // Count completed vs in-progress reviews
        const completedReviews = profile.teamAssignments.filter(
          (a) => a.review.status === "COMPLETED"
        ).length;

        const inProgressReviews = profile.teamAssignments.filter((a) =>
          ["IN_PROGRESS", "REPORT_DRAFTING", "REPORT_REVIEW"].includes(a.review.status)
        ).length;

        return {
          reviewerId: profile.id,
          reviewerName: `${profile.user.firstName || ""} ${profile.user.lastName || ""}`.trim() || "Unknown",
          organizationName: profile.homeOrganization?.nameEn || "Unknown",
          reviewsCompleted: completedReviews,
          reviewsInProgress: inProgressReviews,
          findingsRaised: findingsCount,
          isAvailable: profile.isAvailable,
        };
      })
    );

    // Sort by completed reviews
    reviewerPerformance.sort((a, b) => b.reviewsCompleted - a.reviewsCompleted);

    // Calculate aggregates
    const totalReviewers = reviewerProfiles.length;
    const availableReviewers = reviewerProfiles.filter((p) => p.isAvailable).length;

    // Average findings per review
    const completedReviewsTotal = await db.review.count({
      where: { status: "COMPLETED" },
    });
    const totalFindings = await db.finding.count();
    const averageFindingsPerReview =
      completedReviewsTotal > 0
        ? Math.round((totalFindings / completedReviewsTotal) * 10) / 10
        : null;

    // Average reviews per reviewer
    const averageReviewsPerReviewer =
      totalReviewers > 0
        ? Math.round(
            (reviewerPerformance.reduce((sum, r) => sum + r.reviewsCompleted, 0) /
              totalReviewers) *
              10
          ) / 10
        : null;

    return {
      totalReviewers,
      availableReviewers,
      reviewerPerformance: reviewerPerformance.slice(0, 20), // Top 20 reviewers
      averageFindingsPerReview,
      averageReviewsPerReviewer,
    };
  }),

  /**
   * Get all overdue items requiring attention
   */
  getOverdueItems: adminProcedure.query(async ({ ctx }) => {
    const { db } = ctx;
    const now = new Date();

    // Overdue CAPs
    const overdueCaps = await db.correctiveActionPlan.findMany({
      where: {
        status: { notIn: ["COMPLETED", "VERIFIED", "CLOSED"] },
        dueDate: { lt: now },
      },
      include: {
        finding: {
          include: {
            review: {
              include: {
                hostOrganization: { select: { nameEn: true } },
              },
            },
          },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 20,
    });

    // Reviews past planned end date but not completed
    const overdueReviews = await db.review.findMany({
      where: {
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        plannedEndDate: { lt: now },
      },
      include: {
        hostOrganization: { select: { nameEn: true } },
      },
      orderBy: { plannedEndDate: "asc" },
      take: 10,
    });

    // Findings without CAP that require one
    const findingsWithoutCap = await db.finding.findMany({
      where: {
        capRequired: true,
        correctiveActionPlan: null,
        status: { notIn: ["CLOSED", "DEFERRED"] },
      },
      include: {
        review: {
          include: {
            hostOrganization: { select: { nameEn: true } },
          },
        },
      },
      take: 10,
    });

    return {
      overdueCaps: overdueCaps.map((c) => ({
        id: c.id,
        type: "CAP" as const,
        reference: c.finding.referenceNumber,
        title: c.finding.titleEn,
        organizationName: c.finding.review.hostOrganization.nameEn,
        dueDate: c.dueDate,
        daysOverdue: differenceInDays(now, c.dueDate),
        severity: "HIGH" as const,
      })),
      overdueReviews: overdueReviews.map((r) => ({
        id: r.id,
        type: "REVIEW" as const,
        reference: r.referenceNumber,
        title: `Review for ${r.hostOrganization.nameEn}`,
        organizationName: r.hostOrganization.nameEn,
        dueDate: r.plannedEndDate,
        daysOverdue: r.plannedEndDate ? differenceInDays(now, r.plannedEndDate) : 0,
        severity: "MEDIUM" as const,
      })),
      findingsWithoutCap: findingsWithoutCap.map((f) => ({
        id: f.id,
        type: "FINDING" as const,
        reference: f.referenceNumber,
        title: f.titleEn,
        organizationName: f.review.hostOrganization.nameEn,
        dueDate: f.targetCloseDate,
        daysOverdue: f.targetCloseDate ? differenceInDays(now, f.targetCloseDate) : 0,
        severity: f.severity === "CRITICAL" ? "CRITICAL" as const : "HIGH" as const,
      })),
    };
  }),

  /**
   * Get summary statistics for dashboard cards
   */
  getSummary: adminProcedure.query(async ({ ctx }) => {
    const { db } = ctx;
    const now = new Date();

    const [
      totalReviews,
      activeReviews,
      totalFindings,
      openFindings,
      totalCaps,
      overdueCaps,
      totalReviewers,
      availableReviewers,
    ] = await Promise.all([
      db.review.count(),
      db.review.count({
        where: { status: { in: ["IN_PROGRESS", "REPORT_DRAFTING", "REPORT_REVIEW"] } },
      }),
      db.finding.count(),
      db.finding.count({
        where: { status: { notIn: ["CLOSED", "DEFERRED"] } },
      }),
      db.correctiveActionPlan.count(),
      db.correctiveActionPlan.count({
        where: {
          status: { notIn: ["COMPLETED", "VERIFIED", "CLOSED"] },
          dueDate: { lt: now },
        },
      }),
      db.reviewerProfile.count(),
      db.reviewerProfile.count({ where: { isAvailable: true } }),
    ]);

    return {
      reviews: {
        total: totalReviews,
        active: activeReviews,
      },
      findings: {
        total: totalFindings,
        open: openFindings,
      },
      caps: {
        total: totalCaps,
        overdue: overdueCaps,
      },
      reviewers: {
        total: totalReviewers,
        available: availableReviewers,
      },
    };
  }),
});

export default analyticsRouter;
