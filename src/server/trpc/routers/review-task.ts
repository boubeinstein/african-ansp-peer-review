/**
 * Review Task tRPC Router
 *
 * Handles task management for review team collaboration.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { TaskStatus, TaskPriority, Prisma, PrismaClient } from "@prisma/client";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
});

const createTaskSchema = z.object({
  reviewId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  assignedToId: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).default("MEDIUM"),
  dueDate: z.string().datetime().optional(),
  checklist: z.array(checklistItemSchema).optional(),
});

const updateTaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  checklist: z.array(checklistItemSchema).optional(),
});

const updateStatusSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(TaskStatus),
});

const listTasksSchema = z.object({
  reviewId: z.string(),
  status: z.nativeEnum(TaskStatus).optional(),
  assignedToId: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(50).default(20),
  sortBy: z
    .enum(["dueDate", "priority", "status", "createdAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if user has access to review tasks
 */
async function checkReviewAccess(
  db: PrismaClient | Prisma.TransactionClient,
  reviewId: string,
  userId: string
): Promise<boolean> {
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

  // Team member has access
  if (review.teamMembers.length > 0) return true;

  // Check user role and organization
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { organizationId: true, role: true },
  });

  if (!user) return false;

  // Admins and coordinators have access
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
 * Send notification for task assignment
 */
async function notifyTaskAssignment(
  db: PrismaClient | Prisma.TransactionClient,
  task: {
    id: string;
    reviewId: string;
    title: string;
    priority: TaskPriority;
    assignedToId: string | null;
  },
  assignerId: string,
  assignerName: string,
  reviewReference: string
) {
  if (!task.assignedToId || task.assignedToId === assignerId) return;

  await db.notification.create({
    data: {
      userId: task.assignedToId,
      type: "REVIEW_STATUS_CHANGED",
      titleEn: "Task Assigned to You",
      titleFr: "Tâche qui vous est assignée",
      messageEn: `${assignerName} assigned you a task: "${task.title}" for review ${reviewReference}.`,
      messageFr: `${assignerName} vous a assigné une tâche : "${task.title}" pour la revue ${reviewReference}.`,
      entityType: "ReviewTask",
      entityId: task.id,
      actionUrl: `/reviews/${task.reviewId}?tab=tasks`,
      priority: task.priority === "URGENT" ? "HIGH" : "NORMAL",
    },
  });
}

/**
 * Get priority sort order value
 */
function getPrioritySortValue(priority: TaskPriority): number {
  const order = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return order[priority];
}

// =============================================================================
// ROUTER
// =============================================================================

export const reviewTaskRouter = router({
  // ===========================================================================
  // LIST - Get tasks for a review
  // ===========================================================================

  list: protectedProcedure
    .input(listTasksSchema)
    .query(async ({ ctx, input }) => {
      const {
        reviewId,
        status,
        assignedToId,
        priority,
        page,
        pageSize,
        sortBy,
        sortOrder,
      } = input;
      const { user } = ctx.session;

      // Check access
      const hasAccess = await checkReviewAccess(ctx.db, reviewId, user.id);
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this review's tasks",
        });
      }

      const skip = (page - 1) * pageSize;

      // Build where clause
      const where: Prisma.ReviewTaskWhereInput = {
        reviewId,
        ...(status && { status }),
        ...(assignedToId && { assignedToId }),
        ...(priority && { priority }),
      };

      // Build orderBy
      let orderBy: Prisma.ReviewTaskOrderByWithRelationInput = {};
      switch (sortBy) {
        case "dueDate":
          orderBy = { dueDate: { sort: sortOrder, nulls: "last" } };
          break;
        case "priority":
          // Priority needs special handling - we'll sort in memory
          orderBy = { createdAt: sortOrder };
          break;
        case "status":
          orderBy = { status: sortOrder };
          break;
        default:
          orderBy = { createdAt: sortOrder };
      }

      const [items, total] = await Promise.all([
        ctx.db.reviewTask.findMany({
          where,
          skip,
          take: pageSize,
          orderBy,
          include: {
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            completedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        ctx.db.reviewTask.count({ where }),
      ]);

      // Sort by priority if requested
      let sortedItems = items;
      if (sortBy === "priority") {
        sortedItems = [...items].sort((a, b) => {
          const diff =
            getPrioritySortValue(a.priority) - getPrioritySortValue(b.priority);
          return sortOrder === "asc" ? diff : -diff;
        });
      }

      return {
        items: sortedItems,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  // ===========================================================================
  // GET BY ID - Get single task
  // ===========================================================================

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const task = await ctx.db.reviewTask.findUnique({
        where: { id: input.id },
        include: {
          review: {
            select: {
              id: true,
              referenceNumber: true,
              hostOrganizationId: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          completedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          discussion: {
            select: {
              id: true,
              subject: true,
            },
          },
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      // Check access
      const hasAccess = await checkReviewAccess(ctx.db, task.reviewId, user.id);
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this task",
        });
      }

      return task;
    }),

  // ===========================================================================
  // CREATE - Create new task
  // ===========================================================================

  create: protectedProcedure
    .input(createTaskSchema)
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

      // If assignee specified, verify they have access
      if (input.assignedToId) {
        const assigneeHasAccess = await checkReviewAccess(
          ctx.db,
          input.reviewId,
          input.assignedToId
        );
        if (!assigneeHasAccess) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Assignee does not have access to this review",
          });
        }
      }

      // Get review for notifications
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        select: { referenceNumber: true },
      });

      const task = await ctx.db.reviewTask.create({
        data: {
          reviewId: input.reviewId,
          createdById: user.id,
          title: input.title,
          description: input.description,
          assignedToId: input.assignedToId,
          priority: input.priority,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          checklist: input.checklist || [],
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Notify assignee
      const creatorName = `${task.createdBy.firstName} ${task.createdBy.lastName}`;
      await notifyTaskAssignment(
        ctx.db,
        task,
        user.id,
        creatorName,
        review?.referenceNumber || ""
      );

      return task;
    }),

  // ===========================================================================
  // UPDATE - Update task details
  // ===========================================================================

  update: protectedProcedure
    .input(updateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const { id, ...data } = input;

      const existing = await ctx.db.reviewTask.findUnique({
        where: { id },
        select: {
          reviewId: true,
          assignedToId: true,
          createdById: true,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
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
          message: "You do not have access to this task",
        });
      }

      // If changing assignee, verify they have access
      if (data.assignedToId && data.assignedToId !== existing.assignedToId) {
        const assigneeHasAccess = await checkReviewAccess(
          ctx.db,
          existing.reviewId,
          data.assignedToId
        );
        if (!assigneeHasAccess) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Assignee does not have access to this review",
          });
        }
      }

      // Get review for notifications
      const review = await ctx.db.review.findUnique({
        where: { id: existing.reviewId },
        select: { referenceNumber: true },
      });

      // Prepare update data
      const updateData: Prisma.ReviewTaskUpdateInput = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined)
        updateData.description = data.description;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.dueDate !== undefined) {
        updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
      }
      if (data.checklist !== undefined) updateData.checklist = data.checklist;
      if (data.assignedToId !== undefined) {
        updateData.assignedTo = data.assignedToId
          ? { connect: { id: data.assignedToId } }
          : { disconnect: true };
      }

      const task = await ctx.db.reviewTask.update({
        where: { id },
        data: updateData,
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Notify new assignee if changed
      if (data.assignedToId && data.assignedToId !== existing.assignedToId) {
        const updaterName = `${user.firstName} ${user.lastName}`;
        await notifyTaskAssignment(
          ctx.db,
          task,
          user.id,
          updaterName,
          review?.referenceNumber || ""
        );
      }

      return task;
    }),

  // ===========================================================================
  // UPDATE STATUS - Change task status
  // ===========================================================================

  updateStatus: protectedProcedure
    .input(updateStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const existing = await ctx.db.reviewTask.findUnique({
        where: { id: input.id },
        select: {
          reviewId: true,
          status: true,
          assignedToId: true,
          createdById: true,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
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
          message: "You do not have access to this task",
        });
      }

      // Prepare update data
      const updateData: Prisma.ReviewTaskUpdateInput = {
        status: input.status,
      };

      // Set completion info if completing
      if (input.status === "COMPLETED" && existing.status !== "COMPLETED") {
        updateData.completedAt = new Date();
        updateData.completedBy = { connect: { id: user.id } };
      }

      // Clear completion info if reopening
      if (input.status !== "COMPLETED" && existing.status === "COMPLETED") {
        updateData.completedAt = null;
        updateData.completedBy = { disconnect: true };
      }

      const task = await ctx.db.reviewTask.update({
        where: { id: input.id },
        data: updateData,
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          completedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return task;
    }),

  // ===========================================================================
  // UPDATE CHECKLIST - Update checklist items
  // ===========================================================================

  updateChecklist: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        checklist: z.array(checklistItemSchema),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const existing = await ctx.db.reviewTask.findUnique({
        where: { id: input.id },
        select: { reviewId: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
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
          message: "You do not have access to this task",
        });
      }

      const task = await ctx.db.reviewTask.update({
        where: { id: input.id },
        data: { checklist: input.checklist },
      });

      return task;
    }),

  // ===========================================================================
  // DELETE - Delete task
  // ===========================================================================

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const existing = await ctx.db.reviewTask.findUnique({
        where: { id: input.id },
        select: {
          reviewId: true,
          createdById: true,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      // Creator or admin can delete
      const isAdmin = [
        "SUPER_ADMIN",
        "SYSTEM_ADMIN",
        "PROGRAMME_COORDINATOR",
      ].includes(user.role);
      if (existing.createdById !== user.id && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this task",
        });
      }

      await ctx.db.reviewTask.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // ===========================================================================
  // GET STATS - Task stats for a review
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

      const [total, byStatus, overdue, myTasks] = await Promise.all([
        ctx.db.reviewTask.count({
          where: { reviewId: input.reviewId },
        }),
        ctx.db.reviewTask.groupBy({
          by: ["status"],
          where: { reviewId: input.reviewId },
          _count: { id: true },
        }),
        ctx.db.reviewTask.count({
          where: {
            reviewId: input.reviewId,
            status: { notIn: ["COMPLETED", "CANCELLED"] },
            dueDate: { lt: new Date() },
          },
        }),
        ctx.db.reviewTask.count({
          where: {
            reviewId: input.reviewId,
            assignedToId: user.id,
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
        }),
      ]);

      const statusCounts = Object.fromEntries(
        byStatus.map((s) => [s.status, s._count.id])
      );

      return {
        total,
        pending: statusCounts["PENDING"] || 0,
        inProgress: statusCounts["IN_PROGRESS"] || 0,
        completed: statusCounts["COMPLETED"] || 0,
        cancelled: statusCounts["CANCELLED"] || 0,
        overdue,
        myTasks,
      };
    }),

  // ===========================================================================
  // GET MY TASKS - Tasks assigned to current user across reviews
  // ===========================================================================

  getMyTasks: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(TaskStatus).optional(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const tasks = await ctx.db.reviewTask.findMany({
        where: {
          assignedToId: user.id,
          ...(input.status && { status: input.status }),
        },
        take: input.limit,
        orderBy: [
          { dueDate: { sort: "asc", nulls: "last" } },
          { priority: "asc" },
        ],
        include: {
          review: {
            select: {
              id: true,
              referenceNumber: true,
              hostOrganization: {
                select: {
                  nameEn: true,
                  nameFr: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return tasks;
    }),
});
