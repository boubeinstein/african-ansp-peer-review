import { prisma } from "@/lib/db";
import { sendEmail, sendBatchEmails } from "./resend";
import { notificationEmailTemplate } from "./templates/notification";
import { bestPracticePromotionEmailTemplate } from "./templates/best-practice-promotion";
import type { Notification, NotificationPreference, Locale } from "@prisma/client";

// Type for promotion target users (minimal fields needed)
export type PromotionTargetUser = {
  id: string;
  email: string;
  firstName: string;
  locale: Locale;
  notificationPreference: NotificationPreference | null;
};

// Type for notification with user
type NotificationWithUser = Notification & {
  user: {
    id: string;
    email: string;
    firstName: string;
    locale: Locale;
    notificationPreference: NotificationPreference | null;
  };
};

/**
 * Check if user has email notifications enabled for a notification type
 */
function isEmailEnabledForType(
  preference: NotificationPreference | null,
  notificationType: string
): boolean {
  // Default to enabled if no preference set
  if (!preference) return true;

  // Check global email enabled
  if (!preference.emailEnabled) return false;

  // Check type-specific settings
  const typeSettings = preference.typeSettings as Record<string, boolean> | null;
  if (typeSettings && typeof typeSettings[notificationType] === "boolean") {
    return typeSettings[notificationType];
  }

  // Default to enabled
  return true;
}

/**
 * Get user's preferred locale
 */
function getUserLocale(locale: Locale): "en" | "fr" {
  return locale === "FR" ? "fr" : "en";
}

/**
 * Check if email sending should be skipped (dev mode with test domain)
 */
function shouldSkipEmailSending(): boolean {
  const emailFrom = process.env.EMAIL_FROM || "";
  const apiKey = process.env.RESEND_API_KEY;

  // Skip if using Resend test domain or no API key
  if (emailFrom.includes("@resend.dev")) {
    return true;
  }

  if (!apiKey) {
    return true;
  }

  return false;
}

/**
 * Send email notification for a single notification record
 */
export async function sendNotificationEmail(
  notification: NotificationWithUser
): Promise<boolean> {
  const { user } = notification;

  // Check if email sending should be skipped
  if (shouldSkipEmailSending()) {
    console.log("[NotificationEmail] Skipped - using test domain or no API key");
    return false;
  }

  // Check if email is enabled for this notification type
  if (!isEmailEnabledForType(user.notificationPreference, notification.type)) {
    console.log(`[NotificationEmail] Skipped - email disabled for type ${notification.type}`);
    return false;
  }

  // Skip if already sent
  if (notification.emailSentAt) {
    console.log(`[NotificationEmail] Skipped - already sent`);
    return false;
  }

  const locale = getUserLocale(user.locale);
  const title = locale === "fr" ? notification.titleFr : notification.titleEn;
  const message = locale === "fr" ? notification.messageFr : notification.messageEn;
  const actionLabel = locale === "fr" ? notification.actionLabelFr : notification.actionLabelEn;

  const html = notificationEmailTemplate({
    recipientName: user.firstName,
    title,
    message,
    actionUrl: notification.actionUrl
      ? `${process.env.APP_URL}${notification.actionUrl}`
      : undefined,
    actionLabel: actionLabel || undefined,
    locale,
  });

  const result = await sendEmail({
    to: user.email,
    subject: title,
    html,
    tags: [
      { name: "notification_type", value: notification.type },
      { name: "notification_id", value: notification.id },
    ],
  });

  if (result.success) {
    // Mark as sent
    await prisma.notification.update({
      where: { id: notification.id },
      data: { emailSentAt: new Date() },
    });
  }

  return result.success;
}

/**
 * Send Best Practice promotion emails to target users
 */
export async function sendBestPracticePromotionEmails(params: {
  bestPractice: {
    id: string;
    titleEn: string;
    titleFr: string;
    descriptionEn: string | null;
    descriptionFr: string | null;
    category: string;
    organization: { nameEn: string; nameFr: string };
  };
  targetUsers: PromotionTargetUser[];
  customMessageEn?: string;
  customMessageFr?: string;
}): Promise<{ sent: number; skipped: number; failed: number }> {
  const { bestPractice, targetUsers, customMessageEn, customMessageFr } = params;

  // =========================================================================
  // SKIP EMAIL SENDING IN DEVELOPMENT (using Resend test domain)
  // =========================================================================
  if (shouldSkipEmailSending()) {
    console.log("[BestPracticePromotion] Email sending skipped - using test domain or no API key");
    console.log(`[BestPracticePromotion] ${targetUsers.length} in-app notifications were created successfully`);
    console.log("[BestPracticePromotion] To enable emails, verify a domain at https://resend.com/domains");
    return { sent: 0, skipped: targetUsers.length, failed: 0 };
  }
  // =========================================================================

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  // Filter users who have email enabled
  const eligibleUsers = targetUsers.filter((user) =>
    isEmailEnabledForType(user.notificationPreference, "BEST_PRACTICE_PROMOTED")
  );

  skipped = targetUsers.length - eligibleUsers.length;

  if (eligibleUsers.length === 0) {
    console.log("[BestPracticePromotion] No eligible users for email");
    return { sent, skipped, failed };
  }

  // Prepare emails
  const emails = eligibleUsers.map((user) => {
    const locale = getUserLocale(user.locale);
    const isEn = locale === "en";

    return {
      to: user.email,
      subject: isEn
        ? `📣 Recommended: ${bestPractice.titleEn}`
        : `📣 Recommandé : ${bestPractice.titleFr}`,
      html: bestPracticePromotionEmailTemplate({
        recipientName: user.firstName,
        bestPracticeTitle: isEn ? bestPractice.titleEn : bestPractice.titleFr,
        bestPracticeDescription:
          (isEn ? bestPractice.descriptionEn : bestPractice.descriptionFr) || "",
        originatingOrg: isEn
          ? bestPractice.organization.nameEn
          : bestPractice.organization.nameFr,
        category: bestPractice.category,
        customMessage: isEn ? customMessageEn : customMessageFr,
        actionUrl: `${process.env.APP_URL}/${locale}/best-practices/${bestPractice.id}`,
        locale,
      }),
    };
  });

  // Send in batches of 100 (Resend limit)
  const batchSize = 100;
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const result = await sendBatchEmails(batch);

    result.results.forEach((r) => {
      if (r.success) sent++;
      else failed++;
    });
  }

  console.log(
    `[BestPracticePromotion] Emails sent: ${sent}, skipped: ${skipped}, failed: ${failed}`
  );

  return { sent, skipped, failed };
}

/**
 * Process pending notification emails (for background job)
 */
export async function processPendingNotificationEmails(limit = 50): Promise<number> {
  // Skip if using test domain
  if (shouldSkipEmailSending()) {
    console.log("[ProcessEmails] Skipped - using test domain or no API key");
    return 0;
  }

  const pendingNotifications = await prisma.notification.findMany({
    where: {
      emailSentAt: null,
      createdAt: {
        // Only process notifications from the last 24 hours
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    include: {
      user: {
        include: {
          notificationPreference: true,
        },
      },
    },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  let sentCount = 0;

  for (const notification of pendingNotifications) {
    const success = await sendNotificationEmail(
      notification as unknown as NotificationWithUser
    );
    if (success) sentCount++;
  }

  return sentCount;
}