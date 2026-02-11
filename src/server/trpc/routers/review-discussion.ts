/**
 * Review Discussion tRPC Router
 *
 * Handles threaded discussions for review team collaboration.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { Prisma, PrismaClient } from "@prisma/client";
import { OVERSIGHT_ROLES } from "@/lib/permissions";
import { getPusherServer, CHANNELS, EVENTS } from "@/lib/pusher/server";
import { extractMentionedUserIds, hasMentionAll } from "@/lib/mentions";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const createDiscussionSchema = z.object({
  reviewId: z.string(),
  parentId: z.string().optional(), // For replies
  subject: z.string().max(200).optional(), // Only for top-level
  content: z.string().min(1).max(10000),
  mentions: z.array(z.string()).default([]),
  attachments: z.array(z.string().url()).default([]),
});

const updateDiscussionSchema = z.object({
  id: z.string(),
  content: z.string().min(1).max(10000),
  mentions: z.array(z.string()).optional(),
  attachments: z.array(z.string().url()).optional(),
});

const listDiscussionsSchema = z.object({
  reviewId: z.string().optional(),
  includeResolved: z.boolean().default(false),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if user has access to review discussions
 */
async function checkReviewAccess(
  db: PrismaClient | Prisma.TransactionClient,
  reviewId: string,
  userId: string
): Promise<boolean> {
  // Check if user is a team member or from host org
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: {
      hostOrganizationId: true,
      teamMembers: {
        where: { userId },
        select: { id: true },
      },
    },
  });

  if (!review) return false;

  // Check if team member
  if (review.teamMembers.length > 0) return true;

  // Check if from host organization
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { organizationId: true, role: true },
  });

  if (!user) return false;

  // Admins and coordinators always have access
  if (
    ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(user.role)
  ) {
    return true;
  }

  // Host org members have access
  if (user.organizationId === review.hostOrganizationId) {
    return true;
  }

  return false;
}

/**
 * Send notifications for @mentions.
 * Parses mention tokens from content server-side, handles @all by expanding
 * to all team members, and sends real-time Pusher notifications.
 */
async function notifyMentions(
  db: PrismaClient | Prisma.TransactionClient,
  discussionId: string,
  authorId: string,
  authorName: string,
  content: string,
  reviewId: string,
  reviewReference: string
) {
  try {
    const mentionAll = hasMentionAll(content);
    const mentionedIds = extractMentionedUserIds(content);

    let notifyUserIds: string[];

    if (mentionAll) {
      // @all: get all team members for this review
      const team = await db.reviewTeamMember.findMany({
        where: { reviewId },
        select: { userId: true },
      });
      notifyUserIds = team.map((t) => t.userId);
    } else if (mentionedIds.length > 0) {
      notifyUserIds = mentionedIds;
    } else {
      return; // No mentions
    }

    // Deduplicate and exclude the author
    notifyUserIds = [...new Set(notifyUserIds)].filter((id) => id !== authorId);
    if (notifyUserIds.length === 0) return;

    const titleEn = mentionAll
      ? `${authorName} mentioned @all in a discussion`
      : `${authorName} mentioned you in a discussion`;
    const titleFr = mentionAll
      ? `${authorName} a mentionné @all dans une discussion`
      : `${authorName} vous a mentionné dans une discussion`;
    const messagePreview = content.length > 200
      ? content.slice(0, 200) + "..."
      : content;

    await db.notification.createMany({
      data: notifyUserIds.map((userId) => ({
        userId,
        type: "MENTION" as const,
        titleEn,
        titleFr,
        messageEn: `On review ${reviewReference}: "${messagePreview}"`,
        messageFr: `Sur la revue ${reviewReference} : « ${messagePreview} »`,
        entityType: "ReviewDiscussion",
        entityId: discussionId,
        actionUrl: `/reviews/${reviewId}?tab=workspace`,
        priority: "NORMAL" as const,
      })),
    });

    // Send real-time Pusher notification to each mentioned user
    try {
      const pusher = getPusherServer();
      for (const uid of notifyUserIds) {
        await pusher.trigger(`private-user-${uid}`, "notification", {
          type: "MENTION",
          title: titleEn,
          reviewId,
        });
      }
    } catch {
      // Pusher failure shouldn't block the mutation
    }
  } catch (err) {
    console.error("[notifyMentions] Failed to send mention notifications:", err);
  }
}

/**
 * Get team filter based on user role
 * - Oversight roles: No filter (see all teams)
 * - Team members: Filter by their assigned team(s)
 */
async function getTeamFilter(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
  userRole: string
): Promise<Prisma.ReviewDiscussionWhereInput | null> {
  // Oversight roles can see all discussions - no filter needed
  if (OVERSIGHT_ROLES.includes(userRole as (typeof OVERSIGHT_ROLES)[number])) {
    return null;
  }

  // Get user's organization and its regional team
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      organization: {
        select: { regionalTeamId: true },
      },
    },
  });

  // Get reviews user is directly assigned to
  const directAssignments = await db.reviewTeamMember.findMany({
    where: { userId },
    select: {
      reviewId: true,
      review: {
        select: {
          hostOrganization: {
            select: { regionalTeamId: true },
          },
        },
      },
    },
  });

  // Collect team IDs and review IDs
  const teamIds: string[] = [];
  const reviewIds: string[] = [];

  // Add user's organization's regional team
  if (user?.organization?.regionalTeamId) {
    teamIds.push(user.organization.regionalTeamId);
  }

  // Add teams and reviews from direct assignments
  directAssignments.forEach((assignment) => {
    reviewIds.push(assignment.reviewId);
    if (assignment.review.hostOrganization?.regionalTeamId) {
      teamIds.push(assignment.review.hostOrganization.regionalTeamId);
    }
  });

  // If user has no team assignments, return filter that matches nothing
  if (teamIds.length === 0 && reviewIds.length === 0) {
    return { id: { equals: "no-access-placeholder" } };
  }

  // Return filter for user's teams OR directly assigned reviews
  // Team filter goes through review -> hostOrganization -> regionalTeamId
  return {
    OR: [
      {
        review: {
          hostOrganization: {
            regionalTeamId: { in: [...new Set(teamIds)] },
          },
        },
      },
      { reviewId: { in: [...new Set(reviewIds)] } },
    ],
  };
}

/**
 * Verify if a user has access to a specific review
 * - Oversight roles have access to all reviews
 * - Team members have access to reviews they're assigned to
 * - Users in the same regional team have access
 */
async function verifyReviewAccess(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
  userRole: string,
  reviewId: string
): Promise<boolean> {
  // Oversight roles have access to all reviews
  if (OVERSIGHT_ROLES.includes(userRole as (typeof OVERSIGHT_ROLES)[number])) {
    return true;
  }

  // Check if user is directly assigned to the review
  const directAssignment = await db.reviewTeamMember.findFirst({
    where: {
      reviewId,
      userId,
    },
  });

  if (directAssignment) {
    return true;
  }

  // Check if user is in the same regional team as the review
  // Regional team is linked through Organization
  const [review, user] = await Promise.all([
    db.review.findUnique({
      where: { id: reviewId },
      select: {
        hostOrganization: {
          select: { regionalTeamId: true },
        },
      },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: {
        organization: {
          select: { regionalTeamId: true },
        },
      },
    }),
  ]);

  const reviewTeamId = review?.hostOrganization?.regionalTeamId;
  const userTeamId = user?.organization?.regionalTeamId;

  if (reviewTeamId && userTeamId && reviewTeamId === userTeamId) {
    return true;
  }

  return false;
}

// =============================================================================
// ROUTER
// =============================================================================

export const reviewDiscussionRouter = router({
  // ===========================================================================
  // LIST - Get discussions for a review
  // ===========================================================================

  list: protectedProcedure
    .input(listDiscussionsSchema)
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const userId = user.id;
      const userRole = user.role;

      // Get team-based filter
      const teamFilter = await getTeamFilter(ctx.db, userId, userRole);

      // If specific reviewId provided, verify access
      if (input.reviewId) {
        const hasAccess = await verifyReviewAccess(
          ctx.db,
          userId,
          userRole,
          input.reviewId
        );

        if (!hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this review's discussions",
          });
        }
      }

      // Build where clause - only top-level discussions
      const where: Prisma.ReviewDiscussionWhereInput = {
        ...(teamFilter || {}),
        ...(input.reviewId && { reviewId: input.reviewId }),
        parentId: null, // Only top-level
        isDeleted: false,
        ...(!input.includeResolved && { isResolved: false }),
      };

      const [discussions, total] = await Promise.all([
        ctx.db.reviewDiscussion.findMany({
          where,
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy: [
            { isPinned: "desc" },
            { createdAt: "desc" },
          ],
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            review: {
              select: {
                id: true,
                referenceNumber: true,
                hostOrganization: {
                  select: {
                    regionalTeam: {
                      select: { id: true, nameEn: true, nameFr: true },
                    },
                  },
                },
              },
            },
            resolvedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            replies: {
              where: { isDeleted: false },
              orderBy: { createdAt: "asc" },
              take: 3, // Preview of recent replies
              include: {
                author: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            _count: {
              select: {
                replies: {
                  where: { isDeleted: false },
                },
              },
            },
          },
        }),
        ctx.db.reviewDiscussion.count({ where }),
      ]);

      return {
        discussions,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    }),

  // ===========================================================================
  // GET BY ID - Get single discussion with replies
  // ===========================================================================

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const discussion = await ctx.db.reviewDiscussion.findUnique({
        where: { id: input.id },
        include: {
          review: {
            select: {
              id: true,
              referenceNumber: true,
              hostOrganizationId: true,
            },
          },
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          resolvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          replies: {
            where: { isDeleted: false },
            orderBy: { createdAt: "asc" },
            include: {
              author: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              reactions: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          reads: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { readAt: "desc" },
          },
        },
      });

      if (!discussion || discussion.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discussion not found",
        });
      }

      // Check access
      const hasAccess = await checkReviewAccess(
        ctx.db,
        discussion.reviewId,
        user.id
      );
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this discussion",
        });
      }

      return discussion;
    }),

  // ===========================================================================
  // CREATE - Create new discussion
  // ===========================================================================

  create: protectedProcedure
    .input(createDiscussionSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const userId = user.id;
      const userRole = user.role;

      // Verify user has access to this review
      const hasAccess = await verifyReviewAccess(
        ctx.db,
        userId,
        userRole,
        input.reviewId
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to create discussions for this review",
        });
      }

      // If reply, verify parent exists
      if (input.parentId) {
        const parent = await ctx.db.reviewDiscussion.findUnique({
          where: { id: input.parentId },
          select: { id: true, reviewId: true, isDeleted: true },
        });

        if (!parent || parent.isDeleted) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Parent discussion not found",
          });
        }

        if (parent.reviewId !== input.reviewId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Parent discussion belongs to a different review",
          });
        }
      }

      // Get review for notifications
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        select: { referenceNumber: true },
      });

      const discussion = await ctx.db.reviewDiscussion.create({
        data: {
          reviewId: input.reviewId,
          authorId: userId,
          parentId: input.parentId,
          subject: input.parentId ? null : input.subject, // Subject only for top-level
          content: input.content,
          mentions: input.mentions,
          attachments: input.attachments,
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Send mention notifications (parses @mentions from content server-side)
      const authorName = `${discussion.author.firstName} ${discussion.author.lastName}`;
      await notifyMentions(
        ctx.db,
        discussion.id,
        userId,
        authorName,
        input.content,
        input.reviewId,
        review?.referenceNumber || ""
      );

      // Broadcast via Pusher
      try {
        const pusher = getPusherServer();
        await pusher.trigger(
          CHANNELS.review(input.reviewId),
          EVENTS.COMMENT_ADDED,
          {
            discussion: {
              id: discussion.id,
              subject: discussion.subject,
              content: discussion.content.substring(0, 100),
              parentId: discussion.parentId,
            },
            author: {
              id: userId,
              name: authorName,
            },
            timestamp: new Date().toISOString(),
          }
        );
      } catch (e) {
        console.warn("[Pusher] Failed to broadcast discussion creation:", e);
      }

      return discussion;
    }),

  // ===========================================================================
  // ADD REPLY - Add a reply to an existing discussion
  // ===========================================================================

  addReply: protectedProcedure
    .input(
      z.object({
        discussionId: z.string(),
        content: z.string().min(1),
        mentions: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const userId = user.id;
      const userRole = user.role;

      // Get parent discussion to find reviewId
      const parentDiscussion = await ctx.db.reviewDiscussion.findUnique({
        where: { id: input.discussionId },
        select: { reviewId: true, isDeleted: true },
      });

      if (!parentDiscussion || parentDiscussion.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discussion not found",
        });
      }

      // Verify access to the review
      const hasAccess = await verifyReviewAccess(
        ctx.db,
        userId,
        userRole,
        parentDiscussion.reviewId
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to reply to this discussion",
        });
      }

      // Get review for notifications
      const review = await ctx.db.review.findUnique({
        where: { id: parentDiscussion.reviewId },
        select: { referenceNumber: true },
      });

      // Create reply as a ReviewDiscussion with parentId
      const reply = await ctx.db.reviewDiscussion.create({
        data: {
          reviewId: parentDiscussion.reviewId,
          authorId: userId,
          parentId: input.discussionId,
          content: input.content,
          mentions: input.mentions,
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Send mention notifications (parses @mentions from content server-side)
      const authorName = `${reply.author.firstName} ${reply.author.lastName}`;
      await notifyMentions(
        ctx.db,
        reply.id,
        userId,
        authorName,
        input.content,
        parentDiscussion.reviewId,
        review?.referenceNumber || ""
      );

      // Broadcast reply via Pusher
      try {
        const pusher = getPusherServer();
        await pusher.trigger(
          CHANNELS.review(parentDiscussion.reviewId),
          EVENTS.COMMENT_ADDED,
          {
            discussion: {
              id: reply.id,
              content: reply.content.substring(0, 100),
              parentId: input.discussionId,
            },
            author: {
              id: userId,
              name: authorName,
            },
            timestamp: new Date().toISOString(),
          }
        );
      } catch (e) {
        console.warn("[Pusher] Failed to broadcast discussion reply:", e);
      }

      return reply;
    }),

  // ===========================================================================
  // UPDATE - Edit discussion content
  // ===========================================================================

  update: protectedProcedure
    .input(updateDiscussionSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const existing = await ctx.db.reviewDiscussion.findUnique({
        where: { id: input.id },
        select: {
          authorId: true,
          isDeleted: true,
          reviewId: true,
        },
      });

      if (!existing || existing.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discussion not found",
        });
      }

      // Only author can edit
      if (existing.authorId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only edit your own discussions",
        });
      }

      const discussion = await ctx.db.reviewDiscussion.update({
        where: { id: input.id },
        data: {
          content: input.content,
          mentions: input.mentions,
          attachments: input.attachments,
          isEdited: true,
          editedAt: new Date(),
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return discussion;
    }),

  // ===========================================================================
  // DELETE - Soft delete discussion
  // ===========================================================================

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const existing = await ctx.db.reviewDiscussion.findUnique({
        where: { id: input.id },
        select: {
          authorId: true,
          isDeleted: true,
        },
      });

      if (!existing || existing.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discussion not found",
        });
      }

      // Author or admin can delete
      const isAdmin = [
        "SUPER_ADMIN",
        "SYSTEM_ADMIN",
        "PROGRAMME_COORDINATOR",
      ].includes(user.role);
      if (existing.authorId !== user.id && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this discussion",
        });
      }

      await ctx.db.reviewDiscussion.update({
        where: { id: input.id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      return { success: true };
    }),

  // ===========================================================================
  // RESOLVE - Mark discussion as resolved
  // ===========================================================================

  resolve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const existing = await ctx.db.reviewDiscussion.findUnique({
        where: { id: input.id },
        select: {
          reviewId: true,
          isDeleted: true,
          isResolved: true,
          parentId: true,
        },
      });

      if (!existing || existing.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discussion not found",
        });
      }

      // Only top-level discussions can be resolved
      if (existing.parentId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only top-level discussions can be resolved",
        });
      }

      if (existing.isResolved) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Discussion is already resolved",
        });
      }

      // Check access
      const hasAccess = await checkReviewAccess(
        ctx.db,
        existing.reviewId,
        user.id
      );
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this discussion",
        });
      }

      const discussion = await ctx.db.reviewDiscussion.update({
        where: { id: input.id },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
          resolvedById: user.id,
        },
        include: {
          resolvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Broadcast resolve via Pusher
      try {
        const pusher = getPusherServer();
        await pusher.trigger(
          CHANNELS.review(existing.reviewId),
          EVENTS.COMMENT_ADDED,
          {
            discussion: {
              id: discussion.id,
              action: "resolved",
            },
            author: {
              id: user.id,
              name: `${user.firstName} ${user.lastName}`,
            },
            timestamp: new Date().toISOString(),
          }
        );
      } catch (e) {
        console.warn("[Pusher] Failed to broadcast discussion resolve:", e);
      }

      return discussion;
    }),

  // ===========================================================================
  // UNRESOLVE - Reopen a resolved discussion
  // ===========================================================================

  unresolve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const existing = await ctx.db.reviewDiscussion.findUnique({
        where: { id: input.id },
        select: {
          reviewId: true,
          isDeleted: true,
          isResolved: true,
        },
      });

      if (!existing || existing.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discussion not found",
        });
      }

      if (!existing.isResolved) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Discussion is not resolved",
        });
      }

      // Check access
      const hasAccess = await checkReviewAccess(
        ctx.db,
        existing.reviewId,
        user.id
      );
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this discussion",
        });
      }

      const discussion = await ctx.db.reviewDiscussion.update({
        where: { id: input.id },
        data: {
          isResolved: false,
          resolvedAt: null,
          resolvedById: null,
        },
      });

      // Broadcast unresolve via Pusher
      try {
        const pusher = getPusherServer();
        await pusher.trigger(
          CHANNELS.review(existing.reviewId),
          EVENTS.COMMENT_ADDED,
          {
            discussion: {
              id: discussion.id,
              action: "reopened",
            },
            author: {
              id: user.id,
              name: `${user.firstName} ${user.lastName}`,
            },
            timestamp: new Date().toISOString(),
          }
        );
      } catch (e) {
        console.warn("[Pusher] Failed to broadcast discussion unresolve:", e);
      }

      return discussion;
    }),

  // ===========================================================================
  // TOGGLE PIN - Pin/unpin a discussion (Lead Reviewer + Coordinator only)
  // ===========================================================================

  togglePin: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const existing = await ctx.db.reviewDiscussion.findUnique({
        where: { id: input.id },
        select: {
          reviewId: true,
          isDeleted: true,
          isPinned: true,
          parentId: true,
        },
      });

      if (!existing || existing.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discussion not found",
        });
      }

      // Only top-level discussions can be pinned
      if (existing.parentId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only top-level discussions can be pinned",
        });
      }

      // Only Lead Reviewer, Coordinator, or admins can pin
      const canPin = [
        "SUPER_ADMIN",
        "SYSTEM_ADMIN",
        "PROGRAMME_COORDINATOR",
        "LEAD_REVIEWER",
      ].includes(user.role);

      if (!canPin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Lead Reviewers and Coordinators can pin discussions",
        });
      }

      // Verify review access
      const hasAccess = await checkReviewAccess(
        ctx.db,
        existing.reviewId,
        user.id
      );
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this discussion",
        });
      }

      const discussion = await ctx.db.reviewDiscussion.update({
        where: { id: input.id },
        data: { isPinned: !existing.isPinned },
      });

      return { isPinned: discussion.isPinned };
    }),

  // ===========================================================================
  // SET PRIORITY - Set discussion priority (Lead Reviewer + Coordinator only)
  // ===========================================================================

  setPriority: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        priority: z.enum(["normal", "important", "urgent"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const existing = await ctx.db.reviewDiscussion.findUnique({
        where: { id: input.id },
        select: {
          reviewId: true,
          isDeleted: true,
          parentId: true,
        },
      });

      if (!existing || existing.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discussion not found",
        });
      }

      // Only top-level discussions can have priority set
      if (existing.parentId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only top-level discussions can have priority",
        });
      }

      // Only Lead Reviewer, Coordinator, or admins can set priority
      const canSetPriority = [
        "SUPER_ADMIN",
        "SYSTEM_ADMIN",
        "PROGRAMME_COORDINATOR",
        "LEAD_REVIEWER",
      ].includes(user.role);

      if (!canSetPriority) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Lead Reviewers and Coordinators can set discussion priority",
        });
      }

      // Verify review access
      const hasAccess = await checkReviewAccess(
        ctx.db,
        existing.reviewId,
        user.id
      );
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this discussion",
        });
      }

      const discussion = await ctx.db.reviewDiscussion.update({
        where: { id: input.id },
        data: { priority: input.priority },
      });

      return { priority: discussion.priority };
    }),

  // ===========================================================================
  // MARK AS READ - Track that a user has seen a discussion
  // ===========================================================================

  markAsRead: protectedProcedure
    .input(z.object({ discussionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the discussion exists and isn't deleted
      const discussion = await ctx.db.reviewDiscussion.findUnique({
        where: { id: input.discussionId },
        select: { reviewId: true, isDeleted: true },
      });

      if (!discussion || discussion.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discussion not found",
        });
      }

      // Verify access
      const hasAccess = await checkReviewAccess(
        ctx.db,
        discussion.reviewId,
        userId
      );
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this discussion",
        });
      }

      await ctx.db.discussionRead.upsert({
        where: {
          discussionId_userId: {
            discussionId: input.discussionId,
            userId,
          },
        },
        create: {
          discussionId: input.discussionId,
          userId,
        },
        update: {
          readAt: new Date(),
        },
      });

      return { success: true };
    }),

  // ===========================================================================
  // TOGGLE REACTION - Add or remove an emoji reaction
  // ===========================================================================

  toggleReaction: protectedProcedure
    .input(
      z.object({
        discussionId: z.string(),
        emoji: z.enum(["thumbsup", "check", "eyes", "target", "question", "fire"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const userId = user.id;

      // Verify the discussion exists
      const discussion = await ctx.db.reviewDiscussion.findUnique({
        where: { id: input.discussionId },
        select: { reviewId: true, isDeleted: true },
      });

      if (!discussion || discussion.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discussion not found",
        });
      }

      // Verify access
      const hasAccess = await checkReviewAccess(
        ctx.db,
        discussion.reviewId,
        userId
      );
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this discussion",
        });
      }

      // Check if reaction already exists (toggle logic)
      const existing = await ctx.db.discussionReaction.findUnique({
        where: {
          discussionId_userId_emoji: {
            discussionId: input.discussionId,
            userId,
            emoji: input.emoji,
          },
        },
      });

      if (existing) {
        // Remove reaction
        await ctx.db.discussionReaction.delete({
          where: { id: existing.id },
        });
        return { action: "removed" as const, emoji: input.emoji };
      } else {
        // Add reaction
        await ctx.db.discussionReaction.create({
          data: {
            discussionId: input.discussionId,
            userId,
            emoji: input.emoji,
          },
        });
        return { action: "added" as const, emoji: input.emoji };
      }
    }),

  // ===========================================================================
  // GET STATS - Discussion stats for a review
  // ===========================================================================

  getStats: protectedProcedure
    .input(z.object({ reviewId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const userId = user.id;
      const userRole = user.role;

      // Verify access if reviewId provided
      if (input.reviewId) {
        const hasAccess = await verifyReviewAccess(
          ctx.db,
          userId,
          userRole,
          input.reviewId
        );

        if (!hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this review",
          });
        }
      }

      // Get team-based filter
      const teamFilter = await getTeamFilter(ctx.db, userId, userRole);

      const where: Prisma.ReviewDiscussionWhereInput = {
        ...(teamFilter || {}),
        ...(input.reviewId && { reviewId: input.reviewId }),
        parentId: null, // Only top-level discussions
        isDeleted: false,
      };

      const [total, open, resolved, myDiscussions] = await Promise.all([
        ctx.db.reviewDiscussion.count({ where }),
        ctx.db.reviewDiscussion.count({
          where: { ...where, isResolved: false },
        }),
        ctx.db.reviewDiscussion.count({
          where: { ...where, isResolved: true },
        }),
        ctx.db.reviewDiscussion.count({
          where: { ...where, authorId: userId },
        }),
      ]);

      return { total, open, resolved, myDiscussions };
    }),

  // ===========================================================================
  // GET TEAM MEMBERS - For @mention autocomplete
  // ===========================================================================

  getTeamMembers: protectedProcedure
    .input(z.object({ reviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      // Check access
      const hasAccess = await checkReviewAccess(ctx.db, input.reviewId, user.id);
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this review",
        });
      }

      // Get review team members and host org contacts
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        select: {
          hostOrganizationId: true,
          teamMembers: {
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

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Get host org admins
      const hostOrgUsers = await ctx.db.user.findMany({
        where: {
          organizationId: review.hostOrganizationId,
          role: { in: ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"] },
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      // Combine and dedupe
      const teamUsers = review.teamMembers.map((tm) => tm.user);
      const allUsers = [...teamUsers, ...hostOrgUsers];
      const uniqueUsers = Array.from(
        new Map(allUsers.map((u) => [u.id, u])).values()
      );

      return uniqueUsers;
    }),

  // ===========================================================================
  // LIST ALL TEAMS - View discussions across all teams (oversight roles only)
  // ===========================================================================

  listAllTeams: protectedProcedure
    .input(
      z.object({
        teamId: z.string().optional(),
        includeResolved: z.boolean().default(false),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { session } = ctx;
      const userRole = session.user.role;

      // Only oversight roles can use this endpoint
      if (!OVERSIGHT_ROLES.includes(userRole as (typeof OVERSIGHT_ROLES)[number])) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only oversight roles can view all team discussions",
        });
      }

      const where: Prisma.ReviewDiscussionWhereInput = {
        parentId: null, // Only top-level discussions
        isDeleted: false,
        ...(input.teamId && {
          review: { hostOrganization: { regionalTeamId: input.teamId } },
        }),
        ...(!input.includeResolved && { isResolved: false }),
      };

      const [discussions, total] = await Promise.all([
        ctx.db.reviewDiscussion.findMany({
          where,
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true },
            },
            review: {
              select: {
                id: true,
                referenceNumber: true,
                hostOrganization: {
                  select: {
                    regionalTeam: {
                      select: { id: true, nameEn: true, nameFr: true, code: true },
                    },
                  },
                },
              },
            },
            _count: {
              select: {
                replies: { where: { isDeleted: false } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.reviewDiscussion.count({ where }),
      ]);

      return {
        discussions,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    }),

  // ===========================================================================
  // GET STATS BY TEAM - Team-level discussion statistics (oversight roles only)
  // ===========================================================================

  getStatsByTeam: protectedProcedure.query(async ({ ctx }) => {
    const { session } = ctx;
    const userRole = session.user.role;

    // Only oversight roles can use this endpoint
    if (!OVERSIGHT_ROLES.includes(userRole as (typeof OVERSIGHT_ROLES)[number])) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only oversight roles can view team statistics",
      });
    }

    const teams = await ctx.db.regionalTeam.findMany({
      where: { isActive: true },
      select: {
        id: true,
        nameEn: true,
        nameFr: true,
        code: true,
        memberOrganizations: {
          select: {
            _count: {
              select: { reviewsAsHost: true },
            },
          },
        },
      },
    });

    const stats = await Promise.all(
      teams.map(async (team) => {
        const baseWhere: Prisma.ReviewDiscussionWhereInput = {
          review: { hostOrganization: { regionalTeamId: team.id } },
          parentId: null, // Only top-level discussions
          isDeleted: false,
        };

        const [total, open, resolved] = await Promise.all([
          ctx.db.reviewDiscussion.count({ where: baseWhere }),
          ctx.db.reviewDiscussion.count({
            where: { ...baseWhere, isResolved: false },
          }),
          ctx.db.reviewDiscussion.count({
            where: { ...baseWhere, isResolved: true },
          }),
        ]);

        // Sum review counts from member organizations
        const reviewCount = team.memberOrganizations.reduce(
          (sum, org) => sum + org._count.reviewsAsHost,
          0
        );

        return {
          team: {
            id: team.id,
            nameEn: team.nameEn,
            nameFr: team.nameFr,
            code: team.code,
          },
          reviewCount,
          discussions: { total, open, resolved },
        };
      })
    );

    return stats;
  }),
});
