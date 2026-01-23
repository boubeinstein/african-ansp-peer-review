/**
 * CAP Deadline Service
 *
 * Manages deadline tracking, overdue detection, and escalation for Corrective Action Plans.
 *
 * Features:
 * - Calculate days until deadline
 * - Overdue detection
 * - Escalation rules (7 days before, 1 day before, overdue)
 * - Auto-notify on approaching deadlines
 */

import { db } from "@/lib/db";
import {
  CAPStatus,
  Prisma,
  type CorrectiveActionPlan,
  type CAPMilestone,
} from "@prisma/client";
import { addDays, differenceInDays, isPast, isToday, isFuture, startOfDay } from "date-fns";

// =============================================================================
// TYPES
// =============================================================================

export interface DeadlineInfo {
  dueDate: Date;
  daysRemaining: number;
  isOverdue: boolean;
  isDueToday: boolean;
  isDueSoon: boolean; // Within 7 days
  urgencyLevel: "critical" | "warning" | "normal" | "overdue";
  percentageComplete?: number;
}

export interface CAPWithDeadlineInfo {
  cap: CorrectiveActionPlan & {
    milestones: CAPMilestone[];
    finding: {
      id: string;
      referenceNumber: string;
      severity: string;
      titleEn: string;
      titleFr: string;
      organization: {
        id: string;
        nameEn: string;
        nameFr: string | null;
      };
    };
  };
  deadlineInfo: DeadlineInfo;
  milestoneProgress: {
    total: number;
    completed: number;
    overdue: number;
    upcoming: number;
  };
}

export interface EscalationEvent {
  type: "7_DAYS_BEFORE" | "1_DAY_BEFORE" | "DUE_TODAY" | "OVERDUE" | "MILESTONE_OVERDUE";
  capId: string;
  milestoneId?: string;
  daysOverdue?: number;
  recipientIds: string[];
  finding: {
    referenceNumber: string;
    titleEn: string;
    titleFr: string;
    severity: string;
  };
  organization: {
    nameEn: string;
    nameFr: string | null;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Days before deadline to start showing warnings */
const WARNING_THRESHOLD_DAYS = 7;

/** Days before deadline for critical warnings */
const CRITICAL_THRESHOLD_DAYS = 1;

/** Statuses that should be tracked for deadlines */
const TRACKABLE_STATUSES: CAPStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "ACCEPTED",
  "REJECTED",
  "IN_PROGRESS",
  "COMPLETED", // Still need verification
];

// =============================================================================
// DEADLINE CALCULATIONS
// =============================================================================

/**
 * Calculate deadline information for a CAP
 */
export function calculateDeadlineInfo(
  dueDate: Date,
  status: CAPStatus,
  milestonesCompleted: number = 0,
  milestonesTotal: number = 0
): DeadlineInfo {
  const today = startOfDay(new Date());
  const dueDateNormalized = startOfDay(dueDate);
  const daysRemaining = differenceInDays(dueDateNormalized, today);

  const isOverdue = isPast(dueDateNormalized) && !isToday(dueDateNormalized);
  const isDueToday = isToday(dueDateNormalized);
  const isDueSoon = daysRemaining > 0 && daysRemaining <= WARNING_THRESHOLD_DAYS;

  // Determine urgency level
  let urgencyLevel: DeadlineInfo["urgencyLevel"] = "normal";
  if (isOverdue) {
    urgencyLevel = "overdue";
  } else if (isDueToday || (daysRemaining > 0 && daysRemaining <= CRITICAL_THRESHOLD_DAYS)) {
    urgencyLevel = "critical";
  } else if (isDueSoon) {
    urgencyLevel = "warning";
  }

  // Calculate percentage complete based on milestones if available
  let percentageComplete: number | undefined;
  if (milestonesTotal > 0) {
    percentageComplete = Math.round((milestonesCompleted / milestonesTotal) * 100);
  } else {
    // Estimate based on status
    percentageComplete = getStatusProgressPercentage(status);
  }

  return {
    dueDate,
    daysRemaining,
    isOverdue,
    isDueToday,
    isDueSoon,
    urgencyLevel,
    percentageComplete,
  };
}

/**
 * Get estimated progress percentage based on CAP status
 */
function getStatusProgressPercentage(status: CAPStatus): number {
  switch (status) {
    case "DRAFT":
      return 10;
    case "SUBMITTED":
      return 20;
    case "UNDER_REVIEW":
      return 25;
    case "REJECTED":
      return 15;
    case "ACCEPTED":
      return 30;
    case "IN_PROGRESS":
      return 50;
    case "COMPLETED":
      return 80;
    case "VERIFIED":
      return 95;
    case "CLOSED":
      return 100;
    default:
      return 0;
  }
}

/**
 * Calculate milestone progress for a CAP
 */
export function calculateMilestoneProgress(milestones: CAPMilestone[]): {
  total: number;
  completed: number;
  overdue: number;
  upcoming: number;
  inProgress: number;
} {
  const completed = milestones.filter((m) => m.status === "COMPLETED").length;
  const overdue = milestones.filter(
    (m) =>
      m.status !== "COMPLETED" &&
      m.status !== "CANCELLED" &&
      isPast(startOfDay(m.targetDate)) &&
      !isToday(m.targetDate)
  ).length;
  const upcoming = milestones.filter(
    (m) =>
      m.status === "PENDING" &&
      (isFuture(startOfDay(m.targetDate)) || isToday(m.targetDate))
  ).length;
  const inProgress = milestones.filter((m) => m.status === "IN_PROGRESS").length;

  return {
    total: milestones.length,
    completed,
    overdue,
    upcoming,
    inProgress,
  };
}

// =============================================================================
// DATABASE QUERIES
// =============================================================================

/**
 * Get all CAPs with deadline information
 */
export async function getCAPsWithDeadlineInfo(options?: {
  organizationId?: string;
  includeCompleted?: boolean;
  overdueOnly?: boolean;
}): Promise<CAPWithDeadlineInfo[]> {
  const where: Prisma.CorrectiveActionPlanWhereInput = {};

  // Filter by organization if specified
  if (options?.organizationId) {
    where.finding = {
      organizationId: options.organizationId,
    };
  }

  // Exclude closed/verified unless specifically requested
  if (!options?.includeCompleted) {
    where.status = {
      in: TRACKABLE_STATUSES,
    };
  }

  const caps = await db.correctiveActionPlan.findMany({
    where,
    include: {
      milestones: {
        orderBy: { targetDate: "asc" },
      },
      finding: {
        select: {
          id: true,
          referenceNumber: true,
          severity: true,
          titleEn: true,
          titleFr: true,
          organization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
            },
          },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const results: CAPWithDeadlineInfo[] = caps.map((cap) => {
    const milestoneProgress = calculateMilestoneProgress(cap.milestones);
    const deadlineInfo = calculateDeadlineInfo(
      cap.dueDate,
      cap.status,
      milestoneProgress.completed,
      milestoneProgress.total
    );

    return {
      cap,
      deadlineInfo,
      milestoneProgress,
    };
  });

  // Filter to overdue only if requested
  if (options?.overdueOnly) {
    return results.filter((r) => r.deadlineInfo.isOverdue);
  }

  return results;
}

/**
 * Get overdue CAPs
 */
export async function getOverdueCAPs(): Promise<CAPWithDeadlineInfo[]> {
  return getCAPsWithDeadlineInfo({ overdueOnly: true });
}

/**
 * Get CAPs due within specified days
 */
export async function getCAPsDueWithinDays(days: number): Promise<CAPWithDeadlineInfo[]> {
  const today = startOfDay(new Date());
  const targetDate = addDays(today, days);

  const caps = await db.correctiveActionPlan.findMany({
    where: {
      status: { in: TRACKABLE_STATUSES },
      dueDate: {
        gte: today,
        lte: targetDate,
      },
    },
    include: {
      milestones: {
        orderBy: { targetDate: "asc" },
      },
      finding: {
        select: {
          id: true,
          referenceNumber: true,
          severity: true,
          titleEn: true,
          titleFr: true,
          organization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
            },
          },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  return caps.map((cap) => {
    const milestoneProgress = calculateMilestoneProgress(cap.milestones);
    const deadlineInfo = calculateDeadlineInfo(
      cap.dueDate,
      cap.status,
      milestoneProgress.completed,
      milestoneProgress.total
    );

    return {
      cap,
      deadlineInfo,
      milestoneProgress,
    };
  });
}

/**
 * Get overdue milestones
 */
export async function getOverdueMilestones(): Promise<
  (CAPMilestone & {
    cap: {
      id: string;
      status: CAPStatus;
      finding: {
        referenceNumber: string;
        titleEn: string;
        organization: { nameEn: string };
      };
    };
  })[]
> {
  const today = startOfDay(new Date());

  return db.cAPMilestone.findMany({
    where: {
      status: { in: ["PENDING", "IN_PROGRESS"] },
      targetDate: { lt: today },
      cap: {
        status: { in: TRACKABLE_STATUSES },
      },
    },
    include: {
      cap: {
        select: {
          id: true,
          status: true,
          finding: {
            select: {
              referenceNumber: true,
              titleEn: true,
              organization: {
                select: { nameEn: true },
              },
            },
          },
        },
      },
    },
    orderBy: { targetDate: "asc" },
  });
}

// =============================================================================
// ESCALATION DETECTION
// =============================================================================

/**
 * Detect CAPs that need escalation notifications
 */
export async function detectEscalationEvents(): Promise<EscalationEvent[]> {
  const events: EscalationEvent[] = [];
  const today = startOfDay(new Date());

  // Get all trackable CAPs with their findings and assigned users
  const caps = await db.correctiveActionPlan.findMany({
    where: {
      status: { in: TRACKABLE_STATUSES },
    },
    include: {
      finding: {
        select: {
          referenceNumber: true,
          titleEn: true,
          titleFr: true,
          severity: true,
          organizationId: true,
          organization: {
            select: {
              nameEn: true,
              nameFr: true,
            },
          },
        },
      },
      assignedTo: {
        select: { id: true },
      },
    },
  });

  for (const cap of caps) {
    const dueDate = startOfDay(cap.dueDate);
    const daysUntilDue = differenceInDays(dueDate, today);

    // Get recipients (assigned user + organization focal points)
    const recipientIds: string[] = [];
    if (cap.assignedTo) {
      recipientIds.push(cap.assignedTo.id);
    }

    // Add organization focal points
    const focalPoints = await db.user.findMany({
      where: {
        organizationId: cap.finding.organizationId,
        role: { in: ["SAFETY_MANAGER", "ANSP_ADMIN"] },
        isActive: true,
      },
      select: { id: true },
    });
    recipientIds.push(...focalPoints.map((u) => u.id));

    const eventBase = {
      capId: cap.id,
      recipientIds: [...new Set(recipientIds)], // Deduplicate
      finding: {
        referenceNumber: cap.finding.referenceNumber,
        titleEn: cap.finding.titleEn,
        titleFr: cap.finding.titleFr,
        severity: cap.finding.severity,
      },
      organization: {
        nameEn: cap.finding.organization.nameEn,
        nameFr: cap.finding.organization.nameFr,
      },
    };

    // Check for different escalation levels
    if (daysUntilDue < 0) {
      // Overdue
      events.push({
        ...eventBase,
        type: "OVERDUE",
        daysOverdue: Math.abs(daysUntilDue),
      });
    } else if (daysUntilDue === 0) {
      // Due today
      events.push({
        ...eventBase,
        type: "DUE_TODAY",
      });
    } else if (daysUntilDue === 1) {
      // 1 day before
      events.push({
        ...eventBase,
        type: "1_DAY_BEFORE",
      });
    } else if (daysUntilDue === 7) {
      // 7 days before
      events.push({
        ...eventBase,
        type: "7_DAYS_BEFORE",
      });
    }
  }

  // Check for overdue milestones
  const overdueMilestones = await getOverdueMilestones();
  for (const milestone of overdueMilestones) {
    const daysOverdue = differenceInDays(today, startOfDay(milestone.targetDate));

    // Get recipients
    const focalPoints = await db.user.findMany({
      where: {
        organization: {
          findings: {
            some: {
              correctiveActionPlan: {
                id: milestone.capId,
              },
            },
          },
        },
        role: { in: ["SAFETY_MANAGER", "ANSP_ADMIN"] },
        isActive: true,
      },
      select: { id: true },
    });

    events.push({
      type: "MILESTONE_OVERDUE",
      capId: milestone.capId,
      milestoneId: milestone.id,
      daysOverdue,
      recipientIds: focalPoints.map((u) => u.id),
      finding: {
        referenceNumber: milestone.cap.finding.referenceNumber,
        titleEn: milestone.cap.finding.titleEn,
        titleFr: "",
        severity: "",
      },
      organization: {
        nameEn: milestone.cap.finding.organization.nameEn,
        nameFr: null,
      },
    });
  }

  return events;
}

// =============================================================================
// STATUS TRANSITIONS
// =============================================================================

/**
 * Valid CAP status transitions
 */
export const CAP_STATUS_TRANSITIONS: Record<CAPStatus, CAPStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "DRAFT"], // Can be returned to draft
  UNDER_REVIEW: ["ACCEPTED", "REJECTED"],
  REJECTED: ["DRAFT"], // Goes back to draft for revisions
  ACCEPTED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: ["VERIFIED", "IN_PROGRESS"], // Can fail verification
  VERIFIED: ["CLOSED"],
  CLOSED: [], // Terminal state
};

/**
 * Check if a status transition is valid
 */
export function isValidCAPTransition(
  currentStatus: CAPStatus,
  newStatus: CAPStatus
): boolean {
  if (currentStatus === newStatus) return true;
  return CAP_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Get allowed next statuses for a CAP
 */
export function getAllowedNextStatuses(currentStatus: CAPStatus): CAPStatus[] {
  return CAP_STATUS_TRANSITIONS[currentStatus] || [];
}

// =============================================================================
// MILESTONE MANAGEMENT
// =============================================================================

/**
 * Update milestone statuses based on dates
 * Called periodically to mark milestones as overdue
 */
export async function updateMilestoneStatuses(): Promise<number> {
  const today = startOfDay(new Date());

  // Mark overdue milestones
  const result = await db.cAPMilestone.updateMany({
    where: {
      status: { in: ["PENDING", "IN_PROGRESS"] },
      targetDate: { lt: today },
      cap: {
        status: { in: TRACKABLE_STATUSES },
      },
    },
    data: {
      status: "OVERDUE",
    },
  });

  return result.count;
}

/**
 * Calculate suggested due date based on finding severity
 */
export function getSuggestedDueDate(severity: string): Date {
  const today = new Date();

  switch (severity) {
    case "CRITICAL":
      return addDays(today, 30); // 30 days for critical
    case "MAJOR":
      return addDays(today, 60); // 60 days for major
    case "MINOR":
      return addDays(today, 90); // 90 days for minor
    case "OBSERVATION":
      return addDays(today, 180); // 180 days for observations
    default:
      return addDays(today, 90);
  }
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Get CAP statistics for an organization or overall
 */
export async function getCAPStatistics(organizationId?: string): Promise<{
  total: number;
  byStatus: Record<CAPStatus, number>;
  overdue: number;
  dueSoon: number;
  averageDaysToClose: number | null;
  onTimeCompletionRate: number | null;
}> {
  const where: Prisma.CorrectiveActionPlanWhereInput = {};

  if (organizationId) {
    where.finding = { organizationId };
  }

  // Get all CAPs
  const caps = await db.correctiveActionPlan.findMany({
    where,
    select: {
      id: true,
      status: true,
      dueDate: true,
      createdAt: true,
      closedAt: true,
      verifiedAt: true,
    },
  });

  // Count by status
  const byStatus: Record<CAPStatus, number> = {
    DRAFT: 0,
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    ACCEPTED: 0,
    REJECTED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    VERIFIED: 0,
    CLOSED: 0,
  };

  const today = startOfDay(new Date());
  let overdue = 0;
  let dueSoon = 0;
  let totalDaysToClose = 0;
  let closedCount = 0;
  let onTimeCount = 0;

  for (const cap of caps) {
    byStatus[cap.status]++;

    // Check if trackable and overdue/due soon
    if (TRACKABLE_STATUSES.includes(cap.status)) {
      const dueDate = startOfDay(cap.dueDate);
      const daysUntilDue = differenceInDays(dueDate, today);

      if (daysUntilDue < 0) {
        overdue++;
      } else if (daysUntilDue <= WARNING_THRESHOLD_DAYS) {
        dueSoon++;
      }
    }

    // Calculate closure statistics
    if (cap.closedAt || cap.verifiedAt) {
      const closeDate = cap.closedAt || cap.verifiedAt!;
      const daysToClose = differenceInDays(closeDate, cap.createdAt);
      totalDaysToClose += daysToClose;
      closedCount++;

      // Check if closed on time
      if (closeDate <= cap.dueDate) {
        onTimeCount++;
      }
    }
  }

  return {
    total: caps.length,
    byStatus,
    overdue,
    dueSoon,
    averageDaysToClose: closedCount > 0 ? Math.round(totalDaysToClose / closedCount) : null,
    onTimeCompletionRate: closedCount > 0 ? Math.round((onTimeCount / closedCount) * 100) : null,
  };
}
