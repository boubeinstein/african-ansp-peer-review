/**
 * Organization Router - Organization Management API
 *
 * Provides CRUD operations for organizations in the AFI Peer Review Programme.
 * Includes listing, filtering, statistics, and admin operations.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import { Prisma, AfricanRegion, MembershipStatus, AuditAction } from "@prisma/client";
import {
  organizationCreateSchema,
  organizationUpdateSchema,
  organizationFiltersSchema,
  organizationIdSchema,
} from "@/types/organization";
import { hasPermission } from "@/lib/rbac/permissions";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Include clause for organization with counts
 */
const organizationWithCountsInclude = {
  _count: {
    select: {
      users: true,
      assessments: true,
      homeReviewers: true,
      reviewsAsHost: true,
    },
  },
} satisfies Prisma.OrganizationInclude;

/**
 * Include clause for organization list items
 */
const organizationListInclude = {
  _count: {
    select: {
      users: true,
      assessments: true,
    },
  },
} satisfies Prisma.OrganizationInclude;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Log audit entry for organization operations
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
        entityType: "Organization",
        entityId,
        newState: newData ? JSON.stringify(newData) : Prisma.JsonNull,
      },
    });
  } catch (error) {
    console.error("[Audit] Failed to log organization entry:", error);
  }
}

/**
 * Build where clause for organization search
 */
function buildOrganizationWhereClause(
  filters: z.infer<typeof organizationFiltersSchema>
): Prisma.OrganizationWhereInput {
  const where: Prisma.OrganizationWhereInput = {};

  // Text search across name, organizationCode, country
  if (filters.search) {
    const searchTerm = filters.search.trim();
    where.OR = [
      { nameEn: { contains: searchTerm, mode: "insensitive" } },
      { nameFr: { contains: searchTerm, mode: "insensitive" } },
      { organizationCode: { contains: searchTerm, mode: "insensitive" } },
      { country: { contains: searchTerm, mode: "insensitive" } },
      { city: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  // Region filter
  if (filters.region?.length) {
    where.region = { in: filters.region as AfricanRegion[] };
  }

  // Country filter
  if (filters.country?.length) {
    where.country = { in: filters.country };
  }

  // Membership status filter
  if (filters.membershipStatus?.length) {
    where.membershipStatus = { in: filters.membershipStatus as MembershipStatus[] };
  }

  return where;
}

/**
 * Build order by clause for organization sorting
 */
function buildOrganizationOrderBy(
  sortBy: string,
  sortOrder: "asc" | "desc"
): Prisma.OrganizationOrderByWithRelationInput {
  const orderMap: Record<string, Prisma.OrganizationOrderByWithRelationInput> = {
    nameEn: { nameEn: sortOrder },
    nameFr: { nameFr: sortOrder },
    country: { country: sortOrder },
    region: { region: sortOrder },
    membershipStatus: { membershipStatus: sortOrder },
    createdAt: { createdAt: sortOrder },
    organizationCode: { organizationCode: sortOrder },
  };

  return orderMap[sortBy] || { nameEn: sortOrder };
}

// =============================================================================
// ORGANIZATION ROUTER
// =============================================================================

export const organizationRouter = router({
  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * List all organizations for dropdown/select components (no pagination)
   * Returns minimal data optimized for selection UI
   */
  listForDropdown: protectedProcedure.query(async () => {
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        nameEn: true,
        nameFr: true,
        organizationCode: true,
        country: true,
        region: true,
      },
      orderBy: { nameEn: "asc" },
    });
    return organizations;
  }),

  /**
   * List organizations with filtering and pagination
   * Users without organizations.all permission only see their own organization
   */
  list: protectedProcedure
    .input(organizationFiltersSchema)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, sortBy, sortOrder } = input;
      const skip = (page - 1) * pageSize;

      const where = buildOrganizationWhereClause(input);
      const orderBy = buildOrganizationOrderBy(sortBy, sortOrder);

      // Check if user has permission to see all organizations
      const canSeeAll = hasPermission(ctx.user.role, "organizations.all");

      // If user cannot see all, restrict to their own organization
      if (!canSeeAll && ctx.user.organizationId) {
        where.id = ctx.user.organizationId;
      } else if (!canSeeAll && !ctx.user.organizationId) {
        // User has no organization and no permission to see all - return empty
        return {
          items: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        };
      }

      const [items, total] = await Promise.all([
        prisma.organization.findMany({
          where,
          include: organizationListInclude,
          orderBy,
          skip,
          take: pageSize,
        }),
        prisma.organization.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  /**
   * Get organization by ID with related counts
   * Users without organizations.all can only view their own organization
   */
  getById: protectedProcedure
    .input(organizationIdSchema)
    .query(async ({ ctx, input }) => {
      // Check if user has permission to see all organizations
      const canSeeAll = hasPermission(ctx.user.role, "organizations.all");

      // If user cannot see all, verify they're requesting their own organization
      if (!canSeeAll && ctx.user.organizationId !== input.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only view your own organization",
        });
      }

      const organization = await prisma.organization.findUnique({
        where: { id: input.id },
        include: organizationWithCountsInclude,
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      return organization;
    }),

  /**
   * Get organization statistics
   * Users without organizations.all permission only see stats for their own organization
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    // Check if user has permission to see all organizations
    const canSeeAll = hasPermission(ctx.user.role, "organizations.all");

    // Build where clause based on permissions
    const where: Prisma.OrganizationWhereInput = {};
    if (!canSeeAll && ctx.user.organizationId) {
      where.id = ctx.user.organizationId;
    } else if (!canSeeAll && !ctx.user.organizationId) {
      // User has no organization and no permission to see all - return empty stats
      return {
        total: 0,
        active: 0,
        pending: 0,
        suspended: 0,
        inactive: 0,
        byRegion: {},
        byStatus: {},
        byCountry: {},
      };
    }

    const [
      total,
      byStatus,
      byRegion,
      byCountry,
    ] = await Promise.all([
      // Total count
      prisma.organization.count({ where }),

      // Count by status
      prisma.organization.groupBy({
        by: ["membershipStatus"],
        where,
        _count: { id: true },
      }),

      // Count by region
      prisma.organization.groupBy({
        by: ["region"],
        where,
        _count: { id: true },
      }),

      // Count by country
      prisma.organization.groupBy({
        by: ["country"],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 20, // Top 20 countries
      }),
    ]);

    // Transform grouped data to records
    const statusCounts = byStatus.reduce(
      (acc, item) => {
        acc[item.membershipStatus] = item._count.id;
        return acc;
      },
      {} as Record<string, number>
    );

    const regionCounts = byRegion.reduce(
      (acc, item) => {
        acc[item.region] = item._count.id;
        return acc;
      },
      {} as Record<string, number>
    );

    const countryCounts = byCountry.reduce(
      (acc, item) => {
        acc[item.country] = item._count.id;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      total,
      active: statusCounts["ACTIVE"] || 0,
      pending: statusCounts["PENDING"] || 0,
      suspended: statusCounts["SUSPENDED"] || 0,
      inactive: statusCounts["INACTIVE"] || 0,
      byRegion: regionCounts,
      byStatus: statusCounts,
      byCountry: countryCounts,
    };
  }),

  /**
   * Get distinct countries for filter dropdown
   */
  getCountries: protectedProcedure.query(async () => {
    const countries = await prisma.organization.groupBy({
      by: ["country"],
      _count: { id: true },
      orderBy: { country: "asc" },
    });

    return countries.map((item) => ({
      value: item.country,
      label: item.country,
      count: item._count.id,
    }));
  }),

  /**
   * Get available regions
   */
  getRegions: protectedProcedure.query(async () => {
    const regions: Array<{
      value: AfricanRegion;
      label: string;
      labelFr: string;
    }> = [
      { value: "WACAF", label: "Western and Central Africa (WACAF)", labelFr: "Afrique occidentale et centrale (WACAF)" },
      { value: "ESAF", label: "Eastern and Southern Africa (ESAF)", labelFr: "Afrique orientale et australe (ESAF)" },
      { value: "NORTHERN", label: "Northern Africa", labelFr: "Afrique du Nord" },
    ];

    // Get counts for each region
    const counts = await prisma.organization.groupBy({
      by: ["region"],
      _count: { id: true },
    });

    const countMap = counts.reduce(
      (acc, item) => {
        acc[item.region] = item._count.id;
        return acc;
      },
      {} as Record<string, number>
    );

    return regions.map((region) => ({
      ...region,
      count: countMap[region.value] || 0,
    }));
  }),

  /**
   * Get all organizations for dropdown selection
   */
  getAll: protectedProcedure
    .input(
      z.object({
        activeOnly: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ input }) => {
      const where: Prisma.OrganizationWhereInput = {};

      if (input?.activeOnly) {
        where.membershipStatus = "ACTIVE";
      }

      return prisma.organization.findMany({
        where,
        select: {
          id: true,
          nameEn: true,
          nameFr: true,
          organizationCode: true,
          country: true,
        },
        orderBy: { nameEn: "asc" },
      });
    }),

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create a new organization (admin only)
   */
  create: adminProcedure
    .input(organizationCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if ICAO code is unique (if provided)
      if (input.organizationCode) {
        const existing = await prisma.organization.findUnique({
          where: { organizationCode: input.organizationCode },
        });

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Organization with ICAO code ${input.organizationCode} already exists`,
          });
        }
      }

      // Create organization
      const organization = await prisma.organization.create({
        data: {
          nameEn: input.nameEn,
          nameFr: input.nameFr,
          organizationCode: input.organizationCode || null,
          country: input.country,
          city: input.city || null,
          region: input.region as AfricanRegion,
          membershipStatus: (input.membershipStatus || "PENDING") as MembershipStatus,
          joinedAt: input.membershipStatus === "ACTIVE" ? new Date() : null,
        },
        include: organizationWithCountsInclude,
      });

      await logAuditEntry(ctx.user.id, AuditAction.CREATE, organization.id, {
        nameEn: input.nameEn,
        organizationCode: input.organizationCode,
        region: input.region,
      });

      console.log(
        `[Organization] Admin ${ctx.user.id} created organization ${organization.id} (${organization.nameEn})`
      );

      return organization;
    }),

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update an organization (admin only)
   */
  update: adminProcedure
    .input(organizationUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify organization exists
      const existing = await prisma.organization.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      // If updating ICAO code, check uniqueness
      if (data.organizationCode && data.organizationCode !== existing.organizationCode) {
        const duplicate = await prisma.organization.findUnique({
          where: { organizationCode: data.organizationCode },
        });

        if (duplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Organization with ICAO code ${data.organizationCode} already exists`,
          });
        }
      }

      // Build update data
      const updateData: Prisma.OrganizationUpdateInput = {};

      if (data.nameEn !== undefined) updateData.nameEn = data.nameEn;
      if (data.nameFr !== undefined) updateData.nameFr = data.nameFr;
      if (data.organizationCode !== undefined) updateData.organizationCode = data.organizationCode;
      if (data.country !== undefined) updateData.country = data.country;
      if (data.city !== undefined) updateData.city = data.city;
      if (data.region !== undefined) updateData.region = data.region as AfricanRegion;
      if (data.membershipStatus !== undefined) {
        updateData.membershipStatus = data.membershipStatus as MembershipStatus;
        // Set joinedAt when status changes to ACTIVE
        if (data.membershipStatus === "ACTIVE" && existing.membershipStatus !== "ACTIVE") {
          updateData.joinedAt = new Date();
        }
      }

      const organization = await prisma.organization.update({
        where: { id },
        data: updateData,
        include: organizationWithCountsInclude,
      });

      await logAuditEntry(ctx.user.id, AuditAction.UPDATE, id, {
        updatedFields: Object.keys(data),
      });

      console.log(
        `[Organization] Admin ${ctx.user.id} updated organization ${id}`
      );

      return organization;
    }),

  /**
   * Update organization membership status (admin only)
   */
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        membershipStatus: z.enum(["ACTIVE", "PENDING", "SUSPENDED", "INACTIVE"]),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.organization.findUnique({
        where: { id: input.id },
        select: { id: true, membershipStatus: true, nameEn: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      const updateData: Prisma.OrganizationUpdateInput = {
        membershipStatus: input.membershipStatus as MembershipStatus,
      };

      // Set joinedAt when status changes to ACTIVE
      if (input.membershipStatus === "ACTIVE" && existing.membershipStatus !== "ACTIVE") {
        updateData.joinedAt = new Date();
      }

      const organization = await prisma.organization.update({
        where: { id: input.id },
        data: updateData,
        include: organizationListInclude,
      });

      await logAuditEntry(ctx.user.id, AuditAction.STATUS_CHANGE, input.id, {
        previousStatus: existing.membershipStatus,
        newStatus: input.membershipStatus,
        notes: input.notes,
      });

      console.log(
        `[Organization] Admin ${ctx.user.id} changed status of ${existing.nameEn} from ${existing.membershipStatus} to ${input.membershipStatus}`
      );

      return organization;
    }),

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Delete an organization (admin only)
   */
  delete: adminProcedure
    .input(organizationIdSchema)
    .mutation(async ({ ctx, input }) => {
      const organization = await prisma.organization.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              users: true,
              assessments: true,
              reviewsAsHost: true,
            },
          },
        },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      // Prevent deletion if organization has related records
      if (organization._count.users > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete organization with ${organization._count.users} user(s). Reassign users first.`,
        });
      }

      if (organization._count.assessments > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete organization with ${organization._count.assessments} assessment(s). Archive or delete assessments first.`,
        });
      }

      if (organization._count.reviewsAsHost > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete organization with ${organization._count.reviewsAsHost} review(s). Delete reviews first.`,
        });
      }

      await prisma.organization.delete({
        where: { id: input.id },
      });

      await logAuditEntry(ctx.user.id, AuditAction.DELETE, input.id, {
        deletedOrganization: organization.nameEn,
        organizationCode: organization.organizationCode,
      });

      console.log(
        `[Organization] Admin ${ctx.user.id} deleted organization ${input.id} (${organization.nameEn})`
      );

      return { success: true };
    }),

  // ============================================
  // SEARCH OPERATIONS
  // ============================================

  /**
   * Search organizations with autocomplete
   */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        limit: z.number().int().min(1).max(20).default(10),
        activeOnly: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      const where: Prisma.OrganizationWhereInput = {
        OR: [
          { nameEn: { contains: input.query, mode: "insensitive" } },
          { nameFr: { contains: input.query, mode: "insensitive" } },
          { organizationCode: { contains: input.query, mode: "insensitive" } },
          { country: { contains: input.query, mode: "insensitive" } },
        ],
      };

      if (input.activeOnly) {
        where.membershipStatus = "ACTIVE";
      }

      return prisma.organization.findMany({
        where,
        select: {
          id: true,
          nameEn: true,
          nameFr: true,
          organizationCode: true,
          country: true,
          region: true,
          membershipStatus: true,
        },
        orderBy: { nameEn: "asc" },
        take: input.limit,
      });
    }),

  /**
   * Check if ICAO code is available
   */
  checkIcaoCode: protectedProcedure
    .input(
      z.object({
        organizationCode: z.string().length(4),
        excludeId: z.string().cuid().optional(),
      })
    )
    .query(async ({ input }) => {
      const where: Prisma.OrganizationWhereInput = {
        organizationCode: input.organizationCode.toUpperCase(),
      };

      if (input.excludeId) {
        where.id = { not: input.excludeId };
      }

      const existing = await prisma.organization.findFirst({
        where,
        select: { id: true, nameEn: true },
      });

      return {
        available: !existing,
        existingOrganization: existing
          ? { id: existing.id, name: existing.nameEn }
          : null,
      };
    }),
});

export type OrganizationRouter = typeof organizationRouter;
