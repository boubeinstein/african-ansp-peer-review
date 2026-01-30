import { slaService } from "@/server/services/workflow/sla-service";
import { escalationService } from "@/server/services/workflow/escalation-service";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface WorkflowJobResult {
  breaches: number;
  escalations: number;
  warnings: number;
  errors: string[];
  timestamp: string;
}

export async function processWorkflowJobs(): Promise<WorkflowJobResult> {
  const errors: string[] = [];
  let breaches = 0;
  let escalations = 0;
  let warnings = 0;
  const timestamp = new Date().toISOString();

  try {
    // Step 1: Check for SLA breaches
    const breachResults = await slaService.checkForBreaches();
    breaches = breachResults.length;

    for (const breach of breachResults) {
      await db.auditLog.create({
        data: {
          userId: "system",
          action: "STATUS_CHANGE",
          entityType: breach.entityType,
          entityId: breach.entityId,
          newState: {
            type: "SLA_BREACH",
            stateCode: breach.stateCode,
            dueAt: breach.dueAt.toISOString(),
            breachedAt: breach.breachedAt.toISOString(),
            daysOverdue: breach.daysOverdue,
          } as Prisma.InputJsonValue,
        },
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error in breach check";
    errors.push(`Breach check: ${message}`);
    console.error("[WorkflowJobs] Breach check failed:", error);
  }

  try {
    // Step 2: Process escalation rules
    const escalationEvents = await escalationService.processEscalations();
    escalations = escalationEvents.length;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error in escalations";
    errors.push(`Escalations: ${message}`);
    console.error("[WorkflowJobs] Escalation processing failed:", error);
  }

  try {
    // Step 3: Send warnings for approaching SLAs (3 days default)
    const approaching = await slaService.getApproachingBreaches(3);
    warnings = approaching.length;

    for (const warning of approaching) {
      // Check if we already sent a notification in the last 24 hours
      const existingNotification = await db.notification.findFirst({
        where: {
          entityType: warning.entityType,
          entityId: warning.entityId,
          type: "CAP_DEADLINE_APPROACHING",
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      if (!existingNotification) {
        // Find the assignee to notify
        let assigneeId: string | null = null;

        if (warning.entityType === "CAP") {
          const cap = await db.correctiveActionPlan.findUnique({
            where: { id: warning.entityId },
            select: { assignedToId: true },
          });
          assigneeId = cap?.assignedToId || null;
        } else if (warning.entityType === "FINDING") {
          const finding = await db.finding.findUnique({
            where: { id: warning.entityId },
            select: { assignedToId: true },
          });
          assigneeId = finding?.assignedToId || null;
        }

        if (assigneeId) {
          const priority = warning.daysRemaining <= 1 ? "URGENT" : "HIGH";

          await db.notification.create({
            data: {
              userId: assigneeId,
              type: "CAP_DEADLINE_APPROACHING",
              priority,
              titleEn: "Deadline Approaching",
              titleFr: "Échéance approchante",
              messageEn: `${warning.entityType} deadline in ${warning.daysRemaining} day(s)`,
              messageFr: `Échéance ${warning.entityType} dans ${warning.daysRemaining} jour(s)`,
              entityType: warning.entityType,
              entityId: warning.entityId,
            },
          });
        }
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error in warnings";
    errors.push(`Warnings: ${message}`);
    console.error("[WorkflowJobs] Warning notifications failed:", error);
  }

  console.log(
    `[WorkflowJobs] Completed: ${breaches} breaches, ${escalations} escalations, ${warnings} warnings, ${errors.length} errors`
  );

  return { breaches, escalations, warnings, errors, timestamp };
}

export async function processOverdueCAPs(): Promise<{
  processed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;

  try {
    // Find all CAPs that are overdue but not yet marked
    const overdueCaps = await db.correctiveActionPlan.findMany({
      where: {
        dueDate: { lt: new Date() },
        status: { notIn: ["CLOSED", "VERIFIED", "REJECTED"] },
      },
      include: {
        assignedTo: { select: { id: true } },
        finding: { select: { organizationId: true } },
      },
    });

    for (const cap of overdueCaps) {
      processed++;

      // Notify assignee if exists
      if (cap.assignedToId) {
        const existingNotification = await db.notification.findFirst({
          where: {
            entityType: "CAP",
            entityId: cap.id,
            type: "CAP_OVERDUE",
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        });

        if (!existingNotification) {
          await db.notification.create({
            data: {
              userId: cap.assignedToId,
              type: "CAP_OVERDUE",
              priority: "URGENT",
              titleEn: "CAP Overdue",
              titleFr: "PAC en retard",
              messageEn: "A Corrective Action Plan assigned to you is overdue",
              messageFr:
                "Un Plan d'Action Corrective qui vous est assigné est en retard",
              entityType: "CAP",
              entityId: cap.id,
            },
          });
        }
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error processing CAPs";
    errors.push(message);
    console.error("[WorkflowJobs] Overdue CAPs processing failed:", error);
  }

  return { processed, errors };
}
