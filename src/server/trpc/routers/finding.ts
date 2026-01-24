import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  adminProcedure,
  roleProcedure,
} from "../trpc";
import {
  FindingType,
  FindingSeverity,
  FindingStatus,
  CriticalElement,
  UserRole,
  PrismaClient,
} from "@prisma/client";

// Notification service import
import { notifyFindingCreated } from "@/server/services/notification-service";

// ============================================================================
// Role Definitions
// ============================================================================

/**
 * Roles that can create/edit findings (Review Team + Programme Management)
 */
const FINDING_EDIT_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "STEERING_COMMITTEE",
  "PROGRAMME_COORDINATOR",
  "LEAD_REVIEWER",
  "PEER_REVIEWER",
];

/**
 * Roles that can view all findings across organizations
 */
const FINDING_VIEW_ALL_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "STEERING_COMMITTEE",
  "PROGRAMME_COORDINATOR",
];

// ============================================================================
// Zod Schemas
// ============================================================================

const createFindingSchema = z.object({
  reviewId: z.string().cuid(),
  organizationId: z.string().cuid(),
  questionId: z.string().cuid().optional(),
  findingType: z.nativeEnum(FindingType).default("OBSERVATION"),
  severity: z.nativeEnum(FindingSeverity).default("MINOR"),
  titleEn: z.string().min(5, "Title must be at least 5 characters").max(200),
  titleFr: z.string().min(5, "Title must be at least 5 characters").max(200),
  descriptionEn: z
    .string()
    .min(20, "Description must be at least 20 characters"),
  descriptionFr: z
    .string()
    .min(20, "Description must be at least 20 characters"),
  evidenceEn: z.string().optional(),
  evidenceFr: z.string().optional(),
  icaoReference: z.string().optional(),
  criticalElement: z.nativeEnum(CriticalElement).optional(),
  capRequired: z.boolean().default(true),
  targetCloseDate: z.coerce.date().optional(),
});

const updateFindingSchema = z.object({
  id: z.string().cuid(),
  findingType: z.nativeEnum(FindingType).optional(),
  severity: z.nativeEnum(FindingSeverity).optional(),
  titleEn: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200)
    .optional(),
  titleFr: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200)
    .optional(),
  descriptionEn: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .optional(),
  descriptionFr: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .optional(),
  evidenceEn: z.string().optional().nullable(),
  evidenceFr: z.string().optional().nullable(),
  icaoReference: z.string().optional().nullable(),
  criticalElement: z.nativeEnum(CriticalElement).optional().nullable(),
  capRequired: z.boolean().optional(),
  targetCloseDate: z.coerce.date().optional().nullable(),
});

const listFindingsSchema = z.object({
  reviewId: z.string().cuid().optional(),
  organizationId: z.string().cuid().optional(),
  status: z.nativeEnum(FindingStatus).optional(),
  findingType: z.nativeEnum(FindingType).optional(),
  severity: z.nativeEnum(FindingSeverity).optional(),
  assignedToId: z.string().cuid().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum([
      "referenceNumber",
      "createdAt",
      "status",
      "severity",
      "findingType",
      "targetCloseDate",
    ])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const updateStatusSchema = z.object({
  id: z.string().cuid(),
  status: z.nativeEnum(FindingStatus),
  notes: z.string().optional(),
});

// ============================================================================
// Status Transition Validation
// ============================================================================

/**
 * Valid status transitions following the AFI Peer Review Programme workflow
 */
const VALID_STATUS_TRANSITIONS: Record<FindingStatus, FindingStatus[]> = {
  OPEN: ["CAP_REQUIRED", "CLOSED", "DEFERRED"],
  CAP_REQUIRED: ["CAP_SUBMITTED", "DEFERRED"],
  CAP_SUBMITTED: ["CAP_ACCEPTED", "CAP_REQUIRED"], // Can reject back to CAP_REQUIRED
  CAP_ACCEPTED: ["IN_PROGRESS"],
  IN_PROGRESS: ["VERIFICATION", "DEFERRED"],
  VERIFICATION: ["CLOSED", "IN_PROGRESS"], // Can fail verification
  CLOSED: [], // Terminal state
  DEFERRED: ["OPEN", "CAP_REQUIRED"], // Can be reopened
};

function isValidStatusTransition(
  currentStatus: FindingStatus,
  newStatus: FindingStatus
): boolean {
  if (currentStatus === newStatus) return true;
  return VALID_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate reference number for a finding
 * Format: FND-{ORG_CODE}-{YEAR}-{SEQUENCE}
 */
async function generateReferenceNumber(
  db: PrismaClient,
  organizationId: string,
  reviewId: string
): Promise<string> {
  const [org, count] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
      select: { organizationCode: true },
    }),
    db.finding.count({
      where: { reviewId },
    }),
  ]);

  const orgCode = org?.organizationCode || "UNK";
  const year = new Date().getFullYear();
  const sequence = String(count + 1).padStart(3, "0");

  return `FND-${orgCode}-${year}-${sequence}`;
}

/**
 * Build role-based visibility filter for findings
 * Non-admin users can only see findings for their organization or reviews they're on
 */
function buildFindingVisibilityFilter(
  userRole: UserRole,
  userId: string,
  userOrgId: string | null
): Record<string, unknown> | null {
  const isAdmin = FINDING_VIEW_ALL_ROLES.includes(userRole);

  if (isAdmin) {
    return null; // No filter needed - can see all findings
  }

  // Non-admin: filter to own org OR reviews user is on
  return {
    OR: [
      { organizationId: userOrgId },
      {
        review: {
          teamMembers: {
            some: { userId },
          },
        },
      },
    ],
  };
}

// ============================================================================
// Router
// ============================================================================

export const findingRouter = router({
  /**
   * Create a new finding
   */
  create: roleProcedure(...FINDING_EDIT_ROLES)
    .input(createFindingSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      // Verify the review exists and user has access
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        include: {
          hostOrganization: true,
          teamMembers: {
            where: { userId: user.id },
          },
        },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Check if user is on the review team or has admin access
      const isOnTeam = review.teamMembers.length > 0;
      const isAdmin = FINDING_VIEW_ALL_ROLES.includes(user.role);

      if (!isOnTeam && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You must be a member of the review team to create findings",
        });
      }

      // Generate unique reference number
      const referenceNumber = await generateReferenceNumber(
        ctx.db,
        input.organizationId,
        input.reviewId
      );

      const finding = await ctx.db.finding.create({
        data: {
          ...input,
          referenceNumber,
          status: "OPEN",
          identifiedAt: new Date(),
        },
        include: {
          review: {
            select: {
              id: true,
              referenceNumber: true,
              hostOrganization: {
                select: {
                  id: true,
                  nameEn: true,
                  nameFr: true,
                },
              },
            },
          },
          organization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
              organizationCode: true,
            },
          },
          question: {
            select: {
              id: true,
              pqNumber: true,
              questionTextEn: true,
              questionTextFr: true,
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
        },
      });

      // Send notification to host organization
      try {
        await notifyFindingCreated({
          id: finding.id,
          referenceNumber: finding.referenceNumber,
          titleEn: finding.titleEn,
          titleFr: finding.titleFr,
          severity: finding.severity,
          review: {
            id: finding.review.id,
            referenceNumber: finding.review.referenceNumber,
            hostOrganization: {
              id: finding.review.hostOrganization.id,
              nameEn: finding.review.hostOrganization.nameEn,
              nameFr: finding.review.hostOrganization.nameFr ?? finding.review.hostOrganization.nameEn,
            },
          },
        });
      } catch (error) {
        console.error("[Finding Create] Failed to send notifications:", error);
        // Don't fail the request if notifications fail
      }

      return finding;
    }),

  /**
   * Get a finding by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const finding = await ctx.db.finding.findUnique({
        where: { id: input.id },
        include: {
          review: {
            select: {
              id: true,
              referenceNumber: true,
              status: true,
              hostOrganization: {
                select: {
                  id: true,
                  nameEn: true,
                  nameFr: true,
                },
              },
              teamMembers: {
                select: {
                  userId: true,
                },
              },
            },
          },
          organization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
              organizationCode: true,
            },
          },
          question: {
            select: {
              id: true,
              pqNumber: true,
              questionTextEn: true,
              questionTextFr: true,
              category: {
                select: {
                  id: true,
                  nameEn: true,
                  nameFr: true,
                },
              },
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
          correctiveActionPlan: true,
          documents: true,
        },
      });

      if (!finding) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Finding not found",
        });
      }

      // Check access permissions
      const isAdmin = FINDING_VIEW_ALL_ROLES.includes(user.role);
      const isOrgMember = user.organizationId === finding.organizationId;
      const isOnTeam = finding.review.teamMembers.some(
        (m: { userId: string }) => m.userId === user.id
      );

      if (!isAdmin && !isOrgMember && !isOnTeam) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this finding",
        });
      }

      return finding;
    }),

  /**
   * List findings with filtering and pagination
   */
  list: protectedProcedure
    .input(listFindingsSchema)
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const {
        reviewId,
        organizationId,
        status,
        findingType,
        severity,
        assignedToId,
        search,
        page,
        pageSize,
        sortBy,
        sortOrder,
      } = input;

      // Build where clause based on user's role
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {};

      // Apply role-based visibility filter
      const visibilityFilter = buildFindingVisibilityFilter(
        user.role,
        user.id,
        user.organizationId
      );
      if (visibilityFilter) {
        Object.assign(where, visibilityFilter);
      }

      // Apply filters
      if (reviewId) where.reviewId = reviewId;
      if (organizationId) where.organizationId = organizationId;
      if (status) where.status = status;
      if (findingType) where.findingType = findingType;
      if (severity) where.severity = severity;
      if (assignedToId) where.assignedToId = assignedToId;

      // Search in title and description
      if (search) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { titleEn: { contains: search, mode: "insensitive" } },
              { titleFr: { contains: search, mode: "insensitive" } },
              { descriptionEn: { contains: search, mode: "insensitive" } },
              { descriptionFr: { contains: search, mode: "insensitive" } },
              { referenceNumber: { contains: search, mode: "insensitive" } },
            ],
          },
        ];
      }

      const [findings, total] = await Promise.all([
        ctx.db.finding.findMany({
          where,
          include: {
            review: {
              select: {
                id: true,
                referenceNumber: true,
              },
            },
            organization: {
              select: {
                id: true,
                nameEn: true,
                nameFr: true,
                organizationCode: true,
              },
            },
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.db.finding.count({ where }),
      ]);

      return {
        findings,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  /**
   * Update a finding
   */
  update: roleProcedure(...FINDING_EDIT_ROLES)
    .input(updateFindingSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const { id, ...updateData } = input;

      const existing = await ctx.db.finding.findUnique({
        where: { id },
        include: {
          review: {
            include: {
              teamMembers: {
                where: { userId: user.id },
              },
            },
          },
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Finding not found",
        });
      }

      // Check if user can edit
      const isAdmin = FINDING_VIEW_ALL_ROLES.includes(user.role);
      const isOnTeam = existing.review.teamMembers.length > 0;

      if (!isAdmin && !isOnTeam) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this finding",
        });
      }

      // Cannot edit closed or verified findings (except admin)
      if (
        !isAdmin &&
        (existing.status === "CLOSED" || existing.status === "VERIFICATION")
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Cannot modify findings that are closed or under verification",
        });
      }

      const updated = await ctx.db.finding.update({
        where: { id },
        data: updateData,
        include: {
          review: {
            select: {
              id: true,
              referenceNumber: true,
            },
          },
          organization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
              organizationCode: true,
            },
          },
          question: {
            select: {
              id: true,
              pqNumber: true,
              questionTextEn: true,
              questionTextFr: true,
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
        },
      });

      return updated;
    }),

  /**
   * Update finding status with workflow validation
   */
  updateStatus: protectedProcedure
    .input(updateStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const { id, status: newStatus } = input;

      const finding = await ctx.db.finding.findUnique({
        where: { id },
        include: {
          review: {
            include: {
              teamMembers: {
                where: { userId: user.id },
              },
            },
          },
        },
      });

      if (!finding) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Finding not found",
        });
      }

      // Check permissions based on status transition
      const isAdmin = FINDING_VIEW_ALL_ROLES.includes(user.role);
      const isOrgMember = user.organizationId === finding.organizationId;
      const isOnTeam = finding.review.teamMembers.length > 0;

      // Organization members can submit CAP and mark IN_PROGRESS
      // Review team can accept CAP, verify, and close
      // Admins can do anything
      const orgAllowedTransitions: FindingStatus[] = [
        "CAP_SUBMITTED",
        "IN_PROGRESS",
      ];
      const reviewerAllowedTransitions: FindingStatus[] = [
        "CAP_REQUIRED",
        "CAP_ACCEPTED",
        "VERIFICATION",
        "CLOSED",
        "DEFERRED",
      ];

      if (!isAdmin) {
        if (isOrgMember && !orgAllowedTransitions.includes(newStatus)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Organization members can only submit CAP or mark findings as in progress",
          });
        }
        if (
          isOnTeam &&
          !isOrgMember &&
          !reviewerAllowedTransitions.includes(newStatus)
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Review team can only accept CAP, verify, or close findings",
          });
        }
        if (!isOrgMember && !isOnTeam) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to update this finding's status",
          });
        }
      }

      // Validate status transition
      if (!isValidStatusTransition(finding.status, newStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid status transition from ${finding.status} to ${newStatus}`,
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        status: newStatus,
      };

      // Set closedAt timestamp when closing
      if (newStatus === "CLOSED") {
        updateData.closedAt = new Date();
      }

      const updated = await ctx.db.finding.update({
        where: { id },
        data: updateData,
        include: {
          review: {
            select: {
              id: true,
              referenceNumber: true,
            },
          },
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

      return updated;
    }),

  /**
   * Assign a finding to a user
   */
  assignTo: roleProcedure(...FINDING_EDIT_ROLES)
    .input(
      z.object({
        id: z.string().cuid(),
        assignedToId: z.string().cuid().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const { id, assignedToId } = input;

      const finding = await ctx.db.finding.findUnique({
        where: { id },
        include: {
          review: {
            include: {
              teamMembers: {
                where: { userId: user.id },
              },
            },
          },
        },
      });

      if (!finding) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Finding not found",
        });
      }

      // Check permissions
      const isAdmin = FINDING_VIEW_ALL_ROLES.includes(user.role);
      const isOnTeam = finding.review.teamMembers.length > 0;

      if (!isAdmin && !isOnTeam) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to assign this finding",
        });
      }

      // Verify assignee exists if provided
      if (assignedToId) {
        const assignee = await ctx.db.user.findUnique({
          where: { id: assignedToId },
        });
        if (!assignee) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Assigned user not found",
          });
        }
      }

      const updated = await ctx.db.finding.update({
        where: { id },
        data: { assignedToId },
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return updated;
    }),

  /**
   * Get all findings for a specific review
   */
  getByReview: protectedProcedure
    .input(z.object({ reviewId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        include: {
          teamMembers: {
            where: { userId: user.id },
          },
        },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Check access
      const isAdmin = FINDING_VIEW_ALL_ROLES.includes(user.role);
      const isOrgMember = user.organizationId === review.hostOrganizationId;
      const isOnTeam = review.teamMembers.length > 0;

      if (!isAdmin && !isOrgMember && !isOnTeam) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view findings for this review",
        });
      }

      const findings = await ctx.db.finding.findMany({
        where: { reviewId: input.reviewId },
        include: {
          organization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
              organizationCode: true,
            },
          },
          question: {
            select: {
              id: true,
              pqNumber: true,
              questionTextEn: true,
              questionTextFr: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          correctiveActionPlan: {
            select: {
              id: true,
              status: true,
              dueDate: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return findings;
    }),

  /**
   * Get finding statistics for a review or organization
   */
  getStats: protectedProcedure
    .input(
      z.object({
        reviewId: z.string().cuid().optional(),
        organizationId: z.string().cuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const { reviewId, organizationId } = input;

      // Build where clause with role-based visibility filter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {};

      // Apply role-based visibility filter (same as list query)
      const visibilityFilter = buildFindingVisibilityFilter(
        user.role,
        user.id,
        user.organizationId
      );
      if (visibilityFilter) {
        Object.assign(where, visibilityFilter);
      }

      // Apply optional input filters
      if (reviewId) where.reviewId = reviewId;
      if (organizationId) where.organizationId = organizationId;

      // Additional permission checks for explicit filters
      const isAdmin = FINDING_VIEW_ALL_ROLES.includes(user.role);
      if (!isAdmin) {
        if (organizationId && organizationId !== user.organizationId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only view statistics for your own organization",
          });
        }
        if (reviewId) {
          const review = await ctx.db.review.findUnique({
            where: { id: reviewId },
            include: {
              teamMembers: {
                where: { userId: user.id },
              },
            },
          });
          if (!review) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Review not found",
            });
          }
          const isOnTeam = review.teamMembers.length > 0;
          const isHostOrg = user.organizationId === review.hostOrganizationId;
          if (!isOnTeam && !isHostOrg) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "You do not have permission to view statistics for this review",
            });
          }
        }
      }

      // Get counts by status
      const byStatus = await ctx.db.finding.groupBy({
        by: ["status"],
        where,
        _count: true,
      });

      // Get counts by type
      const byType = await ctx.db.finding.groupBy({
        by: ["findingType"],
        where,
        _count: true,
      });

      // Get counts by severity
      const bySeverity = await ctx.db.finding.groupBy({
        by: ["severity"],
        where,
        _count: true,
      });

      // Get total and open counts
      const [total, open, closed, overdue] = await Promise.all([
        ctx.db.finding.count({ where }),
        ctx.db.finding.count({
          where: { ...where, status: { notIn: ["CLOSED", "DEFERRED"] } },
        }),
        ctx.db.finding.count({
          where: { ...where, status: "CLOSED" },
        }),
        ctx.db.finding.count({
          where: {
            ...where,
            status: { notIn: ["CLOSED", "DEFERRED"] },
            targetCloseDate: { lt: new Date() },
          },
        }),
      ]);

      return {
        total,
        open,
        closed,
        overdue,
        byStatus: byStatus.reduce(
          (
            acc: Record<FindingStatus, number>,
            item: { status: FindingStatus; _count: number }
          ) => ({
            ...acc,
            [item.status]: item._count,
          }),
          {} as Record<FindingStatus, number>
        ),
        byType: byType.reduce(
          (
            acc: Record<FindingType, number>,
            item: { findingType: FindingType; _count: number }
          ) => ({
            ...acc,
            [item.findingType]: item._count,
          }),
          {} as Record<FindingType, number>
        ),
        bySeverity: bySeverity.reduce(
          (
            acc: Record<FindingSeverity, number>,
            item: { severity: FindingSeverity; _count: number }
          ) => ({
            ...acc,
            [item.severity]: item._count,
          }),
          {} as Record<FindingSeverity, number>
        ),
      };
    }),

  /**
   * Delete a finding (admin only)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const finding = await ctx.db.finding.findUnique({
        where: { id: input.id },
        include: {
          correctiveActionPlan: true,
        },
      });

      if (!finding) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Finding not found",
        });
      }

      // Cannot delete findings with CAP
      if (finding.correctiveActionPlan) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot delete finding with associated corrective action plan",
        });
      }

      await ctx.db.finding.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
