/**
 * CAP Deadline Checker Job
 *
 * Checks for CAPs approaching deadline (7 days) or overdue.
 * Run via: Vercel Cron, GitHub Actions, or manual API endpoint
 *
 * This job:
 * 1. Finds CAPs with deadlines within the next 7 days
 * 2. Finds CAPs that are overdue
 * 3. Sends notifications (avoiding duplicates within 24 hours)
 */

import { prisma } from "@/lib/db";
import {
  notifyCAPOverdue,
  sendNotification,
  getRecipientsByRole,
  type CAPForNotification,
} from "@/server/services/notification-service";
import { NotificationType, NotificationPriority } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface CAPDeadlineCheckResult {
  checked: number;
  approaching: number;
  overdue: number;
  notificationsSent: number;
  errors: string[];
}

// =============================================================================
// MAIN JOB FUNCTION
// =============================================================================

/**
 * Check CAP deadlines and send notifications
 */
export async function checkCAPDeadlines(): Promise<CAPDeadlineCheckResult> {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const result: CAPDeadlineCheckResult = {
    checked: 0,
    approaching: 0,
    overdue: 0,
    notificationsSent: 0,
    errors: [],
  };

  console.log("[CAP Deadline Checker] Starting check...");

  try {
    // 1. Find CAPs approaching deadline (due in 7 days or less, not yet overdue)
    const approachingCAPs = await prisma.correctiveActionPlan.findMany({
      where: {
        status: { in: ["ACCEPTED", "IN_PROGRESS"] },
        dueDate: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        finding: {
          include: {
            review: {
              select: {
                id: true,
                referenceNumber: true,
                hostOrganizationId: true,
                hostOrganization: {
                  select: {
                    id: true,
                    nameEn: true,
                    nameFr: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 2. Find overdue CAPs
    const overdueCAPs = await prisma.correctiveActionPlan.findMany({
      where: {
        status: { in: ["ACCEPTED", "IN_PROGRESS"] },
        dueDate: { lt: now },
      },
      include: {
        finding: {
          include: {
            review: {
              select: {
                id: true,
                referenceNumber: true,
                hostOrganizationId: true,
                hostOrganization: {
                  select: {
                    id: true,
                    nameEn: true,
                    nameFr: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    result.checked = approachingCAPs.length + overdueCAPs.length;
    result.approaching = approachingCAPs.length;
    result.overdue = overdueCAPs.length;

    // 3. Send approaching deadline notifications
    for (const cap of approachingCAPs) {
      const daysRemaining = Math.ceil(
        (cap.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      // Check if we already sent this notification today
      const existingNotification = await prisma.notification.findFirst({
        where: {
          entityType: "CAP",
          entityId: cap.id,
          type: NotificationType.CAP_DEADLINE_APPROACHING,
          createdAt: { gte: oneDayAgo },
        },
      });

      if (existingNotification) {
        continue; // Skip - already notified today
      }

      try {
        // Get org admins
        const recipients = await getRecipientsByRole(
          ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"],
          cap.finding.review.hostOrganizationId
        );

        if (recipients.length > 0) {
          await sendNotification(recipients, {
            type: NotificationType.CAP_DEADLINE_APPROACHING,
            titleEn: "CAP Deadline Approaching",
            titleFr: "Echéance du PAC approchant",
            messageEn: `Corrective Action Plan for finding ${cap.finding.referenceNumber} is due in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}. Please ensure timely completion.`,
            messageFr: `Le Plan d'Actions Correctives pour la constatation ${cap.finding.referenceNumber} est dû dans ${daysRemaining} jour${daysRemaining !== 1 ? "s" : ""}. Veuillez assurer une completion rapide.`,
            entityType: "CAP",
            entityId: cap.id,
            actionUrl: `/caps/${cap.id}`,
            actionLabelEn: "View CAP",
            actionLabelFr: "Voir le PAC",
            priority: NotificationPriority.HIGH,
          });
          result.notificationsSent++;
          console.log(
            `  [Approaching] ${cap.finding.referenceNumber} - ${daysRemaining} days remaining`
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Approaching ${cap.finding.referenceNumber}: ${message}`);
        console.error(
          `  [Error] Failed to notify for ${cap.finding.referenceNumber}:`,
          error
        );
      }
    }

    // 4. Send overdue notifications
    for (const cap of overdueCAPs) {
      // Check if we already sent overdue notification today
      const existingNotification = await prisma.notification.findFirst({
        where: {
          entityType: "CAP",
          entityId: cap.id,
          type: NotificationType.CAP_OVERDUE,
          createdAt: { gte: oneDayAgo },
        },
      });

      if (existingNotification) {
        continue; // Skip - already notified today
      }

      try {
        // Build the CAPForNotification object
        const capForNotification: CAPForNotification = {
          id: cap.id,
          dueDate: cap.dueDate,
          assignedToId: cap.assignedToId,
          finding: {
            id: cap.finding.id,
            referenceNumber: cap.finding.referenceNumber,
            titleEn: cap.finding.titleEn,
            titleFr: cap.finding.titleFr,
            review: {
              id: cap.finding.review.id,
              referenceNumber: cap.finding.review.referenceNumber,
              hostOrganization: cap.finding.review.hostOrganization,
            },
          },
        };

        await notifyCAPOverdue(capForNotification);
        result.notificationsSent++;
        console.log(`  [Overdue] ${cap.finding.referenceNumber}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Overdue ${cap.finding.referenceNumber}: ${message}`);
        console.error(
          `  [Error] Failed to notify overdue for ${cap.finding.referenceNumber}:`,
          error
        );
      }
    }

    console.log("[CAP Deadline Checker] Complete:", result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(`Job failed: ${message}`);
    console.error("[CAP Deadline Checker] Job failed:", error);
    return result;
  }
}
