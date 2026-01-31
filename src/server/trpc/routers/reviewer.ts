/**
 * Reviewer Router - Reviewer Profile Module API
 *
 * Provides CRUD operations for reviewer profiles, expertise management,
 * COI tracking, and reviewer matching aligned with ICAO Doc 9734
 * and CANSO peer review standards.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import {
  ReviewerStatus,
  ReviewerSelectionStatus,
  ReviewerType,
  ExpertiseArea,
  Language,
  Prisma,
  AuditAction,
} from "@prisma/client";
import {
  createReviewerProfileSchema,
  updateReviewerProfileSchema,
  reviewerProfileFilterSchema,
  createExpertiseSchema,
  updateExpertiseSchema,
  batchExpertiseSchema,
  createLanguageSchema,
  updateLanguageSchema,
  batchLanguageSchema,
  createCertificationSchema,
  updateCertificationSchema,
  createAvailabilitySchemaBase,
  updateAvailabilitySchema,
  createTrainingSchema,
  updateTrainingSchema,
  createCOISchema,
  updateCOISchema,
  verifyCOISchema,
} from "@/lib/validations/reviewer";
import {
  getReviewerById,
  getReviewerByUserId,
  searchReviewers,
  checkCOIConflict,
  reviewerProfileInclude,
  reviewerProfileListInclude,
} from "@/server/db/queries/reviewer";
import {
  canManageReviewers,
  canViewReviewer,
  assertCanManageReviewers,
  assertCanEditReviewer,
  assertCanViewReviewer,
  assertCanCoordinateReviewers,
} from "../lib/reviewer-permissions";
import {
  MATCHING_WEIGHTS,
  REVIEWER_CAPACITY,
} from "@/lib/reviewer/constants";
import {
  getEligibleReviewers,
  validateReviewerAssignment,
} from "@/server/services/reviewer-eligibility";
import { matchingCriteriaSchema } from "@/lib/validations/reviewer";
import {
  findMatchingReviewers,
  buildOptimalTeam as buildOptimalTeamAlgorithm,
  calculateMatchScore,
  type MatchingCriteria,
  type MatchResult,
} from "@/lib/reviewer/matching";
import type { ReviewerProfileFull } from "@/types/reviewer";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Maximum number of selected reviewers in the pool (per programme guidelines)
 */
const MAX_SELECTED_REVIEWERS = 45;

/**
 * Valid status transitions for reviewer profiles
 */
const SELECTION_STATUS_TRANSITIONS: Record<
  ReviewerSelectionStatus,
  ReviewerSelectionStatus[]
> = {
  NOMINATED: ["UNDER_REVIEW", "WITHDRAWN", "REJECTED"],
  UNDER_REVIEW: ["SELECTED", "NOMINATED", "REJECTED"],
  SELECTED: ["INACTIVE", "WITHDRAWN"],
  INACTIVE: ["SELECTED", "WITHDRAWN"],
  WITHDRAWN: [],
  REJECTED: ["NOMINATED"],
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Log audit entry for reviewer operations
 */
async function logAuditEntry(
  userId: string,
  action: AuditAction,
  entityId: string,
  newState?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType: "ReviewerProfile",
        entityId,
        newState: newState ? JSON.stringify(newState) : Prisma.JsonNull,
      },
    });
  } catch (error) {
    console.error("[Audit] Failed to log reviewer entry:", error);
  }
}

// =============================================================================
// REVIEWER ROUTER
// =============================================================================

export const reviewerRouter = router({
  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Get users without reviewer profiles (for admin to create new reviewers)
   */
  getUsersWithoutProfile: adminProcedure.query(async () => {
    const users = await prisma.user.findMany({
      where: {
        reviewerProfile: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            nameEn: true,
            nameFr: true,
          },
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
    // Transform to include a computed name field
    return users.map(user => ({
      ...user,
      name: `${user.firstName} ${user.lastName}`.trim() || null,
    }));
  }),

  /**
   * Get reviewer profile by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const reviewer = await getReviewerById(input.id);

      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer profile not found",
        });
      }

      // Check view permission
      assertCanViewReviewer(ctx.session, reviewer.userId);

      // Determine RBAC permissions
      const { session } = ctx;
      const userRole = session.user.role;
      const userOrgId = session.user.organizationId;
      const isAdmin = ["PROGRAMME_COORDINATOR", "SYSTEM_ADMIN", "SUPER_ADMIN"].includes(userRole);

      // Determine edit permission
      const canEdit = isAdmin || reviewer.organizationId === userOrgId;

      // Get user's team and reviewer's team for context
      let userRegionalTeamId: string | null = null;
      let reviewerRegionalTeamId: string | null = null;

      const [userOrg, reviewerOrg] = await Promise.all([
        userOrgId
          ? ctx.db.organization.findUnique({
              where: { id: userOrgId },
              select: { regionalTeamId: true },
            })
          : null,
        ctx.db.organization.findUnique({
          where: { id: reviewer.homeOrganizationId },
          select: { regionalTeamId: true },
        }),
      ]);

      userRegionalTeamId = userOrg?.regionalTeamId ?? null;
      reviewerRegionalTeamId = reviewerOrg?.regionalTeamId ?? null;

      const isOwnTeam = userRegionalTeamId !== null && reviewerRegionalTeamId === userRegionalTeamId;
      const isOwnOrg = reviewer.organizationId === userOrgId;

      return {
        ...reviewer,
        canEdit,
        isOwnTeam,
        isOwnOrg,
      };
    }),

  /**
   * Get reviewer profile by user ID
   */
  getByUserId: protectedProcedure
    .input(z.object({ userId: z.string().cuid().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = input.userId || ctx.user.id;

      // Users can always view their own profile
      if (userId !== ctx.user.id) {
        assertCanViewReviewer(ctx.session, userId);
      }

      const reviewer = await getReviewerByUserId(userId);
      return reviewer;
    }),

  /**
   * Get current user's reviewer profile
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    return getReviewerByUserId(ctx.user.id);
  }),

  /**
   * Check if current user has a reviewer profile
   */
  hasProfile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await prisma.reviewerProfile.findUnique({
      where: { userId: ctx.user.id },
      select: { id: true, selectionStatus: true },
    });
    return {
      hasProfile: !!profile,
      profileId: profile?.id,
      selectionStatus: profile?.selectionStatus,
    };
  }),

  /**
   * List reviewers with filters and pagination
   */
  list: protectedProcedure
    .input(reviewerProfileFilterSchema)
    .query(async ({ ctx, input }) => {
      const { session } = ctx;
      const userRole = session.user.role;
      const userOrgId = session.user.organizationId;

      // Determine if user is admin (can edit all)
      const isAdmin = ["PROGRAMME_COORDINATOR", "SYSTEM_ADMIN", "SUPER_ADMIN"].includes(userRole);

      // Get user's regional team for default filtering
      let userRegionalTeamId: string | null = null;
      if (userOrgId) {
        const userOrg = await ctx.db.organization.findUnique({
          where: { id: userOrgId },
          select: { regionalTeamId: true },
        });
        userRegionalTeamId = userOrg?.regionalTeamId ?? null;
      }

      // Check if user can view all reviewers
      if (!canViewReviewer(ctx.session, "")) {
        // Return only the user's own profile if they can't view all
        const ownProfile = await getReviewerByUserId(ctx.user.id);
        const items = ownProfile ? [{
          ...ownProfile,
          canEdit: true, // Users can always edit their own profile
        }] : [];
        return {
          items,
          total: ownProfile ? 1 : 0,
          page: 1,
          pageSize: input.pageSize,
          totalPages: 1,
          userContext: {
            isAdmin,
            userOrgId,
            userRegionalTeamId,
            canEditAll: isAdmin,
          },
        };
      }

      const result = await searchReviewers({
        page: input.page,
        pageSize: input.pageSize,
        sortBy: input.sortBy,
        sortOrder: input.sortOrder,
        search: input.search,
        organizationId: input.organizationId,
        selectionStatus: input.selectionStatus
          ? [input.selectionStatus]
          : undefined,
        reviewerType: input.reviewerType ? [input.reviewerType] : undefined,
        expertiseAreas: input.expertiseAreas,
        languages: input.languages,
        isLeadQualified: input.isLeadQualified,
        isAvailable: input.isActive,
      });

      // Add canEdit flag to each reviewer
      const reviewersWithPermissions = result.items.map((reviewer) => ({
        ...reviewer,
        canEdit: isAdmin || reviewer.organizationId === userOrgId,
      }));

      return {
        items: reviewersWithPermissions,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
        userContext: {
          isAdmin,
          userOrgId,
          userRegionalTeamId,
          canEditAll: isAdmin,
        },
      };
    }),

  /**
   * Get reviewer statistics with role-based filtering
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const { session } = ctx;
    const userRole = session.user.role;
    const userOrgId = session.user.organizationId;
    const isAdmin = ["PROGRAMME_COORDINATOR", "SYSTEM_ADMIN", "SUPER_ADMIN"].includes(userRole);

    // Get user's regional team
    let userRegionalTeamId: string | null = null;
    if (userOrgId) {
      const userOrg = await ctx.db.organization.findUnique({
        where: { id: userOrgId },
        select: { regionalTeamId: true },
      });
      userRegionalTeamId = userOrg?.regionalTeamId ?? null;
    }

    // Programme-wide stats
    const [totalAll, activeAll] = await Promise.all([
      ctx.db.reviewerProfile.count(),
      ctx.db.reviewerProfile.count({ where: { isAvailable: true } }),
    ]);

    // Team stats
    let totalTeam = 0;
    let activeTeam = 0;
    if (userRegionalTeamId) {
      const teamFilter = { homeOrganization: { regionalTeamId: userRegionalTeamId } };
      [totalTeam, activeTeam] = await Promise.all([
        ctx.db.reviewerProfile.count({ where: teamFilter }),
        ctx.db.reviewerProfile.count({ where: { ...teamFilter, isAvailable: true } }),
      ]);
    }

    // Own org stats
    const totalOwnOrg = userOrgId
      ? await ctx.db.reviewerProfile.count({ where: { organizationId: userOrgId } })
      : 0;

    return {
      programme: { total: totalAll, active: activeAll, inactive: totalAll - activeAll },
      team: userRegionalTeamId ? { total: totalTeam, active: activeTeam, inactive: totalTeam - activeTeam } : null,
      ownOrganization: { total: totalOwnOrg },
      userContext: { isAdmin, userRegionalTeamId, userOrgId },
    };
  }),

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create a new reviewer profile (admin or self-nomination)
   */
  create: protectedProcedure
    .input(createReviewerProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      const isCreatingOwnProfile = input.userId === user.id;

      // Only admins can create profiles for others
      if (!isCreatingOwnProfile) {
        assertCanManageReviewers(ctx.session);
      }

      // Check if user already has a reviewer profile
      const existing = await prisma.reviewerProfile.findUnique({
        where: { userId: input.userId },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already has a reviewer profile",
        });
      }

      // Verify the user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, organizationId: true },
      });

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Verify the organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: input.homeOrganizationId },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      // Create the reviewer profile
      const reviewer = await prisma.reviewerProfile.create({
        data: {
          userId: input.userId,
          organizationId: input.homeOrganizationId,
          homeOrganizationId: input.homeOrganizationId,
          status: ReviewerStatus.NOMINATED,
          selectionStatus: input.selectionStatus || ReviewerSelectionStatus.NOMINATED,
          reviewerType: input.reviewerType || ReviewerType.PEER_REVIEWER,
          currentPosition: input.currentPosition,
          yearsExperience: input.yearsOfExperience,
          biography: input.biography,
          biographyFr: input.biographyFr,
          nominatedAt: input.nominationDate || new Date(),
          isLeadQualified: input.isLeadQualified || false,
          preferredContactMethod: input.preferredContactMethod || "EMAIL",
          alternativeEmail: input.alternateEmail,
          alternativePhone: input.alternatePhone,
        },
        include: reviewerProfileInclude,
      });

      await logAuditEntry(user.id, AuditAction.CREATE, reviewer.id, {
        userId: input.userId,
        homeOrganizationId: input.homeOrganizationId,
        reviewerType: reviewer.reviewerType,
      });

      console.log(
        `[Reviewer] User ${user.id} created reviewer profile ${reviewer.id} for user ${input.userId}`
      );

      return reviewer;
    }),

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update reviewer profile
   */
  update: protectedProcedure
    .input(updateReviewerProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const user = ctx.user;

      // Get existing reviewer to check permissions
      const existing = await prisma.reviewerProfile.findUnique({
        where: { id },
        select: { id: true, userId: true, organizationId: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer profile not found",
        });
      }

      // Check edit permission (includes ANSP_ADMIN organization check)
      assertCanEditReviewer(ctx.session, existing.userId, existing.organizationId);

      // If user is editing their own profile, restrict to allowed fields
      const isSelfEdit = existing.userId === user.id;
      const isAdmin = canManageReviewers(ctx.session);

      // Build update data based on permissions
      const updateData: Prisma.ReviewerProfileUpdateInput = {};

      // Fields anyone can edit on their own profile
      if (data.currentPosition !== undefined) {
        updateData.currentPosition = data.currentPosition;
      }
      if (data.biography !== undefined) {
        updateData.biography = data.biography;
      }
      if (data.biographyFr !== undefined) {
        updateData.biographyFr = data.biographyFr;
      }
      if (data.yearsOfExperience !== undefined) {
        updateData.yearsExperience = data.yearsOfExperience;
      }
      if (data.preferredContactMethod !== undefined) {
        updateData.preferredContactMethod = data.preferredContactMethod;
      }
      if (data.alternateEmail !== undefined) {
        updateData.alternativeEmail = data.alternateEmail;
      }
      if (data.alternatePhone !== undefined) {
        updateData.alternativePhone = data.alternatePhone;
      }
      if (data.title !== undefined) {
        updateData.user = {
          update: { title: data.title },
        };
      }

      // Admin-only fields
      if (isAdmin) {
        if (data.selectionStatus !== undefined) {
          updateData.selectionStatus = data.selectionStatus;
          // Update related timestamp based on new status
          if (data.selectionStatus === "SELECTED") {
            updateData.selectedAt = new Date();
          }
        }
        if (data.reviewerType !== undefined) {
          updateData.reviewerType = data.reviewerType;
        }
        if (data.isLeadQualified !== undefined) {
          updateData.isLeadQualified = data.isLeadQualified;
          if (data.isLeadQualified) {
            updateData.leadQualifiedAt = new Date();
          }
        }
        if (data.isActive !== undefined) {
          updateData.isAvailable = data.isActive;
        }
      }

      const reviewer = await prisma.reviewerProfile.update({
        where: { id },
        data: updateData,
        include: reviewerProfileInclude,
      });

      await logAuditEntry(user.id, AuditAction.UPDATE, id, {
        updatedFields: Object.keys(data),
        isSelfEdit,
      });

      console.log(
        `[Reviewer] User ${user.id} updated reviewer profile ${id}`
      );

      return reviewer;
    }),

  /**
   * Update reviewer selection status (admin only)
   */
  updateSelectionStatus: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        selectionStatus: z.nativeEnum(ReviewerSelectionStatus),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reviewer = await prisma.reviewerProfile.findUnique({
        where: { id: input.id },
        select: { id: true, selectionStatus: true },
      });

      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer profile not found",
        });
      }

      // Validate status transition
      const allowedTransitions =
        SELECTION_STATUS_TRANSITIONS[reviewer.selectionStatus];
      if (!allowedTransitions.includes(input.selectionStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition from ${reviewer.selectionStatus} to ${input.selectionStatus}`,
        });
      }

      // If selecting, check the limit
      if (input.selectionStatus === "SELECTED") {
        const selectedCount = await prisma.reviewerProfile.count({
          where: { selectionStatus: "SELECTED" },
        });
        if (selectedCount >= MAX_SELECTED_REVIEWERS) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Maximum of ${MAX_SELECTED_REVIEWERS} selected reviewers reached`,
          });
        }
      }

      // Build update data with timestamps
      const updateData: Prisma.ReviewerProfileUpdateInput = {
        selectionStatus: input.selectionStatus,
      };

      if (input.selectionStatus === "SELECTED") {
        updateData.selectedAt = new Date();
        updateData.status = ReviewerStatus.SELECTED;
      } else if (input.selectionStatus === "INACTIVE") {
        updateData.status = ReviewerStatus.INACTIVE;
      } else if (input.selectionStatus === "WITHDRAWN") {
        updateData.status = ReviewerStatus.RETIRED;
      }

      const updated = await prisma.reviewerProfile.update({
        where: { id: input.id },
        data: updateData,
        include: reviewerProfileListInclude,
      });

      await logAuditEntry(ctx.user.id, AuditAction.STATUS_CHANGE, input.id, {
        previousStatus: reviewer.selectionStatus,
        newStatus: input.selectionStatus,
        notes: input.notes,
      });

      console.log(
        `[Reviewer] Admin ${ctx.user.id} changed status of ${input.id} from ${reviewer.selectionStatus} to ${input.selectionStatus}`
      );

      return updated;
    }),

  /**
   * Toggle reviewer availability
   */
  toggleAvailability: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        isAvailable: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reviewer = await prisma.reviewerProfile.findUnique({
        where: { id: input.id },
        select: { id: true, userId: true },
      });

      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer profile not found",
        });
      }

      // User can toggle their own availability, or admin can do it
      if (reviewer.userId !== ctx.user.id) {
        assertCanManageReviewers(ctx.session);
      }

      const updated = await prisma.reviewerProfile.update({
        where: { id: input.id },
        data: { isAvailable: input.isAvailable },
      });

      return updated;
    }),

  /**
   * Update reviewer profile availability (status + date range)
   * Used by the availability dialog for reviewers to set their availability
   */
  updateProfileAvailability: protectedProcedure
    .input(
      z.object({
        reviewerProfileId: z.string().cuid(),
        isAvailable: z.boolean(),
        availableFrom: z.date().nullable(),
        availableTo: z.date().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await prisma.reviewerProfile.findUnique({
        where: { id: input.reviewerProfileId },
        select: { id: true, userId: true },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer profile not found",
        });
      }

      // User can update their own availability, or admin can do it
      if (profile.userId !== ctx.user.id) {
        const isAdmin = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(
          ctx.session.user.role
        );
        if (!isAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only update your own availability",
          });
        }
      }

      // Date validation
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Validate: availableFrom cannot be in the past
      if (input.availableFrom) {
        const fromDate = new Date(input.availableFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (fromDate < today) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Start date cannot be in the past",
          });
        }
      }

      // Validate: availableTo cannot be before availableFrom
      if (input.availableFrom && input.availableTo) {
        if (input.availableTo < input.availableFrom) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "End date must be after start date",
          });
        }
      }

      // Validate: availableTo cannot be in the past
      if (input.availableTo) {
        const toDate = new Date(input.availableTo);
        toDate.setHours(23, 59, 59, 999);
        if (toDate < today) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "End date cannot be in the past",
          });
        }
      }

      const updated = await prisma.reviewerProfile.update({
        where: { id: input.reviewerProfileId },
        data: {
          isAvailable: input.isAvailable,
          availableFrom: input.availableFrom,
          availableTo: input.availableTo,
        },
      });

      return updated;
    }),

  // ============================================
  // COI (CONFLICT OF INTEREST) OPERATIONS
  // ============================================

  /**
   * Check COI between reviewer and organization
   */
  checkCOI: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string().cuid(),
        targetOrganizationId: z.string().cuid(),
      })
    )
    .query(async ({ input }) => {
      return checkCOIConflict(input.reviewerId, input.targetOrganizationId);
    }),

  /**
   * Get all COIs for a reviewer
   */
  getCOIs: protectedProcedure
    .input(z.object({ reviewerProfileId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const reviewer = await prisma.reviewerProfile.findUnique({
        where: { id: input.reviewerProfileId },
        select: { userId: true },
      });

      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer profile not found",
        });
      }

      // User can view their own COIs
      if (reviewer.userId !== ctx.user.id) {
        assertCanCoordinateReviewers(ctx.session);
      }

      return prisma.reviewerCOI.findMany({
        where: { reviewerProfileId: input.reviewerProfileId },
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
        },
        orderBy: { startDate: "desc" },
      });
    }),

  // ============================================
  // EXPERTISE MANAGEMENT
  // ============================================

  /**
   * Add expertise area to reviewer
   */
  addExpertise: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string().cuid(),
        expertise: createExpertiseSchema.omit({ reviewerProfileId: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reviewer = await getReviewerById(input.reviewerId);
      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer not found",
        });
      }
      assertCanEditReviewer(ctx.session, reviewer.userId);

      // Check if expertise already exists for this area
      const existing = await prisma.reviewerExpertise.findFirst({
        where: {
          reviewerProfileId: input.reviewerId,
          area: input.expertise.expertiseArea,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Expertise area already added",
        });
      }

      return prisma.reviewerExpertise.create({
        data: {
          reviewerProfileId: input.reviewerId,
          area: input.expertise.expertiseArea,
          proficiencyLevel: input.expertise.proficiencyLevel,
          yearsExperience: input.expertise.yearsInArea ?? 0,
          description: input.expertise.qualificationDetails,
        },
      });
    }),

  /**
   * Update expertise area
   */
  updateExpertise: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        data: updateExpertiseSchema.omit({ id: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const expertise = await prisma.reviewerExpertise.findUnique({
        where: { id: input.id },
        include: { reviewerProfile: true },
      });

      if (!expertise) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expertise not found",
        });
      }

      assertCanEditReviewer(ctx.session, expertise.reviewerProfile.userId);

      return prisma.reviewerExpertise.update({
        where: { id: input.id },
        data: {
          proficiencyLevel: input.data.proficiencyLevel,
          yearsExperience: input.data.yearsInArea ?? undefined,
          description: input.data.qualificationDetails,
        },
      });
    }),

  /**
   * Remove expertise area
   */
  removeExpertise: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const expertise = await prisma.reviewerExpertise.findUnique({
        where: { id: input.id },
        include: { reviewerProfile: true },
      });

      if (!expertise) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expertise not found",
        });
      }

      assertCanEditReviewer(ctx.session, expertise.reviewerProfile.userId);

      await prisma.reviewerExpertise.delete({ where: { id: input.id } });
      return { success: true };
    }),

  /**
   * Batch update expertise areas (replace all)
   */
  batchUpdateExpertise: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string().cuid(),
        expertise: batchExpertiseSchema.shape.expertise,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reviewer = await getReviewerById(input.reviewerId);
      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer not found",
        });
      }
      assertCanEditReviewer(ctx.session, reviewer.userId);

      // Delete existing and create new
      await prisma.reviewerExpertise.deleteMany({
        where: { reviewerProfileId: input.reviewerId },
      });

      const expertiseData = input.expertise.map((item) => ({
        reviewerProfileId: input.reviewerId,
        area: item.expertiseArea,
        proficiencyLevel: item.proficiencyLevel,
        yearsExperience: item.yearsInArea ?? 0,
      }));

      await prisma.reviewerExpertise.createMany({ data: expertiseData });

      return prisma.reviewerExpertise.findMany({
        where: { reviewerProfileId: input.reviewerId },
        orderBy: { area: "asc" },
      });
    }),

  // ============================================
  // LANGUAGE MANAGEMENT
  // ============================================

  /**
   * Add language proficiency to reviewer
   */
  addLanguage: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string().cuid(),
        language: createLanguageSchema.omit({ reviewerProfileId: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reviewer = await getReviewerById(input.reviewerId);
      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer not found",
        });
      }
      assertCanEditReviewer(ctx.session, reviewer.userId);

      // Check if language already exists
      const existing = await prisma.reviewerLanguage.findFirst({
        where: {
          reviewerProfileId: input.reviewerId,
          language: input.language.language,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Language proficiency already added",
        });
      }

      return prisma.reviewerLanguage.create({
        data: {
          reviewerProfileId: input.reviewerId,
          language: input.language.language,
          proficiency: input.language.proficiencyLevel,
          isNative: input.language.isNative ?? false,
          canConductInterviews: input.language.canConduct ?? false,
          icaoLevel: input.language.icaoLevel,
          icaoAssessmentDate: input.language.certificationDate,
          icaoExpiryDate: input.language.expiryDate,
        },
      });
    }),

  /**
   * Update language proficiency
   */
  updateLanguage: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        data: updateLanguageSchema.omit({ id: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const language = await prisma.reviewerLanguage.findUnique({
        where: { id: input.id },
        include: { reviewerProfile: true },
      });

      if (!language) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Language proficiency not found",
        });
      }

      assertCanEditReviewer(ctx.session, language.reviewerProfile.userId);

      return prisma.reviewerLanguage.update({
        where: { id: input.id },
        data: {
          proficiency: input.data.proficiencyLevel,
          isNative: input.data.isNative,
          canConductInterviews: input.data.canConduct,
          icaoLevel: input.data.icaoLevel,
          icaoAssessmentDate: input.data.certificationDate,
          icaoExpiryDate: input.data.expiryDate,
        },
      });
    }),

  /**
   * Remove language proficiency
   */
  removeLanguage: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const language = await prisma.reviewerLanguage.findUnique({
        where: { id: input.id },
        include: { reviewerProfile: true },
      });

      if (!language) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Language proficiency not found",
        });
      }

      assertCanEditReviewer(ctx.session, language.reviewerProfile.userId);

      await prisma.reviewerLanguage.delete({ where: { id: input.id } });
      return { success: true };
    }),

  /**
   * Batch update language proficiencies (replace all)
   */
  batchUpdateLanguages: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string().cuid(),
        languages: batchLanguageSchema.shape.languages,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reviewer = await getReviewerById(input.reviewerId);
      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer not found",
        });
      }
      assertCanEditReviewer(ctx.session, reviewer.userId);

      // Validate EN and FR are included (required for peer reviews)
      const hasEnglish = input.languages.some((l) => l.language === "EN");
      const hasFrench = input.languages.some((l) => l.language === "FR");

      if (!hasEnglish || !hasFrench) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "English and French proficiency are required for peer reviewers",
        });
      }

      // Delete existing and create new
      await prisma.reviewerLanguage.deleteMany({
        where: { reviewerProfileId: input.reviewerId },
      });

      const languageData = input.languages.map((item) => ({
        reviewerProfileId: input.reviewerId,
        language: item.language,
        proficiency: item.proficiencyLevel,
        isNative: item.isNative ?? false,
        canConductInterviews: item.canConduct ?? false,
      }));

      await prisma.reviewerLanguage.createMany({ data: languageData });

      return prisma.reviewerLanguage.findMany({
        where: { reviewerProfileId: input.reviewerId },
        orderBy: { language: "asc" },
      });
    }),

  // ============================================
  // CERTIFICATION MANAGEMENT
  // ============================================

  /**
   * Add certification to reviewer
   */
  addCertification: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string().cuid(),
        certification: createCertificationSchema.omit({ reviewerProfileId: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reviewer = await getReviewerById(input.reviewerId);
      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer not found",
        });
      }
      assertCanEditReviewer(ctx.session, reviewer.userId);

      return prisma.reviewerCertification.create({
        data: {
          reviewerProfileId: input.reviewerId,
          certificationType: input.certification.certificationType,
          certificationName: input.certification.certificationName,
          certificationNameFr: input.certification.certificationNameFr,
          issuingAuthority: input.certification.issuingAuthority,
          issueDate: input.certification.issueDate,
          expiryDate: input.certification.expiryDate,
          certificateNumber: input.certification.certificateNumber,
          documentUrl: input.certification.documentUrl,
          isValid: input.certification.expiryDate
            ? new Date(input.certification.expiryDate) > new Date()
            : true,
        },
      });
    }),

  /**
   * Update certification
   */
  updateCertification: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        data: updateCertificationSchema.omit({ id: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const certification = await prisma.reviewerCertification.findUnique({
        where: { id: input.id },
        include: { reviewerProfile: true },
      });

      if (!certification) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Certification not found",
        });
      }

      assertCanEditReviewer(ctx.session, certification.reviewerProfile.userId);

      // Recalculate validity if expiry date changed
      let isValid = certification.isValid;
      if (input.data.expiryDate !== undefined) {
        isValid = input.data.expiryDate
          ? new Date(input.data.expiryDate) > new Date()
          : true;
      }
      if (input.data.isValid !== undefined) {
        isValid = input.data.isValid;
      }

      return prisma.reviewerCertification.update({
        where: { id: input.id },
        data: {
          certificationName: input.data.certificationName,
          certificationNameFr: input.data.certificationNameFr,
          issuingAuthority: input.data.issuingAuthority,
          expiryDate: input.data.expiryDate,
          documentUrl: input.data.documentUrl,
          isValid,
        },
      });
    }),

  /**
   * Remove certification
   */
  removeCertification: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const certification = await prisma.reviewerCertification.findUnique({
        where: { id: input.id },
        include: { reviewerProfile: true },
      });

      if (!certification) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Certification not found",
        });
      }

      assertCanEditReviewer(ctx.session, certification.reviewerProfile.userId);

      await prisma.reviewerCertification.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // ============================================
  // AVAILABILITY MANAGEMENT
  // ============================================

  /**
   * Get availability slots for a reviewer
   */
  getAvailability: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string().cuid(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const reviewer = await prisma.reviewerProfile.findUnique({
        where: { id: input.reviewerId },
        select: { userId: true },
      });

      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer not found",
        });
      }

      // Build where clause for date range filtering
      const where: Prisma.ReviewerAvailabilityWhereInput = {
        reviewerProfileId: input.reviewerId,
      };

      if (input.startDate && input.endDate) {
        where.OR = [
          {
            startDate: { gte: input.startDate, lte: input.endDate },
          },
          {
            endDate: { gte: input.startDate, lte: input.endDate },
          },
          {
            AND: [
              { startDate: { lte: input.startDate } },
              { endDate: { gte: input.endDate } },
            ],
          },
        ];
      }

      return prisma.reviewerAvailability.findMany({
        where,
        orderBy: { startDate: "asc" },
      });
    }),

  /**
   * Add availability slot to reviewer
   */
  addAvailability: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string().cuid(),
        availability: createAvailabilitySchemaBase.omit({ reviewerProfileId: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reviewer = await getReviewerById(input.reviewerId);
      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer not found",
        });
      }
      assertCanEditReviewer(ctx.session, reviewer.userId);

      return prisma.reviewerAvailability.create({
        data: {
          reviewerProfileId: input.reviewerId,
          startDate: input.availability.startDate,
          endDate: input.availability.endDate,
          availabilityType: input.availability.availabilityType,
          notes: input.availability.notes,
          isRecurring: input.availability.isRecurring ?? false,
          recurrencePattern: input.availability.recurrencePattern,
        },
      });
    }),

  /**
   * Update availability slot
   */
  updateAvailability: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        data: updateAvailabilitySchema.omit({ id: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const availability = await prisma.reviewerAvailability.findUnique({
        where: { id: input.id },
        include: { reviewerProfile: true },
      });

      if (!availability) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Availability slot not found",
        });
      }

      assertCanEditReviewer(ctx.session, availability.reviewerProfile.userId);

      return prisma.reviewerAvailability.update({
        where: { id: input.id },
        data: {
          startDate: input.data.startDate,
          endDate: input.data.endDate,
          availabilityType: input.data.availabilityType,
          notes: input.data.notes,
        },
      });
    }),

  /**
   * Remove availability slot
   */
  removeAvailability: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const availability = await prisma.reviewerAvailability.findUnique({
        where: { id: input.id },
        include: { reviewerProfile: true },
      });

      if (!availability) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Availability slot not found",
        });
      }

      assertCanEditReviewer(ctx.session, availability.reviewerProfile.userId);

      await prisma.reviewerAvailability.delete({ where: { id: input.id } });
      return { success: true };
    }),

  /**
   * Batch update availability slots (replace all)
   */
  batchUpdateAvailability: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string().cuid(),
        slots: z.array(
          z.object({
            startDate: z.coerce.date(),
            endDate: z.coerce.date(),
            availabilityType: z.enum(["AVAILABLE", "TENTATIVE", "UNAVAILABLE", "ON_ASSIGNMENT"]).default("AVAILABLE"),
            notes: z.string().max(500).optional().nullable(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reviewer = await getReviewerById(input.reviewerId);
      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer not found",
        });
      }
      assertCanEditReviewer(ctx.session, reviewer.userId);

      // Delete existing and create new
      await prisma.reviewerAvailability.deleteMany({
        where: { reviewerProfileId: input.reviewerId },
      });

      const availabilityData = input.slots.map((slot) => ({
        reviewerProfileId: input.reviewerId,
        startDate: slot.startDate,
        endDate: slot.endDate,
        availabilityType: slot.availabilityType,
        notes: slot.notes,
      }));

      await prisma.reviewerAvailability.createMany({ data: availabilityData });

      return prisma.reviewerAvailability.findMany({
        where: { reviewerProfileId: input.reviewerId },
        orderBy: { startDate: "asc" },
      });
    }),

  /**
   * Get availability for a specific month (calendar view)
   */
  getAvailabilityByMonth: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string().cuid(),
        year: z.number().int().min(2020).max(2100),
        month: z.number().int().min(0).max(11),
      })
    )
    .query(async ({ input }) => {
      const reviewer = await prisma.reviewerProfile.findUnique({
        where: { id: input.reviewerId },
        select: { userId: true },
      });

      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer not found",
        });
      }

      // Get first and last day of month
      const startDate = new Date(input.year, input.month, 1);
      const endDate = new Date(input.year, input.month + 1, 0, 23, 59, 59);

      return prisma.reviewerAvailability.findMany({
        where: {
          reviewerProfileId: input.reviewerId,
          OR: [
            { startDate: { gte: startDate, lte: endDate } },
            { endDate: { gte: startDate, lte: endDate } },
            {
              AND: [
                { startDate: { lte: startDate } },
                { endDate: { gte: endDate } },
              ],
            },
          ],
        },
        include: {
          review: {
            select: {
              id: true,
              referenceNumber: true,
              hostOrganization: {
                select: { nameEn: true, nameFr: true },
              },
            },
          },
        },
        orderBy: { startDate: "asc" },
      });
    }),

  /**
   * Bulk create availability slots
   */
  bulkCreateAvailability: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string().cuid(),
        slots: z.array(
          z.object({
            startDate: z.coerce.date(),
            endDate: z.coerce.date(),
            availabilityType: z.enum(["AVAILABLE", "TENTATIVE", "UNAVAILABLE"]).default("AVAILABLE"),
            title: z.string().max(200).optional(),
            notes: z.string().max(1000).optional(),
          })
        ).min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reviewer = await getReviewerById(input.reviewerId);
      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer not found",
        });
      }
      assertCanEditReviewer(ctx.session, reviewer.userId);

      // Check for conflicts with ON_ASSIGNMENT slots
      const existingAssignments = await prisma.reviewerAvailability.findMany({
        where: {
          reviewerProfileId: input.reviewerId,
          availabilityType: "ON_ASSIGNMENT",
        },
      });

      for (const slot of input.slots) {
        for (const assignment of existingAssignments) {
          // Check overlap
          if (slot.startDate <= assignment.endDate && slot.endDate >= assignment.startDate) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cannot create slot overlapping with an existing review assignment",
            });
          }
        }
      }

      const availabilityData = input.slots.map((slot) => ({
        reviewerProfileId: input.reviewerId,
        startDate: slot.startDate,
        endDate: slot.endDate,
        availabilityType: slot.availabilityType,
        title: slot.title,
        notes: slot.notes,
        createdById: ctx.user.id,
      }));

      await prisma.reviewerAvailability.createMany({ data: availabilityData });

      return prisma.reviewerAvailability.findMany({
        where: { reviewerProfileId: input.reviewerId },
        orderBy: { startDate: "asc" },
      });
    }),

  /**
   * Bulk delete availability slots in a date range
   */
  bulkDeleteAvailability: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string().cuid(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        types: z.array(z.enum(["AVAILABLE", "TENTATIVE", "UNAVAILABLE"])).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reviewer = await getReviewerById(input.reviewerId);
      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer not found",
        });
      }
      assertCanEditReviewer(ctx.session, reviewer.userId);

      const where: Prisma.ReviewerAvailabilityWhereInput = {
        reviewerProfileId: input.reviewerId,
        // Only delete slots that fall within the date range
        startDate: { gte: input.startDate },
        endDate: { lte: input.endDate },
        // Never delete ON_ASSIGNMENT slots
        availabilityType: { not: "ON_ASSIGNMENT" },
      };

      if (input.types?.length) {
        where.availabilityType = { in: input.types };
      }

      const deleted = await prisma.reviewerAvailability.deleteMany({ where });

      return { deletedCount: deleted.count };
    }),

  /**
   * Get team availability for multiple reviewers
   */
  getTeamAvailability: protectedProcedure
    .input(
      z.object({
        reviewerIds: z.array(z.string().cuid()).min(1).max(20),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      assertCanCoordinateReviewers(ctx.session);

      const reviewers = await prisma.reviewerProfile.findMany({
        where: { id: { in: input.reviewerIds } },
        include: {
          user: {
            select: { firstName: true, lastName: true },
          },
          homeOrganization: {
            select: { nameEn: true, nameFr: true },
          },
          availabilityPeriods: {
            where: {
              OR: [
                { startDate: { gte: input.startDate, lte: input.endDate } },
                { endDate: { gte: input.startDate, lte: input.endDate } },
                {
                  AND: [
                    { startDate: { lte: input.startDate } },
                    { endDate: { gte: input.endDate } },
                  ],
                },
              ],
            },
            orderBy: { startDate: "asc" },
          },
        },
      });

      return reviewers.map((r) => ({
        id: r.id,
        name: `${r.user.firstName} ${r.user.lastName}`,
        organization: r.homeOrganization.nameEn,
        organizationFr: r.homeOrganization.nameFr,
        slots: r.availabilityPeriods,
      }));
    }),

  /**
   * Find common available date ranges for a team
   */
  findCommonAvailability: protectedProcedure
    .input(
      z.object({
        reviewerIds: z.array(z.string().cuid()).min(2).max(20),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        minDays: z.number().int().min(1).max(90).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      assertCanCoordinateReviewers(ctx.session);

      const reviewers = await prisma.reviewerProfile.findMany({
        where: { id: { in: input.reviewerIds } },
        include: {
          availabilityPeriods: {
            where: {
              availabilityType: { in: ["AVAILABLE", "TENTATIVE"] },
              OR: [
                { startDate: { gte: input.startDate, lte: input.endDate } },
                { endDate: { gte: input.startDate, lte: input.endDate } },
                {
                  AND: [
                    { startDate: { lte: input.startDate } },
                    { endDate: { gte: input.endDate } },
                  ],
                },
              ],
            },
          },
        },
      });

      // Build a map of available dates for each reviewer
      const reviewerAvailability = new Map<string, Set<string>>();

      for (const reviewer of reviewers) {
        const dateSet = new Set<string>();

        for (const slot of reviewer.availabilityPeriods) {
          const current = new Date(slot.startDate);
          const end = new Date(slot.endDate);

          while (current <= end && current <= input.endDate) {
            if (current >= input.startDate) {
              dateSet.add(current.toISOString().split("T")[0]);
            }
            current.setDate(current.getDate() + 1);
          }
        }

        reviewerAvailability.set(reviewer.id, dateSet);
      }

      // Find dates where all reviewers are available
      const commonDates: string[] = [];
      const current = new Date(input.startDate);

      while (current <= input.endDate) {
        const dateKey = current.toISOString().split("T")[0];
        const allAvailable = input.reviewerIds.every((id) => {
          const dates = reviewerAvailability.get(id);
          return dates?.has(dateKey);
        });

        if (allAvailable) {
          commonDates.push(dateKey);
        }

        current.setDate(current.getDate() + 1);
      }

      // Group consecutive dates into ranges
      const ranges: { start: string; end: string; days: number }[] = [];
      let rangeStart: string | null = null;
      let rangeEnd: string | null = null;

      for (let i = 0; i < commonDates.length; i++) {
        const date = commonDates[i];

        if (!rangeStart) {
          rangeStart = date;
          rangeEnd = date;
        } else {
          const prevDate = new Date(rangeEnd!);
          const currDate = new Date(date);
          const diffDays = (currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000);

          if (diffDays === 1) {
            rangeEnd = date;
          } else {
            // End current range
            const days = Math.floor(
              (new Date(rangeEnd!).getTime() - new Date(rangeStart).getTime()) /
                (24 * 60 * 60 * 1000)
            ) + 1;

            if (days >= input.minDays) {
              ranges.push({ start: rangeStart, end: rangeEnd!, days });
            }

            rangeStart = date;
            rangeEnd = date;
          }
        }
      }

      // Handle last range
      if (rangeStart && rangeEnd) {
        const days = Math.floor(
          (new Date(rangeEnd).getTime() - new Date(rangeStart).getTime()) /
            (24 * 60 * 60 * 1000)
        ) + 1;

        if (days >= input.minDays) {
          ranges.push({ start: rangeStart, end: rangeEnd, days });
        }
      }

      return {
        commonDateRanges: ranges,
        totalCommonDays: commonDates.length,
        reviewerCount: input.reviewerIds.length,
      };
    }),

  /**
   * Get availability statistics for a reviewer
   */
  getAvailabilityStats: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string().cuid(),
        daysAhead: z.number().int().min(1).max(365).default(90),
      })
    )
    .query(async ({ input }) => {
      const reviewer = await prisma.reviewerProfile.findUnique({
        where: { id: input.reviewerId },
        select: { userId: true },
      });

      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer not found",
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + input.daysAhead);

      const slots = await prisma.reviewerAvailability.findMany({
        where: {
          reviewerProfileId: input.reviewerId,
          endDate: { gte: today },
          startDate: { lte: endDate },
        },
        orderBy: { startDate: "asc" },
      });

      // Count days by type
      let availableDays = 0;
      let tentativeDays = 0;
      let unavailableDays = 0;
      let onAssignmentDays = 0;

      const current = new Date(today);
      while (current <= endDate) {
        // Find slot for this date
        const slot = slots.find((s) => {
          const start = new Date(s.startDate);
          const end = new Date(s.endDate);
          return current >= start && current <= end;
        });

        if (slot) {
          switch (slot.availabilityType) {
            case "AVAILABLE":
              availableDays++;
              break;
            case "TENTATIVE":
              tentativeDays++;
              break;
            case "UNAVAILABLE":
              unavailableDays++;
              break;
            case "ON_ASSIGNMENT":
              onAssignmentDays++;
              break;
          }
        } else {
          unavailableDays++; // No slot = unavailable
        }

        current.setDate(current.getDate() + 1);
      }

      const totalDays = input.daysAhead;
      const availabilityRate = Math.round(
        ((availableDays + tentativeDays * 0.5) / totalDays) * 100
      );

      // Find next available period
      let nextAvailableStart: Date | null = null;
      let nextAvailableEnd: Date | null = null;

      for (const slot of slots) {
        if (slot.availabilityType === "AVAILABLE" && new Date(slot.startDate) >= today) {
          nextAvailableStart = new Date(slot.startDate);
          nextAvailableEnd = new Date(slot.endDate);
          break;
        }
      }

      return {
        period: { start: today, end: endDate },
        totalDays,
        availableDays,
        tentativeDays,
        unavailableDays,
        onAssignmentDays,
        availabilityRate,
        nextAvailablePeriod: nextAvailableStart
          ? { start: nextAvailableStart, end: nextAvailableEnd! }
          : null,
      };
    }),

  /**
   * Block dates when a reviewer is assigned to a review (system procedure)
   */
  blockForReview: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string().cuid(),
        reviewId: z.string().cuid(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertCanCoordinateReviewers(ctx.session);

      const reviewer = await getReviewerById(input.reviewerId);
      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer not found",
        });
      }

      const review = await prisma.review.findUnique({
        where: { id: input.reviewId },
        select: { referenceNumber: true },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Check if block already exists
      const existing = await prisma.reviewerAvailability.findFirst({
        where: {
          reviewerProfileId: input.reviewerId,
          reviewId: input.reviewId,
        },
      });

      if (existing) {
        // Update existing block
        return prisma.reviewerAvailability.update({
          where: { id: existing.id },
          data: {
            startDate: input.startDate,
            endDate: input.endDate,
            notes: input.notes,
          },
        });
      }

      // Create new block
      return prisma.reviewerAvailability.create({
        data: {
          reviewerProfileId: input.reviewerId,
          reviewId: input.reviewId,
          startDate: input.startDate,
          endDate: input.endDate,
          availabilityType: "ON_ASSIGNMENT",
          title: `Review: ${review.referenceNumber}`,
          notes: input.notes,
          createdById: ctx.user.id,
        },
      });
    }),

  /**
   * Unblock dates when a reviewer is removed from a review (system procedure)
   */
  unblockForReview: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string().cuid(),
        reviewId: z.string().cuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertCanCoordinateReviewers(ctx.session);

      const deleted = await prisma.reviewerAvailability.deleteMany({
        where: {
          reviewerProfileId: input.reviewerId,
          reviewId: input.reviewId,
          availabilityType: "ON_ASSIGNMENT",
        },
      });

      return { deletedCount: deleted.count };
    }),

  // ============================================
  // TRAINING RECORDS MANAGEMENT
  // ============================================

  /**
   * Get training records for a reviewer
   */
  getTrainingRecords: protectedProcedure
    .input(z.object({ reviewerId: z.string().cuid() }))
    .query(async ({ input }) => {
      const reviewer = await prisma.reviewerProfile.findUnique({
        where: { id: input.reviewerId },
        select: { userId: true },
      });

      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer not found",
        });
      }

      return prisma.reviewerTraining.findMany({
        where: { reviewerProfileId: input.reviewerId },
        orderBy: { startDate: "desc" },
      });
    }),

  /**
   * Add training record to reviewer
   */
  addTraining: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string().cuid(),
        training: createTrainingSchema.omit({ reviewerProfileId: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reviewer = await getReviewerById(input.reviewerId);
      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer not found",
        });
      }
      assertCanEditReviewer(ctx.session, reviewer.userId);

      return prisma.reviewerTraining.create({
        data: {
          reviewerProfileId: input.reviewerId,
          trainingType: input.training.trainingType,
          trainingName: input.training.trainingName,
          trainingNameFr: input.training.trainingNameFr,
          provider: input.training.provider,
          startDate: input.training.startDate,
          completionDate: input.training.completionDate,
          status: input.training.status,
          location: input.training.location,
          isOnline: input.training.isOnline ?? false,
          hoursCompleted: input.training.hoursCompleted,
          grade: input.training.grade,
          certificateUrl: input.training.certificateUrl,
          notes: input.training.notes,
        },
      });
    }),

  /**
   * Update training record
   */
  updateTraining: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        data: updateTrainingSchema.omit({ id: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const training = await prisma.reviewerTraining.findUnique({
        where: { id: input.id },
        include: { reviewerProfile: true },
      });

      if (!training) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Training record not found",
        });
      }

      assertCanEditReviewer(ctx.session, training.reviewerProfile.userId);

      return prisma.reviewerTraining.update({
        where: { id: input.id },
        data: {
          completionDate: input.data.completionDate,
          status: input.data.status,
          hoursCompleted: input.data.hoursCompleted,
          grade: input.data.grade,
          certificateUrl: input.data.certificateUrl,
          notes: input.data.notes,
        },
      });
    }),

  /**
   * Remove training record
   */
  removeTraining: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const training = await prisma.reviewerTraining.findUnique({
        where: { id: input.id },
        include: { reviewerProfile: true },
      });

      if (!training) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Training record not found",
        });
      }

      assertCanEditReviewer(ctx.session, training.reviewerProfile.userId);

      await prisma.reviewerTraining.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // ============================================
  // CONFLICT OF INTEREST MANAGEMENT (Extended)
  // ============================================

  /**
   * Add conflict of interest declaration
   */
  addCOI: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string().cuid(),
        coi: createCOISchema.omit({ reviewerProfileId: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reviewer = await getReviewerById(input.reviewerId);
      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer not found",
        });
      }
      assertCanEditReviewer(ctx.session, reviewer.userId);

      // Check if COI already exists for this organization and type
      const existing = await prisma.reviewerCOI.findFirst({
        where: {
          reviewerProfileId: input.reviewerId,
          organizationId: input.coi.organizationId,
          coiType: input.coi.coiType,
          isActive: true,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Active COI already exists for this organization and type",
        });
      }

      // Determine severity based on COI type
      const severity = input.coi.coiType === "HOME_ORGANIZATION" || input.coi.coiType === "FAMILY_RELATIONSHIP"
        ? "HARD_BLOCK"
        : "SOFT_WARNING";

      return prisma.reviewerCOI.create({
        data: {
          reviewerProfileId: input.reviewerId,
          organizationId: input.coi.organizationId,
          coiType: input.coi.coiType,
          severity,
          reasonEn: input.coi.reason,
          startDate: input.coi.startDate ?? new Date(),
          endDate: input.coi.endDate,
          isActive: true,
        },
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
        },
      });
    }),

  /**
   * Update conflict of interest declaration
   */
  updateCOI: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        data: updateCOISchema.omit({ id: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coi = await prisma.reviewerCOI.findUnique({
        where: { id: input.id },
        include: { reviewerProfile: true },
      });

      if (!coi) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "COI declaration not found",
        });
      }

      assertCanEditReviewer(ctx.session, coi.reviewerProfile.userId);

      return prisma.reviewerCOI.update({
        where: { id: input.id },
        data: {
          reasonEn: input.data.reason,
          endDate: input.data.endDate,
          isActive: input.data.isActive,
        },
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
        },
      });
    }),

  /**
   * Deactivate conflict of interest declaration
   */
  deactivateCOI: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const coi = await prisma.reviewerCOI.findUnique({
        where: { id: input.id },
        include: { reviewerProfile: true },
      });

      if (!coi) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "COI declaration not found",
        });
      }

      assertCanEditReviewer(ctx.session, coi.reviewerProfile.userId);

      // Soft delete - mark as inactive
      await prisma.reviewerCOI.update({
        where: { id: input.id },
        data: { isActive: false },
      });

      return { success: true };
    }),

  /**
   * Verify COI declaration (coordinator/admin only)
   */
  verifyCOI: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        verification: verifyCOISchema.omit({ id: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertCanCoordinateReviewers(ctx.session);

      const coi = await prisma.reviewerCOI.findUnique({
        where: { id: input.id },
      });

      if (!coi) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "COI declaration not found",
        });
      }

      return prisma.reviewerCOI.update({
        where: { id: input.id },
        data: {
          verifiedAt: new Date(),
          verifiedById: ctx.user.id,
          verificationNotes: input.verification.verificationNotes,
        },
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
        },
      });
    }),

  /**
   * Check COI for a team of reviewers against a target organization
   */
  checkTeamCOI: protectedProcedure
    .input(
      z.object({
        reviewerIds: z.array(z.string().cuid()),
        targetOrganizationId: z.string().cuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      assertCanCoordinateReviewers(ctx.session);

      const results = await Promise.all(
        input.reviewerIds.map(async (reviewerId) => ({
          reviewerId,
          ...(await checkCOIConflict(reviewerId, input.targetOrganizationId)),
        }))
      );

      return {
        results,
        hasAnyConflict: results.some((r) => r.hasConflict),
        hasHardBlock: results.some((r) => r.severity === "HARD_BLOCK"),
      };
    }),

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Delete reviewer profile (admin only)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const reviewer = await prisma.reviewerProfile.findUnique({
        where: { id: input.id },
        include: {
          teamAssignments: { select: { id: true } },
        },
      });

      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer profile not found",
        });
      }

      // Don't allow deletion if reviewer has active team assignments
      if (reviewer.teamAssignments.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot delete reviewer with active review team assignments. Remove them from all teams first.",
        });
      }

      // Delete the reviewer profile (cascades to related records)
      await prisma.reviewerProfile.delete({
        where: { id: input.id },
      });

      await logAuditEntry(ctx.user.id, AuditAction.DELETE, input.id, {
        deletedUserId: reviewer.userId,
      });

      console.log(
        `[Reviewer] Admin ${ctx.user.id} deleted reviewer profile ${input.id}`
      );

      return { success: true };
    }),

  // ============================================
  // MATCHING OPERATIONS
  // ============================================

  /**
   * Find available reviewers for a review assignment
   */
  findAvailable: protectedProcedure
    .input(
      z.object({
        targetOrganizationId: z.string().cuid(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        requiredExpertise: z.array(z.string()).optional(),
        requiredLanguages: z.array(z.string()).optional(),
        requireLeadQualified: z.boolean().default(false),
        maxResults: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      assertCanCoordinateReviewers(ctx.session);

      // Build where clause
      const where: Prisma.ReviewerProfileWhereInput = {
        selectionStatus: "SELECTED",
        isAvailable: true,
        // Exclude reviewers from target organization
        homeOrganizationId: { not: input.targetOrganizationId },
        // Exclude reviewers with COI against target organization
        conflictsOfInterest: {
          none: {
            organizationId: input.targetOrganizationId,
            isActive: true,
          },
        },
        // Check availability period overlap
        availabilityPeriods: {
          some: {
            availabilityType: "AVAILABLE",
            startDate: { lte: input.startDate },
            endDate: { gte: input.endDate },
          },
        },
      };

      // Add lead qualification filter
      if (input.requireLeadQualified) {
        where.isLeadQualified = true;
      }

      // Add expertise filter
      if (input.requiredExpertise?.length) {
        where.expertiseRecords = {
          some: {
            area: {
              in: input.requiredExpertise as Prisma.EnumExpertiseAreaFilter["in"],
            },
          },
        };
      }

      // Add language filter
      if (input.requiredLanguages?.length) {
        where.languages = {
          some: {
            language: {
              in: input.requiredLanguages as Prisma.EnumLanguageFilter["in"],
            },
          },
        };
      }

      const reviewers = await prisma.reviewerProfile.findMany({
        where,
        include: reviewerProfileListInclude,
        orderBy: [
          { reviewsCompleted: "desc" },
          { isLeadQualified: "desc" },
        ],
        take: input.maxResults,
      });

      // Check COI for each reviewer and add to result
      const results = await Promise.all(
        reviewers.map(async (reviewer) => {
          const coiCheck = await checkCOIConflict(
            reviewer.id,
            input.targetOrganizationId
          );
          return {
            ...reviewer,
            coiStatus: coiCheck,
          };
        })
      );

      return results;
    }),

  /**
   * Advanced search for reviewers with detailed filtering
   */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().max(100).optional(),
        organizationId: z.string().cuid().optional(),
        excludeOrganizationId: z.string().cuid().optional(),
        selectionStatus: z.array(z.nativeEnum(ReviewerSelectionStatus)).optional(),
        reviewerType: z.array(z.nativeEnum(ReviewerType)).optional(),
        expertiseAreas: z.array(z.string()).optional(),
        languages: z.array(z.string()).optional(),
        isLeadQualified: z.boolean().optional(),
        isAvailable: z.boolean().optional(),
        availableFrom: z.coerce.date().optional(),
        availableTo: z.coerce.date().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        sortBy: z.enum(["name", "organization", "experience", "createdAt", "reviewsCompleted"]).default("name"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check view permission
      if (!canViewReviewer(ctx.session, "")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to search reviewers",
        });
      }

      return searchReviewers({
        page: input.page,
        pageSize: input.pageSize,
        sortBy: input.sortBy,
        sortOrder: input.sortOrder,
        search: input.query,
        organizationId: input.organizationId,
        excludeOrganizationId: input.excludeOrganizationId,
        selectionStatus: input.selectionStatus,
        reviewerType: input.reviewerType,
        expertiseAreas: input.expertiseAreas,
        languages: input.languages,
        isLeadQualified: input.isLeadQualified,
        isAvailable: input.isAvailable,
        availableFrom: input.availableFrom,
        availableTo: input.availableTo,
      });
    }),

  /**
   * Hard delete COI declaration (admin only)
   */
  removeCOI: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const coi = await prisma.reviewerCOI.findUnique({
        where: { id: input.id },
      });

      if (!coi) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "COI declaration not found",
        });
      }

      await prisma.reviewerCOI.delete({ where: { id: input.id } });

      await logAuditEntry(ctx.user.id, AuditAction.DELETE, input.id, {
        reviewerProfileId: coi.reviewerProfileId,
        organizationId: coi.organizationId,
        coiType: coi.coiType,
      });

      return { success: true };
    }),

  /**
   * Find matching reviewers based on criteria with scoring
   */
  findMatches: protectedProcedure
    .input(matchingCriteriaSchema)
    .query(async ({ ctx, input }) => {
      assertCanCoordinateReviewers(ctx.session);

      // Get all eligible reviewers (selected, available, no COI)
      const eligibleReviewers = await prisma.reviewerProfile.findMany({
        where: {
          selectionStatus: "SELECTED",
          isAvailable: true,
          homeOrganizationId: { not: input.targetOrganizationId },
          conflictsOfInterest: {
            none: {
              organizationId: input.targetOrganizationId,
              isActive: true,
            },
          },
          ...(input.excludeReviewerIds?.length && {
            id: { notIn: input.excludeReviewerIds },
          }),
          ...(input.requireLeadQualified && { isLeadQualified: true }),
        },
        include: {
          ...reviewerProfileListInclude,
          availabilityPeriods: {
            where: {
              availabilityType: "AVAILABLE",
              startDate: { lte: input.startDate },
              endDate: { gte: input.endDate },
            },
          },
        },
      });

      // Calculate match scores for each reviewer
      const scoredReviewers = eligibleReviewers.map((reviewer) => {
        // Expertise score
        const requiredExpertise = new Set(input.requiredExpertise);
        const preferredExpertise = new Set(input.preferredExpertise || []);
        const reviewerExpertise = new Set(reviewer.expertiseRecords.map((e) => e.area));

        let expertiseScore = 0;
        const matchedRequired = [...requiredExpertise].filter((e) => reviewerExpertise.has(e));
        const matchedPreferred = [...preferredExpertise].filter((e) => reviewerExpertise.has(e));

        if (requiredExpertise.size > 0) {
          expertiseScore = (matchedRequired.length / requiredExpertise.size) * 80;
        }
        if (preferredExpertise.size > 0) {
          expertiseScore += (matchedPreferred.length / preferredExpertise.size) * 20;
        }

        // Language score
        const requiredLanguages = new Set(input.requiredLanguages);
        const preferredLanguages = new Set(input.preferredLanguages || []);
        const reviewerLanguages = new Set(reviewer.languages.map((l) => l.language));

        let languageScore = 0;
        const matchedRequiredLangs = [...requiredLanguages].filter((l) => reviewerLanguages.has(l));
        const matchedPreferredLangs = [...preferredLanguages].filter((l) => reviewerLanguages.has(l));

        if (requiredLanguages.size > 0) {
          languageScore = (matchedRequiredLangs.length / requiredLanguages.size) * 80;
        }
        if (preferredLanguages.size > 0) {
          languageScore += (matchedPreferredLangs.length / preferredLanguages.size) * 20;
        }

        // Availability score (100 if available for full period, 0 otherwise)
        const availabilityScore = reviewer.availabilityPeriods.length > 0 ? 100 : 0;

        // Experience score (based on reviews completed, max 20 reviews = 100%)
        const experienceScore = Math.min((reviewer.reviewsCompleted / 20) * 100, 100);

        // Calculate weighted total score
        const totalScore =
          (expertiseScore * MATCHING_WEIGHTS.EXPERTISE +
            languageScore * MATCHING_WEIGHTS.LANGUAGE +
            availabilityScore * MATCHING_WEIGHTS.AVAILABILITY +
            experienceScore * MATCHING_WEIGHTS.EXPERIENCE) /
          100;

        return {
          reviewer,
          score: Math.round(totalScore * 100) / 100,
          breakdown: {
            expertise: Math.round(expertiseScore * 100) / 100,
            language: Math.round(languageScore * 100) / 100,
            availability: availabilityScore,
            experience: Math.round(experienceScore * 100) / 100,
          },
          matchedExpertise: matchedRequired,
          matchedLanguages: matchedRequiredLangs,
          isFullyQualified: matchedRequired.length === requiredExpertise.size &&
            matchedRequiredLangs.length === requiredLanguages.size,
        };
      });

      // Sort by score descending and return top results
      scoredReviewers.sort((a, b) => b.score - a.score);

      return {
        matches: scoredReviewers.slice(0, input.maxResults),
        totalEligible: eligibleReviewers.length,
        fullyQualifiedCount: scoredReviewers.filter((r) => r.isFullyQualified).length,
      };
    }),

  /**
   * Calculate match score for a single reviewer against criteria
   */
  calculateMatchScore: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string().cuid(),
        targetOrganizationId: z.string().cuid(),
        requiredExpertise: z.array(z.string()),
        requiredLanguages: z.array(z.string()),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      assertCanCoordinateReviewers(ctx.session);

      const reviewer = await prisma.reviewerProfile.findUnique({
        where: { id: input.reviewerId },
        include: {
          expertiseRecords: true,
          languages: true,
          availabilityPeriods: {
            where: {
              availabilityType: "AVAILABLE",
              startDate: { lte: input.startDate },
              endDate: { gte: input.endDate },
            },
          },
        },
      });

      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer not found",
        });
      }

      // Check COI
      const coiResult = await checkCOIConflict(input.reviewerId, input.targetOrganizationId);
      if (coiResult.hasConflict && coiResult.severity === "HARD_BLOCK") {
        return {
          reviewerId: input.reviewerId,
          score: 0,
          isEligible: false,
          disqualificationReason: `COI: ${coiResult.description || coiResult.reason}`,
          breakdown: null,
        };
      }

      // Calculate scores (convert enums to strings for comparison)
      const requiredExpertise = new Set(input.requiredExpertise);
      const reviewerExpertise = new Set(reviewer.expertiseRecords.map((e) => String(e.area)));
      const matchedExpertise = [...requiredExpertise].filter((e) => reviewerExpertise.has(e));
      const expertiseScore = requiredExpertise.size > 0
        ? (matchedExpertise.length / requiredExpertise.size) * 100
        : 100;

      const requiredLanguages = new Set(input.requiredLanguages);
      const reviewerLanguages = new Set(reviewer.languages.map((l) => String(l.language)));
      const matchedLanguages = [...requiredLanguages].filter((l) => reviewerLanguages.has(l));
      const languageScore = requiredLanguages.size > 0
        ? (matchedLanguages.length / requiredLanguages.size) * 100
        : 100;

      const availabilityScore = reviewer.availabilityPeriods.length > 0 ? 100 : 0;
      const experienceScore = Math.min((reviewer.reviewsCompleted / 20) * 100, 100);

      const totalScore =
        (expertiseScore * MATCHING_WEIGHTS.EXPERTISE +
          languageScore * MATCHING_WEIGHTS.LANGUAGE +
          availabilityScore * MATCHING_WEIGHTS.AVAILABILITY +
          experienceScore * MATCHING_WEIGHTS.EXPERIENCE) /
        100;

      return {
        reviewerId: input.reviewerId,
        score: Math.round(totalScore * 100) / 100,
        isEligible: reviewer.selectionStatus === "SELECTED" && reviewer.isAvailable,
        disqualificationReason: null,
        breakdown: {
          expertise: Math.round(expertiseScore * 100) / 100,
          language: Math.round(languageScore * 100) / 100,
          availability: availabilityScore,
          experience: Math.round(experienceScore * 100) / 100,
        },
        matchedExpertise,
        matchedLanguages,
        coiStatus: coiResult,
      };
    }),

  /**
   * Build an optimal review team based on criteria
   */
  buildOptimalTeam: protectedProcedure
    .input(
      z.object({
        targetOrganizationId: z.string().cuid(),
        requiredExpertise: z.array(z.string()).min(1),
        requiredLanguages: z.array(z.string()).min(1),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        teamSize: z.number().int().min(REVIEWER_CAPACITY.MIN_TEAM_SIZE).max(REVIEWER_CAPACITY.MAX_TEAM_SIZE).default(REVIEWER_CAPACITY.IDEAL_TEAM_SIZE),
        requireLeadReviewer: z.boolean().default(true),
        excludeReviewerIds: z.array(z.string().cuid()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertCanCoordinateReviewers(ctx.session);

      // Get all eligible reviewers
      const eligibleReviewers = await prisma.reviewerProfile.findMany({
        where: {
          selectionStatus: "SELECTED",
          isAvailable: true,
          homeOrganizationId: { not: input.targetOrganizationId },
          conflictsOfInterest: {
            none: {
              organizationId: input.targetOrganizationId,
              isActive: true,
            },
          },
          ...(input.excludeReviewerIds?.length && {
            id: { notIn: input.excludeReviewerIds },
          }),
        },
        include: {
          ...reviewerProfileListInclude,
          availabilityPeriods: {
            where: {
              availabilityType: "AVAILABLE",
              startDate: { lte: input.startDate },
              endDate: { gte: input.endDate },
            },
          },
        },
      });

      // Filter to only those available for the full period
      const availableReviewers = eligibleReviewers.filter(
        (r) => r.availabilityPeriods.length > 0
      );

      if (availableReviewers.length < input.teamSize) {
        return {
          success: false,
          message: `Only ${availableReviewers.length} reviewers available, need ${input.teamSize}`,
          team: [],
          coverageAnalysis: null,
        };
      }

      // Score and sort reviewers (convert enums to strings for comparison)
      const scoredReviewers = availableReviewers.map((reviewer) => {
        const reviewerExpertise = new Set(reviewer.expertiseRecords.map((e) => String(e.area)));
        const reviewerLanguages = new Set(reviewer.languages.map((l) => String(l.language)));

        const expertiseMatch = input.requiredExpertise.filter((e) => reviewerExpertise.has(e));
        const languageMatch = input.requiredLanguages.filter((l) => reviewerLanguages.has(l));

        return {
          reviewer,
          expertiseMatch,
          languageMatch,
          isLeadQualified: reviewer.isLeadQualified,
          score: expertiseMatch.length * 10 + languageMatch.length * 5 + (reviewer.isLeadQualified ? 20 : 0),
        };
      });

      scoredReviewers.sort((a, b) => b.score - a.score);

      // Build team using greedy algorithm to maximize coverage
      const team: typeof scoredReviewers = [];
      const coveredExpertise = new Set<string>();
      const coveredLanguages = new Set<string>();

      // If lead required, select lead first
      if (input.requireLeadReviewer) {
        const leadCandidates = scoredReviewers.filter((r) => r.isLeadQualified);
        if (leadCandidates.length === 0) {
          return {
            success: false,
            message: "No lead-qualified reviewers available",
            team: [],
            coverageAnalysis: null,
          };
        }
        const lead = leadCandidates[0];
        team.push(lead);
        lead.expertiseMatch.forEach((e) => coveredExpertise.add(e));
        lead.languageMatch.forEach((l) => coveredLanguages.add(l));
      }

      // Fill remaining slots
      for (const candidate of scoredReviewers) {
        if (team.length >= input.teamSize) break;
        if (team.some((t) => t.reviewer.id === candidate.reviewer.id)) continue;

        // Calculate marginal contribution (new expertise/languages this candidate adds)
        const newExpertise = candidate.expertiseMatch.filter((e) => !coveredExpertise.has(e));
        const newLanguages = candidate.languageMatch.filter((l) => !coveredLanguages.has(l));

        // Prioritize candidates who add new coverage
        if (newExpertise.length > 0 || newLanguages.length > 0 || team.length < input.teamSize) {
          team.push(candidate);
          candidate.expertiseMatch.forEach((e) => coveredExpertise.add(e));
          candidate.languageMatch.forEach((l) => coveredLanguages.add(l));
        }
      }

      // Calculate coverage analysis
      const uncoveredExpertise = input.requiredExpertise.filter((e) => !coveredExpertise.has(e));
      const uncoveredLanguages = input.requiredLanguages.filter((l) => !coveredLanguages.has(l));

      return {
        success: team.length >= input.teamSize,
        message: team.length >= input.teamSize
          ? "Optimal team built successfully"
          : `Could only select ${team.length} of ${input.teamSize} required reviewers`,
        team: team.map((t) => ({
          reviewer: t.reviewer,
          role: t.isLeadQualified && team.indexOf(t) === 0 ? "LEAD" : "MEMBER",
          expertiseContribution: t.expertiseMatch,
          languageContribution: t.languageMatch,
        })),
        coverageAnalysis: {
          requiredExpertise: input.requiredExpertise,
          coveredExpertise: [...coveredExpertise],
          uncoveredExpertise,
          expertiseCoveragePercent: Math.round(
            (coveredExpertise.size / input.requiredExpertise.length) * 100
          ),
          requiredLanguages: input.requiredLanguages,
          coveredLanguages: [...coveredLanguages],
          uncoveredLanguages,
          languageCoveragePercent: Math.round(
            (coveredLanguages.size / input.requiredLanguages.length) * 100
          ),
        },
      };
    }),

  // ============================================
  // ADVANCED MATCHING API (using matching library)
  // ============================================

  /**
   * Find matching reviewers using the full matching algorithm.
   * Returns a ranked list of reviewers with detailed scores.
   */
  findMatchingReviewers: protectedProcedure
    .input(
      z.object({
        targetOrganizationId: z.string().cuid(),
        requiredExpertise: z.array(z.string()),
        preferredExpertise: z.array(z.string()).optional(),
        requiredLanguages: z.array(z.string()).default(["EN", "FR"]),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        teamSize: z.number().int().min(2).max(6).default(4),
        excludeReviewerIds: z.array(z.string().cuid()).optional(),
        mustIncludeReviewerIds: z.array(z.string().cuid()).optional(),
        minScore: z.number().min(0).max(100).default(30),
        maxResults: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      assertCanCoordinateReviewers(ctx.session);

      // Fetch all reviewers with full profile data for matching
      const reviewers = await prisma.reviewerProfile.findMany({
        where: {
          selectionStatus: "SELECTED",
          homeOrganizationId: { not: input.targetOrganizationId },
          ...(input.excludeReviewerIds?.length && {
            id: { notIn: input.excludeReviewerIds },
          }),
        },
        include: reviewerProfileInclude,
      });

      // Build matching criteria
      const criteria: MatchingCriteria = {
        targetOrganizationId: input.targetOrganizationId,
        requiredExpertise: input.requiredExpertise as import("@prisma/client").ExpertiseArea[],
        preferredExpertise: input.preferredExpertise as import("@prisma/client").ExpertiseArea[] | undefined,
        requiredLanguages: input.requiredLanguages as import("@prisma/client").Language[],
        reviewStartDate: input.startDate,
        reviewEndDate: input.endDate,
        teamSize: input.teamSize,
        mustIncludeReviewerIds: input.mustIncludeReviewerIds,
        excludeReviewerIds: input.excludeReviewerIds,
      };

      // Run matching algorithm
      const results = findMatchingReviewers(criteria, reviewers as ReviewerProfileFull[]);

      // Filter by minimum score and limit results
      const filteredResults = results
        .filter((r) => r.score >= input.minScore)
        .slice(0, input.maxResults);

      // Get summary stats
      const eligibleCount = filteredResults.filter((r) => r.isEligible).length;
      const ineligibleCount = filteredResults.filter((r) => !r.isEligible).length;

      return {
        results: filteredResults,
        summary: {
          totalFound: results.length,
          returned: filteredResults.length,
          eligible: eligibleCount,
          ineligible: ineligibleCount,
          averageScore:
            filteredResults.length > 0
              ? Math.round(
                  (filteredResults.reduce((sum, r) => sum + r.score, 0) / filteredResults.length) * 10
                ) / 10
              : 0,
        },
      };
    }),

  /**
   * Validate a manually selected team.
   * Checks coverage, COI status, and provides recommendations.
   */
  validateTeam: protectedProcedure
    .input(
      z.object({
        reviewerIds: z.array(z.string().cuid()).min(1).max(6),
        targetOrganizationId: z.string().cuid(),
        requiredExpertise: z.array(z.string()),
        requiredLanguages: z.array(z.string()).default(["EN", "FR"]),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      assertCanCoordinateReviewers(ctx.session);

      // Fetch the selected reviewers with full data
      const reviewers = await prisma.reviewerProfile.findMany({
        where: {
          id: { in: input.reviewerIds },
        },
        include: reviewerProfileInclude,
      });

      if (reviewers.length !== input.reviewerIds.length) {
        const foundIds = new Set(reviewers.map((r) => r.id));
        const missingIds = input.reviewerIds.filter((id) => !foundIds.has(id));
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Reviewer(s) not found: ${missingIds.join(", ")}`,
        });
      }

      // Build matching criteria
      const criteria: MatchingCriteria = {
        targetOrganizationId: input.targetOrganizationId,
        requiredExpertise: input.requiredExpertise as import("@prisma/client").ExpertiseArea[],
        requiredLanguages: input.requiredLanguages as import("@prisma/client").Language[],
        reviewStartDate: input.startDate,
        reviewEndDate: input.endDate,
        teamSize: reviewers.length,
        mustIncludeReviewerIds: input.reviewerIds,
      };

      // Score each reviewer individually
      const scoredReviewers: MatchResult[] = reviewers.map((reviewer) =>
        calculateMatchScore(reviewer as ReviewerProfileFull, criteria)
      );

      // Build team result
      const teamResult = buildOptimalTeamAlgorithm(criteria, scoredReviewers);

      // Generate recommendations
      const recommendations: string[] = [];

      if (teamResult.coverageReport.expertiseMissing.length > 0) {
        recommendations.push(
          `Add reviewer(s) with expertise in: ${teamResult.coverageReport.expertiseMissing.join(", ")}`
        );
      }

      if (teamResult.coverageReport.languagesMissing.length > 0) {
        recommendations.push(
          `Add reviewer(s) proficient in: ${teamResult.coverageReport.languagesMissing.join(", ")}`
        );
      }

      if (!teamResult.coverageReport.hasLeadQualified) {
        recommendations.push("Consider adding a lead-qualified reviewer to the team");
      }

      const coiIssues = scoredReviewers.filter((r) => r.coiStatus.hasConflict);
      if (coiIssues.length > 0) {
        recommendations.push(
          `${coiIssues.length} team member(s) have COI conflicts that require attention`
        );
      }

      const unavailableMembers = scoredReviewers.filter(
        (r) => r.availabilityStatus.coverage < 0.8
      );
      if (unavailableMembers.length > 0) {
        recommendations.push(
          `${unavailableMembers.length} team member(s) have limited availability during the review period`
        );
      }

      return {
        isValid: teamResult.isViable,
        team: teamResult.team,
        coverage: teamResult.coverageReport,
        totalScore: teamResult.totalScore,
        averageScore: teamResult.averageScore,
        warnings: teamResult.warnings,
        recommendations,
      };
    }),

  /**
   * Get detailed match score breakdown for a single reviewer.
   */
  getReviewerMatchScore: protectedProcedure
    .input(
      z.object({
        reviewerProfileId: z.string().cuid(),
        targetOrganizationId: z.string().cuid(),
        requiredExpertise: z.array(z.string()),
        preferredExpertise: z.array(z.string()).optional(),
        requiredLanguages: z.array(z.string()).default(["EN", "FR"]),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Use coordinate permission since this is for matching purposes
      assertCanCoordinateReviewers(ctx.session);

      // Fetch the reviewer with full data
      const reviewer = await getReviewerById(input.reviewerProfileId);

      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer profile not found",
        });
      }

      // Build matching criteria
      const criteria: MatchingCriteria = {
        targetOrganizationId: input.targetOrganizationId,
        requiredExpertise: input.requiredExpertise as import("@prisma/client").ExpertiseArea[],
        preferredExpertise: input.preferredExpertise as import("@prisma/client").ExpertiseArea[] | undefined,
        requiredLanguages: input.requiredLanguages as import("@prisma/client").Language[],
        reviewStartDate: input.startDate,
        reviewEndDate: input.endDate,
        teamSize: 1,
      };

      // Calculate match score
      const result = calculateMatchScore(reviewer as ReviewerProfileFull, criteria);

      return {
        ...result,
        reviewer: {
          id: reviewer.id,
          userId: reviewer.userId,
          fullName: `${reviewer.user.firstName} ${reviewer.user.lastName}`,
          organization: reviewer.homeOrganization?.nameEn ?? "Unknown",
          organizationId: reviewer.homeOrganizationId,
          isLeadQualified: reviewer.isLeadQualified,
          selectionStatus: reviewer.selectionStatus,
        },
      };
    }),

  // ============================================
  // ELIGIBLE REVIEWERS FOR PEER REVIEW
  // ============================================

  /**
   * Get reviewers eligible for a specific peer review (COI-filtered).
   * Returns reviewers sorted by match score with reasons.
   */
  getEligibleForReview: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        search: z.string().optional(),
        expertiseAreas: z.array(z.nativeEnum(ExpertiseArea)).optional(),
        languages: z.array(z.nativeEnum(Language)).optional(),
        availableOnly: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get the review to know the host organization (for COI)
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        include: {
          hostOrganization: true,
        },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Get existing team members to exclude
      const existingMembers = await ctx.db.reviewTeamMember.findMany({
        where: { reviewId: input.reviewId },
        select: { userId: true },
      });
      const existingUserIds = existingMembers.map((m) => m.userId);

      // Build where clause for reviewers
      const whereClause: Prisma.ReviewerProfileWhereInput = {
        // COI: Exclude reviewers from host organization
        homeOrganizationId: { not: review.hostOrganizationId },
        // Exclude already assigned reviewers
        ...(existingUserIds.length > 0 && {
          userId: { notIn: existingUserIds },
        }),
        // Only selected reviewers (active in the pool)
        selectionStatus: "SELECTED",
      };

      // Filter by availability if requested
      if (input.availableOnly) {
        whereClause.isAvailable = true;
      }

      // Filter by expertise if specified
      if (input.expertiseAreas && input.expertiseAreas.length > 0) {
        whereClause.expertiseAreas = { hasSome: input.expertiseAreas };
      }

      // Search filter
      if (input.search) {
        whereClause.user = {
          OR: [
            { firstName: { contains: input.search, mode: "insensitive" } },
            { lastName: { contains: input.search, mode: "insensitive" } },
            { email: { contains: input.search, mode: "insensitive" } },
          ],
        };
      }

      const reviewers = await ctx.db.reviewerProfile.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          homeOrganization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
              organizationCode: true,
              country: true,
            },
          },
          languages: true,
          certifications: {
            where: {
              OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
            },
          },
        },
        orderBy: [{ isLeadQualified: "desc" }, { reviewsCompleted: "desc" }],
      });

      // Filter by languages if specified (needs post-query filter due to relation)
      let filteredReviewers = reviewers;
      if (input.languages && input.languages.length > 0) {
        filteredReviewers = reviewers.filter((reviewer) => {
          const reviewerLangs = reviewer.languages.map((l) => l.language);
          return input.languages!.some((lang) => reviewerLangs.includes(lang));
        });
      }

      // Calculate match scores for each reviewer
      const reviewersWithScores = filteredReviewers.map((reviewer) => {
        let matchScore = 0;
        const matchReasons: string[] = [];

        // Check language match (important for peer reviews)
        const reviewerLanguages = reviewer.languages.map((l) => l.language);
        const hasEnglish = reviewerLanguages.includes("EN");
        const hasFrench = reviewerLanguages.includes("FR");

        if (hasEnglish && hasFrench) {
          matchScore += 20;
          matchReasons.push("Bilingual (EN/FR)");
        } else if (hasEnglish || hasFrench) {
          matchScore += 10;
          matchReasons.push(hasEnglish ? "English" : "French");
        }

        // Check lead qualification
        if (reviewer.isLeadQualified) {
          matchScore += 15;
          matchReasons.push("Lead Qualified");
        }

        // Check experience
        if (reviewer.reviewsCompleted >= 5) {
          matchScore += 15;
          matchReasons.push(`${reviewer.reviewsCompleted} reviews completed`);
        } else if (reviewer.reviewsCompleted >= 3) {
          matchScore += 10;
          matchReasons.push(`${reviewer.reviewsCompleted} reviews completed`);
        } else if (reviewer.reviewsCompleted >= 1) {
          matchScore += 5;
          matchReasons.push(`${reviewer.reviewsCompleted} review(s) completed`);
        }

        // Check certifications
        const hasPeerReviewerCert = reviewer.certifications.some(
          (c) => c.certificationType === "PEER_REVIEWER"
        );
        const hasLeadCert = reviewer.certifications.some(
          (c) => c.certificationType === "LEAD_REVIEWER"
        );

        if (hasLeadCert) {
          matchScore += 15;
          matchReasons.push("Lead Reviewer Certified");
        } else if (hasPeerReviewerCert) {
          matchScore += 10;
          matchReasons.push("Peer Reviewer Certified");
        }

        // Check expertise match (if areas were specified)
        if (input.expertiseAreas && input.expertiseAreas.length > 0) {
          const matchedAreas = reviewer.expertiseAreas.filter((area) =>
            input.expertiseAreas!.includes(area)
          );
          if (matchedAreas.length > 0) {
            const expertiseScore = Math.round(
              (matchedAreas.length / input.expertiseAreas.length) * 25
            );
            matchScore += expertiseScore;
            matchReasons.push(
              `${matchedAreas.length}/${input.expertiseAreas.length} expertise match`
            );
          }
        }

        return {
          id: reviewer.id,
          userId: reviewer.userId,
          fullName: `${reviewer.user.firstName} ${reviewer.user.lastName}`,
          email: reviewer.user.email,
          organization: reviewer.homeOrganization,
          expertiseAreas: reviewer.expertiseAreas,
          languages: reviewer.languages,
          isLeadQualified: reviewer.isLeadQualified,
          reviewsCompleted: reviewer.reviewsCompleted,
          reviewsAsLead: reviewer.reviewsAsLead,
          isAvailable: reviewer.isAvailable,
          certifications: reviewer.certifications,
          matchScore,
          matchReasons,
          canBeLead: reviewer.isLeadQualified || hasLeadCert,
        };
      });

      // Sort by match score
      reviewersWithScores.sort((a, b) => b.matchScore - a.matchScore);

      return {
        reviewers: reviewersWithScores,
        review: {
          id: review.id,
          referenceNumber: review.referenceNumber,
          hostOrganization: review.hostOrganization,
          plannedStartDate: review.plannedStartDate,
          plannedEndDate: review.plannedEndDate,
        },
        excludedOrganizationId: review.hostOrganizationId,
        totalCount: reviewersWithScores.length,
      };
    }),

  // =============================================================================
  // TEAM-BASED ELIGIBILITY
  // =============================================================================

  /**
   * Get eligible reviewers for a review based on team membership rules
   *
   * Rule 1: SAME TEAM - Reviewer must be from same team as host ANSP
   * Rule 2: NO SELF-REVIEW - Reviewer cannot be from host organization
   */
  getTeamEligibleReviewers: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        includeCrossTeam: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      // Only Programme Coordinator can see cross-team reviewers
      const canSeeCrossTeam =
        input.includeCrossTeam &&
        ["PROGRAMME_COORDINATOR", "SUPER_ADMIN", "SYSTEM_ADMIN"].includes(
          ctx.session.user.role
        );

      return getEligibleReviewers(input.reviewId, canSeeCrossTeam);
    }),

  /**
   * Validate a reviewer assignment against eligibility rules
   *
   * Returns validation result with cross-team status
   */
  validateTeamAssignment: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        reviewerProfileId: z.string(),
        crossTeamJustification: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const approverId = ["PROGRAMME_COORDINATOR", "SUPER_ADMIN"].includes(
        ctx.session.user.role
      )
        ? ctx.session.user.id
        : undefined;

      return validateReviewerAssignment(
        input.reviewId,
        input.reviewerProfileId,
        input.crossTeamJustification,
        approverId
      );
    }),
});

export type ReviewerRouter = typeof reviewerRouter;
