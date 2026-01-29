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
  reviewId: z.string(),
  includeResolved: z.boolean().default(false),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(50).default(20),
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
 * Send notifications for mentions
 */
async function notifyMentions(
  db: PrismaClient | Prisma.TransactionClient,
  discussionId: string,
  authorId: string,
  authorName: string,
  mentions: string[],
  reviewId: string,
  reviewReference: string
) {
  if (mentions.length === 0) return;

  const notifications = mentions
    .filter((userId) => userId !== authorId)
    .map((userId) => ({
      userId,
      type: "REVIEW_STATUS_CHANGED" as const, // Using existing type
      titleEn: "You were mentioned in a discussion",
      titleFr: "Vous avez été mentionné dans une discussion",
      messageEn: `${authorName} mentioned you in a discussion on review ${reviewReference}.`,
      messageFr: `${authorName} vous a mentionné dans une discussion sur la revue ${reviewReference}.`,
      entityType: "ReviewDiscussion",
      entityId: discussionId,
      actionUrl: `/reviews/${reviewId}?tab=discussions`,
      priority: "NORMAL" as const,
    }));

  if (notifications.length > 0) {
    await db.notification.createMany({ data: notifications });
  }
}

/**
 * Verify if a user has access to a specific review
 * - Oversight roles have access to all reviews
 * - Team members have access to reviews they're assigned to
 * - Users in the same regional team have access
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      const { reviewId, includeResolved, page, pageSize } = input;
      const { user } = ctx.session;

      // Check access
      const hasAccess = await checkReviewAccess(ctx.db, reviewId, user.id);
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this review's discussions",
        });
      }

      const skip = (page - 1) * pageSize;

      // Build where clause - only top-level discussions
      const where: Prisma.ReviewDiscussionWhereInput = {
        reviewId,
        parentId: null, // Only top-level
        isDeleted: false,
        ...(includeResolved ? {} : { isResolved: false }),
      };

      const [items, total] = await Promise.all([
        ctx.db.reviewDiscussion.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: {
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
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
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
            },
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
  // CREATE - Create new discussion or reply
  // ===========================================================================

  create: protectedProcedure
    .input(createDiscussionSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      // Check access
      const hasAccess = await checkReviewAccess(ctx.db, input.reviewId, user.id);
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this review",
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
          authorId: user.id,
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

      // Send mention notifications
      const authorName = `${discussion.author.firstName} ${discussion.author.lastName}`;
      await notifyMentions(
        ctx.db,
        discussion.id,
        user.id,
        authorName,
        input.mentions,
        input.reviewId,
        review?.referenceNumber || ""
      );

      return discussion;
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

      return discussion;
    }),

  // ===========================================================================
  // GET STATS - Discussion stats for a review
  // ===========================================================================

  getStats: protectedProcedure
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

      const [total, resolved, unresolved] = await Promise.all([
        ctx.db.reviewDiscussion.count({
          where: {
            reviewId: input.reviewId,
            parentId: null,
            isDeleted: false,
          },
        }),
        ctx.db.reviewDiscussion.count({
          where: {
            reviewId: input.reviewId,
            parentId: null,
            isDeleted: false,
            isResolved: true,
          },
        }),
        ctx.db.reviewDiscussion.count({
          where: {
            reviewId: input.reviewId,
            parentId: null,
            isDeleted: false,
            isResolved: false,
          },
        }),
      ]);

      return { total, resolved, unresolved };
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
});
