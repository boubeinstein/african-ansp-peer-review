import { db } from "@/lib/db";
import type {
  NotificationType,
  NotificationPriority,
  DigestFrequency,
  Prisma,
} from "@prisma/client";
import { notificationPreferenceService } from "./preference-service";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  titleEn: string;
  titleFr: string;
  messageEn: string;
  messageFr: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  actionLabelEn?: string;
  actionLabelFr?: string;
  metadata?: Record<string, unknown>;
}

export interface BulkNotificationInput
  extends Omit<CreateNotificationInput, "userId"> {
  userIds: string[];
}

export interface NotificationResult {
  created: boolean;
  notificationId?: string;
  digestId?: string;
  reason?: string;
}

export class NotificationService {
  /**
   * Create a notification with preference awareness
   */
  async create(input: CreateNotificationInput): Promise<NotificationResult> {
    const { userId, type, priority = "NORMAL" } = input;

    // Check if type is enabled for user
    const typeEnabled = await notificationPreferenceService.isTypeEnabled(
      userId,
      type
    );
    if (!typeEnabled) {
      return { created: false, reason: "type_disabled" };
    }

    // Get user preferences
    const prefs = await notificationPreferenceService.getPreferences(userId);

    // Check if in-app notifications are enabled
    if (!prefs.inAppEnabled) {
      return { created: false, reason: "in_app_disabled" };
    }

    // Handle based on digest frequency (URGENT bypasses digest)
    if (prefs.digestFrequency !== "IMMEDIATE" && priority !== "URGENT") {
      return this.addToDigest(userId, input, prefs.digestFrequency);
    }

    // Check rate limits and quiet hours (URGENT bypasses these too)
    const { canSend } =
      await notificationPreferenceService.shouldSendNow(userId);
    if (!canSend && priority !== "URGENT") {
      // Queue for next daily digest instead
      return this.addToDigest(userId, input, "DAILY");
    }

    // Create notification immediately
    const notification = await db.notification.create({
      data: {
        userId,
        type,
        priority,
        titleEn: input.titleEn,
        titleFr: input.titleFr,
        messageEn: input.messageEn,
        messageFr: input.messageFr,
        entityType: input.entityType,
        entityId: input.entityId,
        actionUrl: input.actionUrl,
        actionLabelEn: input.actionLabelEn,
        actionLabelFr: input.actionLabelFr,
        data: (input.metadata || {}) as Prisma.InputJsonValue,
      },
    });

    // Queue email if enabled and immediate delivery
    if (prefs.emailEnabled && prefs.digestFrequency === "IMMEDIATE") {
      await this.queueEmailNotification(userId, notification.id);
    }

    return { created: true, notificationId: notification.id };
  }

  /**
   * Create notifications for multiple users
   */
  async createBulk(
    input: BulkNotificationInput
  ): Promise<{ successful: number; failed: number; results: NotificationResult[] }> {
    const results: NotificationResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const userId of input.userIds) {
      const result = await this.create({ ...input, userId });
      results.push(result);
      if (result.created) {
        successful++;
      } else {
        failed++;
      }
    }

    return { successful, failed, results };
  }

  /**
   * Create notifications for users with specific roles
   */
  async createForRoles(
    roles: string[],
    input: Omit<CreateNotificationInput, "userId">
  ): Promise<{ successful: number; failed: number }> {
    const users = await db.user.findMany({
      where: {
        role: { in: roles as Prisma.EnumUserRoleFilter<"User">["in"] },
        isActive: true,
      },
      select: { id: true },
    });

    const { successful, failed } = await this.createBulk({
      ...input,
      userIds: users.map((u) => u.id),
    });

    return { successful, failed };
  }

  /**
   * Create notifications for users in a specific organization
   */
  async createForOrganization(
    organizationId: string,
    input: Omit<CreateNotificationInput, "userId">,
    roles?: string[]
  ): Promise<{ successful: number; failed: number }> {
    const where: Prisma.UserWhereInput = {
      organizationId,
      isActive: true,
    };

    if (roles?.length) {
      where.role = { in: roles as Prisma.EnumUserRoleFilter<"User">["in"] };
    }

    const users = await db.user.findMany({
      where,
      select: { id: true },
    });

    const { successful, failed } = await this.createBulk({
      ...input,
      userIds: users.map((u) => u.id),
    });

    return { successful, failed };
  }

  /**
   * Add notification to a digest for batched delivery
   */
  private async addToDigest(
    userId: string,
    input: CreateNotificationInput,
    frequency: DigestFrequency
  ): Promise<NotificationResult> {
    // Create the notification but mark it for digest
    const notification = await db.notification.create({
      data: {
        userId,
        type: input.type,
        priority: input.priority || "NORMAL",
        titleEn: input.titleEn,
        titleFr: input.titleFr,
        messageEn: input.messageEn,
        messageFr: input.messageFr,
        entityType: input.entityType,
        entityId: input.entityId,
        actionUrl: input.actionUrl,
        actionLabelEn: input.actionLabelEn,
        actionLabelFr: input.actionLabelFr,
        data: {
          ...(input.metadata || {}),
          forDigest: true,
          digestFrequency: frequency,
        } as Prisma.InputJsonValue,
      },
    });

    // Find or create digest for this user/frequency
    const scheduledFor = this.getNextDigestTime(frequency);

    let digest = await db.notificationDigest.findFirst({
      where: {
        userId,
        frequency,
        scheduledFor,
        sentAt: null,
      },
    });

    if (digest) {
      // Add to existing digest
      await db.notificationDigest.update({
        where: { id: digest.id },
        data: {
          notificationIds: [...digest.notificationIds, notification.id],
        },
      });
    } else {
      // Create new digest
      digest = await db.notificationDigest.create({
        data: {
          userId,
          frequency,
          scheduledFor,
          notificationIds: [notification.id],
        },
      });
    }

    return {
      created: true,
      notificationId: notification.id,
      digestId: digest.id,
    };
  }

  /**
   * Calculate next digest delivery time
   */
  private getNextDigestTime(frequency: DigestFrequency): Date {
    const now = new Date();

    if (frequency === "DAILY") {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(8, 0, 0, 0); // 8 AM next day
      return next;
    } else if (frequency === "WEEKLY") {
      const next = new Date(now);
      const daysUntilMonday = (8 - next.getDay()) % 7 || 7;
      next.setDate(next.getDate() + daysUntilMonday);
      next.setHours(8, 0, 0, 0); // 8 AM next Monday
      return next;
    }

    return now;
  }

  /**
   * Queue an email notification for sending
   */
  private async queueEmailNotification(
    userId: string,
    notificationId: string
  ): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, locale: true },
    });

    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!user || !notification) return;

    const title =
      user.locale === "FR" ? notification.titleFr : notification.titleEn;
    const message =
      user.locale === "FR" ? notification.messageFr : notification.messageEn;

    // TODO: Integrate with Resend or other email service
    // For now, just log
    console.log(
      `[Email Queue] To: ${user.email}, Subject: ${title}, Preview: ${message.substring(0, 100)}...`
    );

    // Mark email as queued
    await db.notification.update({
      where: { id: notificationId },
      data: { emailSentAt: new Date() },
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await db.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return db.notification.count({
      where: { userId, readAt: null },
    });
  }

  /**
   * List notifications for a user
   */
  async list(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
    } = {}
  ) {
    const { limit = 20, offset = 0, unreadOnly = false, type } = options;

    return db.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { readAt: null }),
        ...(type && { type }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Delete old read notifications
   */
  async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const result = await db.notification.deleteMany({
      where: {
        readAt: { not: null },
        createdAt: { lt: cutoff },
      },
    });

    return result.count;
  }

  /**
   * Get notification by ID (with user verification)
   */
  async getById(notificationId: string, userId: string) {
    return db.notification.findFirst({
      where: { id: notificationId, userId },
    });
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string, userId: string): Promise<boolean> {
    const result = await db.notification.deleteMany({
      where: { id: notificationId, userId },
    });
    return result.count > 0;
  }
}

export const notificationService = new NotificationService();
