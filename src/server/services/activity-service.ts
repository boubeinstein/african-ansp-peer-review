import { db } from "@/lib/db";

export type ActivityType =
  | "REVIEW_CREATED"
  | "REVIEW_STARTED"
  | "REVIEW_COMPLETED"
  | "FINDING_RAISED"
  | "FINDING_CLOSED"
  | "CAP_SUBMITTED"
  | "CAP_APPROVED"
  | "CAP_OVERDUE"
  | "REVIEWER_ASSIGNED"
  | "ASSESSMENT_SUBMITTED"
  | "ORGANIZATION_JOINED";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  timestamp: Date;
  teamId: string | null;
  teamName: string | null;
  teamNumber: number | null;
  organizationId: string | null;
  organizationName: string | null;
  reviewId: string | null;
  findingId: string | null;
  capId: string | null;
  userId: string | null;
  userName: string | null;
  metadata: {
    severity?: string;
    status?: string;
    title?: string;
    count?: number;
  };
}

export async function getRecentActivities(options: {
  limit?: number;
  teamId?: string;
  days?: number;
}): Promise<ActivityItem[]> {
  const { limit = 50, teamId, days = 30 } = options;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const activities: ActivityItem[] = [];

  // Get recent reviews
  const reviews = await db.review.findMany({
    where: {
      updatedAt: { gte: since },
      ...(teamId && {
        hostOrganization: { regionalTeamId: teamId },
      }),
    },
    include: {
      hostOrganization: {
        include: { regionalTeam: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  for (const review of reviews) {
    let type: ActivityType = "REVIEW_CREATED";
    if (review.status === "COMPLETED") type = "REVIEW_COMPLETED";
    else if (review.status === "IN_PROGRESS") type = "REVIEW_STARTED";

    activities.push({
      id: `review-${review.id}`,
      type,
      timestamp: review.updatedAt,
      teamId: review.hostOrganization?.regionalTeamId || null,
      teamName: review.hostOrganization?.regionalTeam?.nameEn || null,
      teamNumber: review.hostOrganization?.regionalTeam?.teamNumber || null,
      organizationId: review.hostOrganizationId,
      organizationName: review.hostOrganization?.nameEn || null,
      reviewId: review.id,
      findingId: null,
      capId: null,
      userId: null,
      userName: null,
      metadata: {
        title: `Review ${review.referenceNumber}`,
        status: review.status,
      },
    });
  }

  // Get recent findings
  const findings = await db.finding.findMany({
    where: {
      createdAt: { gte: since },
      ...(teamId && {
        review: {
          hostOrganization: { regionalTeamId: teamId },
        },
      }),
    },
    include: {
      review: {
        include: {
          hostOrganization: {
            include: { regionalTeam: true },
          },
        },
      },
      assignedTo: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  for (const finding of findings) {
    const org = finding.review?.hostOrganization;
    activities.push({
      id: `finding-${finding.id}`,
      type: finding.status === "CLOSED" ? "FINDING_CLOSED" : "FINDING_RAISED",
      timestamp: finding.createdAt,
      teamId: org?.regionalTeamId || null,
      teamName: org?.regionalTeam?.nameEn || null,
      teamNumber: org?.regionalTeam?.teamNumber || null,
      organizationId: org?.id || null,
      organizationName: org?.nameEn || null,
      reviewId: finding.reviewId,
      findingId: finding.id,
      capId: null,
      userId: finding.assignedToId || null,
      userName: finding.assignedTo ? `${finding.assignedTo.firstName} ${finding.assignedTo.lastName}` : null,
      metadata: {
        severity: finding.severity,
        title: finding.titleEn || finding.referenceNumber,
      },
    });
  }

  // Get recent CAPs
  const caps = await db.correctiveActionPlan.findMany({
    where: {
      updatedAt: { gte: since },
      ...(teamId && {
        finding: {
          review: {
            hostOrganization: { regionalTeamId: teamId },
          },
        },
      }),
    },
    include: {
      finding: {
        include: {
          review: {
            include: {
              hostOrganization: {
                include: { regionalTeam: true },
              },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  for (const cap of caps) {
    const org = cap.finding?.review?.hostOrganization;
    let type: ActivityType = "CAP_SUBMITTED";
    if (cap.status === "VERIFIED" || cap.status === "CLOSED") type = "CAP_APPROVED";
    // Check if overdue by comparing due date to current date
    else if (cap.dueDate && new Date(cap.dueDate) < new Date() && cap.status !== "COMPLETED") {
      type = "CAP_OVERDUE";
    }

    activities.push({
      id: `cap-${cap.id}`,
      type,
      timestamp: cap.updatedAt,
      teamId: org?.regionalTeamId || null,
      teamName: org?.regionalTeam?.nameEn || null,
      teamNumber: org?.regionalTeam?.teamNumber || null,
      organizationId: org?.id || null,
      organizationName: org?.nameEn || null,
      reviewId: cap.finding?.reviewId || null,
      findingId: cap.findingId,
      capId: cap.id,
      userId: null,
      userName: null,
      metadata: {
        status: cap.status,
        title: `CAP for ${cap.finding?.referenceNumber || "Finding"}`,
      },
    });
  }

  // Sort all activities by timestamp descending
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return activities.slice(0, limit);
}
