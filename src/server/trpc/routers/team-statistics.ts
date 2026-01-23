/**
 * Team Statistics Router
 *
 * tRPC router for team-level statistics and metrics.
 * Provides endpoints for team performance dashboards and comparisons.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import {
  getTeamStatistics,
  getAllTeamsStatistics,
  getTeamStatisticsForOrganization,
  getTeamStatisticsByNumber,
  compareTeams,
  getTeamLeaderboard,
} from "@/server/services/team-statistics";
import { UserRole } from "@prisma/client";

// =============================================================================
// ROLE DEFINITIONS
// =============================================================================

/** Roles that can view all teams' statistics */
const COORDINATOR_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.SYSTEM_ADMIN,
  UserRole.PROGRAMME_COORDINATOR,
  UserRole.STEERING_COMMITTEE,
];

/** Roles that can view their own team's statistics */
const TEAM_VIEWER_ROLES: UserRole[] = [
  ...COORDINATOR_ROLES,
  UserRole.LEAD_REVIEWER,
  UserRole.PEER_REVIEWER,
  UserRole.ANSP_ADMIN,
  UserRole.SAFETY_MANAGER,
  UserRole.QUALITY_MANAGER,
];

// =============================================================================
// ROUTER
// =============================================================================

export const teamStatisticsRouter = router({
  /**
   * Get statistics for a specific team by ID
   */
  getByTeamId: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Coordinators can view any team
      if (COORDINATOR_ROLES.includes(ctx.session.user.role as UserRole)) {
        return getTeamStatistics(input.teamId);
      }

      // Others can only view their own team
      const orgId = ctx.session.user.organizationId;
      if (!orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must belong to an organization to view team statistics",
        });
      }

      const myTeamStats = await getTeamStatisticsForOrganization(orgId);
      if (!myTeamStats || myTeamStats.teamId !== input.teamId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only view your own team's statistics",
        });
      }

      return myTeamStats;
    }),

  /**
   * Get statistics for a specific team by team number
   */
  getByTeamNumber: protectedProcedure
    .input(z.object({ teamNumber: z.number().min(1).max(10) }))
    .query(async ({ ctx, input }) => {
      const stats = await getTeamStatisticsByNumber(input.teamNumber);

      if (!stats) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Team ${input.teamNumber} not found`,
        });
      }

      // Coordinators can view any team
      if (COORDINATOR_ROLES.includes(ctx.session.user.role as UserRole)) {
        return stats;
      }

      // Others can only view their own team
      const orgId = ctx.session.user.organizationId;
      if (!orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must belong to an organization to view team statistics",
        });
      }

      const myTeamStats = await getTeamStatisticsForOrganization(orgId);
      if (!myTeamStats || myTeamStats.teamNumber !== input.teamNumber) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only view your own team's statistics",
        });
      }

      return stats;
    }),

  /**
   * Get all teams' statistics (coordinators only)
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    if (!COORDINATOR_ROLES.includes(ctx.session.user.role as UserRole)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only coordinators and steering committee can view all teams",
      });
    }

    return getAllTeamsStatistics();
  }),

  /**
   * Get my team's statistics
   */
  getMyTeam: protectedProcedure.query(async ({ ctx }) => {
    if (!TEAM_VIEWER_ROLES.includes(ctx.session.user.role as UserRole)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to view team statistics",
      });
    }

    const orgId = ctx.session.user.organizationId;
    if (!orgId) {
      return null;
    }

    return getTeamStatisticsForOrganization(orgId);
  }),

  /**
   * Compare multiple teams (coordinators only)
   */
  compareTeams: protectedProcedure
    .input(
      z.object({
        teamIds: z.array(z.string()).min(2, "At least 2 teams required").max(5, "Maximum 5 teams"),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!COORDINATOR_ROLES.includes(ctx.session.user.role as UserRole)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only coordinators can compare teams",
        });
      }

      return compareTeams(input.teamIds);
    }),

  /**
   * Get team leaderboard
   */
  getLeaderboard: protectedProcedure.query(async ({ ctx }) => {
    // Allow coordinators to see full leaderboard
    // Others can see the leaderboard but with limited details
    const isCoordinator = COORDINATOR_ROLES.includes(
      ctx.session.user.role as UserRole
    );

    const leaderboard = await getTeamLeaderboard();

    if (isCoordinator) {
      return leaderboard;
    }

    // For non-coordinators, only show their team's position highlighted
    const orgId = ctx.session.user.organizationId;
    if (!orgId) {
      return leaderboard;
    }

    const myTeamStats = await getTeamStatisticsForOrganization(orgId);
    const myTeamId = myTeamStats?.teamId;

    return leaderboard.map((team) => ({
      ...team,
      isMyTeam: team.teamId === myTeamId,
    }));
  }),

  /**
   * Get summary statistics for dashboard widgets
   */
  getDashboardSummary: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session.user.organizationId;
    const isCoordinator = COORDINATOR_ROLES.includes(
      ctx.session.user.role as UserRole
    );

    if (isCoordinator) {
      // Coordinators see programme-wide summary
      const allTeams = await getAllTeamsStatistics();

      return {
        type: "programme" as const,
        totalTeams: allTeams.length,
        totalOrganizations: allTeams.reduce(
          (sum, t) => sum + t.organizationCount,
          0
        ),
        totalReviewers: allTeams.reduce((sum, t) => sum + t.reviewerCount, 0),
        availableReviewers: allTeams.reduce(
          (sum, t) => sum + t.availableReviewerCount,
          0
        ),
        totalReviews: allTeams.reduce((sum, t) => sum + t.totalReviews, 0),
        reviewsCompleted: allTeams.reduce(
          (sum, t) => sum + t.reviewsCompleted,
          0
        ),
        reviewsInProgress: allTeams.reduce(
          (sum, t) => sum + t.reviewsInProgress,
          0
        ),
        totalFindings: allTeams.reduce((sum, t) => sum + t.totalFindings, 0),
        openFindings: allTeams.reduce((sum, t) => sum + t.openFindings, 0),
        totalCAPs: allTeams.reduce((sum, t) => sum + t.totalCAPs, 0),
        overdueCAPs: allTeams.reduce((sum, t) => sum + t.overdueCAPs, 0),
        avgCapClosureRate:
          allTeams.length > 0
            ? Math.round(
                (allTeams.reduce((sum, t) => sum + t.capClosureRate, 0) /
                  allTeams.length) *
                  10
              ) / 10
            : 0,
        topPerformingTeam:
          allTeams.length > 0
            ? allTeams.reduce((best, t) =>
                t.participationScore < best.participationScore ? t : best
              )
            : null,
      };
    }

    // Non-coordinators see their team's summary
    if (!orgId) {
      return null;
    }

    const myTeamStats = await getTeamStatisticsForOrganization(orgId);
    if (!myTeamStats) {
      return null;
    }

    return {
      type: "team" as const,
      teamId: myTeamStats.teamId,
      teamName: myTeamStats.teamName,
      teamNumber: myTeamStats.teamNumber,
      participationScore: myTeamStats.participationScore,
      organizationCount: myTeamStats.organizationCount,
      reviewerCount: myTeamStats.reviewerCount,
      availableReviewers: myTeamStats.availableReviewerCount,
      reviewsCompleted: myTeamStats.reviewsCompleted,
      reviewsInProgress: myTeamStats.reviewsInProgress,
      totalFindings: myTeamStats.totalFindings,
      openFindings: myTeamStats.openFindings,
      totalCAPs: myTeamStats.totalCAPs,
      overdueCAPs: myTeamStats.overdueCAPs,
      capClosureRate: myTeamStats.capClosureRate,
    };
  }),
});
