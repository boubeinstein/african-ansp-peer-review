import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type {
  WorkflowEntityType,
  WorkflowExecution,
  WorkflowTransition,
  CAPStatus,
  FindingStatus,
  ReviewStatus,
} from "@prisma/client";
import type {
  TransitionRequest,
  TransitionResult,
  EntityContext,
  TransitionConditions,
} from "@/types/workflow";
import { conditionEvaluator } from "./condition-evaluator";
import { TRPCError } from "@trpc/server";

type TransitionWithStates = WorkflowTransition & {
  fromState: { code: string };
  toState: { code: string; defaultSLADays: number | null; stateType: string };
};

export class WorkflowService {
  async getOrCreateExecution(
    entityType: WorkflowEntityType,
    entityId: string,
    initialState?: string
  ): Promise<WorkflowExecution> {
    const existing = await db.workflowExecution.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });

    if (existing) return existing;

    const workflow = await db.workflowDefinition.findFirst({
      where: { entityType, isActive: true, isDefault: true },
      include: { states: { where: { stateType: "INITIAL" } } },
    });

    if (!workflow) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `No active workflow for ${entityType}`,
      });
    }

    const startState = initialState || workflow.states[0]?.code || "DRAFT";

    const execution = await db.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        entityType,
        entityId,
        currentStateCode: startState,
      },
    });

    await db.workflowHistory.create({
      data: {
        executionId: execution.id,
        toStateCode: startState,
        trigger: "AUTOMATIC",
      },
    });

    return execution;
  }

  async getAvailableTransitions(
    entityType: WorkflowEntityType,
    entityId: string,
    userRole: string
  ): Promise<TransitionWithStates[]> {
    const execution = await this.getOrCreateExecution(entityType, entityId);

    const transitions = await db.workflowTransition.findMany({
      where: {
        workflowId: execution.workflowId,
        fromState: { code: execution.currentStateCode },
      },
      include: {
        fromState: { select: { code: true } },
        toState: { select: { code: true, defaultSLADays: true, stateType: true } },
      },
    });

    return transitions.filter((t) => {
      const allowedRoles = t.allowedRoles as string[];
      return allowedRoles.length === 0 || allowedRoles.includes(userRole);
    });
  }

  async executeTransition(request: TransitionRequest): Promise<TransitionResult> {
    const {
      entityType,
      entityId,
      transitionCode,
      performedById,
      comment,
      metadata,
    } = request;

    const execution = await this.getOrCreateExecution(entityType, entityId);
    const previousState = execution.currentStateCode;

    const transition = await db.workflowTransition.findFirst({
      where: {
        workflowId: execution.workflowId,
        fromState: { code: previousState },
        code: transitionCode,
      },
      include: {
        fromState: true,
        toState: true,
      },
    });

    if (!transition) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid transition '${transitionCode}' from '${previousState}'`,
      });
    }

    const user = await db.user.findUnique({
      where: { id: performedById },
      select: { role: true },
    });

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not found",
      });
    }

    const allowedRoles = transition.allowedRoles as string[];
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Role '${user.role}' cannot perform '${transitionCode}'`,
      });
    }

    const context = await this.buildEntityContext(entityType, entityId);
    const conditions = transition.conditions as TransitionConditions | null;

    if (!conditionEvaluator.evaluate(conditions, context)) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Transition conditions not met",
      });
    }

    const lastHistory = await db.workflowHistory.findFirst({
      where: { executionId: execution.id },
      orderBy: { performedAt: "desc" },
    });

    const durationInState = lastHistory
      ? Math.floor((Date.now() - lastHistory.performedAt.getTime()) / 1000)
      : null;

    const result = await db.$transaction(async (tx) => {
      await tx.workflowExecution.update({
        where: { id: execution.id },
        data: {
          currentStateCode: transition.toState.code,
          ...(transition.toState.stateType === "TERMINAL" && {
            completedAt: new Date(),
          }),
        },
      });

      const history = await tx.workflowHistory.create({
        data: {
          executionId: execution.id,
          fromStateCode: previousState,
          toStateCode: transition.toState.code,
          transitionCode,
          trigger: transition.trigger,
          performedById,
          comment,
          metadata: (metadata || {}) as Prisma.InputJsonValue,
          durationInState,
        },
      });

      await this.updateEntityStatus(
        tx,
        entityType,
        entityId,
        transition.toState.code
      );

      await this.handleSLATransition(
        tx,
        execution.id,
        previousState,
        transition.toState
      );

      return { historyId: history.id };
    });

    return {
      success: true,
      previousState,
      newState: transition.toState.code,
      executionId: execution.id,
      historyId: result.historyId,
    };
  }

  private async buildEntityContext(
    entityType: WorkflowEntityType,
    entityId: string
  ): Promise<EntityContext> {
    switch (entityType) {
      case "CAP": {
        const cap = await db.correctiveActionPlan.findUnique({
          where: { id: entityId },
          include: {
            finding: true,
            documents: { where: { isDeleted: false } },
            assignedTo: { select: { id: true, role: true } },
          },
        });

        if (!cap) {
          throw new TRPCError({ code: "NOT_FOUND", message: "CAP not found" });
        }

        return {
          id: cap.id,
          type: "CAP",
          currentStatus: cap.status,
          data: {
            rootCauseEn: cap.rootCauseEn,
            dueDate: cap.dueDate,
            isOverdue:
              cap.dueDate < new Date() && cap.status !== "CLOSED",
          },
          relations: {
            documents: { count: cap.documents.length },
            assignedTo: cap.assignedTo,
          },
        };
      }

      case "FINDING": {
        const finding = await db.finding.findUnique({
          where: { id: entityId },
          include: {
            documents: { where: { isDeleted: false } },
            assignedTo: { select: { id: true, role: true } },
            organization: { select: { id: true, organizationCode: true } },
            review: { select: { id: true, status: true } },
          },
        });

        if (!finding) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Finding not found" });
        }

        return {
          id: finding.id,
          type: "FINDING",
          currentStatus: finding.status,
          data: {
            severity: finding.severity,
            findingType: finding.findingType,
            capRequired: finding.capRequired,
          },
          relations: {
            documents: { count: finding.documents.length },
            assignedTo: finding.assignedTo,
            organization: finding.organization
              ? {
                  id: finding.organization.id,
                  code: finding.organization.organizationCode || "",
                }
              : undefined,
            review: finding.review,
          },
        };
      }

      case "REVIEW": {
        const review = await db.review.findUnique({
          where: { id: entityId },
          include: {
            hostOrganization: { select: { id: true, organizationCode: true } },
            documents: { where: { isDeleted: false } },
          },
        });

        if (!review) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Review not found" });
        }

        return {
          id: review.id,
          type: "REVIEW",
          currentStatus: review.status,
          data: {
            reviewType: review.reviewType,
            plannedStartDate: review.plannedStartDate,
          },
          relations: {
            documents: { count: review.documents.length },
            organization: {
              id: review.hostOrganization.id,
              code: review.hostOrganization.organizationCode || "",
            },
          },
        };
      }

      default:
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unknown entity type: ${entityType}`,
        });
    }
  }

  private async updateEntityStatus(
    tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
    entityType: WorkflowEntityType,
    entityId: string,
    newStatus: string
  ): Promise<void> {
    switch (entityType) {
      case "CAP":
        await tx.correctiveActionPlan.update({
          where: { id: entityId },
          data: {
            status: newStatus as CAPStatus,
            ...(newStatus === "SUBMITTED" && { submittedAt: new Date() }),
            ...(newStatus === "ACCEPTED" && { acceptedAt: new Date() }),
            ...(newStatus === "IMPLEMENTED" && { completedAt: new Date() }),
            ...(newStatus === "VERIFIED" && { verifiedAt: new Date() }),
            ...(newStatus === "CLOSED" && { closedAt: new Date() }),
          },
        });
        break;

      case "FINDING":
        await tx.finding.update({
          where: { id: entityId },
          data: {
            status: newStatus as FindingStatus,
            ...(newStatus === "CLOSED" && { closedAt: new Date() }),
          },
        });
        break;

      case "REVIEW":
        await tx.review.update({
          where: { id: entityId },
          data: { status: newStatus as ReviewStatus },
        });
        break;
    }
  }

  private async handleSLATransition(
    tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
    executionId: string,
    previousState: string,
    toState: { code: string; defaultSLADays: number | null }
  ): Promise<void> {
    // Complete any running SLA for the previous state
    await tx.sLATracker.updateMany({
      where: {
        executionId,
        stateCode: previousState,
        status: "RUNNING",
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Create new SLA tracker if the target state has an SLA
    if (toState.defaultSLADays && toState.defaultSLADays > 0) {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + toState.defaultSLADays);

      await tx.sLATracker.create({
        data: {
          executionId,
          stateCode: toState.code,
          targetDays: toState.defaultSLADays,
          startedAt: new Date(),
          dueAt,
          status: "RUNNING",
        },
      });
    }
  }

  async getHistory(entityType: WorkflowEntityType, entityId: string) {
    const execution = await db.workflowExecution.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
      include: {
        history: {
          include: {
            performedBy: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
          orderBy: { performedAt: "desc" },
        },
      },
    });

    return execution?.history || [];
  }

  async getCurrentState(
    entityType: WorkflowEntityType,
    entityId: string
  ): Promise<string | null> {
    const execution = await db.workflowExecution.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });

    return execution?.currentStateCode || null;
  }

  async getSLAStatus(entityType: WorkflowEntityType, entityId: string) {
    const execution = await db.workflowExecution.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
      include: {
        slaTrackers: {
          where: { status: "RUNNING" },
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!execution || execution.slaTrackers.length === 0) {
      return null;
    }

    const tracker = execution.slaTrackers[0];
    const now = new Date();
    const isBreached = now > tracker.dueAt;
    const remainingMs = tracker.dueAt.getTime() - now.getTime();
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

    return {
      stateCode: tracker.stateCode,
      targetDays: tracker.targetDays,
      dueAt: tracker.dueAt,
      isBreached,
      remainingDays: isBreached ? 0 : remainingDays,
      status: tracker.status,
    };
  }
}

export const workflowService = new WorkflowService();
