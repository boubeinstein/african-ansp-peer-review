import { db } from "@/lib/db";
import type {
  EscalationAction,
  WorkflowEntityType,
  EscalationRule,
  WorkflowDefinition,
  WorkflowState,
  WorkflowExecution,
  WorkflowHistory,
  SLATracker,
  Prisma,
  UserRole,
} from "@prisma/client";
import type { EscalationConfig } from "@/types/workflow";

export interface EscalationEvent {
  ruleId: string;
  ruleName: { en: string; fr: string };
  entityType: WorkflowEntityType;
  entityId: string;
  action: EscalationAction;
  triggeredAt: Date;
}

type EscalationRuleWithRelations = EscalationRule & {
  workflow: WorkflowDefinition;
  state: WorkflowState;
};

type ExecutionWithRelations = WorkflowExecution & {
  history: WorkflowHistory[];
  slaTrackers: SLATracker[];
};

export class EscalationService {
  async processEscalations(): Promise<EscalationEvent[]> {
    const events: EscalationEvent[] = [];

    const rules = await db.escalationRule.findMany({
      where: { isActive: true },
      include: {
        workflow: true,
        state: true,
      },
    });

    for (const rule of rules) {
      const executions = await db.workflowExecution.findMany({
        where: {
          workflowId: rule.workflowId,
          currentStateCode: rule.state.code,
          completedAt: null,
        },
        include: {
          history: {
            where: { toStateCode: rule.state.code },
            orderBy: { performedAt: "desc" },
            take: 1,
          },
          slaTrackers: {
            where: { stateCode: rule.state.code },
            orderBy: { startedAt: "desc" },
            take: 1,
          },
        },
      });

      for (const execution of executions) {
        if (await this.shouldTrigger(execution, rule)) {
          const event = await this.executeEscalation(execution, rule);
          if (event) events.push(event);
        }
      }
    }

    return events;
  }

  private async shouldTrigger(
    execution: ExecutionWithRelations,
    rule: EscalationRuleWithRelations
  ): Promise<boolean> {
    const stateEntry = execution.history[0];
    if (!stateEntry) return false;

    const tracker = execution.slaTrackers[0];
    const daysInState = Math.floor(
      (Date.now() - stateEntry.performedAt.getTime()) / (24 * 60 * 60 * 1000)
    );

    // Check if enough days have passed
    if (daysInState < rule.triggerAfterDays) return false;

    if (tracker) {
      // Check max repeats
      if (rule.maxRepeats !== null && tracker.escalationCount >= rule.maxRepeats) {
        return false;
      }

      // Check repeat interval
      if (tracker.lastEscalatedAt && rule.repeatIntervalDays) {
        const daysSinceLast = Math.floor(
          (Date.now() - tracker.lastEscalatedAt.getTime()) / (24 * 60 * 60 * 1000)
        );
        if (daysSinceLast < rule.repeatIntervalDays) return false;
      }
    }

    // Evaluate trigger conditions if present
    const triggerConditions = rule.triggerConditions as Record<string, unknown> | null;
    if (triggerConditions) {
      // Additional condition checks can be implemented here
      // For now, we pass if no specific conditions fail
    }

    return true;
  }

  private async executeEscalation(
    execution: ExecutionWithRelations,
    rule: EscalationRuleWithRelations
  ): Promise<EscalationEvent | null> {
    const config = (rule.actionConfig as EscalationConfig) || {};
    const now = new Date();

    try {
      switch (rule.action) {
        case "NOTIFY":
          await this.sendNotifications(execution, config);
          break;

        case "REASSIGN":
          await this.reassignEntity(execution, config);
          break;

        case "ESCALATE":
          // Escalate notifies higher-level roles
          await this.sendNotifications(execution, {
            ...config,
            notifyRoles: ["PROGRAMME_COORDINATOR", "SYSTEM_ADMIN"],
          });
          break;

        case "AUTO_REJECT":
          if (execution.entityType === "CAP") {
            await db.correctiveActionPlan.update({
              where: { id: execution.entityId },
              data: { status: "REJECTED" },
            });
          }
          break;

        case "AUTO_CLOSE":
          if (execution.entityType === "FINDING") {
            await db.finding.update({
              where: { id: execution.entityId },
              data: { status: "CLOSED", closedAt: now },
            });
          }
          break;
      }

      // Update escalation count on SLA tracker
      const tracker = execution.slaTrackers[0];
      if (tracker) {
        await db.sLATracker.update({
          where: { id: tracker.id },
          data: {
            escalationCount: tracker.escalationCount + 1,
            lastEscalatedAt: now,
          },
        });
      }

      // Create audit log entry
      await db.auditLog.create({
        data: {
          userId: "system", // System-initiated action
          action: "STATUS_CHANGE",
          entityType: execution.entityType,
          entityId: execution.entityId,
          newState: {
            ruleId: rule.id,
            action: rule.action,
            escalationType: "AUTOMATED",
          } as Prisma.InputJsonValue,
        },
      });

      return {
        ruleId: rule.id,
        ruleName: { en: rule.nameEn, fr: rule.nameFr },
        entityType: execution.entityType,
        entityId: execution.entityId,
        action: rule.action,
        triggeredAt: now,
      };
    } catch (error) {
      console.error(
        `Escalation failed for ${execution.entityType}/${execution.entityId}:`,
        error
      );
      return null;
    }
  }

  private async sendNotifications(
    execution: ExecutionWithRelations,
    config: EscalationConfig
  ): Promise<void> {
    const recipients: string[] = [];

    // Get users by role
    if (config.notifyRoles?.length) {
      const users = await db.user.findMany({
        where: {
          role: { in: config.notifyRoles as UserRole[] },
          isActive: true,
        },
        select: { id: true },
      });
      recipients.push(...users.map((u) => u.id));
    }

    // Add specific users
    if (config.notifyUsers?.length) {
      recipients.push(...config.notifyUsers);
    }

    const message = config.message || {
      en: `Escalation alert for ${execution.entityType}`,
      fr: `Alerte d'escalade pour ${execution.entityType}`,
    };

    // Deduplicate recipients
    const uniqueRecipients = [...new Set(recipients)];

    for (const userId of uniqueRecipients) {
      await db.notification.create({
        data: {
          userId,
          type: execution.entityType === "CAP" ? "CAP_OVERDUE" : "REMINDER",
          priority: "HIGH",
          titleEn: "Escalation Alert",
          titleFr: "Alerte d'escalade",
          messageEn: message.en,
          messageFr: message.fr,
          entityType: execution.entityType,
          entityId: execution.entityId,
        },
      });
    }
  }

  private async reassignEntity(
    execution: ExecutionWithRelations,
    config: EscalationConfig
  ): Promise<void> {
    let newAssigneeId = config.reassignToUserId || null;

    // If no specific user, find one by role
    if (!newAssigneeId && config.reassignToRole) {
      const user = await db.user.findFirst({
        where: {
          role: config.reassignToRole as UserRole,
          isActive: true,
        },
        select: { id: true },
      });
      newAssigneeId = user?.id || null;
    }

    if (!newAssigneeId) return;

    if (execution.entityType === "CAP") {
      await db.correctiveActionPlan.update({
        where: { id: execution.entityId },
        data: { assignedToId: newAssigneeId },
      });
    }

    if (execution.entityType === "FINDING") {
      await db.finding.update({
        where: { id: execution.entityId },
        data: { assignedToId: newAssigneeId },
      });
    }
  }

  async getActiveRules(entityType?: WorkflowEntityType) {
    const where: Prisma.EscalationRuleWhereInput = { isActive: true };

    if (entityType) {
      where.workflow = { entityType };
    }

    return db.escalationRule.findMany({
      where,
      include: {
        workflow: { select: { code: true, nameEn: true, nameFr: true } },
        state: { select: { code: true, labelEn: true, labelFr: true } },
      },
    });
  }
}

export const escalationService = new EscalationService();
