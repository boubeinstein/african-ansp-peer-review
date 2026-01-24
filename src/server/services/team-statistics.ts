/**
 * Team Statistics Service
 *
 * Calculates comprehensive team-level metrics for dashboard widgets.
 * Provides insights into team composition, review activity, findings, and CAP performance.
 */

import { prisma } from "@/lib/db";
import {
  ReviewStatus,
  FindingSeverity,
  FindingStatus,
  CAPStatus,
  ReviewerSelectionStatus,
} from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface OrganizationStats {
  id: string;
  name: string;
  organizationCode: string | null;
  country: string;
  isLead: boolean;
  reviewerCount: number;
  reviewsHosted: number;
  reviewsParticipated: number;
}

export interface FindingsBySeverity {
  critical: number;
  major: number;
  minor: number;
  observation: number;
}

export type ParticipationScore = "A+" | "A" | "B+" | "B" | "C" | "D";

export interface TeamStatistics {
  teamId: string;
  teamName: string;
  teamNameFr: string;
  teamNumber: number;
  teamCode: string;
  leadOrganizationId: string | null;
  leadOrganizationName: string | null;

  // Composition
  organizationCount: number;
  reviewerCount: number;
  leadQualifiedCount: number;
  certifiedCount: number;
  availableReviewerCount: number;

  // Review Activity
  reviewsCompleted: number;
  reviewsInProgress: number;
  reviewsScheduled: number;
  reviewsPlanning: number;
  totalReviews: number;

  // Findings & CAPs
  totalFindings: number;
  openFindings: number;
  closedFindings: number;
  findingsBySeverity: FindingsBySeverity;

  // CAP Performance
  totalCAPs: number;
  openCAPs: number;
  closedCAPs: number;
  overdueCAPs: number;
  capClosureRate: number;
  avgCapClosureDays: number | null;

  // Performance Metrics
  avgReviewDurationDays: number | null;
  participationScore: ParticipationScore;

  // Organizations list
  organizations: OrganizationStats[];
}

export interface TeamComparison {
  teams: TeamStatistics[];
  summary: {
    totalOrganizations: number;
    totalReviewers: number;
    totalReviews: number;
    totalFindings: number;
    avgCapClosureRate: number;
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate the average number of days between two dates
 */
function calculateAvgDays(
  records: { startDate: Date | null; endDate: Date | null }[]
): number | null {
  const validRecords = records.filter((r) => r.startDate && r.endDate);
  if (validRecords.length === 0) return null;

  const totalDays = validRecords.reduce((sum, r) => {
    const start = r.startDate!.getTime();
    const end = r.endDate!.getTime();
    return sum + (end - start) / (1000 * 60 * 60 * 24);
  }, 0);

  return Math.round(totalDays / validRecords.length);
}

/**
 * Calculate participation score based on team metrics
 */
function calculateParticipationScore(
  reviewsCompleted: number,
  totalReviews: number,
  capClosureRate: number,
  reviewerCount: number,
  organizationCount: number
): ParticipationScore {
  // Score components (0-100 each)
  const reviewCompletionScore =
    totalReviews > 0 ? (reviewsCompleted / totalReviews) * 100 : 0;
  const capScore = capClosureRate;
  const reviewerDensityScore = Math.min(
    (reviewerCount / (organizationCount * 3)) * 100,
    100
  ); // Target 3 reviewers per org

  // Weighted average
  const totalScore =
    reviewCompletionScore * 0.4 + capScore * 0.4 + reviewerDensityScore * 0.2;

  if (totalScore >= 90) return "A+";
  if (totalScore >= 80) return "A";
  if (totalScore >= 70) return "B+";
  if (totalScore >= 60) return "B";
  if (totalScore >= 50) return "C";
  return "D";
}

// =============================================================================
// MAIN SERVICE FUNCTIONS
// =============================================================================

/**
 * Get comprehensive statistics for a specific team
 */
export async function getTeamStatistics(
  teamId: string
): Promise<TeamStatistics> {
  // Fetch team with all related data
  const team = await prisma.regionalTeam.findUnique({
    where: { id: teamId },
    include: {
      leadOrganization: {
        select: {
          id: true,
          nameEn: true,
        },
      },
      memberOrganizations: {
        include: {
          users: {
            include: {
              reviewerProfile: {
                include: {
                  certifications: true,
                },
              },
            },
          },
          reviewsAsHost: {
            select: {
              id: true,
              status: true,
              actualStartDate: true,
              actualEndDate: true,
              plannedStartDate: true,
              plannedEndDate: true,
            },
          },
          findings: {
            select: {
              id: true,
              severity: true,
              status: true,
              correctiveActionPlan: {
                select: {
                  id: true,
                  status: true,
                  dueDate: true,
                  closedAt: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!team) {
    throw new Error(`Team not found: ${teamId}`);
  }

  const orgIds = team.memberOrganizations.map((o) => o.id);

  // Get all team members for participation count
  const teamMemberships = await prisma.reviewTeamMember.findMany({
    where: {
      user: {
        organizationId: { in: orgIds },
      },
      invitationStatus: "CONFIRMED",
    },
    select: {
      userId: true,
      reviewId: true,
    },
  });

  // Group participations by user
  const userParticipations = new Map<string, Set<string>>();
  teamMemberships.forEach((m) => {
    if (!userParticipations.has(m.userId)) {
      userParticipations.set(m.userId, new Set());
    }
    userParticipations.get(m.userId)!.add(m.reviewId);
  });

  // Calculate composition metrics
  let reviewerCount = 0;
  let leadQualifiedCount = 0;
  let certifiedCount = 0;
  let availableReviewerCount = 0;

  team.memberOrganizations.forEach((org) => {
    org.users.forEach((user) => {
      if (user.reviewerProfile) {
        reviewerCount++;
        if (user.reviewerProfile.isLeadQualified) {
          leadQualifiedCount++;
        }
        if (user.reviewerProfile.certifications.length > 0) {
          certifiedCount++;
        }
        if (
          user.reviewerProfile.isAvailable &&
          user.reviewerProfile.selectionStatus ===
            ReviewerSelectionStatus.SELECTED
        ) {
          availableReviewerCount++;
        }
      }
    });
  });

  // Calculate review metrics
  const allReviews = team.memberOrganizations.flatMap((o) => o.reviewsAsHost);
  const reviewsCompleted = allReviews.filter(
    (r) => r.status === ReviewStatus.COMPLETED
  ).length;
  const reviewsInProgress = allReviews.filter(
    (r) => r.status === ReviewStatus.IN_PROGRESS
  ).length;
  const reviewsScheduled = allReviews.filter(
    (r) => r.status === ReviewStatus.SCHEDULED
  ).length;
  const reviewsPlanning = allReviews.filter(
    (r) =>
      r.status === ReviewStatus.PLANNING || r.status === ReviewStatus.APPROVED
  ).length;

  // Calculate average review duration
  const completedReviewsWithDates = allReviews
    .filter((r) => r.status === ReviewStatus.COMPLETED)
    .map((r) => ({
      startDate: r.actualStartDate,
      endDate: r.actualEndDate,
    }));
  const avgReviewDurationDays = calculateAvgDays(completedReviewsWithDates);

  // Calculate findings metrics
  const allFindings = team.memberOrganizations.flatMap((o) => o.findings);
  const totalFindings = allFindings.length;
  const openFindings = allFindings.filter(
    (f) =>
      f.status !== FindingStatus.CLOSED && f.status !== FindingStatus.DEFERRED
  ).length;
  const closedFindings = allFindings.filter(
    (f) => f.status === FindingStatus.CLOSED
  ).length;

  const findingsBySeverity: FindingsBySeverity = {
    critical: allFindings.filter((f) => f.severity === FindingSeverity.CRITICAL)
      .length,
    major: allFindings.filter((f) => f.severity === FindingSeverity.MAJOR)
      .length,
    minor: allFindings.filter((f) => f.severity === FindingSeverity.MINOR)
      .length,
    observation: allFindings.filter(
      (f) => f.severity === FindingSeverity.OBSERVATION
    ).length,
  };

  // Calculate CAP metrics
  const allCAPs = allFindings
    .map((f) => f.correctiveActionPlan)
    .filter((cap): cap is NonNullable<typeof cap> => cap !== null);

  const totalCAPs = allCAPs.length;
  const closedCAPs = allCAPs.filter(
    (c) => c.status === CAPStatus.CLOSED || c.status === CAPStatus.VERIFIED
  ).length;
  const openCAPs = totalCAPs - closedCAPs;
  const overdueCAPs = allCAPs.filter(
    (c) =>
      c.status !== CAPStatus.CLOSED &&
      c.status !== CAPStatus.VERIFIED &&
      new Date(c.dueDate) < new Date()
  ).length;

  const capClosureRate = totalCAPs > 0 ? (closedCAPs / totalCAPs) * 100 : 0;

  // Calculate average CAP closure days
  const closedCAPsWithDates = allCAPs
    .filter(
      (c) =>
        (c.status === CAPStatus.CLOSED || c.status === CAPStatus.VERIFIED) &&
        c.closedAt
    )
    .map((c) => ({
      startDate: c.createdAt,
      endDate: c.closedAt,
    }));
  const avgCapClosureDays = calculateAvgDays(closedCAPsWithDates);

  // Calculate participation score
  const participationScore = calculateParticipationScore(
    reviewsCompleted,
    allReviews.length,
    capClosureRate,
    reviewerCount,
    team.memberOrganizations.length
  );

  // Build organization stats
  const organizations: OrganizationStats[] = team.memberOrganizations.map(
    (org) => {
      const orgReviewerCount = org.users.filter(
        (u) => u.reviewerProfile
      ).length;

      // Count review participations for this org's users
      let reviewsParticipated = 0;
      org.users.forEach((user) => {
        const participations = userParticipations.get(user.id);
        if (participations) {
          reviewsParticipated += participations.size;
        }
      });

      return {
        id: org.id,
        name: org.nameEn,
        organizationCode: org.organizationCode,
        country: org.country,
        isLead: org.id === team.leadOrganizationId,
        reviewerCount: orgReviewerCount,
        reviewsHosted: org.reviewsAsHost.length,
        reviewsParticipated,
      };
    }
  );

  return {
    teamId: team.id,
    teamName: team.nameEn,
    teamNameFr: team.nameFr,
    teamNumber: team.teamNumber,
    teamCode: team.code,
    leadOrganizationId: team.leadOrganizationId,
    leadOrganizationName: team.leadOrganization?.nameEn || null,

    // Composition
    organizationCount: team.memberOrganizations.length,
    reviewerCount,
    leadQualifiedCount,
    certifiedCount,
    availableReviewerCount,

    // Review Activity
    reviewsCompleted,
    reviewsInProgress,
    reviewsScheduled,
    reviewsPlanning,
    totalReviews: allReviews.length,

    // Findings & CAPs
    totalFindings,
    openFindings,
    closedFindings,
    findingsBySeverity,

    // CAP Performance
    totalCAPs,
    openCAPs,
    closedCAPs,
    overdueCAPs,
    capClosureRate: Math.round(capClosureRate * 10) / 10,
    avgCapClosureDays,

    // Performance Metrics
    avgReviewDurationDays,
    participationScore,

    // Organizations
    organizations,
  };
}

/**
 * Get statistics for all teams
 */
export async function getAllTeamsStatistics(): Promise<TeamStatistics[]> {
  const teams = await prisma.regionalTeam.findMany({
    where: { isActive: true },
    orderBy: { teamNumber: "asc" },
    select: { id: true },
  });

  return Promise.all(teams.map((team) => getTeamStatistics(team.id)));
}

/**
 * Get team statistics for a user's organization
 */
export async function getTeamStatisticsForOrganization(
  organizationId: string
): Promise<TeamStatistics | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { regionalTeamId: true },
  });

  if (!org?.regionalTeamId) return null;

  return getTeamStatistics(org.regionalTeamId);
}

/**
 * Get team by team number
 */
export async function getTeamStatisticsByNumber(
  teamNumber: number
): Promise<TeamStatistics | null> {
  const team = await prisma.regionalTeam.findUnique({
    where: { teamNumber },
    select: { id: true },
  });

  if (!team) return null;

  return getTeamStatistics(team.id);
}

/**
 * Compare multiple teams
 */
export async function compareTeams(teamIds: string[]): Promise<TeamComparison> {
  const teams = await Promise.all(teamIds.map((id) => getTeamStatistics(id)));

  const summary = {
    totalOrganizations: teams.reduce((sum, t) => sum + t.organizationCount, 0),
    totalReviewers: teams.reduce((sum, t) => sum + t.reviewerCount, 0),
    totalReviews: teams.reduce((sum, t) => sum + t.totalReviews, 0),
    totalFindings: teams.reduce((sum, t) => sum + t.totalFindings, 0),
    avgCapClosureRate:
      teams.length > 0
        ? Math.round(
            (teams.reduce((sum, t) => sum + t.capClosureRate, 0) /
              teams.length) *
              10
          ) / 10
        : 0,
  };

  return { teams, summary };
}

/**
 * Get team leaderboard based on participation score
 */
export async function getTeamLeaderboard(): Promise<
  Array<{
    teamId: string;
    teamName: string;
    teamNumber: number;
    participationScore: ParticipationScore;
    capClosureRate: number;
    reviewsCompleted: number;
    reviewerCount: number;
  }>
> {
  const allStats = await getAllTeamsStatistics();

  return allStats
    .map((t) => ({
      teamId: t.teamId,
      teamName: t.teamName,
      teamNumber: t.teamNumber,
      participationScore: t.participationScore,
      capClosureRate: t.capClosureRate,
      reviewsCompleted: t.reviewsCompleted,
      reviewerCount: t.reviewerCount,
    }))
    .sort((a, b) => {
      // Sort by score first, then by CAP closure rate
      const scoreOrder = { "A+": 0, A: 1, "B+": 2, B: 3, C: 4, D: 5 };
      const scoreDiff =
        scoreOrder[a.participationScore] - scoreOrder[b.participationScore];
      if (scoreDiff !== 0) return scoreDiff;
      return b.capClosureRate - a.capClosureRate;
    });
}
