/**
 * COI Router - Conflict of Interest Management API
 *
 * Provides enterprise-grade COI management for the AFI Peer Review Programme.
 * Aligned with ICAO Doc 9734 and CANSO peer review standards.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import { Prisma, AuditAction } from "@prisma/client";
import {
  // Schemas
  createCOISchema,
  updateCOISchema,
  checkCOISchema,
  checkTeamCOISchema,
  listCOISchema,
  createOverrideSchema,
  revokeOverrideSchema,
  listOverridesSchema,
  syncAutoDetectedSchema,
  // Types
  COI_TYPE_CONFIG,
  COI_SEVERITY_CONFIG,
  getDefaultSeverity,
} from "@/lib/coi";
import {
  checkReviewerCOI,
  checkTeamCOI,
  syncAutoDetectedCOIs,
  getCOIStats,
} from "@/lib/coi/detection";

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Log audit entry for COI operations
 */
async function logAuditEntry(
  userId: string,
  action: AuditAction,
  entityId: string,
  newData?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType: "ReviewerCOI",
        entityId,
        newState: newData ? JSON.stringify(newData) : Prisma.JsonNull,
      },
    });
  } catch (error) {
    console.error("[Audit] Failed to log COI entry:", error);
  }
}

/**
 * Check if user can manage COIs for a reviewer
 */
async function canManageCOI(
  userId: string,
  userRole: string,
  reviewerProfileId: string
): Promise<boolean> {
  // Admins can manage any COI
  const adminRoles = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"];
  if (adminRoles.includes(userRole)) {
    return true;
  }

  // Users can manage their own COIs
  const reviewer = await prisma.reviewerProfile.findUnique({
    where: { id: reviewerProfileId },
    select: { userId: true },
  });

  return reviewer?.userId === userId;
}

// =============================================================================
// COI ROUTER
// =============================================================================

export const coiRouter = router({
  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * List COIs with filters and pagination
   */
  list: protectedProcedure
    .input(listCOISchema)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, sortBy, sortOrder, ...filters } = input;

      // Build where clause
      const where: Prisma.ReviewerCOIWhereInput = {};

      if (filters.reviewerProfileId) {
        where.reviewerProfileId = filters.reviewerProfileId;
      }
      if (filters.organizationId) {
        where.organizationId = filters.organizationId;
      }
      if (filters.coiType) {
        where.coiType = filters.coiType;
      }
      if (filters.severity) {
        where.severity = filters.severity;
      }
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }
      if (filters.isAutoDetected !== undefined) {
        where.isAutoDetected = filters.isAutoDetected;
      }

      // Non-admins can only see their own COIs
      const adminRoles = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"];
      if (!adminRoles.includes(ctx.user.role)) {
        const ownProfile = await prisma.reviewerProfile.findUnique({
          where: { userId: ctx.user.id },
          select: { id: true },
        });
        if (ownProfile) {
          where.reviewerProfileId = ownProfile.id;
        } else {
          // No profile, no COIs to see
          return {
            items: [],
            total: 0,
            page,
            pageSize,
            totalPages: 0,
          };
        }
      }

      // Get total count
      const total = await prisma.reviewerCOI.count({ where });

      // Get items with pagination
      const items = await prisma.reviewerCOI.findMany({
        where,
        include: {
          reviewerProfile: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          organization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
              icaoCode: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          verifiedBy: {
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
      });

      // Transform items for response
      const transformedItems = items.map((item) => ({
        id: item.id,
        reviewerProfileId: item.reviewerProfileId,
        reviewerName: `${item.reviewerProfile.user.firstName} ${item.reviewerProfile.user.lastName}`,
        organizationId: item.organizationId,
        organizationName: item.organization.nameEn,
        coiType: item.coiType,
        severity: item.severity,
        reasonEn: item.reasonEn,
        reasonFr: item.reasonFr,
        isAutoDetected: item.isAutoDetected,
        isActive: item.isActive,
        startDate: item.startDate,
        endDate: item.endDate,
        createdAt: item.createdAt,
        hasActiveOverride: false, // Will be populated below
      }));

      // Check for active overrides
      const activeOverrides = await prisma.cOIOverride.findMany({
        where: {
          reviewerProfileId: { in: items.map((i) => i.reviewerProfileId) },
          organizationId: { in: items.map((i) => i.organizationId) },
          isRevoked: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } },
          ],
        },
        select: {
          reviewerProfileId: true,
          organizationId: true,
        },
      });

      const overrideSet = new Set(
        activeOverrides.map((o) => `${o.reviewerProfileId}-${o.organizationId}`)
      );

      for (const item of transformedItems) {
        item.hasActiveOverride = overrideSet.has(
          `${item.reviewerProfileId}-${item.organizationId}`
        );
      }

      return {
        items: transformedItems,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  /**
   * Get a single COI by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const coi = await prisma.reviewerCOI.findUnique({
        where: { id: input.id },
        include: {
          reviewerProfile: {
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
          organization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
              icaoCode: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          verifiedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!coi) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "COI not found",
        });
      }

      // Check permission
      const canView = await canManageCOI(
        ctx.user.id,
        ctx.user.role,
        coi.reviewerProfileId
      );

      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this COI",
        });
      }

      return coi;
    }),

  /**
   * Check COI for a single reviewer against an organization
   */
  check: protectedProcedure
    .input(checkCOISchema)
    .query(async ({ input }) => {
      return checkReviewerCOI(
        prisma,
        input.reviewerProfileId,
        input.organizationId,
        input.reviewId
      );
    }),

  /**
   * Check COI for a team of reviewers against an organization
   */
  checkTeam: protectedProcedure
    .input(checkTeamCOISchema)
    .query(async ({ input }) => {
      return checkTeamCOI(
        prisma,
        input.reviewerProfileIds,
        input.organizationId,
        input.reviewId
      );
    }),

  /**
   * Get COI statistics
   */
  getStats: protectedProcedure
    .input(
      z.object({
        reviewerProfileId: z.string().cuid().optional(),
        organizationId: z.string().cuid().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Non-admins can only see their own stats
      const adminRoles = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"];
      if (!adminRoles.includes(ctx.user.role)) {
        const ownProfile = await prisma.reviewerProfile.findUnique({
          where: { userId: ctx.user.id },
          select: { id: true },
        });
        if (!ownProfile) {
          return {
            total: 0,
            active: 0,
            inactive: 0,
            byType: {},
            bySeverity: {},
            autoDetected: 0,
            manuallyDeclared: 0,
            activeOverrides: 0,
          };
        }
        return getCOIStats(prisma, { reviewerProfileId: ownProfile.id });
      }

      return getCOIStats(prisma, input || undefined);
    }),

  /**
   * Get COI type configuration
   */
  getTypeConfig: protectedProcedure.query(() => {
    return COI_TYPE_CONFIG;
  }),

  /**
   * Get COI severity configuration
   */
  getSeverityConfig: protectedProcedure.query(() => {
    return COI_SEVERITY_CONFIG;
  }),

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create a new COI declaration
   */
  create: protectedProcedure
    .input(createCOISchema)
    .mutation(async ({ ctx, input }) => {
      // Check permission
      const canManage = await canManageCOI(
        ctx.user.id,
        ctx.user.role,
        input.reviewerProfileId
      );

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to create COIs for this reviewer",
        });
      }

      // Verify reviewer exists
      const reviewer = await prisma.reviewerProfile.findUnique({
        where: { id: input.reviewerProfileId },
      });

      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer profile not found",
        });
      }

      // Verify organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: input.organizationId },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      // Check for existing active COI of same type
      const existing = await prisma.reviewerCOI.findFirst({
        where: {
          reviewerProfileId: input.reviewerProfileId,
          organizationId: input.organizationId,
          coiType: input.coiType,
          isActive: true,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An active COI of this type already exists for this reviewer and organization",
        });
      }

      // Use default severity if not provided
      const severity = input.severity || getDefaultSeverity(input.coiType);

      // Create the COI
      const coi = await prisma.reviewerCOI.create({
        data: {
          reviewerProfileId: input.reviewerProfileId,
          organizationId: input.organizationId,
          coiType: input.coiType,
          severity,
          reasonEn: input.reasonEn,
          reasonFr: input.reasonFr || null,
          startDate: input.startDate || new Date(),
          endDate: input.endDate || null,
          isAutoDetected: false,
          createdById: ctx.user.id,
        },
        include: {
          reviewerProfile: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          organization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
            },
          },
        },
      });

      await logAuditEntry(ctx.user.id, AuditAction.CREATE, coi.id, {
        reviewerProfileId: input.reviewerProfileId,
        organizationId: input.organizationId,
        coiType: input.coiType,
        severity,
      });

      console.log(
        `[COI] User ${ctx.user.id} created COI ${coi.id} for reviewer ${input.reviewerProfileId}`
      );

      return coi;
    }),

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update an existing COI declaration
   */
  update: protectedProcedure
    .input(updateCOISchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Get existing COI
      const existing = await prisma.reviewerCOI.findUnique({
        where: { id },
        select: {
          id: true,
          reviewerProfileId: true,
          isAutoDetected: true,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "COI not found",
        });
      }

      // Check permission
      const canManage = await canManageCOI(
        ctx.user.id,
        ctx.user.role,
        existing.reviewerProfileId
      );

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this COI",
        });
      }

      // Don't allow editing auto-detected COIs (only deactivating)
      if (existing.isAutoDetected && (data.reasonEn || data.reasonFr)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot edit reason for auto-detected COIs",
        });
      }

      // Build update data
      const updateData: Prisma.ReviewerCOIUpdateInput = {};

      if (data.reasonEn !== undefined) {
        updateData.reasonEn = data.reasonEn;
      }
      if (data.reasonFr !== undefined) {
        updateData.reasonFr = data.reasonFr;
      }
      if (data.endDate !== undefined) {
        updateData.endDate = data.endDate;
      }
      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
        if (!data.isActive) {
          updateData.endDate = new Date();
        }
      }

      const coi = await prisma.reviewerCOI.update({
        where: { id },
        data: updateData,
        include: {
          reviewerProfile: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          organization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
            },
          },
        },
      });

      await logAuditEntry(ctx.user.id, AuditAction.UPDATE, id, {
        updatedFields: Object.keys(data),
      });

      console.log(`[COI] User ${ctx.user.id} updated COI ${id}`);

      return coi;
    }),

  /**
   * Sync auto-detected COIs for a reviewer
   */
  syncAutoDetected: protectedProcedure
    .input(syncAutoDetectedSchema)
    .mutation(async ({ ctx, input }) => {
      // Check permission
      const canManage = await canManageCOI(
        ctx.user.id,
        ctx.user.role,
        input.reviewerProfileId
      );

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to sync COIs for this reviewer",
        });
      }

      const result = await syncAutoDetectedCOIs(prisma, input.reviewerProfileId);

      await logAuditEntry(ctx.user.id, AuditAction.UPDATE, input.reviewerProfileId, {
        created: result.created,
        deactivated: result.deactivated,
      });

      console.log(
        `[COI] User ${ctx.user.id} synced auto-detected COIs for reviewer ${input.reviewerProfileId}: ${result.created} created, ${result.deactivated} deactivated`
      );

      return result;
    }),

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Delete a COI (admin only, soft delete preferred)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const coi = await prisma.reviewerCOI.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          reviewerProfileId: true,
          organizationId: true,
          coiType: true,
          isAutoDetected: true,
        },
      });

      if (!coi) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "COI not found",
        });
      }

      // Check permission
      const canManage = await canManageCOI(
        ctx.user.id,
        ctx.user.role,
        coi.reviewerProfileId
      );

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this COI",
        });
      }

      // For auto-detected COIs, just deactivate
      if (coi.isAutoDetected) {
        await prisma.reviewerCOI.update({
          where: { id: input.id },
          data: {
            isActive: false,
            endDate: new Date(),
          },
        });
      } else {
        // For manual COIs, actually delete
        await prisma.reviewerCOI.delete({
          where: { id: input.id },
        });
      }

      await logAuditEntry(ctx.user.id, AuditAction.DELETE, input.id, {
        reviewerProfileId: coi.reviewerProfileId,
        organizationId: coi.organizationId,
        coiType: coi.coiType,
        wasAutoDetected: coi.isAutoDetected,
      });

      console.log(`[COI] User ${ctx.user.id} deleted COI ${input.id}`);

      return { success: true };
    }),

  // ============================================
  // OVERRIDE OPERATIONS (ADMIN ONLY)
  // ============================================

  /**
   * List COI overrides with filters and pagination
   */
  listOverrides: protectedProcedure
    .input(listOverridesSchema)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, sortBy, sortOrder, ...filters } = input;

      // Build where clause
      const where: Prisma.COIOverrideWhereInput = {};

      if (filters.reviewerProfileId) {
        where.reviewerProfileId = filters.reviewerProfileId;
      }
      if (filters.organizationId) {
        where.organizationId = filters.organizationId;
      }
      if (filters.reviewId) {
        where.reviewId = filters.reviewId;
      }
      if (filters.isRevoked !== undefined) {
        where.isRevoked = filters.isRevoked;
      }

      // Non-admins can only see overrides for their own profile
      const adminRoles = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"];
      if (!adminRoles.includes(ctx.user.role)) {
        const ownProfile = await prisma.reviewerProfile.findUnique({
          where: { userId: ctx.user.id },
          select: { id: true },
        });
        if (ownProfile) {
          where.reviewerProfileId = ownProfile.id;
        } else {
          return {
            items: [],
            total: 0,
            page,
            pageSize,
            totalPages: 0,
          };
        }
      }

      const total = await prisma.cOIOverride.count({ where });

      const items = await prisma.cOIOverride.findMany({
        where,
        include: {
          reviewerProfile: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          organization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          revokedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          review: {
            select: {
              id: true,
              referenceNumber: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  /**
   * Create a COI override (admin only)
   */
  createOverride: adminProcedure
    .input(createOverrideSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify reviewer exists
      const reviewer = await prisma.reviewerProfile.findUnique({
        where: { id: input.reviewerProfileId },
      });

      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer profile not found",
        });
      }

      // Verify organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: input.organizationId },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      // Check if reviewer has any COI with this organization
      const coiCheck = await checkReviewerCOI(
        prisma,
        input.reviewerProfileId,
        input.organizationId,
        input.reviewId || undefined
      );

      if (!coiCheck.hasConflict) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Reviewer has no conflicts with this organization",
        });
      }

      // Cannot override hard blocks
      if (coiCheck.hasHardBlock) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot override hard block COIs. Remove the reviewer from consideration.",
        });
      }

      // Check for existing active override
      const existingOverride = await prisma.cOIOverride.findFirst({
        where: {
          reviewerProfileId: input.reviewerProfileId,
          organizationId: input.organizationId,
          reviewId: input.reviewId || null,
          isRevoked: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } },
          ],
        },
      });

      if (existingOverride) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An active override already exists for this reviewer and organization",
        });
      }

      // Create the override
      const override = await prisma.cOIOverride.create({
        data: {
          reviewerProfileId: input.reviewerProfileId,
          organizationId: input.organizationId,
          reviewId: input.reviewId || null,
          justification: input.justification,
          approvedById: ctx.user.id,
          approvedAt: new Date(),
          expiresAt: input.expiresAt || null,
        },
        include: {
          reviewerProfile: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          organization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      await logAuditEntry(ctx.user.id, AuditAction.CREATE, override.id, {
        reviewerProfileId: input.reviewerProfileId,
        organizationId: input.organizationId,
        reviewId: input.reviewId,
        expiresAt: input.expiresAt,
      });

      console.log(
        `[COI] Admin ${ctx.user.id} created override ${override.id} for reviewer ${input.reviewerProfileId}`
      );

      return override;
    }),

  /**
   * Revoke a COI override (admin only)
   */
  revokeOverride: adminProcedure
    .input(revokeOverrideSchema)
    .mutation(async ({ ctx, input }) => {
      const override = await prisma.cOIOverride.findUnique({
        where: { id: input.id },
      });

      if (!override) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Override not found",
        });
      }

      if (override.isRevoked) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Override is already revoked",
        });
      }

      const updated = await prisma.cOIOverride.update({
        where: { id: input.id },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedById: ctx.user.id,
          revokeReason: input.revokeReason,
        },
        include: {
          reviewerProfile: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          organization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
            },
          },
        },
      });

      await logAuditEntry(ctx.user.id, AuditAction.UPDATE, input.id, {
        revokeReason: input.revokeReason,
      });

      console.log(`[COI] Admin ${ctx.user.id} revoked override ${input.id}`);

      return updated;
    }),
});

export type COIRouter = typeof coiRouter;
