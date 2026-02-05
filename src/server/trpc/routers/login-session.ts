import { z } from "zod";
import { Prisma } from "@prisma/client";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { revokeLoginSession } from "@/lib/session-tracker";

const ADMIN_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN"];

export const loginSessionRouter = router({
  /**
   * List current user's active sessions
   */
  listMySessions: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const currentSessionId = ctx.session.loginSessionId;

    const sessions = await ctx.db.loginSession.findMany({
      where: { userId, isActive: true },
      orderBy: { lastActiveAt: "desc" },
      select: {
        id: true,
        deviceName: true,
        deviceType: true,
        browser: true,
        os: true,
        ipAddress: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });

    return sessions.map((s) => ({
      ...s,
      isCurrent: s.id === currentSessionId,
    }));
  }),

  /**
   * Revoke a specific session
   */
  revokeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const currentSessionId = ctx.session.loginSessionId;

      // Verify the session belongs to this user
      const targetSession = await ctx.db.loginSession.findUnique({
        where: { id: input.sessionId },
      });

      if (!targetSession || targetSession.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      if (input.sessionId === currentSessionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot revoke your current session. Use sign out instead.",
        });
      }

      await revokeLoginSession(input.sessionId);

      // Race condition check: verify our own session wasn't revoked by another device
      if (currentSessionId) {
        const ownSession = await ctx.db.loginSession.findUnique({
          where: { id: currentSessionId },
          select: { isActive: true },
        });

        if (!ownSession || !ownSession.isActive) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Your session was revoked by another device",
          });
        }
      }

      // Log to audit trail
      await ctx.db.auditLog.create({
        data: {
          userId,
          action: "SESSION_REVOKED",
          entityType: "LoginSession",
          entityId: input.sessionId,
          newState: JSON.stringify({
            revokedDevice: targetSession.deviceName,
            revokedIp: targetSession.ipAddress,
          }),
        },
      });

      return { success: true };
    }),

  /**
   * Revoke all other sessions (keep current)
   */
  revokeAllOtherSessions: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const currentSessionId = ctx.session.loginSessionId;

    if (!currentSessionId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active session found",
      });
    }

    // Revoke all other sessions
    const result = await ctx.db.loginSession.updateMany({
      where: {
        userId,
        isActive: true,
        id: { not: currentSessionId },
      },
      data: { isActive: false, revokedAt: new Date() },
    });

    // Race condition check: verify our own session wasn't revoked by another device
    const ownSession = await ctx.db.loginSession.findUnique({
      where: { id: currentSessionId },
      select: { isActive: true },
    });

    if (!ownSession || !ownSession.isActive) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Your session was revoked by another device",
      });
    }

    await ctx.db.auditLog.create({
      data: {
        userId,
        action: "ALL_SESSIONS_REVOKED",
        entityType: "LoginSession",
        entityId: userId,
        newState: JSON.stringify({ revokedCount: result.count }),
      },
    });

    return { success: true, revokedCount: result.count };
  }),

  /**
   * Admin: List all active sessions (with user info)
   */
  adminListAllSessions: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(10).max(100).default(20),
        userId: z.string().optional(),
        organizationId: z.string().optional(),
        search: z.string().optional(),
        sortBy: z.enum(["lastActiveAt", "createdAt"]).default("lastActiveAt"),
      })
    )
    .query(async ({ ctx, input }) => {
      const role = ctx.session.user.role;
      if (!ADMIN_ROLES.includes(role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const where: Prisma.LoginSessionWhereInput = { isActive: true };

      if (input.userId) {
        where.userId = input.userId;
      }
      if (input.organizationId) {
        where.user = { organizationId: input.organizationId };
      }
      if (input.search) {
        where.user = {
          ...(where.user as object),
          OR: [
            { firstName: { contains: input.search, mode: "insensitive" } },
            { lastName: { contains: input.search, mode: "insensitive" } },
            { email: { contains: input.search, mode: "insensitive" } },
          ],
        };
      }

      const [sessions, total] = await Promise.all([
        ctx.db.loginSession.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                organization: {
                  select: { id: true, nameEn: true, nameFr: true, organizationCode: true },
                },
              },
            },
          },
          orderBy: { [input.sortBy]: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.loginSession.count({ where }),
      ]);

      return {
        sessions,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  /**
   * Admin: Force-revoke a user's session
   */
  adminRevokeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const role = ctx.session.user.role;
      if (!ADMIN_ROLES.includes(role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const session = await ctx.db.loginSession.findUnique({
        where: { id: input.sessionId },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      await ctx.db.loginSession.update({
        where: { id: input.sessionId },
        data: { isActive: false, revokedAt: new Date() },
      });

      await ctx.db.auditLog.create({
        data: {
          userId: ctx.session.user.id,
          action: "ADMIN_SESSION_REVOKED",
          entityType: "LoginSession",
          entityId: input.sessionId,
          newState: JSON.stringify({
            targetUser: session.user.email,
            targetUserName: `${session.user.firstName} ${session.user.lastName}`,
            device: session.deviceName,
            ip: session.ipAddress,
          }),
        },
      });

      return { success: true };
    }),

  /**
   * Admin: Get session statistics
   */
  adminSessionStats: protectedProcedure.query(async ({ ctx }) => {
    const role = ctx.session.user.role;
    if (!ADMIN_ROLES.includes(role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const now = new Date();
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);

    const [totalActive, recentlyActive, byUser] = await Promise.all([
      ctx.db.loginSession.count({ where: { isActive: true } }),
      ctx.db.loginSession.count({
        where: { isActive: true, lastActiveAt: { gte: thirtyMinAgo } },
      }),
      ctx.db.loginSession.groupBy({
        by: ["userId"],
        where: { isActive: true },
        _count: { userId: true },
      }),
    ]);

    const uniqueUsers = byUser.length;
    const multiSessionUsers = byUser.filter((u) => u._count.userId > 1).length;

    return { totalActive, recentlyActive, uniqueUsers, multiSessionUsers };
  }),
});
