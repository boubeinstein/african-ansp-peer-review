/**
 * Collaboration tRPC Router
 *
 * Handles real-time collaboration sessions, presence tracking,
 * and session management for peer review teams.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { getPusherServer, CHANNELS, EVENTS } from "@/lib/pusher/server";
import { SessionType, Prisma } from "@prisma/client";

// =============================================================================
// COLLABORATION ROUTER
// =============================================================================

export const collaborationRouter = router({
  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  /**
   * Start a new collaboration session
   */
  startSession: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        sessionType: z.nativeEnum(SessionType).default("FIELDWORK"),
        title: z.string().optional(),
        description: z.string().optional(),
        isRecording: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session: userSession } = ctx;
      const userId = userSession.user.id;

      // Verify user is a team member
      const membership = await ctx.db.reviewTeamMember.findFirst({
        where: { reviewId: input.reviewId, userId },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be a team member to start a session",
        });
      }

      // Check for existing active session
      const existingSession = await ctx.db.reviewSession.findFirst({
        where: {
          reviewId: input.reviewId,
          status: "ACTIVE",
        },
      });

      if (existingSession) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An active session already exists for this review",
        });
      }

      // Create session
      const session = await ctx.db.reviewSession.create({
        data: {
          reviewId: input.reviewId,
          sessionType: input.sessionType,
          title: input.title,
          description: input.description,
          isRecording: input.isRecording,
          startedById: userId,
          status: "ACTIVE",
          participants: {
            create: {
              userId,
              role: "HOST",
              isOnline: true,
            },
          },
        },
        include: {
          startedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      // Log activity
      await ctx.db.sessionActivity.create({
        data: {
          sessionId: session.id,
          userId,
          activityType: "SESSION_JOIN",
          data: { role: "HOST" },
        },
      });

      // Broadcast session start
      const pusher = getPusherServer();
      await pusher.trigger(
        CHANNELS.review(input.reviewId),
        EVENTS.SESSION_STARTED,
        {
          session: {
            id: session.id,
            type: session.sessionType,
            title: session.title,
            startedBy: session.startedBy,
          },
        }
      );

      return session;
    }),

  /**
   * Join an existing session
   */
  joinSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session: userSession } = ctx;
      const userId = userSession.user.id;

      const session = await ctx.db.reviewSession.findUnique({
        where: { id: input.sessionId },
        include: { review: true },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      if (session.status !== "ACTIVE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Session is not active",
        });
      }

      // Verify user has access to this review
      const membership = await ctx.db.reviewTeamMember.findFirst({
        where: { reviewId: session.reviewId, userId },
      });

      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { role: true, firstName: true, lastName: true, email: true },
      });

      const isOversight = [
        "SUPER_ADMIN",
        "SYSTEM_ADMIN",
        "PROGRAMME_COORDINATOR",
      ].includes(user?.role || "");

      if (!membership && !isOversight) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Upsert participant
      const participant = await ctx.db.sessionParticipant.upsert({
        where: {
          sessionId_userId: {
            sessionId: input.sessionId,
            userId,
          },
        },
        update: {
          isOnline: true,
          leftAt: null,
          lastSeenAt: new Date(),
        },
        create: {
          sessionId: input.sessionId,
          userId,
          role: isOversight ? "OBSERVER" : "PARTICIPANT",
          isOnline: true,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Log activity
      await ctx.db.sessionActivity.create({
        data: {
          sessionId: input.sessionId,
          userId,
          activityType: "SESSION_JOIN",
          data: { role: participant.role },
        },
      });

      // Broadcast member joined
      const pusher = getPusherServer();
      await pusher.trigger(
        CHANNELS.reviewPresence(session.reviewId),
        EVENTS.MEMBER_JOINED,
        {
          participant: {
            id: participant.id,
            userId: participant.userId,
            name: `${user?.firstName} ${user?.lastName}`,
            role: participant.role,
            joinedAt: participant.joinedAt,
          },
        }
      );

      return participant;
    }),

  /**
   * Leave a session
   */
  leaveSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { session: userSession } = ctx;
      const userId = userSession.user.id;

      const participant = await ctx.db.sessionParticipant.findUnique({
        where: {
          sessionId_userId: {
            sessionId: input.sessionId,
            userId,
          },
        },
        include: {
          session: true,
          user: {
            select: { firstName: true, lastName: true },
          },
        },
      });

      if (!participant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Not a participant" });
      }

      // Update participant status
      await ctx.db.sessionParticipant.update({
        where: { id: participant.id },
        data: {
          isOnline: false,
          leftAt: new Date(),
        },
      });

      // Log activity
      await ctx.db.sessionActivity.create({
        data: {
          sessionId: input.sessionId,
          userId,
          activityType: "SESSION_LEAVE",
        },
      });

      // Broadcast member left
      const pusher = getPusherServer();
      await pusher.trigger(
        CHANNELS.reviewPresence(participant.session.reviewId),
        EVENTS.MEMBER_LEFT,
        {
          userId,
          name: `${participant.user.firstName} ${participant.user.lastName}`,
        }
      );

      return { success: true };
    }),

  /**
   * End a session (host only)
   */
  endSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { session: userSession } = ctx;
      const userId = userSession.user.id;

      const session = await ctx.db.reviewSession.findUnique({
        where: { id: input.sessionId },
        include: {
          participants: true,
        },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      // Only host or oversight can end session
      const isHost = session.startedById === userId;
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      const isOversight = ["SUPER_ADMIN", "PROGRAMME_COORDINATOR"].includes(
        user?.role || ""
      );

      if (!isHost && !isOversight) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only host can end session",
        });
      }

      // End session
      const updatedSession = await ctx.db.reviewSession.update({
        where: { id: input.sessionId },
        data: {
          status: "COMPLETED",
          endedAt: new Date(),
        },
      });

      // Mark all participants as offline
      await ctx.db.sessionParticipant.updateMany({
        where: { sessionId: input.sessionId },
        data: {
          isOnline: false,
          leftAt: new Date(),
        },
      });

      // Broadcast session end
      const pusher = getPusherServer();
      await pusher.trigger(
        CHANNELS.review(session.reviewId),
        EVENTS.SESSION_ENDED,
        {
          sessionId: session.id,
          endedAt: updatedSession.endedAt,
        }
      );

      return updatedSession;
    }),

  /**
   * Get active session for a review
   */
  getActiveSession: protectedProcedure
    .input(z.object({ reviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.reviewSession.findFirst({
        where: {
          reviewId: input.reviewId,
          status: "ACTIVE",
        },
        include: {
          startedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          participants: {
            where: { isOnline: true },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return session;
    }),

  /**
   * Get session history for a review
   */
  getSessionHistory: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const sessions = await ctx.db.reviewSession.findMany({
        where: { reviewId: input.reviewId },
        include: {
          startedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: {
            select: { participants: true, activities: true },
          },
        },
        orderBy: { startedAt: "desc" },
        take: input.limit,
      });

      return sessions;
    }),

  // ==========================================================================
  // PRESENCE UPDATES
  // ==========================================================================

  /**
   * Update user's current focus within a session
   */
  updateFocus: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        currentFocus: z.string().nullable(), // e.g., "finding:123", "document:456"
        cursorPosition: z
          .object({
            x: z.number(),
            y: z.number(),
            element: z.string().optional(),
          })
          .nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session: userSession } = ctx;
      const userId = userSession.user.id;

      const participant = await ctx.db.sessionParticipant.findUnique({
        where: {
          sessionId_userId: {
            sessionId: input.sessionId,
            userId,
          },
        },
        include: {
          session: true,
          user: {
            select: { firstName: true, lastName: true },
          },
        },
      });

      if (!participant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Not a participant" });
      }

      // Update participant focus
      await ctx.db.sessionParticipant.update({
        where: { id: participant.id },
        data: {
          currentFocus: input.currentFocus,
          cursorPosition: input.cursorPosition ?? Prisma.JsonNull,
          lastSeenAt: new Date(),
        },
      });

      // Broadcast focus change
      const pusher = getPusherServer();
      await pusher.trigger(
        CHANNELS.reviewPresence(participant.session.reviewId),
        EVENTS.MEMBER_UPDATED,
        {
          userId,
          name: `${participant.user.firstName} ${participant.user.lastName}`,
          currentFocus: input.currentFocus,
          cursorPosition: input.cursorPosition,
        }
      );

      return { success: true };
    }),

  /**
   * Send heartbeat to maintain presence
   */
  heartbeat: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { session: userSession } = ctx;
      const userId = userSession.user.id;

      await ctx.db.sessionParticipant.updateMany({
        where: {
          sessionId: input.sessionId,
          userId,
        },
        data: {
          lastSeenAt: new Date(),
          isOnline: true,
        },
      });

      return { success: true };
    }),

  // ==========================================================================
  // LIVE FINDING COLLABORATION
  // ==========================================================================

  /**
   * Broadcast finding created event
   */
  broadcastFindingCreated: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        sessionId: z.string().optional(),
        finding: z.object({
          id: z.string(),
          referenceNumber: z.string(),
          title: z.string(),
          severity: z.string(),
          status: z.string(),
          createdAt: z.date(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session: userSession } = ctx;
      const userId = userSession.user.id;

      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      // Log activity if in session
      if (input.sessionId) {
        await ctx.db.sessionActivity.create({
          data: {
            sessionId: input.sessionId,
            userId,
            activityType: "FINDING_CREATE",
            targetType: "finding",
            targetId: input.finding.id,
            data: { finding: input.finding },
          },
        });
      }

      // Broadcast to review channel
      const pusher = getPusherServer();
      await pusher.trigger(
        CHANNELS.review(input.reviewId),
        EVENTS.FINDING_CREATED,
        {
          finding: input.finding,
          createdBy: {
            id: userId,
            name: `${user?.firstName} ${user?.lastName}`,
          },
          timestamp: new Date(),
        }
      );

      return { success: true };
    }),

  /**
   * Broadcast finding updated event
   */
  broadcastFindingUpdated: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        sessionId: z.string().optional(),
        findingId: z.string(),
        changes: z.record(z.string(), z.unknown()),
        previousValues: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session: userSession } = ctx;
      const userId = userSession.user.id;

      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      // Log activity if in session
      if (input.sessionId) {
        await ctx.db.sessionActivity.create({
          data: {
            sessionId: input.sessionId,
            userId,
            activityType: "FINDING_EDIT",
            targetType: "finding",
            targetId: input.findingId,
            data: { changes: input.changes } as Prisma.InputJsonValue,
            previousData: input.previousValues
              ? (input.previousValues as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          },
        });
      }

      // Broadcast to review channel
      const pusher = getPusherServer();
      await pusher.trigger(
        CHANNELS.review(input.reviewId),
        EVENTS.FINDING_UPDATED,
        {
          findingId: input.findingId,
          changes: input.changes,
          updatedBy: {
            id: userId,
            name: `${user?.firstName} ${user?.lastName}`,
          },
          timestamp: new Date(),
        }
      );

      return { success: true };
    }),

  /**
   * Broadcast finding deleted event
   */
  broadcastFindingDeleted: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        sessionId: z.string().optional(),
        findingId: z.string(),
        referenceNumber: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session: userSession } = ctx;
      const userId = userSession.user.id;

      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      // Log activity if in session
      if (input.sessionId) {
        await ctx.db.sessionActivity.create({
          data: {
            sessionId: input.sessionId,
            userId,
            activityType: "FINDING_DELETE",
            targetType: "finding",
            targetId: input.findingId,
            data: { referenceNumber: input.referenceNumber },
          },
        });
      }

      // Broadcast to review channel
      const pusher = getPusherServer();
      await pusher.trigger(
        CHANNELS.review(input.reviewId),
        EVENTS.FINDING_DELETED,
        {
          findingId: input.findingId,
          referenceNumber: input.referenceNumber,
          deletedBy: {
            id: userId,
            name: `${user?.firstName} ${user?.lastName}`,
          },
          timestamp: new Date(),
        }
      );

      return { success: true };
    }),

  /**
   * Broadcast comment added event
   */
  broadcastCommentAdded: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        sessionId: z.string().optional(),
        comment: z.object({
          id: z.string(),
          content: z.string(),
          parentType: z.string(), // "finding", "discussion", etc.
          parentId: z.string(),
          createdAt: z.date(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session: userSession } = ctx;
      const userId = userSession.user.id;

      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      // Log activity if in session
      if (input.sessionId) {
        await ctx.db.sessionActivity.create({
          data: {
            sessionId: input.sessionId,
            userId,
            activityType: "COMMENT_ADD",
            targetType: input.comment.parentType,
            targetId: input.comment.parentId,
            data: { comment: input.comment },
          },
        });
      }

      // Broadcast to review channel
      const pusher = getPusherServer();
      await pusher.trigger(
        CHANNELS.review(input.reviewId),
        EVENTS.COMMENT_ADDED,
        {
          comment: input.comment,
          addedBy: {
            id: userId,
            name: `${user?.firstName} ${user?.lastName}`,
          },
          timestamp: new Date(),
        }
      );

      return { success: true };
    }),

  /**
   * Broadcast task updated event
   */
  broadcastTaskUpdated: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        sessionId: z.string().optional(),
        task: z.object({
          id: z.string(),
          title: z.string(),
          status: z.string(),
          assignedToId: z.string().nullable(),
        }),
        changeType: z.enum(["created", "updated", "completed", "deleted"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session: userSession } = ctx;
      const userId = userSession.user.id;

      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      // Log activity if in session
      if (input.sessionId) {
        const activityType =
          input.changeType === "created"
            ? "TASK_CREATE"
            : input.changeType === "completed"
              ? "TASK_COMPLETE"
              : "TASK_UPDATE";

        await ctx.db.sessionActivity.create({
          data: {
            sessionId: input.sessionId,
            userId,
            activityType,
            targetType: "task",
            targetId: input.task.id,
            data: { task: input.task, changeType: input.changeType },
          },
        });
      }

      // Broadcast to review channel
      const pusher = getPusherServer();
      await pusher.trigger(
        CHANNELS.review(input.reviewId),
        EVENTS.TASK_UPDATED,
        {
          task: input.task,
          changeType: input.changeType,
          updatedBy: {
            id: userId,
            name: `${user?.firstName} ${user?.lastName}`,
          },
          timestamp: new Date(),
        }
      );

      return { success: true };
    }),

  // ==========================================================================
  // SESSION ACTIVITY & VIEWERS
  // ==========================================================================

  /**
   * Get session activity log with pagination
   */
  getSessionActivities: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const activities = await ctx.db.sessionActivity.findMany({
        where: { sessionId: input.sessionId },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { timestamp: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | undefined;
      if (activities.length > input.limit) {
        const nextItem = activities.pop();
        nextCursor = nextItem?.id;
      }

      return {
        activities,
        nextCursor,
      };
    }),

  /**
   * Get users currently viewing a specific item
   */
  getViewers: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        focus: z.string(), // e.g., "finding:123"
      })
    )
    .query(async ({ ctx, input }) => {
      const viewers = await ctx.db.sessionParticipant.findMany({
        where: {
          sessionId: input.sessionId,
          isOnline: true,
          currentFocus: input.focus,
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      return viewers.map((v) => ({
        id: v.userId,
        name: `${v.user.firstName} ${v.user.lastName}`,
      }));
    }),

  /**
   * Get all online participants in a session
   */
  getOnlineParticipants: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const participants = await ctx.db.sessionParticipant.findMany({
        where: {
          sessionId: input.sessionId,
          isOnline: true,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      });

      return participants.map((p) => ({
        id: p.id,
        odId: p.userId,
        name: `${p.user.firstName} ${p.user.lastName}`,
        email: p.user.email,
        role: p.role,
        userRole: p.user.role,
        currentFocus: p.currentFocus,
        joinedAt: p.joinedAt,
        lastSeenAt: p.lastSeenAt,
      }));
    }),

  // ==========================================================================
  // UNIFIED ACTIVITY FEED
  // ==========================================================================

  /**
   * Get recent activity across all sources for a review
   * Aggregates findings, discussions, tasks, and session activities
   */
  getRecentActivity: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // Only show activities from the last 7 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      const [findings, discussions, tasks, sessionActivities] =
        await Promise.all([
          ctx.db.finding.findMany({
            where: {
              reviewId: input.reviewId,
              updatedAt: { gte: cutoffDate },
            },
            orderBy: { updatedAt: "desc" },
            take: input.limit,
            select: {
              id: true,
              referenceNumber: true,
              titleEn: true,
              titleFr: true,
              severity: true,
              status: true,
              updatedAt: true,
              createdAt: true,
              assignedTo: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          }),
          ctx.db.reviewDiscussion.findMany({
            where: {
              reviewId: input.reviewId,
              isDeleted: false,
              createdAt: { gte: cutoffDate },
            },
            orderBy: { createdAt: "desc" },
            take: input.limit,
            select: {
              id: true,
              subject: true,
              content: true,
              isResolved: true,
              createdAt: true,
              author: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          }),
          ctx.db.reviewTask.findMany({
            where: {
              reviewId: input.reviewId,
              updatedAt: { gte: cutoffDate },
            },
            orderBy: { updatedAt: "desc" },
            take: input.limit,
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              updatedAt: true,
              createdAt: true,
              assignedTo: {
                select: { id: true, firstName: true, lastName: true },
              },
              createdBy: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          }),
          ctx.db.sessionActivity.findMany({
            where: {
              session: { reviewId: input.reviewId },
              timestamp: { gte: cutoffDate },
            },
            orderBy: { timestamp: "desc" },
            take: input.limit,
            select: {
              id: true,
              activityType: true,
              targetType: true,
              targetId: true,
              timestamp: true,
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          }),
        ]);

      // Build unified activity items
      const merged = [
        ...findings.map((f) => ({
          type: "finding" as const,
          id: `finding-${f.id}`,
          entityId: f.id,
          label: f.titleEn || f.referenceNumber,
          detail: f.severity,
          status: f.status,
          user: f.assignedTo ?? { id: "", firstName: "", lastName: "" },
          timestamp: f.updatedAt,
        })),
        ...discussions.map((d) => ({
          type: "discussion" as const,
          id: `discussion-${d.id}`,
          entityId: d.id,
          label: d.subject || d.content.slice(0, 60),
          detail: d.isResolved ? "resolved" : "open",
          status: null,
          user: d.author,
          timestamp: d.createdAt,
        })),
        ...tasks.map((t) => ({
          type: "task" as const,
          id: `task-${t.id}`,
          entityId: t.id,
          label: t.title,
          detail: t.priority,
          status: t.status,
          user: t.createdBy,
          timestamp: t.updatedAt,
        })),
        ...sessionActivities.map((s) => ({
          type: "session" as const,
          id: `session-${s.id}`,
          entityId: s.targetId,
          label: s.activityType.replace(/_/g, " ").toLowerCase(),
          detail: s.targetType,
          status: null,
          user: s.user,
          timestamp: s.timestamp,
        })),
      ]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, input.limit);

      return merged;
    }),
});
