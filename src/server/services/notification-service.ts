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

// =============================================================================
// WORKFLOW NOTIFICATION FUNCTIONS
// =============================================================================

/**
 * Review data needed for notifications.
 */
interface ReviewForNotification {
  id: string;
  referenceNumber: string;
  hostOrganization: {
    id: string;
    nameEn: string;
    nameFr: string;
  };
  plannedStartDate?: Date | null;
  plannedEndDate?: Date | null;
}

/**
 * Finding data needed for notifications.
 */
interface FindingForNotification {
  id: string;
  referenceNumber: string;
  titleEn: string;
  titleFr: string;
  severity: string;
  review: {
    id: string;
    referenceNumber: string;
    hostOrganization: {
      id: string;
      nameEn: string;
      nameFr: string;
    };
  };
}

/**
 * CAP data needed for notifications.
 */
export interface CAPForNotification {
  id: string;
  dueDate: Date;
  assignedToId: string | null;
  finding: {
    id: string;
    referenceNumber: string;
    titleEn: string;
    titleFr: string;
    review: {
      id: string;
      referenceNumber: string;
      hostOrganization: {
        id: string;
        nameEn: string;
        nameFr: string;
      };
    };
  };
}

/**
 * Team member assignment info.
 */
interface TeamMemberAssignment {
  userId: string;
  role: string;
}

/**
 * Notify stakeholders when a new peer review is requested.
 * - Steering Committee: Approval needed
 * - Programme Coordinator: New request awareness
 * - Host ANSP Admin: Confirmation of submission
 *
 * @param review - Review with host organization data
 */
export async function notifyReviewRequested(
  review: ReviewForNotification
): Promise<SendNotificationResult[]> {
  const results: SendNotificationResult[] = [];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const reviewUrl = `${baseUrl}/reviews/${review.id}`;

  // 1. Notify Steering Committee (approval needed)
  const steeringCommittee = await getRecipientsByRole(["STEERING_COMMITTEE"]);
  if (steeringCommittee.length > 0) {
    const result = await sendNotification(steeringCommittee, {
      type: "REVIEW_REQUESTED",
      titleEn: "New Peer Review Request - Approval Required",
      titleFr: "Nouvelle Demande de Revue par les Pairs - Approbation Requise",
      messageEn: `${review.hostOrganization.nameEn} has submitted a peer review request (${review.referenceNumber}). Your approval is required to proceed.`,
      messageFr: `${review.hostOrganization.nameFr} a soumis une demande de revue par les pairs (${review.referenceNumber}). Votre approbation est requise pour continuer.`,
      entityType: "Review",
      entityId: review.id,
      actionUrl: reviewUrl,
      actionLabelEn: "Review Request",
      actionLabelFr: "Examiner la Demande",
      priority: "HIGH",
    });
    results.push(result);
  }

  // 2. Notify Programme Coordinators (awareness)
  const coordinators = await getRecipientsByRole(["PROGRAMME_COORDINATOR"]);
  if (coordinators.length > 0) {
    const result = await sendNotification(coordinators, {
      type: "REVIEW_REQUESTED",
      titleEn: "New Peer Review Request Submitted",
      titleFr: "Nouvelle Demande de Revue par les Pairs Soumise",
      messageEn: `A new peer review request (${review.referenceNumber}) has been submitted by ${review.hostOrganization.nameEn}. The request is pending Steering Committee approval.`,
      messageFr: `Une nouvelle demande de revue par les pairs (${review.referenceNumber}) a été soumise par ${review.hostOrganization.nameFr}. La demande est en attente d'approbation du Comité de Pilotage.`,
      entityType: "Review",
      entityId: review.id,
      actionUrl: reviewUrl,
      actionLabelEn: "View Request",
      actionLabelFr: "Voir la Demande",
      priority: "NORMAL",
    });
    results.push(result);
  }

  // 3. Confirm to Host ANSP Admin (submission received)
  const hostAdmins = await getRecipientsByRole(
    ["ANSP_ADMIN"],
    review.hostOrganization.id
  );
  if (hostAdmins.length > 0) {
    const result = await sendNotification(hostAdmins, {
      type: "REVIEW_REQUESTED",
      titleEn: "Peer Review Request Submitted Successfully",
      titleFr: "Demande de Revue par les Pairs Soumise avec Succès",
      messageEn: `Your peer review request (${review.referenceNumber}) has been submitted and is pending approval from the Steering Committee. You will be notified once a decision is made.`,
      messageFr: `Votre demande de revue par les pairs (${review.referenceNumber}) a été soumise et est en attente d'approbation du Comité de Pilotage. Vous serez notifié dès qu'une décision sera prise.`,
      entityType: "Review",
      entityId: review.id,
      actionUrl: reviewUrl,
      actionLabelEn: "View Request",
      actionLabelFr: "Voir la Demande",
      priority: "NORMAL",
    });
    results.push(result);
  }

  return results;
}

/**
 * Notify stakeholders when a peer review is approved.
 * - Host ANSP Admin: Approval confirmation
 * - Programme Coordinator: Planning can begin
 *
 * @param review - Review with host organization data
 */
export async function notifyReviewApproved(
  review: ReviewForNotification
): Promise<SendNotificationResult[]> {
  const results: SendNotificationResult[] = [];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const reviewUrl = `${baseUrl}/reviews/${review.id}`;

  // 1. Notify Host ANSP Admin (approval confirmation)
  const hostAdmins = await getRecipientsByRole(
    ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"],
    review.hostOrganization.id
  );
  if (hostAdmins.length > 0) {
    const result = await sendNotification(hostAdmins, {
      type: "REVIEW_APPROVED",
      titleEn: "Peer Review Request Approved",
      titleFr: "Demande de Revue par les Pairs Approuvée",
      messageEn: `Great news! Your peer review request (${review.referenceNumber}) has been approved by the Steering Committee. The review team will be assembled and you will be contacted regarding scheduling.`,
      messageFr: `Bonne nouvelle ! Votre demande de revue par les pairs (${review.referenceNumber}) a été approuvée par le Comité de Pilotage. L'équipe de revue sera constituée et vous serez contacté concernant la planification.`,
      entityType: "Review",
      entityId: review.id,
      actionUrl: reviewUrl,
      actionLabelEn: "View Review",
      actionLabelFr: "Voir la Revue",
      priority: "HIGH",
    });
    results.push(result);
  }

  // 2. Notify Programme Coordinators (planning can begin)
  const coordinators = await getRecipientsByRole(["PROGRAMME_COORDINATOR"]);
  if (coordinators.length > 0) {
    const result = await sendNotification(coordinators, {
      type: "REVIEW_APPROVED",
      titleEn: "Peer Review Approved - Planning Required",
      titleFr: "Revue par les Pairs Approuvée - Planification Requise",
      messageEn: `Peer review ${review.referenceNumber} for ${review.hostOrganization.nameEn} has been approved. Please proceed with team assembly and scheduling.`,
      messageFr: `La revue par les pairs ${review.referenceNumber} pour ${review.hostOrganization.nameFr} a été approuvée. Veuillez procéder à la constitution de l'équipe et à la planification.`,
      entityType: "Review",
      entityId: review.id,
      actionUrl: reviewUrl,
      actionLabelEn: "Start Planning",
      actionLabelFr: "Commencer la Planification",
      priority: "NORMAL",
    });
    results.push(result);
  }

  return results;
}

/**
 * Notify team members when they are assigned to a peer review.
 *
 * @param review - Review with host organization data
 * @param assignments - Array of team member assignments
 */
export async function notifyTeamAssigned(
  review: ReviewForNotification,
  assignments: TeamMemberAssignment[]
): Promise<SendNotificationResult[]> {
  const results: SendNotificationResult[] = [];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const reviewUrl = `${baseUrl}/reviews/${review.id}`;

  // Format dates for message
  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return "TBD";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const startDate = formatDate(review.plannedStartDate);
  const endDate = formatDate(review.plannedEndDate);
  const dateRange =
    review.plannedStartDate && review.plannedEndDate
      ? `${startDate} - ${endDate}`
      : "To be determined";
  const dateRangeFr =
    review.plannedStartDate && review.plannedEndDate
      ? `${startDate} - ${endDate}`
      : "À déterminer";

  // Role labels for messages
  const roleLabels: Record<string, { en: string; fr: string }> = {
    LEAD_REVIEWER: { en: "Lead Reviewer", fr: "Réviseur Principal" },
    REVIEWER: { en: "Reviewer", fr: "Réviseur" },
    TECHNICAL_EXPERT: { en: "Technical Expert", fr: "Expert Technique" },
    OBSERVER: { en: "Observer", fr: "Observateur" },
    TRAINEE: { en: "Trainee", fr: "Stagiaire" },
  };

  // Notify each assigned team member
  for (const assignment of assignments) {
    const roleLabel = roleLabels[assignment.role] || {
      en: assignment.role,
      fr: assignment.role,
    };

    const result = await notifyUser(assignment.userId, {
      type: "TEAM_ASSIGNED",
      titleEn: `You've Been Assigned to Peer Review ${review.referenceNumber}`,
      titleFr: `Vous avez été assigné à la Revue par les Pairs ${review.referenceNumber}`,
      messageEn: `You have been assigned as ${roleLabel.en} for the peer review of ${review.hostOrganization.nameEn} (${review.referenceNumber}). Review dates: ${dateRange}. Please review the details and confirm your availability.`,
      messageFr: `Vous avez été assigné en tant que ${roleLabel.fr} pour la revue par les pairs de ${review.hostOrganization.nameFr} (${review.referenceNumber}). Dates de la revue : ${dateRangeFr}. Veuillez consulter les détails et confirmer votre disponibilité.`,
      entityType: "Review",
      entityId: review.id,
      actionUrl: reviewUrl,
      actionLabelEn: "View Assignment",
      actionLabelFr: "Voir l'Assignation",
      priority: "HIGH",
      data: { role: assignment.role },
    });
    results.push(result);
  }

  // Notify Host ANSP that team has been assembled
  const hostAdmins = await getRecipientsByRole(
    ["ANSP_ADMIN", "SAFETY_MANAGER"],
    review.hostOrganization.id
  );
  if (hostAdmins.length > 0) {
    const result = await sendNotification(hostAdmins, {
      type: "TEAM_ASSIGNED",
      titleEn: `Review Team Assigned for ${review.referenceNumber}`,
      titleFr: `Équipe de Revue Assignée pour ${review.referenceNumber}`,
      messageEn: `The review team for your upcoming peer review (${review.referenceNumber}) has been assembled. ${assignments.length} team member(s) have been assigned. Review dates: ${dateRange}.`,
      messageFr: `L'équipe de revue pour votre prochaine revue par les pairs (${review.referenceNumber}) a été constituée. ${assignments.length} membre(s) de l'équipe ont été assignés. Dates de la revue : ${dateRangeFr}.`,
      entityType: "Review",
      entityId: review.id,
      actionUrl: reviewUrl,
      actionLabelEn: "View Team",
      actionLabelFr: "Voir l'Équipe",
      priority: "NORMAL",
    });
    results.push(result);
  }

  return results;
}

/**
 * Notify stakeholders when a peer review is scheduled.
 * - Team members: Confirmed dates
 * - Host ANSP: Schedule confirmation
 *
 * @param review - Review with host organization and dates
 */
export async function notifyReviewScheduled(
  review: ReviewForNotification
): Promise<SendNotificationResult[]> {
  const results: SendNotificationResult[] = [];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const reviewUrl = `${baseUrl}/reviews/${review.id}`;

  // Format dates
  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return "TBD";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const startDate = formatDate(review.plannedStartDate);
  const endDate = formatDate(review.plannedEndDate);

  // 1. Notify all team members
  const teamMembers = await getReviewTeamRecipients(review.id);
  if (teamMembers.length > 0) {
    const result = await sendNotification(teamMembers, {
      type: "REVIEW_SCHEDULED",
      titleEn: `Peer Review ${review.referenceNumber} - Schedule Confirmed`,
      titleFr: `Revue par les Pairs ${review.referenceNumber} - Calendrier Confirmé`,
      messageEn: `The schedule for peer review ${review.referenceNumber} at ${review.hostOrganization.nameEn} has been confirmed. The review will take place from ${startDate} to ${endDate}. Please ensure your travel and accommodation arrangements are in place.`,
      messageFr: `Le calendrier de la revue par les pairs ${review.referenceNumber} chez ${review.hostOrganization.nameFr} a été confirmé. La revue se déroulera du ${startDate} au ${endDate}. Veuillez vous assurer que vos arrangements de voyage et d'hébergement sont en place.`,
      entityType: "Review",
      entityId: review.id,
      actionUrl: reviewUrl,
      actionLabelEn: "View Schedule",
      actionLabelFr: "Voir le Calendrier",
      priority: "HIGH",
    });
    results.push(result);
  }

  // 2. Notify Host ANSP management
  const hostAdmins = await getRecipientsByRole(
    ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"],
    review.hostOrganization.id
  );
  if (hostAdmins.length > 0) {
    const result = await sendNotification(hostAdmins, {
      type: "REVIEW_SCHEDULED",
      titleEn: `Peer Review ${review.referenceNumber} - Schedule Confirmed`,
      titleFr: `Revue par les Pairs ${review.referenceNumber} - Calendrier Confirmé`,
      messageEn: `Your peer review (${review.referenceNumber}) has been scheduled from ${startDate} to ${endDate}. Please prepare documentation, arrange logistics, and ensure relevant staff are available during this period.`,
      messageFr: `Votre revue par les pairs (${review.referenceNumber}) a été planifiée du ${startDate} au ${endDate}. Veuillez préparer la documentation, organiser la logistique et vous assurer que le personnel concerné est disponible pendant cette période.`,
      entityType: "Review",
      entityId: review.id,
      actionUrl: reviewUrl,
      actionLabelEn: "View Details",
      actionLabelFr: "Voir les Détails",
      priority: "HIGH",
    });
    results.push(result);
  }

  return results;
}

/**
 * Notify stakeholders when a finding is created.
 * - Host ANSP management: New finding notification
 * - Assigned user (if any): Assignment notification
 *
 * @param finding - Finding with review and organization data
 */
export async function notifyFindingCreated(
  finding: FindingForNotification
): Promise<SendNotificationResult[]> {
  const results: SendNotificationResult[] = [];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const findingUrl = `${baseUrl}/findings/${finding.id}`;

  // Severity labels
  const severityLabels: Record<string, { en: string; fr: string }> = {
    CRITICAL: { en: "Critical", fr: "Critique" },
    MAJOR: { en: "Major", fr: "Majeur" },
    MINOR: { en: "Minor", fr: "Mineur" },
    OBSERVATION: { en: "Observation", fr: "Observation" },
  };
  const severityLabel = severityLabels[finding.severity] || {
    en: finding.severity,
    fr: finding.severity,
  };

  // Determine priority based on severity
  const priority: NotificationPriority =
    finding.severity === "CRITICAL"
      ? "URGENT"
      : finding.severity === "MAJOR"
        ? "HIGH"
        : "NORMAL";

  // Notify Host ANSP management
  const hostAdmins = await getRecipientsByRole(
    ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"],
    finding.review.hostOrganization.id
  );
  if (hostAdmins.length > 0) {
    const result = await sendNotification(hostAdmins, {
      type: "FINDING_CREATED",
      titleEn: `New ${severityLabel.en} Finding - ${finding.referenceNumber}`,
      titleFr: `Nouvelle Constatation ${severityLabel.fr} - ${finding.referenceNumber}`,
      messageEn: `A ${severityLabel.en.toLowerCase()} finding has been identified during peer review ${finding.review.referenceNumber}: "${finding.titleEn}". A corrective action plan may be required.`,
      messageFr: `Une constatation ${severityLabel.fr.toLowerCase()} a été identifiée lors de la revue par les pairs ${finding.review.referenceNumber} : "${finding.titleFr}". Un plan d'actions correctives peut être requis.`,
      entityType: "Finding",
      entityId: finding.id,
      actionUrl: findingUrl,
      actionLabelEn: "View Finding",
      actionLabelFr: "Voir la Constatation",
      priority,
    });
    results.push(result);
  }

  return results;
}

/**
 * Notify stakeholders when a Corrective Action Plan is overdue.
 * - Assigned user: Overdue reminder
 * - Host ANSP management: Escalation notification
 *
 * @param cap - CAP with finding and review data
 */
/**
 * Notify stakeholders when a peer review starts.
 * - Team members: Review is starting
 * - Host ANSP: Review has begun
 *
 * @param review - Review with host organization data
 */
export async function notifyReviewStarted(
  review: ReviewForNotification
): Promise<SendNotificationResult[]> {
  const results: SendNotificationResult[] = [];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const reviewUrl = `${baseUrl}/reviews/${review.id}`;

  // Format dates
  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return "TBD";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const endDate = formatDate(review.plannedEndDate);

  // 1. Notify all team members
  const teamMembers = await getReviewTeamRecipients(review.id);
  if (teamMembers.length > 0) {
    const result = await sendNotification(teamMembers, {
      type: "REVIEW_STARTED",
      titleEn: `Peer Review ${review.referenceNumber} Has Started`,
      titleFr: `La Revue par les Pairs ${review.referenceNumber} a Commencé`,
      messageEn: `The peer review at ${review.hostOrganization.nameEn} (${review.referenceNumber}) has officially started. Please ensure all assessment activities are conducted according to the review plan. Expected completion: ${endDate}.`,
      messageFr: `La revue par les pairs chez ${review.hostOrganization.nameFr} (${review.referenceNumber}) a officiellement commencé. Veuillez vous assurer que toutes les activités d'évaluation sont menées conformément au plan de revue. Achèvement prévu : ${endDate}.`,
      entityType: "Review",
      entityId: review.id,
      actionUrl: reviewUrl,
      actionLabelEn: "View Review",
      actionLabelFr: "Voir la Revue",
      priority: "HIGH",
    });
    results.push(result);
  }

  // 2. Notify Host ANSP management
  const hostAdmins = await getRecipientsByRole(
    ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"],
    review.hostOrganization.id
  );
  if (hostAdmins.length > 0) {
    const result = await sendNotification(hostAdmins, {
      type: "REVIEW_STARTED",
      titleEn: `Your Peer Review Has Started - ${review.referenceNumber}`,
      titleFr: `Votre Revue par les Pairs a Commencé - ${review.referenceNumber}`,
      messageEn: `The peer review (${review.referenceNumber}) has officially begun. Please ensure staff availability and provide access to documentation as requested by the review team.`,
      messageFr: `La revue par les pairs (${review.referenceNumber}) a officiellement commencé. Veuillez assurer la disponibilité du personnel et fournir l'accès à la documentation demandée par l'équipe de revue.`,
      entityType: "Review",
      entityId: review.id,
      actionUrl: reviewUrl,
      actionLabelEn: "View Details",
      actionLabelFr: "Voir les Détails",
      priority: "HIGH",
    });
    results.push(result);
  }

  return results;
}

/**
 * Notify stakeholders when a peer review is completed.
 * - Team members: Review completed acknowledgment
 * - Host ANSP: Review completed, report pending
 * - Programme management: Review completed
 *
 * @param review - Review with host organization data
 */
export async function notifyReviewCompleted(
  review: ReviewForNotification
): Promise<SendNotificationResult[]> {
  const results: SendNotificationResult[] = [];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const reviewUrl = `${baseUrl}/reviews/${review.id}`;

  // 1. Notify all team members
  const teamMembers = await getReviewTeamRecipients(review.id);
  if (teamMembers.length > 0) {
    const result = await sendNotification(teamMembers, {
      type: "REVIEW_COMPLETED",
      titleEn: `Peer Review ${review.referenceNumber} - Review Completed`,
      titleFr: `Revue par les Pairs ${review.referenceNumber} - Revue Terminée`,
      messageEn: `The peer review at ${review.hostOrganization.nameEn} (${review.referenceNumber}) has been completed. Thank you for your contribution to improving aviation safety in Africa.`,
      messageFr: `La revue par les pairs chez ${review.hostOrganization.nameFr} (${review.referenceNumber}) est terminée. Merci pour votre contribution à l'amélioration de la sécurité aérienne en Afrique.`,
      entityType: "Review",
      entityId: review.id,
      actionUrl: reviewUrl,
      actionLabelEn: "View Summary",
      actionLabelFr: "Voir le Résumé",
      priority: "NORMAL",
    });
    results.push(result);
  }

  // 2. Notify Host ANSP management
  const hostAdmins = await getRecipientsByRole(
    ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"],
    review.hostOrganization.id
  );
  if (hostAdmins.length > 0) {
    const result = await sendNotification(hostAdmins, {
      type: "REVIEW_COMPLETED",
      titleEn: `Peer Review Completed - ${review.referenceNumber}`,
      titleFr: `Revue par les Pairs Terminée - ${review.referenceNumber}`,
      messageEn: `Your peer review (${review.referenceNumber}) has been successfully completed. The final report will be shared with you shortly. Any findings requiring corrective action will be communicated separately.`,
      messageFr: `Votre revue par les pairs (${review.referenceNumber}) a été complétée avec succès. Le rapport final vous sera communiqué prochainement. Les constatations nécessitant des actions correctives seront communiquées séparément.`,
      entityType: "Review",
      entityId: review.id,
      actionUrl: reviewUrl,
      actionLabelEn: "View Review",
      actionLabelFr: "Voir la Revue",
      priority: "HIGH",
    });
    results.push(result);
  }

  // 3. Notify Programme Coordinators
  const coordinators = await getRecipientsByRole(["PROGRAMME_COORDINATOR"]);
  if (coordinators.length > 0) {
    const result = await sendNotification(coordinators, {
      type: "REVIEW_COMPLETED",
      titleEn: `Review Completed - ${review.hostOrganization.nameEn}`,
      titleFr: `Revue Terminée - ${review.hostOrganization.nameFr}`,
      messageEn: `Peer review ${review.referenceNumber} at ${review.hostOrganization.nameEn} has been completed. The final report is pending finalization.`,
      messageFr: `La revue par les pairs ${review.referenceNumber} chez ${review.hostOrganization.nameFr} est terminée. Le rapport final est en attente de finalisation.`,
      entityType: "Review",
      entityId: review.id,
      actionUrl: reviewUrl,
      actionLabelEn: "View Details",
      actionLabelFr: "Voir les Détails",
      priority: "NORMAL",
    });
    results.push(result);
  }

  return results;
}

export async function notifyCAPOverdue(
  cap: CAPForNotification
): Promise<SendNotificationResult[]> {
  const results: SendNotificationResult[] = [];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const capUrl = `${baseUrl}/findings/${cap.finding.id}/cap`;

  // Calculate days overdue
  const now = new Date();
  const dueDate = new Date(cap.dueDate);
  const daysOverdue = Math.ceil(
    (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const dueDateStr = dueDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // 1. Notify assigned user (if any)
  if (cap.assignedToId) {
    const result = await notifyUser(cap.assignedToId, {
      type: "CAP_OVERDUE",
      titleEn: `Corrective Action Plan Overdue - ${cap.finding.referenceNumber}`,
      titleFr: `Plan d'Actions Correctives en Retard - ${cap.finding.referenceNumber}`,
      messageEn: `The corrective action plan for finding "${cap.finding.titleEn}" is ${daysOverdue} day(s) overdue. The due date was ${dueDateStr}. Please complete the required actions or request an extension.`,
      messageFr: `Le plan d'actions correctives pour la constatation "${cap.finding.titleFr}" est en retard de ${daysOverdue} jour(s). La date d'échéance était le ${dueDateStr}. Veuillez compléter les actions requises ou demander une extension.`,
      entityType: "CAP",
      entityId: cap.id,
      actionUrl: capUrl,
      actionLabelEn: "Update CAP",
      actionLabelFr: "Mettre à jour le PAC",
      priority: "URGENT",
    });
    results.push(result);
  }

  // 2. Notify Host ANSP management (escalation)
  const hostAdmins = await getRecipientsByRole(
    ["ANSP_ADMIN", "SAFETY_MANAGER"],
    cap.finding.review.hostOrganization.id
  );
  if (hostAdmins.length > 0) {
    const result = await sendNotification(hostAdmins, {
      type: "CAP_OVERDUE",
      titleEn: `Overdue CAP Alert - ${cap.finding.referenceNumber}`,
      titleFr: `Alerte PAC en Retard - ${cap.finding.referenceNumber}`,
      messageEn: `A corrective action plan for finding "${cap.finding.titleEn}" from review ${cap.finding.review.referenceNumber} is now ${daysOverdue} day(s) overdue. Please ensure timely completion to maintain compliance.`,
      messageFr: `Un plan d'actions correctives pour la constatation "${cap.finding.titleFr}" de la revue ${cap.finding.review.referenceNumber} est maintenant en retard de ${daysOverdue} jour(s). Veuillez assurer une complétion rapide pour maintenir la conformité.`,
      entityType: "CAP",
      entityId: cap.id,
      actionUrl: capUrl,
      actionLabelEn: "View CAP",
      actionLabelFr: "Voir le PAC",
      priority: "HIGH",
    });
    results.push(result);
  }

  // 3. Notify Programme Coordinator (oversight)
  const coordinators = await getRecipientsByRole(["PROGRAMME_COORDINATOR"]);
  if (coordinators.length > 0) {
    const result = await sendNotification(coordinators, {
      type: "CAP_OVERDUE",
      titleEn: `Overdue CAP - ${cap.finding.review.hostOrganization.nameEn}`,
      titleFr: `PAC en Retard - ${cap.finding.review.hostOrganization.nameFr}`,
      messageEn: `Finding ${cap.finding.referenceNumber} from ${cap.finding.review.hostOrganization.nameEn} (${cap.finding.review.referenceNumber}) has an overdue corrective action plan (${daysOverdue} days).`,
      messageFr: `La constatation ${cap.finding.referenceNumber} de ${cap.finding.review.hostOrganization.nameFr} (${cap.finding.review.referenceNumber}) a un plan d'actions correctives en retard (${daysOverdue} jours).`,
      entityType: "CAP",
      entityId: cap.id,
      actionUrl: capUrl,
      actionLabelEn: "View Details",
      actionLabelFr: "Voir les Détails",
      priority: "NORMAL",
    });
    results.push(result);
  }

  return results;
}
