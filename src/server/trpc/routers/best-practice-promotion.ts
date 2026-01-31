/**
 * Best Practice Promotion tRPC Router
 *
 * Handles programme-level promotions of best practices to target audiences.
 * Only Programme Coordinators and Administrators can promote best practices.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { PromotionTargetType, PrismaClient } from "@prisma/client";
import { isBPProgrammeRole } from "@/lib/permissions/best-practice-permissions";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const createPromotionSchema = z.object({
  bestPracticeId: z.string(),
  targetType: z
    .enum(["ALL_ANSPS", "BY_TEAM", "BY_ORGANIZATION"])
    .default("ALL_ANSPS"),
  targetTeamIds: z.array(z.string()).optional(),
  targetOrgIds: z.array(z.string()).optional(),
  messageEn: z.string().max(500).optional(),
  messageFr: z.string().max(500).optional(),
  isFeatured: z.boolean().default(false),
  expiresAt: z.date().optional(),
});

// =============================================================================
// ROUTER
// =============================================================================

export const bestPracticePromotionRouter = router({
  /**
   * Create a promotion (Programme roles only)
   */
  create: protectedProcedure
    .input(createPromotionSchema)
    .mutation(async ({ ctx, input }) => {
      const { session } = ctx;
      const userRole = session.user.role;

      // Only programme roles can promote
      if (!isBPProgrammeRole(userRole)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only Programme Coordinators and Administrators can promote best practices",
        });
      }

      // Verify best practice exists and is published
      const bestPractice = await ctx.db.bestPractice.findUnique({
        where: { id: input.bestPracticeId },
        include: { organization: true },
      });

      if (!bestPractice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Best practice not found",
        });
      }

      if (bestPractice.status !== "PUBLISHED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only published best practices can be promoted",
        });
      }

      // Create promotion
      const promotion = await ctx.db.bestPracticePromotion.create({
        data: {
          bestPracticeId: input.bestPracticeId,
          promotedById: session.user.id,
          targetType: input.targetType as PromotionTargetType,
          targetTeamIds: input.targetTeamIds ?? [],
          targetOrgIds: input.targetOrgIds ?? [],
          messageEn: input.messageEn,
          messageFr: input.messageFr,
          isFeatured: input.isFeatured,
          expiresAt: input.expiresAt,
          status: "ACTIVE",
        },
      });

      // Create notifications for target users
      await createPromotionNotifications(ctx.db, {
        promotion,
        bestPractice,
        targetType: input.targetType,
        targetTeamIds: input.targetTeamIds,
        targetOrgIds: input.targetOrgIds,
        messageEn: input.messageEn,
        messageFr: input.messageFr,
        senderId: session.user.id,
      });

      return promotion;
    }),

  /**
   * Get promotions for a best practice
   */
  getByBestPractice: protectedProcedure
    .input(z.object({ bestPracticeId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.bestPracticePromotion.findMany({
        where: { bestPracticeId: input.bestPracticeId },
        include: {
          promotedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { promotedAt: "desc" },
      });
    }),

  /**
   * Check if a best practice is currently featured
   */
  isFeatured: protectedProcedure
    .input(z.object({ bestPracticeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const featured = await ctx.db.bestPracticePromotion.findFirst({
        where: {
          bestPracticeId: input.bestPracticeId,
          isFeatured: true,
          status: "ACTIVE",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });
      return !!featured;
    }),

  /**
   * Get all featured best practices
   */
  getFeatured: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.bestPracticePromotion.findMany({
      where: {
        isFeatured: true,
        status: "ACTIVE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        bestPractice: {
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
        },
      },
      orderBy: { promotedAt: "desc" },
      take: 10,
    });
  }),

  /**
   * Get active promotions visible to the current user
   */
  getActiveForUser: protectedProcedure.query(async ({ ctx }) => {
    const { session } = ctx;
    const user = await ctx.db.user.findUnique({
      where: { id: session.user.id },
      include: {
        organization: {
          select: {
            id: true,
            regionalTeamId: true,
          },
        },
      },
    });

    if (!user) {
      return [];
    }

    // User's team ID from their organization (if any)
    const userTeamId = user.organization?.regionalTeamId;
    const userTeamIds = userTeamId ? [userTeamId] : [];

    return ctx.db.bestPracticePromotion.findMany({
      where: {
        status: "ACTIVE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        AND: [
          {
            OR: [
              { targetType: "ALL_ANSPS" },
              ...(userTeamIds.length > 0
                ? [
                    {
                      targetType: "BY_TEAM" as const,
                      targetTeamIds: { hasSome: userTeamIds },
                    },
                  ]
                : []),
              ...(user.organizationId
                ? [
                    {
                      targetType: "BY_ORGANIZATION" as const,
                      targetOrgIds: { has: user.organizationId },
                    },
                  ]
                : []),
            ],
          },
        ],
      },
      include: {
        bestPractice: {
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
        },
        promotedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ isFeatured: "desc" }, { promotedAt: "desc" }],
      take: 20,
    });
  }),

  /**
   * Cancel a promotion
   */
  cancel: protectedProcedure
    .input(z.object({ promotionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { session } = ctx;

      if (!isBPProgrammeRole(session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Programme roles can cancel promotions",
        });
      }

      const promotion = await ctx.db.bestPracticePromotion.findUnique({
        where: { id: input.promotionId },
      });

      if (!promotion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Promotion not found",
        });
      }

      return ctx.db.bestPracticePromotion.update({
        where: { id: input.promotionId },
        data: { status: "CANCELLED" },
      });
    }),

  /**
   * Update a promotion (e.g., extend expiry, update message)
   */
  update: protectedProcedure
    .input(
      z.object({
        promotionId: z.string(),
        messageEn: z.string().max(500).optional(),
        messageFr: z.string().max(500).optional(),
        isFeatured: z.boolean().optional(),
        expiresAt: z.date().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session } = ctx;

      if (!isBPProgrammeRole(session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Programme roles can update promotions",
        });
      }

      const { promotionId, ...data } = input;

      return ctx.db.bestPracticePromotion.update({
        where: { id: promotionId },
        data,
      });
    }),
});

// =============================================================================
// HELPERS
// =============================================================================

interface PromotionNotificationParams {
  promotion: { id: string };
  bestPractice: {
    id: string;
    titleEn: string;
    titleFr: string;
    organization: { nameEn: string; nameFr: string } | null;
  };
  targetType: string;
  targetTeamIds?: string[];
  targetOrgIds?: string[];
  messageEn?: string;
  messageFr?: string;
  senderId: string;
}

/**
 * Helper to create notifications for promotion targets
 */
async function createPromotionNotifications(
  prisma: PrismaClient,
  params: PromotionNotificationParams
) {
  const {
    bestPractice,
    targetType,
    targetTeamIds,
    targetOrgIds,
    messageEn,
    messageFr,
    senderId,
  } = params;

  console.log("[Promotion] Creating notifications for:", {
    bestPracticeId: bestPractice.id,
    targetType,
    targetTeamIds,
    targetOrgIds,
    senderId,
  });

  // Build user filter based on target type
  // Target reviewers, committee members, and ANSP roles
  // Exclude the user who is sending the promotion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userFilter: any = {
    role: {
      in: [
        // Reviewer roles (currently populated)
        "PEER_REVIEWER",
        "LEAD_REVIEWER",
        "STEERING_COMMITTEE",
        // ANSP roles (for when they're added)
        "ANSP_ADMIN",
        "SAFETY_MANAGER",
        "QUALITY_MANAGER",
        "STAFF",
      ],
    },
    isActive: true,
    // Don't notify the sender
    id: { not: senderId },
  };

  if (targetType === "BY_TEAM" && targetTeamIds?.length) {
    userFilter.organization = {
      regionalTeamId: { in: targetTeamIds },
    };
  } else if (targetType === "BY_ORGANIZATION" && targetOrgIds?.length) {
    userFilter.organizationId = { in: targetOrgIds };
  }

  // Get target users
  const users = await prisma.user.findMany({
    where: userFilter,
    select: { id: true, role: true },
  });

  console.log("[Promotion] Found target users:", users.length);
  console.log(
    "[Promotion] Target roles:",
    [...new Set(users.map((u) => u.role))]
  );

  if (users.length === 0) {
    console.log("[Promotion] No target users found, skipping notifications");
    return;
  }

  // Create notifications in batch
  const notifications = users.map((user: { id: string }) => ({
    userId: user.id,
    type: "BEST_PRACTICE_PROMOTED" as const,
    titleEn: `New Best Practice Recommendation: ${bestPractice.titleEn}`,
    titleFr: `Nouvelle Recommandation de Bonne Pratique : ${bestPractice.titleFr}`,
    messageEn:
      messageEn ||
      `A best practice from ${bestPractice.organization?.nameEn || "an ANSP"} has been recommended for your review.`,
    messageFr:
      messageFr ||
      `Une bonne pratique de ${bestPractice.organization?.nameFr || "un ANSP"} a été recommandée pour votre examen.`,
    entityType: "BEST_PRACTICE",
    entityId: bestPractice.id,
    actionUrl: `/best-practices/${bestPractice.id}`,
    actionLabelEn: "View Practice",
    actionLabelFr: "Voir la Pratique",
    priority: "NORMAL" as const,
  }));

  try {
    const result = await prisma.notification.createMany({ data: notifications });
    console.log("[Promotion] Created notifications:", result.count);
  } catch (error) {
    console.error("[Promotion] Failed to create notifications:", error);
    throw error;
  }
}
