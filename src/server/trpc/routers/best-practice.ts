/**
 * Best Practices Library tRPC Router
 *
 * Handles CRUD operations, filtering, adoption tracking, and engagement metrics
 * for the Best Practices Library feature.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import {
  BestPracticeCategory,
  BestPracticeStatus,
  LessonStatus,
  Prisma,
  PrismaClient,
  UserRole,
} from "@prisma/client";
import { canPerformAnspActions } from "@/lib/permissions";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const createBestPracticeSchema = z.object({
  titleEn: z.string().min(5).max(200),
  titleFr: z.string().min(5).max(200),
  summaryEn: z.string().min(20).max(500),
  summaryFr: z.string().min(20).max(500),
  descriptionEn: z.string().min(50),
  descriptionFr: z.string().min(50),
  implementationEn: z.string().min(50),
  implementationFr: z.string().min(50),
  benefitsEn: z.string().min(20),
  benefitsFr: z.string().min(20),
  category: z.nativeEnum(BestPracticeCategory),
  auditArea: z.string().optional(),
  tags: z.array(z.string()).default([]),
  imageUrl: z.string().url().optional().nullable(),
  attachments: z.array(z.string()).default([]),
  findingId: z.string().optional(), // Link to originating finding
});

const updateBestPracticeSchema = z.object({
  id: z.string(),
  titleEn: z.string().min(5).max(200).optional(),
  titleFr: z.string().min(5).max(200).optional(),
  summaryEn: z.string().min(20).max(500).optional(),
  summaryFr: z.string().min(20).max(500).optional(),
  descriptionEn: z.string().min(50).optional(),
  descriptionFr: z.string().min(50).optional(),
  implementationEn: z.string().min(50).optional(),
  implementationFr: z.string().min(50).optional(),
  benefitsEn: z.string().min(20).optional(),
  benefitsFr: z.string().min(20).optional(),
  category: z.nativeEnum(BestPracticeCategory).optional(),
  auditArea: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional().nullable(),
  attachments: z.array(z.string()).optional(),
});

const listBestPracticesSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(50).default(12),
  search: z.string().optional(),
  category: z.nativeEnum(BestPracticeCategory).optional(),
  auditArea: z.string().optional(),
  status: z.nativeEnum(BestPracticeStatus).optional(),
  organizationId: z.string().optional(),
  sortBy: z.enum(["newest", "popular", "mostAdopted"]).default("newest"),
});

const adoptBestPracticeSchema = z.object({
  bestPracticeId: z.string(),
  implementationNotes: z.string().optional(),
});

const updateAdoptionSchema = z.object({
  bestPracticeId: z.string(),
  implementationNotes: z.string().optional(),
  implementationStatus: z
    .enum(["PLANNED", "IN_PROGRESS", "COMPLETED"])
    .optional(),
});

const createLessonSchema = z.object({
  bestPracticeId: z.string(),
  title: z.string().min(5).max(200),
  content: z.string().min(20),
  challengesFaced: z.string().optional(),
  keySuccessFactors: z.string().optional(),
  recommendations: z.string().optional(),
  implementationDifficulty: z.number().min(1).max(5).optional(),
  overallEffectiveness: z.number().min(1).max(5).optional(),
  timeToImplementMonths: z.number().min(1).max(60).optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate reference number for new best practice
 * Format: BP-YYYY-NNNN
 */
async function generateReferenceNumber(
  prisma: PrismaClient | Prisma.TransactionClient
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `BP-${year}-`;

  const lastPractice = await (prisma as PrismaClient).bestPractice.findFirst({
    where: {
      referenceNumber: { startsWith: prefix },
    },
    orderBy: { referenceNumber: "desc" },
    select: { referenceNumber: true },
  });

  let nextNumber = 1;
  if (lastPractice) {
    const lastNumber = parseInt(lastPractice.referenceNumber.split("-")[2], 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

// =============================================================================
// ROUTER
// =============================================================================

export const bestPracticeRouter = router({
  // ===========================================================================
  // LIST - Public (published only) or Protected (all for admins)
  // ===========================================================================

  list: publicProcedure
    .input(listBestPracticesSchema)
    .query(async ({ ctx, input }) => {
      const {
        page,
        pageSize,
        search,
        category,
        auditArea,
        status,
        organizationId,
        sortBy,
      } = input;
      const skip = (page - 1) * pageSize;

      // Build where clause
      const where: Prisma.BestPracticeWhereInput = {};

      // Public users only see published practices
      // Authenticated admins can see all statuses
      const isAdmin =
        ctx.session?.user?.role &&
        ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(
          ctx.session.user.role
        );

      if (status && isAdmin) {
        where.status = status;
      } else if (!isAdmin) {
        where.status = BestPracticeStatus.PUBLISHED;
      }

      if (search) {
        where.OR = [
          { titleEn: { contains: search, mode: "insensitive" } },
          { titleFr: { contains: search, mode: "insensitive" } },
          { summaryEn: { contains: search, mode: "insensitive" } },
          { summaryFr: { contains: search, mode: "insensitive" } },
          { tags: { has: search } },
        ];
      }

      if (category) {
        where.category = category;
      }

      if (auditArea) {
        where.auditArea = auditArea;
      }

      if (organizationId) {
        where.organizationId = organizationId;
      }

      // Build orderBy
      let orderBy: Prisma.BestPracticeOrderByWithRelationInput = {};
      switch (sortBy) {
        case "popular":
          orderBy = { viewCount: "desc" };
          break;
        case "mostAdopted":
          orderBy = { adoptions: { _count: "desc" } };
          break;
        case "newest":
        default:
          orderBy = { publishedAt: { sort: "desc", nulls: "last" } };
          break;
      }

      const [items, total] = await Promise.all([
        ctx.db.bestPractice.findMany({
          where,
          skip,
          take: pageSize,
          orderBy,
          include: {
            organization: {
              select: {
                id: true,
                nameEn: true,
                nameFr: true,
                organizationCode: true,
              },
            },
            submittedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            _count: {
              select: { adoptions: true },
            },
          },
        }),
        ctx.db.bestPractice.count({ where }),
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
  // GET BY ID - Public for published, protected for others
  // ===========================================================================

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const practice = await ctx.db.bestPractice.findUnique({
        where: { id: input.id },
        include: {
          organization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
              organizationCode: true,
              country: true,
            },
          },
          submittedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          finding: {
            select: {
              id: true,
              referenceNumber: true,
              titleEn: true,
              titleFr: true,
            },
          },
          adoptions: {
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
            orderBy: { adoptedAt: "desc" },
          },
          _count: {
            select: { adoptions: true },
          },
        },
      });

      if (!practice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Best practice not found",
        });
      }

      // Check access - non-published only visible to admins or submitter
      const isAdmin =
        ctx.session?.user?.role &&
        ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(
          ctx.session.user.role
        );
      const isSubmitter = ctx.session?.user?.id === practice.submittedById;

      if (
        practice.status !== BestPracticeStatus.PUBLISHED &&
        !isAdmin &&
        !isSubmitter
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this best practice",
        });
      }

      return practice;
    }),

  // ===========================================================================
  // INCREMENT VIEW COUNT
  // ===========================================================================

  incrementViewCount: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.bestPractice.update({
        where: { id: input.id },
        data: { viewCount: { increment: 1 } },
      });
      return { success: true };
    }),

  // ===========================================================================
  // GET BY FINDING ID - Check if a best practice exists for a finding
  // ===========================================================================

  getByFindingId: publicProcedure
    .input(z.object({ findingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const practice = await ctx.db.bestPractice.findUnique({
        where: { findingId: input.findingId },
        select: {
          id: true,
          referenceNumber: true,
          titleEn: true,
          titleFr: true,
          status: true,
        },
      });

      return practice;
    }),

  // ===========================================================================
  // CREATE - Protected (ANSP users can submit)
  // ===========================================================================

  create: protectedProcedure
    .input(createBestPracticeSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const userRole = user.role as UserRole;
      const userOrgId = user.organizationId;

      // Business rule: Must be ANSP role with organization
      if (!canPerformAnspActions(userRole, userOrgId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only ANSP organization members can submit best practices",
        });
      }

      // If linking to a finding, verify it exists and user has access
      if (input.findingId) {
        const finding = await ctx.db.finding.findUnique({
          where: { id: input.findingId },
          include: { review: true },
        });

        if (!finding) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Finding not found",
          });
        }

        // Check if finding already has a best practice
        const existingBP = await ctx.db.bestPractice.findUnique({
          where: { findingId: input.findingId },
        });

        if (existingBP) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This finding already has an associated best practice",
          });
        }
      }

      const referenceNumber = await generateReferenceNumber(ctx.db);

      const practice = await ctx.db.bestPractice.create({
        data: {
          referenceNumber,
          organizationId: userOrgId!,
          submittedById: user.id,
          titleEn: input.titleEn,
          titleFr: input.titleFr,
          summaryEn: input.summaryEn,
          summaryFr: input.summaryFr,
          descriptionEn: input.descriptionEn,
          descriptionFr: input.descriptionFr,
          implementationEn: input.implementationEn,
          implementationFr: input.implementationFr,
          benefitsEn: input.benefitsEn,
          benefitsFr: input.benefitsFr,
          category: input.category,
          auditArea: input.auditArea,
          tags: input.tags,
          imageUrl: input.imageUrl,
          attachments: input.attachments,
          findingId: input.findingId,
          status: BestPracticeStatus.DRAFT,
        },
        include: {
          organization: {
            select: { nameEn: true, nameFr: true },
          },
        },
      });

      return practice;
    }),

  // ===========================================================================
  // UPDATE - Protected (submitter or admin)
  // ===========================================================================

  update: protectedProcedure
    .input(updateBestPracticeSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const { id, ...data } = input;

      const existing = await ctx.db.bestPractice.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Best practice not found",
        });
      }

      // Check permissions
      const isAdmin = [
        "SUPER_ADMIN",
        "SYSTEM_ADMIN",
        "PROGRAMME_COORDINATOR",
      ].includes(user.role);
      const isSubmitter = user.id === existing.submittedById;

      if (!isAdmin && !isSubmitter) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this best practice",
        });
      }

      // Can only update if DRAFT or SUBMITTED (not after approval)
      if (!isAdmin && !["DRAFT", "SUBMITTED"].includes(existing.status)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot update a best practice after it has been approved",
        });
      }

      const practice = await ctx.db.bestPractice.update({
        where: { id },
        data,
        include: {
          organization: {
            select: { nameEn: true, nameFr: true },
          },
        },
      });

      return practice;
    }),

  // ===========================================================================
  // SUBMIT FOR REVIEW - Protected (submitter only)
  // ===========================================================================

  submit: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const existing = await ctx.db.bestPractice.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Best practice not found",
        });
      }

      if (existing.submittedById !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the submitter can submit for review",
        });
      }

      if (existing.status !== BestPracticeStatus.DRAFT) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft best practices can be submitted",
        });
      }

      const practice = await ctx.db.bestPractice.update({
        where: { id: input.id },
        data: {
          status: BestPracticeStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      });

      // TODO: Notify coordinators of new submission

      return practice;
    }),

  // ===========================================================================
  // REVIEW ACTIONS - Protected (coordinators/admins only)
  // ===========================================================================

  review: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        action: z.enum(["APPROVE", "REJECT", "REQUEST_CHANGES"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      // Check admin role
      if (
        !["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(
          user.role
        )
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only programme coordinators can review best practices",
        });
      }

      const existing = await ctx.db.bestPractice.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Best practice not found",
        });
      }

      if (
        existing.status !== BestPracticeStatus.SUBMITTED &&
        existing.status !== BestPracticeStatus.UNDER_REVIEW
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only submitted best practices can be reviewed",
        });
      }

      let newStatus: BestPracticeStatus;

      switch (input.action) {
        case "APPROVE":
          newStatus = BestPracticeStatus.APPROVED;
          break;
        case "REJECT":
          newStatus = BestPracticeStatus.DRAFT; // Send back to draft
          break;
        case "REQUEST_CHANGES":
          newStatus = BestPracticeStatus.DRAFT;
          break;
        default:
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid action",
          });
      }

      const practice = await ctx.db.bestPractice.update({
        where: { id: input.id },
        data: {
          status: newStatus,
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewNotes: input.notes,
        },
      });

      // TODO: Notify submitter of review outcome

      return practice;
    }),

  // ===========================================================================
  // PUBLISH - Protected (coordinators/admins only)
  // ===========================================================================

  publish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (
        !["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(
          user.role
        )
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only programme coordinators can publish best practices",
        });
      }

      const existing = await ctx.db.bestPractice.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Best practice not found",
        });
      }

      if (existing.status !== BestPracticeStatus.APPROVED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only approved best practices can be published",
        });
      }

      const practice = await ctx.db.bestPractice.update({
        where: { id: input.id },
        data: {
          status: BestPracticeStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });

      // TODO: Notify all users of new published best practice

      return practice;
    }),

  // ===========================================================================
  // ARCHIVE - Protected (coordinators/admins only)
  // ===========================================================================

  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (
        !["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(
          user.role
        )
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only programme coordinators can archive best practices",
        });
      }

      const practice = await ctx.db.bestPractice.update({
        where: { id: input.id },
        data: {
          status: BestPracticeStatus.ARCHIVED,
        },
      });

      return practice;
    }),

  // ===========================================================================
  // DELETE - Protected (admin only, draft only)
  // ===========================================================================

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const existing = await ctx.db.bestPractice.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Best practice not found",
        });
      }

      // Only admins can delete, or submitter can delete their own draft
      const isAdmin = ["SUPER_ADMIN", "SYSTEM_ADMIN"].includes(user.role);
      const isOwnDraft =
        user.id === existing.submittedById &&
        existing.status === BestPracticeStatus.DRAFT;

      if (!isAdmin && !isOwnDraft) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this best practice",
        });
      }

      await ctx.db.bestPractice.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // ===========================================================================
  // ADOPT - Protected (ANSP users)
  // ===========================================================================

  adopt: protectedProcedure
    .input(adoptBestPracticeSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const userRole = user.role as UserRole;
      const userOrgId = user.organizationId;

      // Get the best practice
      const bestPractice = await ctx.db.bestPractice.findUnique({
        where: { id: input.bestPracticeId },
        select: { organizationId: true, status: true },
      });

      if (!bestPractice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Best practice not found" });
      }

      if (bestPractice.status !== "PUBLISHED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only adopt published best practices" });
      }

      // Business rule: Must be ANSP role with organization
      if (!canPerformAnspActions(userRole, userOrgId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only ANSP organization members can adopt best practices",
        });
      }

      // Business rule: Cannot adopt own organization's practice
      if (userOrgId === bestPractice.organizationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot adopt your own organization's best practice",
        });
      }

      // Check if already adopted
      const existingAdoption = await ctx.db.bestPracticeAdoption.findUnique({
        where: {
          bestPracticeId_organizationId: {
            bestPracticeId: input.bestPracticeId,
            organizationId: userOrgId!,
          },
        },
      });

      if (existingAdoption) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Your organization has already adopted this best practice",
        });
      }

      const adoption = await ctx.db.bestPracticeAdoption.create({
        data: {
          bestPracticeId: input.bestPracticeId,
          organizationId: userOrgId!,
          adoptedById: user.id,
          implementationNotes: input.implementationNotes,
          implementationStatus: "PLANNED",
        },
        include: {
          bestPractice: {
            select: { titleEn: true, titleFr: true, referenceNumber: true },
          },
          organization: {
            select: { nameEn: true, nameFr: true },
          },
        },
      });

      return adoption;
    }),

  // ===========================================================================
  // UPDATE ADOPTION - Protected (adopting org only)
  // ===========================================================================

  updateAdoption: protectedProcedure
    .input(updateAdoptionSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (!user.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must belong to an organization",
        });
      }

      const adoption = await ctx.db.bestPracticeAdoption.findUnique({
        where: {
          bestPracticeId_organizationId: {
            bestPracticeId: input.bestPracticeId,
            organizationId: user.organizationId,
          },
        },
      });

      if (!adoption) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Adoption not found",
        });
      }

      const updated = await ctx.db.bestPracticeAdoption.update({
        where: { id: adoption.id },
        data: {
          implementationNotes: input.implementationNotes,
          implementationStatus: input.implementationStatus,
          completedAt:
            input.implementationStatus === "COMPLETED" ? new Date() : null,
        },
      });

      return updated;
    }),

  // ===========================================================================
  // REMOVE ADOPTION - Protected (adopting org only)
  // ===========================================================================

  removeAdoption: protectedProcedure
    .input(z.object({ bestPracticeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (!user.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must belong to an organization",
        });
      }

      await ctx.db.bestPracticeAdoption.delete({
        where: {
          bestPracticeId_organizationId: {
            bestPracticeId: input.bestPracticeId,
            organizationId: user.organizationId,
          },
        },
      });

      return { success: true };
    }),

  // ===========================================================================
  // GET STATS - Public
  // ===========================================================================

  getStats: publicProcedure.query(async ({ ctx }) => {
    const [totalPublished, totalAdoptions, byCategory, topPractices] =
      await Promise.all([
        ctx.db.bestPractice.count({
          where: { status: BestPracticeStatus.PUBLISHED },
        }),
        ctx.db.bestPracticeAdoption.count(),
        ctx.db.bestPractice.groupBy({
          by: ["category"],
          where: { status: BestPracticeStatus.PUBLISHED },
          _count: { id: true },
        }),
        ctx.db.bestPractice.findMany({
          where: { status: BestPracticeStatus.PUBLISHED },
          orderBy: { adoptions: { _count: "desc" } },
          take: 5,
          select: {
            id: true,
            referenceNumber: true,
            titleEn: true,
            titleFr: true,
            category: true,
            viewCount: true,
            _count: { select: { adoptions: true } },
          },
        }),
      ]);

    return {
      totalPublished,
      totalAdoptions,
      byCategory: byCategory.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
      topPractices,
    };
  }),

  // ===========================================================================
  // GET CATEGORIES - Public (for filters)
  // ===========================================================================

  getCategories: publicProcedure.query(async () => {
    return Object.values(BestPracticeCategory);
  }),

  // ===========================================================================
  // GET AUDIT AREAS - Public (for filters)
  // ===========================================================================

  getAuditAreas: publicProcedure.query(async ({ ctx }) => {
    const areas = await ctx.db.bestPractice.findMany({
      where: {
        status: BestPracticeStatus.PUBLISHED,
        auditArea: { not: null },
      },
      select: { auditArea: true },
      distinct: ["auditArea"],
    });

    return areas.map((a) => a.auditArea).filter(Boolean) as string[];
  }),

  // ===========================================================================
  // LESSONS LEARNED - Get published lessons for a best practice
  // ===========================================================================

  getLessons: publicProcedure
    .input(z.object({ bestPracticeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const lessons = await ctx.db.bestPracticeLessonLearned.findMany({
        where: {
          bestPracticeId: input.bestPracticeId,
          status: LessonStatus.PUBLISHED,
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
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [{ helpfulCount: "desc" }, { publishedAt: "desc" }],
      });

      return lessons;
    }),

  // ===========================================================================
  // LESSONS LEARNED - Create a new lesson (adopting orgs only)
  // ===========================================================================

  addLesson: protectedProcedure
    .input(createLessonSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const userOrgId = user.organizationId;

      if (!userOrgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must belong to an organization to share lessons",
        });
      }

      // Check if the user's organization has adopted this best practice
      const adoption = await ctx.db.bestPracticeAdoption.findUnique({
        where: {
          bestPracticeId_organizationId: {
            bestPracticeId: input.bestPracticeId,
            organizationId: userOrgId,
          },
        },
      });

      if (!adoption) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organizations that have adopted this practice can share lessons",
        });
      }

      const lesson = await ctx.db.bestPracticeLessonLearned.create({
        data: {
          bestPracticeId: input.bestPracticeId,
          organizationId: userOrgId,
          authorId: user.id,
          title: input.title,
          content: input.content,
          challengesFaced: input.challengesFaced,
          keySuccessFactors: input.keySuccessFactors,
          recommendations: input.recommendations,
          implementationDifficulty: input.implementationDifficulty,
          overallEffectiveness: input.overallEffectiveness,
          timeToImplementMonths: input.timeToImplementMonths,
          status: LessonStatus.PUBLISHED,
          publishedAt: new Date(),
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
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return lesson;
    }),

  // ===========================================================================
  // LESSONS LEARNED - Mark as helpful
  // ===========================================================================

  markLessonHelpful: protectedProcedure
    .input(z.object({ lessonId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const lesson = await ctx.db.bestPracticeLessonLearned.update({
        where: { id: input.lessonId },
        data: { helpfulCount: { increment: 1 } },
      });

      return lesson;
    }),

  // ===========================================================================
  // DISCUSSION COMMENTS - Get comments for a best practice
  // ===========================================================================

  getComments: publicProcedure
    .input(z.object({ bestPracticeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const comments = await ctx.db.bestPracticeComment.findMany({
        where: {
          bestPracticeId: input.bestPracticeId,
          parentId: null, // Only top-level comments
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              organization: {
                select: {
                  organizationCode: true,
                },
              },
            },
          },
          replies: {
            include: {
              author: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  organization: {
                    select: {
                      organizationCode: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return comments;
    }),

  // ===========================================================================
  // DISCUSSION COMMENTS - Add a comment
  // ===========================================================================

  addComment: protectedProcedure
    .input(
      z.object({
        bestPracticeId: z.string(),
        content: z.string().min(1).max(2000),
        parentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      // If replying, verify the parent comment exists and belongs to the same best practice
      if (input.parentId) {
        const parentComment = await ctx.db.bestPracticeComment.findUnique({
          where: { id: input.parentId },
        });

        if (!parentComment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Parent comment not found",
          });
        }

        if (parentComment.bestPracticeId !== input.bestPracticeId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Parent comment does not belong to this best practice",
          });
        }

        // Prevent nested replies (only one level allowed)
        if (parentComment.parentId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot reply to a reply. Only one level of threading is allowed.",
          });
        }
      }

      const comment = await ctx.db.bestPracticeComment.create({
        data: {
          bestPracticeId: input.bestPracticeId,
          authorId: user.id,
          content: input.content,
          parentId: input.parentId,
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              organization: {
                select: {
                  organizationCode: true,
                },
              },
            },
          },
        },
      });

      return comment;
    }),
});
