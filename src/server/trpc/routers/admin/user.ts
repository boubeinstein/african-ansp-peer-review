import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, requireRole } from "../../trpc";
import { prisma } from "@/lib/db";
import { UserRole, Prisma } from "@prisma/client";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const userListInputSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(["firstName", "lastName", "email", "role", "createdAt", "lastLoginAt"]).default("lastName"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  search: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  organizationId: z.string().cuid().optional(),
  isActive: z.boolean().optional(),
});

const updateRoleInputSchema = z.object({
  userId: z.string().cuid(),
  role: z.nativeEnum(UserRole),
});

const toggleActiveInputSchema = z.object({
  userId: z.string().cuid(),
  isActive: z.boolean(),
});

const resetPasswordInputSchema = z.object({
  userId: z.string().cuid(),
});

// =============================================================================
// CONSTANTS
// =============================================================================

// Only SUPER_ADMIN and SYSTEM_ADMIN can manage users
const SYSTEM_ADMIN_ROLES: UserRole[] = ["SUPER_ADMIN", "SYSTEM_ADMIN"];

// =============================================================================
// ROUTER
// =============================================================================

export const adminUserRouter = router({
  /**
   * List users with pagination and filters
   */
  list: protectedProcedure
    .use(requireRole(...SYSTEM_ADMIN_ROLES))
    .input(userListInputSchema)
    .query(async ({ input }) => {
      const { page, limit, sortBy, sortOrder, search, role, organizationId, isActive } = input;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.UserWhereInput = {};

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      if (role) {
        where.role = role;
      }

      if (organizationId) {
        where.organizationId = organizationId;
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      // Get users and total count
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            title: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
            organization: {
              select: {
                id: true,
                nameEn: true,
                nameFr: true,
                icaoCode: true,
              },
            },
          },
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      return {
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Get user statistics
   */
  getStats: protectedProcedure
    .use(requireRole(...SYSTEM_ADMIN_ROLES))
    .query(async () => {
      const [total, activeCount, roleStats] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.groupBy({
          by: ["role"],
          _count: { role: true },
        }),
      ]);

      const byRole = roleStats.reduce(
        (acc: Record<UserRole, number>, stat) => {
          acc[stat.role] = stat._count.role;
          return acc;
        },
        {} as Record<UserRole, number>
      );

      return {
        total,
        active: activeCount,
        inactive: total - activeCount,
        byRole,
      };
    }),

  /**
   * Update user role
   */
  updateRole: protectedProcedure
    .use(requireRole(...SYSTEM_ADMIN_ROLES))
    .input(updateRoleInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId, role } = input;

      // Cannot change own role
      if (userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own role",
        });
      }

      // Check user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Only SUPER_ADMIN can assign SUPER_ADMIN or SYSTEM_ADMIN roles
      if (
        (role === "SUPER_ADMIN" || role === "SYSTEM_ADMIN") &&
        ctx.user.role !== "SUPER_ADMIN"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Super Admin can assign system administrator roles",
        });
      }

      // Only SUPER_ADMIN can change roles of other SUPER_ADMIN or SYSTEM_ADMIN
      if (
        (user.role === "SUPER_ADMIN" || user.role === "SYSTEM_ADMIN") &&
        ctx.user.role !== "SUPER_ADMIN"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Super Admin can modify system administrator accounts",
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      return updatedUser;
    }),

  /**
   * Activate or deactivate user
   */
  toggleActive: protectedProcedure
    .use(requireRole(...SYSTEM_ADMIN_ROLES))
    .input(toggleActiveInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId, isActive } = input;

      // Cannot deactivate self
      if (userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot deactivate your own account",
        });
      }

      // Check user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Only SUPER_ADMIN can deactivate other SUPER_ADMIN or SYSTEM_ADMIN
      if (
        (user.role === "SUPER_ADMIN" || user.role === "SYSTEM_ADMIN") &&
        ctx.user.role !== "SUPER_ADMIN"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Super Admin can modify system administrator accounts",
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { isActive },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      });

      return updatedUser;
    }),

  /**
   * Request password reset for a user
   * Sets mustChangePassword flag and sends notification
   */
  resetPassword: protectedProcedure
    .use(requireRole(...SYSTEM_ADMIN_ROLES))
    .input(resetPasswordInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId } = input;

      // Check user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Only SUPER_ADMIN can reset password for other SUPER_ADMIN or SYSTEM_ADMIN
      if (
        (user.role === "SUPER_ADMIN" || user.role === "SYSTEM_ADMIN") &&
        ctx.user.role !== "SUPER_ADMIN"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Super Admin can reset system administrator passwords",
        });
      }

      // Generate a temporary password
      const tempPassword = generateTempPassword();

      // Hash the temporary password
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Update user with temporary password and require change
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          mustChangePassword: true,
        },
      });

      // Create notification for the user
      await prisma.notification.create({
        data: {
          userId: userId,
          type: "SYSTEM",
          titleEn: "Password Reset",
          titleFr: "Réinitialisation du mot de passe",
          messageEn: "Your password has been reset by an administrator. Please log in with your temporary password and change it immediately.",
          messageFr: "Votre mot de passe a été réinitialisé par un administrateur. Veuillez vous connecter avec votre mot de passe temporaire et le changer immédiatement.",
        },
      });

      // TODO: In production, send email with temporary password
      // For now, return the temp password in development only
      if (process.env.NODE_ENV === "development") {
        return {
          success: true,
          message: "Password reset successfully",
          tempPassword, // Only in development
        };
      }

      return {
        success: true,
        message: "Password reset successfully. User will receive a notification.",
      };
    }),
});

// =============================================================================
// HELPERS
// =============================================================================

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
