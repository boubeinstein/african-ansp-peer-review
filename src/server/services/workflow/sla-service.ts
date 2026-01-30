import { db } from "@/lib/db";
import type { SLAStatus, WorkflowEntityType, Prisma } from "@prisma/client";

export interface SLAInfo {
  id: string;
  stateCode: string;
  targetDays: number;
  startedAt: Date;
  dueAt: Date;
  status: SLAStatus;
  remainingDays: number;
  percentComplete: number;
  isBreached: boolean;
  breachedAt: Date | null;
}

export interface SLABreachResult {
  slaId: string;
  entityType: WorkflowEntityType;
  entityId: string;
  stateCode: string;
  dueAt: Date;
  breachedAt: Date;
  daysOverdue: number;
}

export interface ApproachingBreachInfo {
  slaId: string;
  entityType: WorkflowEntityType;
  entityId: string;
  stateCode: string;
  dueAt: Date;
  daysRemaining: number;
}

export interface SLAStats {
  total: number;
  running: number;
  breached: number;
  completed: number;
  averageCompletionDays: number;
  breachRate: number;
}

export class SLAService {
  async getCurrentSLA(
    entityType: WorkflowEntityType,
    entityId: string
  ): Promise<SLAInfo | null> {
    const execution = await db.workflowExecution.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
      include: {
        slaTrackers: {
          where: { status: { in: ["RUNNING", "PAUSED"] } },
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
    });

    const tracker = execution?.slaTrackers[0];
    if (!tracker) return null;

    const now = new Date();
    const effectiveElapsed = this.calculateEffectiveElapsed(tracker);
    const totalDuration = tracker.targetDays * 24 * 60 * 60 * 1000;
    const remainingMs = Math.max(0, totalDuration - effectiveElapsed);
    const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    const percentComplete = Math.min(100, (effectiveElapsed / totalDuration) * 100);

    return {
      id: tracker.id,
      stateCode: tracker.stateCode,
      targetDays: tracker.targetDays,
      startedAt: tracker.startedAt,
      dueAt: tracker.dueAt,
      status: tracker.status,
      remainingDays,
      percentComplete: Math.round(percentComplete),
      isBreached: tracker.status === "BREACHED" || now > tracker.dueAt,
      breachedAt: tracker.breachedAt,
    };
  }

  async pauseSLA(slaId: string): Promise<void> {
    const tracker = await db.sLATracker.findUnique({ where: { id: slaId } });
    if (!tracker || tracker.status !== "RUNNING") return;

    await db.sLATracker.update({
      where: { id: slaId },
      data: {
        status: "PAUSED",
        pausedAt: new Date(),
      },
    });
  }

  async resumeSLA(slaId: string): Promise<void> {
    const tracker = await db.sLATracker.findUnique({ where: { id: slaId } });
    if (!tracker || tracker.status !== "PAUSED" || !tracker.pausedAt) return;

    const pauseDuration = Date.now() - tracker.pausedAt.getTime();
    const newDueAt = new Date(tracker.dueAt.getTime() + pauseDuration);

    await db.sLATracker.update({
      where: { id: slaId },
      data: {
        status: "RUNNING",
        pausedAt: null,
        pausedDuration:
          tracker.pausedDuration + Math.floor(pauseDuration / 1000),
        dueAt: newDueAt,
      },
    });
  }

  async checkForBreaches(): Promise<SLABreachResult[]> {
    const now = new Date();

    const breachedTrackers = await db.sLATracker.findMany({
      where: {
        status: "RUNNING",
        dueAt: { lt: now },
      },
      include: { execution: true },
    });

    const results: SLABreachResult[] = [];

    for (const tracker of breachedTrackers) {
      await db.sLATracker.update({
        where: { id: tracker.id },
        data: {
          status: "BREACHED",
          breachedAt: now,
        },
      });

      const daysOverdue = Math.ceil(
        (now.getTime() - tracker.dueAt.getTime()) / (24 * 60 * 60 * 1000)
      );

      results.push({
        slaId: tracker.id,
        entityType: tracker.execution.entityType,
        entityId: tracker.execution.entityId,
        stateCode: tracker.stateCode,
        dueAt: tracker.dueAt,
        breachedAt: now,
        daysOverdue,
      });
    }

    return results;
  }

  async getApproachingBreaches(
    warningDays: number = 3
  ): Promise<ApproachingBreachInfo[]> {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + warningDays);

    const approaching = await db.sLATracker.findMany({
      where: {
        status: "RUNNING",
        dueAt: {
          gt: new Date(),
          lte: warningDate,
        },
      },
      include: { execution: true },
    });

    return approaching.map((tracker) => ({
      slaId: tracker.id,
      entityType: tracker.execution.entityType,
      entityId: tracker.execution.entityId,
      stateCode: tracker.stateCode,
      dueAt: tracker.dueAt,
      daysRemaining: Math.ceil(
        (tracker.dueAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      ),
    }));
  }

  async getSLAHistory(
    entityType: WorkflowEntityType,
    entityId: string
  ) {
    const execution = await db.workflowExecution.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
      include: {
        slaTrackers: {
          orderBy: { startedAt: "desc" },
        },
      },
    });

    return execution?.slaTrackers || [];
  }

  private calculateEffectiveElapsed(tracker: {
    startedAt: Date;
    pausedAt: Date | null;
    pausedDuration: number;
    status: SLAStatus;
  }): number {
    const now = new Date();
    let elapsed = now.getTime() - tracker.startedAt.getTime();

    // Subtract total paused duration (in seconds, convert to ms)
    elapsed -= tracker.pausedDuration * 1000;

    // If currently paused, also subtract the current pause duration
    if (tracker.status === "PAUSED" && tracker.pausedAt) {
      elapsed -= now.getTime() - tracker.pausedAt.getTime();
    }

    return Math.max(0, elapsed);
  }

  async getStats(filters?: {
    entityType?: WorkflowEntityType;
  }): Promise<SLAStats> {
    const executionFilter: Prisma.WorkflowExecutionWhereInput | undefined =
      filters?.entityType ? { entityType: filters.entityType } : undefined;

    const baseWhere: Prisma.SLATrackerWhereInput = executionFilter
      ? { execution: executionFilter }
      : {};

    const [total, running, breached, completed] = await Promise.all([
      db.sLATracker.count({ where: baseWhere }),
      db.sLATracker.count({ where: { ...baseWhere, status: "RUNNING" } }),
      db.sLATracker.count({ where: { ...baseWhere, status: "BREACHED" } }),
      db.sLATracker.count({ where: { ...baseWhere, status: "COMPLETED" } }),
    ]);

    // Calculate average completion time for completed SLAs
    const completedTrackers = await db.sLATracker.findMany({
      where: {
        ...baseWhere,
        status: "COMPLETED",
        completedAt: { not: null },
      },
      select: {
        startedAt: true,
        completedAt: true,
        pausedDuration: true,
      },
    });

    let avgDays = 0;
    if (completedTrackers.length > 0) {
      const totalDays = completedTrackers.reduce((sum, t) => {
        const duration =
          t.completedAt!.getTime() -
          t.startedAt.getTime() -
          t.pausedDuration * 1000;
        return sum + duration / (24 * 60 * 60 * 1000);
      }, 0);
      avgDays = totalDays / completedTrackers.length;
    }

    // Calculate breach rate (breached / (breached + completed))
    const closedTotal = breached + completed;
    const breachRate = closedTotal > 0 ? (breached / closedTotal) * 100 : 0;

    return {
      total,
      running,
      breached,
      completed,
      averageCompletionDays: Math.round(avgDays * 10) / 10,
      breachRate: Math.round(breachRate * 10) / 10,
    };
  }

  async extendSLA(slaId: string, additionalDays: number): Promise<void> {
    const tracker = await db.sLATracker.findUnique({ where: { id: slaId } });
    if (!tracker || tracker.status === "COMPLETED") return;

    const newDueAt = new Date(tracker.dueAt);
    newDueAt.setDate(newDueAt.getDate() + additionalDays);

    // If the SLA was breached but is now being extended, reset status to RUNNING
    const newStatus =
      tracker.status === "BREACHED" && newDueAt > new Date()
        ? "RUNNING"
        : tracker.status;

    await db.sLATracker.update({
      where: { id: slaId },
      data: {
        dueAt: newDueAt,
        targetDays: tracker.targetDays + additionalDays,
        status: newStatus,
        ...(newStatus === "RUNNING" && tracker.status === "BREACHED"
          ? { breachedAt: null }
          : {}),
      },
    });
  }

  async incrementEscalationCount(slaId: string): Promise<number> {
    const tracker = await db.sLATracker.update({
      where: { id: slaId },
      data: {
        escalationCount: { increment: 1 },
        lastEscalatedAt: new Date(),
      },
    });

    return tracker.escalationCount;
  }
}

export const slaService = new SLAService();
