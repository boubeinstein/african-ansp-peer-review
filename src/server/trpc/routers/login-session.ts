import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  revokeLoginSession,
  revokeAllUserSessions,
} from "@/lib/session-tracker";

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

      // Verify the session belongs to this user
      const session = await ctx.db.loginSession.findUnique({
        where: { id: input.sessionId },
      });

      if (!session || session.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      if (session.id === ctx.session.loginSessionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot revoke your current session. Use sign out instead.",
        });
      }

      await revokeLoginSession(input.sessionId);

      // Log to audit trail
      await ctx.db.auditLog.create({
        data: {
          userId,
          action: "SESSION_REVOKED",
          entityType: "LoginSession",
          entityId: input.sessionId,
          newState: JSON.stringify({
            revokedDevice: session.deviceName,
            revokedIp: session.ipAddress,
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

    const result = await revokeAllUserSessions(userId, currentSessionId);

    await ctx.db.auditLog.create({
      data: {
        userId,
        action: "ALL_SESSIONS_REVOKED",
        entityType: "LoginSession",
        entityId: userId,
        newState: JSON.stringify({ count: result.count }),
      },
    });

    return { success: true, revokedCount: result.count };
  }),
});
