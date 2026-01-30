import { db } from "@/lib/db";
import type { DigestFrequency, NotificationType, Prisma } from "@prisma/client";

export interface NotificationPreferences {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  digestFrequency: DigestFrequency;
  typeSettings: Record<string, boolean>;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
  maxPerHour: number;
  maxPerDay: number;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  emailEnabled: true,
  inAppEnabled: true,
  digestFrequency: "IMMEDIATE",
  typeSettings: {},
  quietHoursStart: null,
  quietHoursEnd: null,
  timezone: "UTC",
  maxPerHour: 10,
  maxPerDay: 50,
};

export class NotificationPreferenceService {
  /**
   * Get user's notification preferences, returning defaults if not set
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const prefs = await db.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      return DEFAULT_PREFERENCES;
    }

    return {
      emailEnabled: prefs.emailEnabled,
      inAppEnabled: prefs.inAppEnabled,
      digestFrequency: prefs.digestFrequency,
      typeSettings: prefs.typeSettings as Record<string, boolean>,
      quietHoursStart: prefs.quietHoursStart,
      quietHoursEnd: prefs.quietHoursEnd,
      timezone: prefs.timezone,
      maxPerHour: prefs.maxPerHour,
      maxPerDay: prefs.maxPerDay,
    };
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<void> {
    const data: Prisma.NotificationPreferenceUpdateInput = {};

    if (updates.emailEnabled !== undefined) {
      data.emailEnabled = updates.emailEnabled;
    }
    if (updates.inAppEnabled !== undefined) {
      data.inAppEnabled = updates.inAppEnabled;
    }
    if (updates.digestFrequency !== undefined) {
      data.digestFrequency = updates.digestFrequency;
    }
    if (updates.typeSettings !== undefined) {
      data.typeSettings = updates.typeSettings as Prisma.InputJsonValue;
    }
    if (updates.quietHoursStart !== undefined) {
      data.quietHoursStart = updates.quietHoursStart;
    }
    if (updates.quietHoursEnd !== undefined) {
      data.quietHoursEnd = updates.quietHoursEnd;
    }
    if (updates.timezone !== undefined) {
      data.timezone = updates.timezone;
    }
    if (updates.maxPerHour !== undefined) {
      data.maxPerHour = updates.maxPerHour;
    }
    if (updates.maxPerDay !== undefined) {
      data.maxPerDay = updates.maxPerDay;
    }

    await db.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        emailEnabled: updates.emailEnabled ?? DEFAULT_PREFERENCES.emailEnabled,
        inAppEnabled: updates.inAppEnabled ?? DEFAULT_PREFERENCES.inAppEnabled,
        digestFrequency:
          updates.digestFrequency ?? DEFAULT_PREFERENCES.digestFrequency,
        typeSettings:
          (updates.typeSettings as Prisma.InputJsonValue) ??
          (DEFAULT_PREFERENCES.typeSettings as Prisma.InputJsonValue),
        quietHoursStart:
          updates.quietHoursStart ?? DEFAULT_PREFERENCES.quietHoursStart,
        quietHoursEnd:
          updates.quietHoursEnd ?? DEFAULT_PREFERENCES.quietHoursEnd,
        timezone: updates.timezone ?? DEFAULT_PREFERENCES.timezone,
        maxPerHour: updates.maxPerHour ?? DEFAULT_PREFERENCES.maxPerHour,
        maxPerDay: updates.maxPerDay ?? DEFAULT_PREFERENCES.maxPerDay,
      },
      update: data,
    });
  }

  /**
   * Check if a specific notification type is enabled for the user
   */
  async isTypeEnabled(
    userId: string,
    type: NotificationType
  ): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    const typeSetting = prefs.typeSettings[type];

    // Default to enabled if not explicitly disabled
    return typeSetting !== false;
  }

  /**
   * Toggle a specific notification type on/off
   */
  async toggleType(
    userId: string,
    type: NotificationType,
    enabled: boolean
  ): Promise<void> {
    const prefs = await this.getPreferences(userId);
    const typeSettings = { ...prefs.typeSettings, [type]: enabled };

    await this.updatePreferences(userId, { typeSettings });
  }

  /**
   * Check if notification can be sent now based on user preferences
   */
  async shouldSendNow(
    userId: string
  ): Promise<{ canSend: boolean; reason?: string }> {
    const prefs = await this.getPreferences(userId);

    // Check quiet hours
    if (prefs.quietHoursStart && prefs.quietHoursEnd) {
      const now = new Date();
      const userTime = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: prefs.timezone,
      }).format(now);

      if (
        this.isInQuietHours(
          userTime,
          prefs.quietHoursStart,
          prefs.quietHoursEnd
        )
      ) {
        return { canSend: false, reason: "quiet_hours" };
      }
    }

    // Check frequency caps
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [hourCount, dayCount] = await Promise.all([
      db.notification.count({
        where: { userId, createdAt: { gte: hourAgo } },
      }),
      db.notification.count({
        where: { userId, createdAt: { gte: dayAgo } },
      }),
    ]);

    if (hourCount >= prefs.maxPerHour) {
      return { canSend: false, reason: "hourly_cap" };
    }

    if (dayCount >= prefs.maxPerDay) {
      return { canSend: false, reason: "daily_cap" };
    }

    return { canSend: true };
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(
    current: string,
    start: string,
    end: string
  ): boolean {
    const [currentH, currentM] = current.split(":").map(Number);
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);

    const currentMin = currentH * 60 + currentM;
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (startMin <= endMin) {
      // Same day range
      return currentMin >= startMin && currentMin < endMin;
    } else {
      // Overnight range
      return currentMin >= startMin || currentMin < endMin;
    }
  }

  /**
   * Get user's digest frequency preference
   */
  async getDigestFrequency(userId: string): Promise<DigestFrequency> {
    const prefs = await this.getPreferences(userId);
    return prefs.digestFrequency;
  }

  /**
   * Check if user should receive emails
   */
  async isEmailEnabled(userId: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    return prefs.emailEnabled;
  }

  /**
   * Check if user should receive in-app notifications
   */
  async isInAppEnabled(userId: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    return prefs.inAppEnabled;
  }

  /**
   * Get users who need daily digest
   */
  async getUsersForDailyDigest(): Promise<string[]> {
    const users = await db.notificationPreference.findMany({
      where: { digestFrequency: "DAILY" },
      select: { userId: true },
    });
    return users.map((u) => u.userId);
  }

  /**
   * Get users who need weekly digest
   */
  async getUsersForWeeklyDigest(): Promise<string[]> {
    const users = await db.notificationPreference.findMany({
      where: { digestFrequency: "WEEKLY" },
      select: { userId: true },
    });
    return users.map((u) => u.userId);
  }

  /**
   * Create a digest entry for batched notifications
   */
  async createDigest(
    userId: string,
    frequency: DigestFrequency,
    notificationIds: string[],
    scheduledFor: Date
  ): Promise<string> {
    const digest = await db.notificationDigest.create({
      data: {
        userId,
        frequency,
        notificationIds,
        scheduledFor,
      },
    });
    return digest.id;
  }

  /**
   * Mark a digest as sent
   */
  async markDigestSent(digestId: string): Promise<void> {
    await db.notificationDigest.update({
      where: { id: digestId },
      data: { sentAt: new Date() },
    });
  }

  /**
   * Get pending digests for a user
   */
  async getPendingDigests(userId: string) {
    return db.notificationDigest.findMany({
      where: {
        userId,
        sentAt: null,
        scheduledFor: { lte: new Date() },
      },
      orderBy: { scheduledFor: "asc" },
    });
  }
}

export const notificationPreferenceService =
  new NotificationPreferenceService();
