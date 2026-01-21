/**
 * Notification Service
 *
 * Core service for dispatching in-app and email notifications.
 * Handles notification creation, recipient resolution, and email delivery.
 */

import { prisma } from "@/lib/db";
import { Resend } from "resend";
import type {
  NotificationType,
  NotificationPriority,
  UserRole,
  Locale,
  Prisma,
} from "@prisma/client";

// =============================================================================
// EMAIL CLIENT
// =============================================================================

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL =
  process.env.FROM_EMAIL || "African ANSP Peer Review <notifications@aaprp.org>";

// =============================================================================
// TYPES
// =============================================================================

export interface NotificationPayload {
  type: NotificationType;
  titleEn: string;
  titleFr: string;
  messageEn: string;
  messageFr: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  actionLabelEn?: string;
  actionLabelFr?: string;
  priority?: NotificationPriority;
  data?: Prisma.InputJsonValue;
}

export interface NotificationRecipient {
  userId: string;
  email: string;
  locale: Locale;
  emailNotifications: boolean;
  firstName?: string;
  lastName?: string;
}

export interface SendNotificationOptions {
  /** Skip email delivery (in-app only) */
  skipEmail?: boolean;
  /** Custom email subject (uses title if not provided) */
  emailSubject?: string;
}

export interface SendNotificationResult {
  inAppCount: number;
  emailCount: number;
  errors: string[];
}

// =============================================================================
// SEND NOTIFICATION
// =============================================================================

/**
 * Send notifications to multiple recipients.
 * Creates in-app notifications and optionally sends emails.
 *
 * @param recipients - Array of notification recipients
 * @param payload - Notification content and metadata
 * @param options - Optional configuration
 * @returns Result with counts and any errors
 */
export async function sendNotification(
  recipients: NotificationRecipient[],
  payload: NotificationPayload,
  options: SendNotificationOptions = {}
): Promise<SendNotificationResult> {
  const result: SendNotificationResult = {
    inAppCount: 0,
    emailCount: 0,
    errors: [],
  };

  if (recipients.length === 0) {
    return result;
  }

  // Create in-app notifications
  try {
    const notifications = recipients.map((recipient) => ({
      userId: recipient.userId,
      type: payload.type,
      titleEn: payload.titleEn,
      titleFr: payload.titleFr,
      messageEn: payload.messageEn,
      messageFr: payload.messageFr,
      entityType: payload.entityType,
      entityId: payload.entityId,
      actionUrl: payload.actionUrl,
      actionLabelEn: payload.actionLabelEn,
      actionLabelFr: payload.actionLabelFr,
      priority: payload.priority ?? "NORMAL",
      data: payload.data ?? undefined,
    }));

    const created = await prisma.notification.createMany({
      data: notifications,
    });

    result.inAppCount = created.count;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create notifications";
    result.errors.push(message);
    console.error("[NotificationService] Failed to create in-app notifications:", error);
  }

  // Send emails if not skipped
  if (!options.skipEmail) {
    const emailRecipients = recipients.filter((r) => r.emailNotifications);

    for (const recipient of emailRecipients) {
      try {
        const sent = await sendNotificationEmail(recipient, payload, options);
        if (sent) {
          result.emailCount++;

          // Update emailSentAt timestamp
          await prisma.notification.updateMany({
            where: {
              userId: recipient.userId,
              type: payload.type,
              entityType: payload.entityType ?? undefined,
              entityId: payload.entityId ?? undefined,
              emailSentAt: null,
            },
            data: {
              emailSentAt: new Date(),
            },
          });
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : `Failed to send email to ${recipient.email}`;
        result.errors.push(message);
        console.error(`[NotificationService] Email error for ${recipient.email}:`, error);
      }
    }
  }

  return result;
}

/**
 * Send a single notification email.
 * Uses locale to select EN/FR content.
 */
async function sendNotificationEmail(
  recipient: NotificationRecipient,
  payload: NotificationPayload,
  options: SendNotificationOptions
): Promise<boolean> {
  const isFrench = recipient.locale === "FR";
  const title = isFrench ? payload.titleFr : payload.titleEn;
  const message = isFrench ? payload.messageFr : payload.messageEn;
  const actionLabel = isFrench
    ? payload.actionLabelFr || "Voir les détails"
    : payload.actionLabelEn || "View Details";
  const subject = options.emailSubject || title;

  const recipientName =
    recipient.firstName && recipient.lastName
      ? `${recipient.firstName} ${recipient.lastName}`
      : recipient.firstName || "User";

  // Dev fallback without Resend API key
  if (!resend) {
    console.log(`[DEV EMAIL] To: ${recipient.email}`);
    console.log(`[DEV EMAIL] Subject: ${subject}`);
    console.log(`[DEV EMAIL] Message: ${message}`);
    if (payload.actionUrl) {
      console.log(`[DEV EMAIL] Action: ${actionLabel} -> ${payload.actionUrl}`);
    }
    return true;
  }

  // Priority badge color
  const priorityColors: Record<NotificationPriority, string> = {
    LOW: "#94a3b8",
    NORMAL: "#3b82f6",
    HIGH: "#f59e0b",
    URGENT: "#ef4444",
  };
  const priorityColor = priorityColors[payload.priority ?? "NORMAL"];
  const priorityLabel = isFrench
    ? { LOW: "Basse", NORMAL: "Normale", HIGH: "Haute", URGENT: "Urgente" }[
        payload.priority ?? "NORMAL"
      ]
    : payload.priority ?? "NORMAL";

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipient.email,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e40af; margin: 0;">African ANSP Peer Review Programme</h1>
            <p style="color: #64748b; margin: 5px 0 0 0;">${
              isFrench
                ? "Initiative de Sécurité Aérienne Approuvée par l'OACI"
                : "ICAO-Endorsed Aviation Safety Initiative"
            }</p>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
              <span style="background: ${priorityColor}; color: white; font-size: 12px; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">
                ${priorityLabel}
              </span>
            </div>

            <h2 style="margin-top: 0; color: #1e293b;">${title}</h2>
            <p>${isFrench ? "Bonjour" : "Hello"} ${recipientName},</p>
            <p>${message}</p>

            ${
              payload.actionUrl
                ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${payload.actionUrl}"
                 style="background: #1e40af; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                ${actionLabel}
              </a>
            </div>
            `
                : ""
            }
          </div>

          <div style="text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            <p>${
              isFrench
                ? "Ceci est un message automatique du Programme de Revue par les Pairs des ANSP Africains."
                : "This is an automated message from the African ANSP Peer Review Programme."
            }</p>
            <p style="margin: 0;">&copy; 2026 AAPRP. ${
              isFrench ? "Tous droits réservés." : "All rights reserved."
            }</p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("[NotificationService] Resend error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[NotificationService] Failed to send email:", err);
    return false;
  }
}

// =============================================================================
// RECIPIENT HELPERS
// =============================================================================

/**
 * Get notification recipients by user role.
 * Optionally filters by organization.
 *
 * @param roles - Array of user roles to include
 * @param organizationId - Optional organization ID filter
 * @returns Array of notification recipients
 */
export async function getRecipientsByRole(
  roles: UserRole[],
  organizationId?: string
): Promise<NotificationRecipient[]> {
  const users = await prisma.user.findMany({
    where: {
      role: { in: roles },
      isActive: true,
      ...(organizationId && { organizationId }),
    },
    include: {
      preferences: {
        select: {
          emailNotifications: true,
        },
      },
    },
  });

  return users.map((user) => ({
    userId: user.id,
    email: user.email,
    locale: user.locale,
    emailNotifications: user.preferences?.emailNotifications ?? true,
    firstName: user.firstName,
    lastName: user.lastName,
  }));
}

/**
 * Get notification recipients for a specific review team.
 * Returns all team members (lead, reviewers, experts, observers, trainees).
 *
 * @param reviewId - The review ID to get team members for
 * @returns Array of notification recipients
 */
export async function getReviewTeamRecipients(
  reviewId: string
): Promise<NotificationRecipient[]> {
  const teamMembers = await prisma.reviewTeamMember.findMany({
    where: {
      reviewId,
    },
    include: {
      user: {
        include: {
          preferences: {
            select: {
              emailNotifications: true,
            },
          },
        },
      },
    },
  });

  return teamMembers
    .filter((tm) => tm.user.isActive)
    .map((tm) => ({
      userId: tm.user.id,
      email: tm.user.email,
      locale: tm.user.locale,
      emailNotifications: tm.user.preferences?.emailNotifications ?? true,
      firstName: tm.user.firstName,
      lastName: tm.user.lastName,
    }));
}

/**
 * Get recipients for host organization of a review.
 * Returns users with specific roles in the host organization.
 *
 * @param reviewId - The review ID
 * @param roles - Roles to include (defaults to management roles)
 * @returns Array of notification recipients
 */
export async function getHostOrganizationRecipients(
  reviewId: string,
  roles: UserRole[] = ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"]
): Promise<NotificationRecipient[]> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { hostOrganizationId: true },
  });

  if (!review) {
    return [];
  }

  return getRecipientsByRole(roles, review.hostOrganizationId);
}

/**
 * Get programme management recipients.
 * Returns users with programme coordination/management roles.
 *
 * @returns Array of notification recipients
 */
export async function getProgrammeManagementRecipients(): Promise<
  NotificationRecipient[]
> {
  return getRecipientsByRole([
    "SUPER_ADMIN",
    "PROGRAMME_COORDINATOR",
    "STEERING_COMMITTEE",
  ]);
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Send a notification to a single user by ID.
 */
export async function notifyUser(
  userId: string,
  payload: NotificationPayload,
  options: SendNotificationOptions = {}
): Promise<SendNotificationResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      preferences: {
        select: {
          emailNotifications: true,
        },
      },
    },
  });

  if (!user) {
    return { inAppCount: 0, emailCount: 0, errors: ["User not found"] };
  }

  const recipient: NotificationRecipient = {
    userId: user.id,
    email: user.email,
    locale: user.locale,
    emailNotifications: user.preferences?.emailNotifications ?? true,
    firstName: user.firstName,
    lastName: user.lastName,
  };

  return sendNotification([recipient], payload, options);
}

/**
 * Send a notification to multiple users by IDs.
 */
export async function notifyUsers(
  userIds: string[],
  payload: NotificationPayload,
  options: SendNotificationOptions = {}
): Promise<SendNotificationResult> {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    include: {
      preferences: {
        select: {
          emailNotifications: true,
        },
      },
    },
  });

  const recipients: NotificationRecipient[] = users.map((user) => ({
    userId: user.id,
    email: user.email,
    locale: user.locale,
    emailNotifications: user.preferences?.emailNotifications ?? true,
    firstName: user.firstName,
    lastName: user.lastName,
  }));

  return sendNotification(recipients, payload, options);
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  try {
    await prisma.notification.update({
      where: {
        id: notificationId,
        userId, // Ensure user owns this notification
      },
      data: {
        readAt: new Date(),
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
  return result.count;
}

/**
 * Get unread notification count for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}
