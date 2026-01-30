import { db } from "@/lib/db";

export interface DigestProcessingResult {
  sent: number;
  errors: number;
  skipped: number;
}

/**
 * Process pending notification digests
 * Should be called periodically (e.g., hourly)
 */
export async function processNotificationDigests(): Promise<DigestProcessingResult> {
  const now = new Date();
  let sent = 0;
  let errors = 0;
  let skipped = 0;

  // Find all pending digests that are due
  const pendingDigests = await db.notificationDigest.findMany({
    where: {
      scheduledFor: { lte: now },
      sentAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          locale: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  console.log(
    `[NotificationJobs] Processing ${pendingDigests.length} pending digests`
  );

  for (const digest of pendingDigests) {
    try {
      // Get the notifications in this digest
      const notifications = await db.notification.findMany({
        where: { id: { in: digest.notificationIds } },
        orderBy: { createdAt: "desc" },
      });

      if (notifications.length === 0) {
        // No notifications, just mark as sent
        await db.notificationDigest.update({
          where: { id: digest.id },
          data: { sentAt: now },
        });
        skipped++;
        continue;
      }

      // Group notifications by type for summary
      const byType = notifications.reduce(
        (acc, n) => {
          acc[n.type] = (acc[n.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Determine language
      const isFrench = digest.user.locale === "FR";

      // Build digest content
      const subject = isFrench
        ? `Résumé de vos notifications (${notifications.length})`
        : `Your Notification Summary (${notifications.length})`;

      const greeting = isFrench
        ? `Bonjour ${digest.user.firstName || ""},`
        : `Hello ${digest.user.firstName || ""},`;

      const intro = isFrench
        ? `Voici un résumé de vos ${notifications.length} notification(s) depuis votre dernier résumé:`
        : `Here's a summary of your ${notifications.length} notification(s) since your last digest:`;

      // Build type summary
      const typeSummary = Object.entries(byType)
        .map(([type, count]) => `  - ${formatNotificationType(type, isFrench)}: ${count}`)
        .join("\n");

      // Build notification list (limited to top 10)
      const notificationList = notifications
        .slice(0, 10)
        .map((n) => {
          const title = isFrench ? n.titleFr : n.titleEn;
          const message = isFrench ? n.messageFr : n.messageEn;
          return `• ${title}\n  ${message.substring(0, 100)}${message.length > 100 ? "..." : ""}`;
        })
        .join("\n\n");

      const moreText =
        notifications.length > 10
          ? isFrench
            ? `\n\n... et ${notifications.length - 10} autre(s) notification(s)`
            : `\n\n... and ${notifications.length - 10} more notification(s)`
          : "";

      // TODO: Send actual email via Resend or other service
      console.log(`[Digest Email] To: ${digest.user.email}`);
      console.log(`Subject: ${subject}`);
      console.log(`---`);
      console.log(greeting);
      console.log(intro);
      console.log(`\nSummary by type:\n${typeSummary}`);
      console.log(`\nRecent notifications:\n${notificationList}${moreText}`);
      console.log(`---\n`);

      // Mark digest as sent
      await db.notificationDigest.update({
        where: { id: digest.id },
        data: { sentAt: now },
      });

      // Update notifications to mark them as emailed
      await db.notification.updateMany({
        where: { id: { in: digest.notificationIds } },
        data: { emailSentAt: now },
      });

      sent++;
    } catch (error) {
      console.error(`[NotificationJobs] Failed to process digest ${digest.id}:`, error);
      errors++;
    }
  }

  console.log(
    `[NotificationJobs] Completed: ${sent} sent, ${skipped} skipped, ${errors} errors`
  );

  return { sent, errors, skipped };
}

/**
 * Clean up old sent digests
 */
export async function cleanupOldDigests(daysOld: number = 30): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);

  const result = await db.notificationDigest.deleteMany({
    where: {
      sentAt: { not: null, lt: cutoff },
    },
  });

  console.log(`[NotificationJobs] Cleaned up ${result.count} old digests`);
  return result.count;
}

/**
 * Format notification type for display
 */
function formatNotificationType(type: string, isFrench: boolean): string {
  const typeLabels: Record<string, { en: string; fr: string }> = {
    REVIEW_ASSIGNED: { en: "Review Assigned", fr: "Examen assigné" },
    REVIEW_STATUS_CHANGE: {
      en: "Review Status Change",
      fr: "Changement de statut d'examen",
    },
    FINDING_CREATED: { en: "Finding Created", fr: "Constatation créée" },
    FINDING_STATUS_CHANGE: {
      en: "Finding Status Change",
      fr: "Changement de statut de constatation",
    },
    CAP_ASSIGNED: { en: "CAP Assigned", fr: "PAC assigné" },
    CAP_STATUS_CHANGE: {
      en: "CAP Status Change",
      fr: "Changement de statut de PAC",
    },
    CAP_OVERDUE: { en: "CAP Overdue", fr: "PAC en retard" },
    CAP_DEADLINE_APPROACHING: {
      en: "CAP Deadline Approaching",
      fr: "Échéance PAC approchante",
    },
    COMMENT_ADDED: { en: "Comment Added", fr: "Commentaire ajouté" },
    DOCUMENT_UPLOADED: { en: "Document Uploaded", fr: "Document téléchargé" },
    TEAM_INVITATION: { en: "Team Invitation", fr: "Invitation d'équipe" },
    SYSTEM_ANNOUNCEMENT: {
      en: "System Announcement",
      fr: "Annonce système",
    },
    REMINDER: { en: "Reminder", fr: "Rappel" },
  };

  const label = typeLabels[type];
  if (label) {
    return isFrench ? label.fr : label.en;
  }

  // Fallback: format the enum value
  return type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Get digest statistics
 */
export async function getDigestStats(): Promise<{
  pending: number;
  sentToday: number;
  sentThisWeek: number;
}> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const [pending, sentToday, sentThisWeek] = await Promise.all([
    db.notificationDigest.count({
      where: { sentAt: null, scheduledFor: { lte: now } },
    }),
    db.notificationDigest.count({
      where: { sentAt: { gte: todayStart } },
    }),
    db.notificationDigest.count({
      where: { sentAt: { gte: weekStart } },
    }),
  ]);

  return { pending, sentToday, sentThisWeek };
}
