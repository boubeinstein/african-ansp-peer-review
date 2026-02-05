import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../../trpc";
import { prisma } from "@/lib/db";
import { UserRole, Prisma } from "@prisma/client";
import { logCreate, logUpdate, logDelete } from "@/server/services/audit";
import {
  USER_CRUD_PERMISSIONS,
  ASSIGNABLE_ROLES,
  canManageUser,
  canAssignRole,
  canReadUser,
  canDeactivateUser,
  canDeleteUser,
  canResetPassword,
  getAssignableRolesForActor,
} from "@/lib/permissions/user-management";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const userListInputSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z
    .enum(["firstName", "lastName", "email", "role", "createdAt", "lastLoginAt"])
    .default("lastName"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  search: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  organizationId: z.string().cuid().optional(),
  isActive: z.boolean().optional(),
});

const createUserInputSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.nativeEnum(UserRole),
  organizationId: z.string().cuid().optional().nullable(),
  title: z.string().optional(),
});

const updateUserInputSchema = z.object({
  id: z.string().cuid(),
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  title: z.string().optional().nullable(),
  organizationId: z.string().cuid().optional().nullable(),
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

const deleteUserInputSchema = z.object({
  userId: z.string().cuid(),
});

// =============================================================================
// ROUTER
// =============================================================================

export const adminUserRouter = router({
  /**
   * List users with pagination, filters, and role-based visibility
   */
  list: protectedProcedure.input(userListInputSchema).query(async ({ ctx, input }) => {
    const { page, limit, sortBy, sortOrder, search, role, organizationId, isActive } = input;
    const skip = (page - 1) * limit;
    const permissions = USER_CRUD_PERMISSIONS[ctx.user.role];

    // Check if user can read any users
    if (permissions.canRead === "none") {
      return { users: [], total: 0, page, limit, totalPages: 0 };
    }

    // Build where clause with role-based filtering
    const where: Prisma.UserWhereInput = {};

    // Apply role-based visibility restrictions
    if (permissions.canRead === "own_org") {
      if (!ctx.user.organizationId) {
        return { users: [], total: 0, page, limit, totalPages: 0 };
      }
      where.organizationId = ctx.user.organizationId;
    } else if (permissions.canRead === "self") {
      where.id = ctx.user.id;
    }

    // Apply user-provided filters
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

    // Only allow organization filter if user has "all" read permission
    if (organizationId && permissions.canRead === "all") {
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
          organizationId: true,
          organization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
              organizationCode: true,
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
   * Get single user by ID with permission check
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const targetUser = await prisma.user.findUnique({
        where: { id: input.id },
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

      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Check read permission
      if (
        !canReadUser(
          ctx.user.role,
          ctx.user.id,
          ctx.user.organizationId ?? null,
          targetUser.id,
          targetUser.organizationId
        )
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to view this user",
        });
      }

      return targetUser;
    }),

  /**
   * Get user statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const permissions = USER_CRUD_PERMISSIONS[ctx.user.role];

    // Build where clause based on permissions
    const where: Prisma.UserWhereInput = {};
    if (permissions.canRead === "own_org" && ctx.user.organizationId) {
      where.organizationId = ctx.user.organizationId;
    } else if (permissions.canRead === "self") {
      where.id = ctx.user.id;
    } else if (permissions.canRead === "none") {
      return { total: 0, active: 0, inactive: 0, byRole: {} };
    }

    const [total, activeCount, roleStats] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.count({ where: { ...where, isActive: true } }),
      prisma.user.groupBy({
        by: ["role"],
        where,
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
   * Create new user
   */
  create: protectedProcedure.input(createUserInputSchema).mutation(async ({ ctx, input }) => {
    const permissions = USER_CRUD_PERMISSIONS[ctx.user.role];

    // Check if user can create
    if (!permissions.canCreate) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Not authorized to create users",
      });
    }

    // Check if can assign this role
    if (!ASSIGNABLE_ROLES[ctx.user.role].includes(input.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Not authorized to assign this role",
      });
    }

    // ANSP roles can only create in own org
    if (
      (ctx.user.role === "ANSP_ADMIN" ||
        ctx.user.role === "SAFETY_MANAGER" ||
        ctx.user.role === "QUALITY_MANAGER") &&
      input.organizationId !== ctx.user.organizationId
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Can only create users in your organization",
      });
    }

    // Check email uniqueness
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Email already registered",
      });
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        passwordHash,
        role: input.role,
        organizationId: input.organizationId,
        title: input.title,
        mustChangePassword: true,
      },
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

    // Create welcome notification
    await prisma.notification.create({
      data: {
        userId: newUser.id,
        type: "SYSTEM_ANNOUNCEMENT",
        titleEn: "Welcome to AAPRP",
        titleFr: "Bienvenue sur l'AAPRP",
        messageEn:
          "Your account has been created. Please log in with your temporary password and change it immediately.",
        messageFr:
          "Votre compte a été créé. Veuillez vous connecter avec votre mot de passe temporaire et le changer immédiatement.",
      },
    });

    logCreate({
      userId: ctx.user.id,
      entityType: "User",
      entityId: newUser.id,
      newState: { email: input.email, role: input.role, organizationId: input.organizationId },
    }).catch(() => {});

    // In development, return temp password
    if (process.env.NODE_ENV === "development") {
      return { user: newUser, tempPassword };
    }

    return { user: newUser };
  }),

  /**
   * Update user profile
   */
  update: protectedProcedure.input(updateUserInputSchema).mutation(async ({ ctx, input }) => {
    const permissions = USER_CRUD_PERMISSIONS[ctx.user.role];

    const targetUser = await prisma.user.findUnique({
      where: { id: input.id },
    });

    if (!targetUser) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Check permission - can manage others OR can update self
    const canManage = canManageUser(
      ctx.user.role,
      ctx.user.organizationId ?? null,
      targetUser.role,
      targetUser.organizationId
    );

    const isSelf = targetUser.id === ctx.user.id;
    const canUpdateSelf = permissions.canUpdate === "self" && isSelf;

    if (!canManage && !canUpdateSelf) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Not authorized to update this user",
      });
    }

    // If updating self, cannot change organization
    if (isSelf && input.organizationId !== undefined) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot change your own organization",
      });
    }

    const updated = await prisma.user.update({
      where: { id: input.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        title: input.title,
        organizationId: input.organizationId,
      },
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

    logUpdate({
      userId: ctx.user.id,
      entityType: "User",
      entityId: input.id,
      previousState: { firstName: targetUser.firstName, lastName: targetUser.lastName },
      newState: { updatedFields: Object.keys(input).filter((k) => k !== "id") },
    }).catch(() => {});

    return updated;
  }),

  /**
   * Update user role
   */
  updateRole: protectedProcedure.input(updateRoleInputSchema).mutation(async ({ ctx, input }) => {
    const { userId, role } = input;

    // Cannot change own role (except super admin)
    if (userId === ctx.user.id && ctx.user.role !== "SUPER_ADMIN") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot change your own role",
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, organizationId: true },
    });

    if (!targetUser) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Check permission using the permission system
    if (
      !canAssignRole(
        ctx.user.role,
        ctx.user.organizationId ?? null,
        targetUser.role,
        targetUser.organizationId,
        role
      )
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Not authorized to assign this role",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role, tokenVersion: { increment: 1 } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
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

    logUpdate({
      userId: ctx.user.id,
      entityType: "User",
      entityId: userId,
      previousState: { role: targetUser.role },
      newState: { role },
    }).catch(() => {});

    // Create notification for the user
    await prisma.notification.create({
      data: {
        userId: userId,
        type: "SYSTEM_ANNOUNCEMENT",
        titleEn: "Role Updated",
        titleFr: "Rôle Mis à Jour",
        messageEn: `Your role has been changed to ${role.replace(/_/g, " ")}.`,
        messageFr: `Votre rôle a été modifié en ${role.replace(/_/g, " ")}.`,
      },
    });

    return updatedUser;
  }),

  /**
   * Activate or deactivate user
   */
  toggleActive: protectedProcedure.input(toggleActiveInputSchema).mutation(async ({ ctx, input }) => {
    const { userId, isActive } = input;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, organizationId: true },
    });

    if (!targetUser) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Check permission
    if (
      !canDeactivateUser(
        ctx.user.role,
        ctx.user.id,
        ctx.user.organizationId ?? null,
        targetUser.id,
        targetUser.organizationId
      )
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Not authorized to change this user's status",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive, tokenVersion: { increment: 1 } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    logUpdate({
      userId: ctx.user.id,
      entityType: "User",
      entityId: userId,
      previousState: { isActive: !isActive },
      newState: { isActive },
    }).catch(() => {});

    // Create notification
    await prisma.notification.create({
      data: {
        userId: userId,
        type: "SYSTEM_ANNOUNCEMENT",
        titleEn: isActive ? "Account Activated" : "Account Deactivated",
        titleFr: isActive ? "Compte Activé" : "Compte Désactivé",
        messageEn: isActive
          ? "Your account has been reactivated."
          : "Your account has been deactivated. Contact an administrator for assistance.",
        messageFr: isActive
          ? "Votre compte a été réactivé."
          : "Votre compte a été désactivé. Contactez un administrateur pour obtenir de l'aide.",
      },
    });

    return updatedUser;
  }),

  /**
   * Delete user (soft delete - anonymize and deactivate)
   */
  delete: protectedProcedure.input(deleteUserInputSchema).mutation(async ({ ctx, input }) => {
    const { userId } = input;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, organizationId: true },
    });

    if (!targetUser) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Check permission
    if (
      !canDeleteUser(
        ctx.user.role,
        ctx.user.id,
        ctx.user.organizationId ?? null,
        targetUser.id,
        targetUser.organizationId
      )
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Not authorized to delete users",
      });
    }

    // Soft delete - anonymize and deactivate
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        email: `deleted_${userId}@deleted.local`,
        firstName: "Deleted",
        lastName: "User",
        passwordHash: "", // Clear password
        tokenVersion: { increment: 1 },
      },
    });

    logDelete({
      userId: ctx.user.id,
      entityType: "User",
      entityId: userId,
      previousState: { role: targetUser.role },
    }).catch(() => {});

    return { success: true };
  }),

  /**
   * Request password reset for a user
   */
  resetPassword: protectedProcedure.input(resetPasswordInputSchema).mutation(async ({ ctx, input }) => {
    const { userId } = input;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
      },
    });

    if (!targetUser) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Check permission
    if (
      !canResetPassword(
        ctx.user.role,
        ctx.user.id,
        ctx.user.organizationId ?? null,
        targetUser.id,
        targetUser.organizationId
      )
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Not authorized to reset this user's password",
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

    logUpdate({
      userId: ctx.user.id,
      entityType: "User",
      entityId: userId,
      newState: { action: "admin_password_reset" },
    }).catch(() => {});

    // Create notification for the user
    await prisma.notification.create({
      data: {
        userId: userId,
        type: "SYSTEM_ANNOUNCEMENT",
        titleEn: "Password Reset",
        titleFr: "Réinitialisation du mot de passe",
        messageEn:
          "Your password has been reset by an administrator. Please log in with your temporary password and change it immediately.",
        messageFr:
          "Votre mot de passe a été réinitialisé par un administrateur. Veuillez vous connecter avec votre mot de passe temporaire et le changer immédiatement.",
      },
    });

    // In development, return temp password
    if (process.env.NODE_ENV === "development") {
      return {
        success: true,
        message: "Password reset successfully",
        tempPassword,
      };
    }

    return {
      success: true,
      message: "Password reset successfully. User will receive a notification.",
    };
  }),

  /**
   * Get assignable roles for current user
   */
  getAssignableRoles: protectedProcedure
    .input(z.object({ targetOrgId: z.string().cuid().optional().nullable() }))
    .query(({ ctx, input }) => {
      return getAssignableRolesForActor(
        ctx.user.role,
        ctx.user.organizationId ?? null,
        input.targetOrgId ?? null
      );
    }),

  /**
   * Get current user's permissions for UI rendering
   */
  getMyPermissions: protectedProcedure.query(({ ctx }) => {
    return {
      permissions: USER_CRUD_PERMISSIONS[ctx.user.role],
      assignableRoles: ASSIGNABLE_ROLES[ctx.user.role],
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
