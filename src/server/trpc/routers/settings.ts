/**
 * Settings Router - User Preferences Management
 *
 * Provides procedures for managing user profile, preferences,
 * notification settings, and password management.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { Locale, Theme, DigestFrequency } from "@prisma/client";
import bcrypt from "bcryptjs";
import { logUpdate, logDelete } from "@/server/services/audit";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(100).optional(),
  lastName: z.string().min(2).max(100).optional(),
  title: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
});

const updatePreferencesSchema = z.object({
  locale: z.nativeEnum(Locale).optional(),
  theme: z.nativeEnum(Theme).optional(),
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).optional(),
  showTrainingModule: z.boolean().optional(),
  compactView: z.boolean().optional(),
});

const updateNotificationsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  notifyOnReviewAssignment: z.boolean().optional(),
  notifyOnFindingCreated: z.boolean().optional(),
  notifyOnCAPStatusChange: z.boolean().optional(),
  notifyOnReportReady: z.boolean().optional(),
  digestFrequency: z.nativeEnum(DigestFrequency).optional(),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must contain uppercase, lowercase, number, and special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// =============================================================================
// SETTINGS ROUTER
// =============================================================================

export const settingsRouter = router({
  /**
   * Get current user's profile with organization and preferences
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        organization: {
          select: {
            id: true,
            nameEn: true,
            nameFr: true,
            organizationCode: true,
            country: true,
            region: true,
          },
        },
        reviewerProfile: {
          select: {
            id: true,
            selectionStatus: true,
            isLeadQualified: true,
            reviewsCompleted: true,
          },
        },
        preferences: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Exclude sensitive fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }),

  /**
   * Get or create user preferences (creates default if none exist)
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // First verify user exists in database
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      // User doesn't exist in database - return default preferences
      // This can happen if session is stale or user was deleted
      console.warn(`[Settings] User ${userId} not found in database`);
      return {
        id: "default",
        userId,
        locale: "EN" as const,
        theme: "SYSTEM" as const,
        dateFormat: "DD/MM/YYYY",
        showTrainingModule: true,
        compactView: false,
        emailNotifications: true,
        notifyOnReviewAssignment: true,
        notifyOnFindingCreated: true,
        notifyOnCAPStatusChange: true,
        notifyOnReportReady: true,
        digestFrequency: "DAILY" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    let preferences = await ctx.db.userPreferences.findUnique({
      where: { userId },
    });

    // Create default preferences if none exist
    if (!preferences) {
      preferences = await ctx.db.userPreferences.create({
        data: {
          userId,
        },
      });
    }

    return preferences;
  }),

  /**
   * Update user profile information
   */
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
        include: {
          organization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
              organizationCode: true,
            },
          },
        },
      });

      // Exclude sensitive fields
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...safeUser } = updated;
      return safeUser;
    }),

  /**
   * Update display preferences (locale, theme, date format, etc.)
   */
  updatePreferences: protectedProcedure
    .input(updatePreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      // Also update user's locale and theme if provided
      const userUpdate: Record<string, unknown> = {};
      if (input.locale) userUpdate.locale = input.locale;
      if (input.theme) userUpdate.theme = input.theme;

      // Update user locale/theme if provided
      if (Object.keys(userUpdate).length > 0) {
        await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: userUpdate,
        });
      }

      // Upsert preferences
      return ctx.db.userPreferences.upsert({
        where: { userId: ctx.session.user.id },
        update: input,
        create: {
          userId: ctx.session.user.id,
          ...input,
        },
      });
    }),

  /**
   * Update notification preferences
   */
  updateNotifications: protectedProcedure
    .input(updateNotificationsSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.userPreferences.upsert({
        where: { userId: ctx.session.user.id },
        update: input,
        create: {
          userId: ctx.session.user.id,
          ...input,
        },
      });
    }),

  /**
   * Change user password
   */
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { passwordHash: true },
      });

      if (!user?.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change password for OAuth accounts",
        });
      }

      // Verify current password
      const isValid = await bcrypt.compare(
        input.currentPassword,
        user.passwordHash
      );

      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password is incorrect",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 12);

      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { passwordHash: hashedPassword },
      });

      // Audit log
      logUpdate({
        userId: ctx.session.user.id,
        entityType: "User",
        entityId: ctx.session.user.id,
        metadata: { action: "password_change" },
      }).catch(() => {});

      return { success: true };
    }),

  /**
   * Get active sessions (placeholder for future implementation)
   */
  getSessions: protectedProcedure.query(async () => {
    // In a real implementation, sessions would be tracked in database
    return [
      {
        id: "current",
        device: "Current Session",
        location: "Unknown",
        lastActive: new Date(),
        isCurrent: true,
      },
    ];
  }),

  /**
   * Get organization settings (for ANSP admins)
   */
  getOrganizationSettings: protectedProcedure.query(async ({ ctx }) => {
    const allowedRoles = ["SUPER_ADMIN", "SYSTEM_ADMIN", "ANSP_ADMIN"];
    if (!allowedRoles.includes(ctx.session.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to access organization settings",
      });
    }

    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        organizationId: true,
        organization: {
          include: {
            _count: {
              select: {
                users: true,
                reviewsAsHost: true,
              },
            },
          },
        },
      },
    });

    return user?.organization;
  }),

  /**
   * Get admin settings (system-wide configuration)
   */
  getAdminSettings: adminProcedure.query(async ({ ctx }) => {
    // Get or create system settings (singleton pattern)
    let settings = await ctx.db.systemSettings.findUnique({
      where: { id: "system-settings" },
    });

    if (!settings) {
      settings = await ctx.db.systemSettings.create({
        data: { id: "system-settings" },
      });
    }

    // Get system statistics
    const [userCount, reviewCount, organizationCount] = await Promise.all([
      ctx.db.user.count({ where: { isActive: true } }),
      ctx.db.review.count(),
      ctx.db.organization.count({ where: { membershipStatus: "ACTIVE" } }),
    ]);

    return {
      trainingModuleEnabled: settings.trainingModuleEnabled,
      maintenanceMode: settings.maintenanceMode,
      allowNewRegistrations: settings.allowNewRegistrations,
      maxUploadSizeMB: settings.maxUploadSizeMB,
      statistics: {
        activeUsers: userCount,
        totalReviews: reviewCount,
        activeOrganizations: organizationCount,
      },
    };
  }),

  /**
   * Update admin settings (system-wide configuration)
   * Only SUPER_ADMIN and SYSTEM_ADMIN can modify system settings
   */
  updateAdminSettings: adminProcedure
    .input(
      z.object({
        trainingModuleEnabled: z.boolean().optional(),
        allowNewRegistrations: z.boolean().optional(),
        maintenanceMode: z.boolean().optional(),
        maxUploadSizeMB: z.number().min(1).max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const allowedRoles = ["SUPER_ADMIN", "SYSTEM_ADMIN"];
      if (!allowedRoles.includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only Super Admin and System Admin can modify system settings",
        });
      }

      // Get previous settings for audit
      const previousSettings = await ctx.db.systemSettings.findUnique({
        where: { id: "system-settings" },
      });

      const settings = await ctx.db.systemSettings.upsert({
        where: { id: "system-settings" },
        update: {
          ...input,
          updatedById: ctx.session.user.id,
        },
        create: {
          id: "system-settings",
          ...input,
          updatedById: ctx.session.user.id,
        },
      });

      // Audit log
      logUpdate({
        userId: ctx.session.user.id,
        entityType: "SystemSettings",
        entityId: "system-settings",
        previousState: previousSettings
          ? {
              trainingModuleEnabled: previousSettings.trainingModuleEnabled,
              maintenanceMode: previousSettings.maintenanceMode,
              allowNewRegistrations: previousSettings.allowNewRegistrations,
              maxUploadSizeMB: previousSettings.maxUploadSizeMB,
            }
          : undefined,
        newState: input,
      }).catch(() => {});

      return settings;
    }),

  /**
   * Delete user account (self-service)
   * NOTE: Only allows deactivation, not actual deletion for audit purposes
   */
  deactivateAccount: protectedProcedure
    .input(
      z.object({
        confirmEmail: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true },
      });

      if (user?.email !== input.confirmEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email confirmation does not match",
        });
      }

      // Deactivate instead of delete for audit trail
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { isActive: false, tokenVersion: { increment: 1 } },
      });

      // Audit log
      logDelete({
        userId: ctx.session.user.id,
        entityType: "User",
        entityId: ctx.session.user.id,
        metadata: { action: "self_deactivation" },
      }).catch(() => {});

      return { success: true };
    }),
});

export type SettingsRouter = typeof settingsRouter;
