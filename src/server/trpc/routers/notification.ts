/**
 * Notification Router
 *
 * Handles in-app notifications for users including:
 * - Fetching notifications (paginated, filterable)
 * - Marking notifications as read
 * - Getting unread count
 * - Notification preferences
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { NotificationType, NotificationPriority, DigestFrequency } from "@prisma/client";
import { notificationPreferenceService } from "@/server/services/notification";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const listNotificationsSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(50).default(20),
  unreadOnly: z.boolean().optional().default(false),
  type: z.nativeEnum(NotificationType).optional(),
  priority: z.nativeEnum(NotificationPriority).optional(),
});

// =============================================================================
// ROUTER
// =============================================================================

export const notificationRouter = router({
  /**
   * Get paginated list of notifications for the current user
   */
  list: protectedProcedure
    .input(listNotificationsSchema)
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const { page, pageSize, unreadOnly, type, priority } = input;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {
        userId: user.id,
      };

      if (unreadOnly) {
        where.readAt = null;
      }

      if (type) {
        where.type = type;
      }

      if (priority) {
        where.priority = priority;
      }

      const [notifications, total] = await Promise.all([
        ctx.db.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: pageSize,
          skip: (page - 1) * pageSize,
        }),
        ctx.db.notification.count({ where }),
      ]);

      return {
        notifications,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasMore: page * pageSize < total,
        },
      };
    }),

  /**
   * Get recent notifications (for dropdown)
   * Optimized: parallel queries, selected fields only
   * Handles network errors gracefully
   */
  getRecent: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      try {
        // Run both queries in parallel for better performance
        const [notifications, unreadCount] = await Promise.all([
          ctx.db.notification.findMany({
            where: { userId: user.id },
            select: {
              id: true,
              type: true,
              titleEn: true,
              titleFr: true,
              messageEn: true,
              messageFr: true,
              priority: true,
              actionUrl: true,
              readAt: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: input.limit,
          }),
          ctx.db.notification.count({
            where: {
              userId: user.id,
              readAt: null,
            },
          }),
        ]);

        return {
          notifications,
          unreadCount,
        };
      } catch (error) {
        // Handle network/DNS errors gracefully
        if (error instanceof Error &&
            (error.message.includes('EAI_AGAIN') ||
             error.message.includes('ECONNREFUSED') ||
             error.message.includes('ETIMEDOUT'))) {
          console.warn('[Notification] Database connection failed:', error.message);
          return { notifications: [], unreadCount: 0 };
        }
        throw error;
      }
    }),

  /**
   * Get unread notification count
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;

    const count = await ctx.db.notification.count({
      where: {
        userId: user.id,
        readAt: null,
      },
    });

    return { count };
  }),

  /**
   * Mark a single notification as read
   */
  markAsRead: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      // Verify ownership
      const notification = await ctx.db.notification.findUnique({
        where: { id: input.id },
      });

      if (!notification) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      if (notification.userId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only mark your own notifications as read",
        });
      }

      // Already read
      if (notification.readAt) {
        return notification;
      }

      return ctx.db.notification.update({
        where: { id: input.id },
        data: { readAt: new Date() },
      });
    }),

  /**
   * Mark multiple notifications as read
   */
  markMultipleAsRead: protectedProcedure
    .input(z.object({ ids: z.array(z.string().cuid()) }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const result = await ctx.db.notification.updateMany({
        where: {
          id: { in: input.ids },
          userId: user.id,
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      return { count: result.count };
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const { user } = ctx.session;

    const result = await ctx.db.notification.updateMany({
      where: {
        userId: user.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return { count: result.count };
  }),

  /**
   * Delete a notification
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      // Verify ownership
      const notification = await ctx.db.notification.findUnique({
        where: { id: input.id },
      });

      if (!notification) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      if (notification.userId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own notifications",
        });
      }

      await ctx.db.notification.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Delete all read notifications
   */
  deleteAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const { user } = ctx.session;

    const result = await ctx.db.notification.deleteMany({
      where: {
        userId: user.id,
        readAt: { not: null },
      },
    });

    return { count: result.count };
  }),

  /**
   * Get notification by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const notification = await ctx.db.notification.findUnique({
        where: { id: input.id },
      });

      if (!notification) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      if (notification.userId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only view your own notifications",
        });
      }

      // Mark as read when viewing
      if (!notification.readAt) {
        await ctx.db.notification.update({
          where: { id: input.id },
          data: { readAt: new Date() },
        });
      }

      return notification;
    }),

  /**
   * Get notification statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;

    const [total, unread, byType, byPriority] = await Promise.all([
      ctx.db.notification.count({
        where: { userId: user.id },
      }),
      ctx.db.notification.count({
        where: { userId: user.id, readAt: null },
      }),
      ctx.db.notification.groupBy({
        by: ["type"],
        where: { userId: user.id, readAt: null },
        _count: true,
      }),
      ctx.db.notification.groupBy({
        by: ["priority"],
        where: { userId: user.id, readAt: null },
        _count: true,
      }),
    ]);

    return {
      total,
      unread,
      read: total - unread,
      byType: byType.reduce(
        (acc, item) => ({ ...acc, [item.type]: item._count }),
        {} as Record<NotificationType, number>
      ),
      byPriority: byPriority.reduce(
        (acc, item) => ({ ...acc, [item.priority]: item._count }),
        {} as Record<NotificationPriority, number>
      ),
    };
  }),

  // ===========================================================================
  // NOTIFICATION PREFERENCES
  // ===========================================================================

  /**
   * Get user's notification preferences
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    return notificationPreferenceService.getPreferences(ctx.session.user.id);
  }),

  /**
   * Update user's notification preferences
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        emailEnabled: z.boolean().optional(),
        inAppEnabled: z.boolean().optional(),
        digestFrequency: z.nativeEnum(DigestFrequency).optional(),
        typeSettings: z.record(z.string(), z.boolean()).optional(),
        quietHoursStart: z.string().nullable().optional(),
        quietHoursEnd: z.string().nullable().optional(),
        timezone: z.string().optional(),
        maxPerHour: z.number().min(1).max(100).optional(),
        maxPerDay: z.number().min(1).max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await notificationPreferenceService.updatePreferences(
        ctx.session.user.id,
        input
      );
      return { success: true };
    }),

  /**
   * Toggle a specific notification type on/off
   */
  toggleType: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(NotificationType),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await notificationPreferenceService.toggleType(
        ctx.session.user.id,
        input.type,
        input.enabled
      );
      return { success: true };
    }),

  /**
   * Delete all notifications (read and unread)
   */
  deleteAll: protectedProcedure.mutation(async ({ ctx }) => {
    const { user } = ctx.session;

    const result = await ctx.db.notification.deleteMany({
      where: { userId: user.id },
    });

    return { success: true, count: result.count };
  }),
});
