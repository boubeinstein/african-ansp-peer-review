/**
 * Checklist Router - Fieldwork Checklist Management
 *
 * Provides CRUD operations for fieldwork checklist items with validation integration.
 * Supports pre-visit, on-site, and post-visit phases with automated validation rules.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { FieldworkPhase, Prisma } from "@prisma/client";
import {
  checklistValidationService,
  type ValidationRule,
} from "@/server/services/checklist-validation.service";

// Checklist item definitions for initialization
const CHECKLIST_ITEM_DEFINITIONS: Array<{
  phase: FieldworkPhase;
  itemCode: string;
  sortOrder: number;
  labelEn: string;
  labelFr: string;
  validationRules: ValidationRule | null;
}> = [
  // PRE-VISIT PREPARATION
  {
    phase: "PRE_VISIT",
    itemCode: "PRE_DOC_REQUEST_SENT",
    sortOrder: 1,
    labelEn: "Document request sent to host organization",
    labelFr: "Demande de documents envoyee a l'organisation hote",
    validationRules: {
      type: "DOCUMENT_EXISTS",
      category: "PRE_VISIT_REQUEST",
      minCount: 1,
      requiredStatus: ["UPLOADED", "REVIEWED", "APPROVED"],
    },
  },
  {
    phase: "PRE_VISIT",
    itemCode: "PRE_DOCS_RECEIVED",
    sortOrder: 2,
    labelEn: "Pre-visit documents received and reviewed",
    labelFr: "Documents pre-visite recus et examines",
    validationRules: {
      type: "DOCUMENT_EXISTS",
      category: "HOST_SUBMISSION",
      minCount: 1,
      requiredStatus: ["REVIEWED", "APPROVED"],
    },
  },
  {
    phase: "PRE_VISIT",
    itemCode: "PRE_COORDINATION_MEETING",
    sortOrder: 3,
    labelEn: "Pre-visit coordination meeting held with team",
    labelFr: "Reunion de coordination pre-visite tenue avec l'equipe",
    validationRules: {
      type: "MANUAL_OR_DOCUMENT",
      category: "INTERVIEW_NOTES",
      allowManual: true,
    },
  },
  {
    phase: "PRE_VISIT",
    itemCode: "PRE_PLAN_APPROVED",
    sortOrder: 4,
    labelEn: "Review plan approved by team",
    labelFr: "Plan de revue approuve par l'equipe",
    validationRules: {
      type: "APPROVAL_REQUIRED",
      approverRoles: ["LEAD_REVIEWER", "PROGRAMME_COORDINATOR"],
    },
  },

  // ON-SITE ACTIVITIES
  {
    phase: "ON_SITE",
    itemCode: "SITE_OPENING_MEETING",
    sortOrder: 5,
    labelEn: "Opening meeting conducted with host",
    labelFr: "Reunion d'ouverture tenue avec l'hote",
    validationRules: {
      type: "MANUAL_OR_DOCUMENT",
      allowManual: true,
    },
  },
  {
    phase: "ON_SITE",
    itemCode: "SITE_INTERVIEWS",
    sortOrder: 6,
    labelEn: "Staff interviews completed",
    labelFr: "Entretiens avec le personnel termines",
    validationRules: {
      type: "DOCUMENT_EXISTS",
      category: "INTERVIEW_NOTES",
      minCount: 1,
      requiredStatus: ["UPLOADED", "REVIEWED", "APPROVED"],
    },
  },
  {
    phase: "ON_SITE",
    itemCode: "SITE_FACILITIES",
    sortOrder: 7,
    labelEn: "Facilities inspection completed",
    labelFr: "Inspection des installations terminee",
    validationRules: {
      type: "DOCUMENT_EXISTS",
      category: "EVIDENCE",
      minCount: 1,
      requiredStatus: ["UPLOADED", "REVIEWED", "APPROVED"],
    },
  },
  {
    phase: "ON_SITE",
    itemCode: "SITE_DOC_REVIEW",
    sortOrder: 8,
    labelEn: "Document review completed",
    labelFr: "Examen des documents termine",
    validationRules: {
      type: "DOCUMENTS_REVIEWED",
      category: "HOST_SUBMISSION",
      allMustBeReviewed: true,
    },
  },
  {
    phase: "ON_SITE",
    itemCode: "SITE_FINDINGS_DISCUSSED",
    sortOrder: 9,
    labelEn: "Preliminary findings discussed with host",
    labelFr: "Constatations preliminaires discutees avec l'hote",
    validationRules: {
      type: "FINDINGS_EXIST",
      minCount: 1,
      statusRequired: ["OPEN", "CAP_REQUIRED", "CAP_SUBMITTED", "CAP_ACCEPTED"],
    },
  },
  {
    phase: "ON_SITE",
    itemCode: "SITE_CLOSING_MEETING",
    sortOrder: 10,
    labelEn: "Closing meeting conducted",
    labelFr: "Reunion de cloture tenue",
    validationRules: {
      type: "PREREQUISITE_ITEMS",
      requiredItems: [
        "SITE_OPENING_MEETING",
        "SITE_INTERVIEWS",
        "SITE_FACILITIES",
        "SITE_DOC_REVIEW",
        "SITE_FINDINGS_DISCUSSED",
      ],
    },
  },

  // POST-VISIT ACTIVITIES
  {
    phase: "POST_VISIT",
    itemCode: "POST_FINDINGS_ENTERED",
    sortOrder: 11,
    labelEn: "All findings entered in system",
    labelFr: "Toutes les constatations saisies dans le systeme",
    validationRules: {
      type: "AUTO_CHECK",
      condition: "FINDINGS_COUNT_GT_0",
    },
  },
  {
    phase: "POST_VISIT",
    itemCode: "POST_EVIDENCE_UPLOADED",
    sortOrder: 12,
    labelEn: "Supporting evidence uploaded",
    labelFr: "Preuves a l'appui telechargees",
    validationRules: {
      type: "FINDINGS_HAVE_EVIDENCE",
      allFindingsMustHaveEvidence: true,
    },
  },
  {
    phase: "POST_VISIT",
    itemCode: "POST_DRAFT_REPORT",
    sortOrder: 13,
    labelEn: "Draft report prepared",
    labelFr: "Projet de rapport prepare",
    validationRules: {
      type: "DOCUMENT_EXISTS",
      category: "DRAFT_REPORT",
      minCount: 1,
      requiredStatus: ["UPLOADED", "REVIEWED", "APPROVED"],
    },
  },
  {
    phase: "POST_VISIT",
    itemCode: "POST_HOST_FEEDBACK",
    sortOrder: 14,
    labelEn: "Host feedback received on draft findings",
    labelFr: "Commentaires de l'hote recus sur les constatations",
    validationRules: {
      type: "MANUAL_OR_DOCUMENT",
      category: "CORRESPONDENCE",
      allowManual: true,
    },
  },
];

export const checklistRouter = router({
  /**
   * Initialize checklist items for a review
   */
  initialize: protectedProcedure
    .input(z.object({ reviewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { reviewId } = input;

      // Verify review exists and user has access
      const review = await ctx.db.review.findUnique({
        where: { id: reviewId },
        select: { id: true, hostOrganizationId: true },
      });

      if (!review) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Review not found" });
      }

      // Check if already initialized
      const existingCount = await ctx.db.fieldworkChecklistItem.count({
        where: { reviewId },
      });

      if (existingCount > 0) {
        // Already initialized, return existing items
        return ctx.db.fieldworkChecklistItem.findMany({
          where: { reviewId },
          orderBy: { sortOrder: "asc" },
        });
      }

      // Create all checklist items using createMany for performance
      await ctx.db.fieldworkChecklistItem.createMany({
        data: CHECKLIST_ITEM_DEFINITIONS.map((def) => ({
          reviewId,
          phase: def.phase,
          itemCode: def.itemCode,
          sortOrder: def.sortOrder,
          labelEn: def.labelEn,
          labelFr: def.labelFr,
          validationRules:
            (def.validationRules as unknown as Prisma.InputJsonValue) ??
            Prisma.JsonNull,
        })),
        skipDuplicates: true,
      });

      // Fetch and return the created items
      const items = await ctx.db.fieldworkChecklistItem.findMany({
        where: { reviewId },
        orderBy: { sortOrder: "asc" },
      });

      return items;
    }),

  /**
   * Get checklist items with validation status
   */
  getByReviewId: protectedProcedure
    .input(z.object({ reviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { reviewId } = input;

      const includeRelations = {
        completedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        overriddenBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      } as const;

      let items = await ctx.db.fieldworkChecklistItem.findMany({
        where: { reviewId },
        orderBy: { sortOrder: "asc" },
        include: includeRelations,
      });

      // If no items, initialize them using createMany for performance
      if (items.length === 0) {
        await ctx.db.fieldworkChecklistItem.createMany({
          data: CHECKLIST_ITEM_DEFINITIONS.map((def) => ({
            reviewId,
            phase: def.phase,
            itemCode: def.itemCode,
            sortOrder: def.sortOrder,
            labelEn: def.labelEn,
            labelFr: def.labelFr,
            validationRules:
              (def.validationRules as unknown as Prisma.InputJsonValue) ??
              Prisma.JsonNull,
          })),
          skipDuplicates: true,
        });

        // Fetch the newly created items with relations
        items = await ctx.db.fieldworkChecklistItem.findMany({
          where: { reviewId },
          orderBy: { sortOrder: "asc" },
          include: includeRelations,
        });
      }

      // Validate each item
      const validatedItems = await Promise.all(
        items.map(async (item) => {
          const validation = await checklistValidationService.validateItem(
            reviewId,
            item.itemCode,
            item.validationRules as ValidationRule | null
          );
          return { ...item, validation };
        })
      );

      return validatedItems;
    }),

  /**
   * Toggle checklist item completion with validation
   */
  toggleItem: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        itemCode: z.string(),
        isCompleted: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { reviewId, itemCode, isCompleted } = input;
      const userId = ctx.session.user.id;

      // Get the item
      const item = await ctx.db.fieldworkChecklistItem.findUnique({
        where: { reviewId_itemCode: { reviewId, itemCode } },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Checklist item not found",
        });
      }

      // If trying to complete, validate first
      if (isCompleted && !item.isOverridden) {
        const validation = await checklistValidationService.validateItem(
          reviewId,
          itemCode,
          item.validationRules as ValidationRule | null
        );

        if (!validation.canComplete) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: validation.reason || "Cannot complete this item yet",
          });
        }

        // Check role-based approval if required
        const rules = item.validationRules as {
          type: string;
          approverRoles?: string[];
        } | null;
        if (rules?.type === "APPROVAL_REQUIRED" && rules.approverRoles) {
          const userRole = ctx.session.user.role;
          if (!rules.approverRoles.includes(userRole)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Only ${rules.approverRoles.join(" or ")} can approve this item`,
            });
          }
        }
      }

      // Update the item
      const updated = await ctx.db.fieldworkChecklistItem.update({
        where: { reviewId_itemCode: { reviewId, itemCode } },
        data: {
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          completedById: isCompleted ? userId : null,
        },
        include: {
          completedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      // Re-validate and return
      const validation = await checklistValidationService.validateItem(
        reviewId,
        itemCode,
        updated.validationRules as ValidationRule | null
      );

      return { ...updated, validation };
    }),

  /**
   * Override a checklist item (for exceptional cases)
   */
  overrideItem: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        itemCode: z.string(),
        reason: z
          .string()
          .min(10, "Override reason must be at least 10 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { reviewId, itemCode, reason } = input;
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      // Only coordinators and admins can override
      const allowedRoles = [
        "SUPER_ADMIN",
        "SYSTEM_ADMIN",
        "PROGRAMME_COORDINATOR",
      ];
      if (!allowedRoles.includes(userRole)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only administrators and coordinators can override checklist items",
        });
      }

      const updated = await ctx.db.fieldworkChecklistItem.update({
        where: { reviewId_itemCode: { reviewId, itemCode } },
        data: {
          isOverridden: true,
          overrideReason: reason,
          overriddenById: userId,
          overriddenAt: new Date(),
          isCompleted: true,
          completedAt: new Date(),
          completedById: userId,
        },
        include: {
          completedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          overriddenBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      return updated;
    }),

  /**
   * Remove override from a checklist item
   */
  removeOverride: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        itemCode: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { reviewId, itemCode } = input;
      const userRole = ctx.session.user.role;

      const allowedRoles = [
        "SUPER_ADMIN",
        "SYSTEM_ADMIN",
        "PROGRAMME_COORDINATOR",
      ];
      if (!allowedRoles.includes(userRole)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators and coordinators can remove overrides",
        });
      }

      const updated = await ctx.db.fieldworkChecklistItem.update({
        where: { reviewId_itemCode: { reviewId, itemCode } },
        data: {
          isOverridden: false,
          overrideReason: null,
          overriddenById: null,
          overriddenAt: null,
          isCompleted: false,
          completedAt: null,
          completedById: null,
        },
      });

      // Re-validate
      const validation = await checklistValidationService.validateItem(
        reviewId,
        itemCode,
        updated.validationRules as ValidationRule | null
      );

      return { ...updated, validation };
    }),

  /**
   * Get fieldwork completion status
   */
  getCompletionStatus: protectedProcedure
    .input(z.object({ reviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { reviewId } = input;

      const items = await ctx.db.fieldworkChecklistItem.findMany({
        where: { reviewId },
        select: {
          phase: true,
          isCompleted: true,
          isOverridden: true,
        },
      });

      if (items.length === 0) {
        return {
          totalItems: 0,
          completedItems: 0,
          progress: 0,
          byPhase: {} as Record<string, { total: number; completed: number }>,
          canCompleteFieldwork: false,
          incompleteItems: [],
        };
      }

      const completedItems = items.filter(
        (i) => i.isCompleted || i.isOverridden
      ).length;

      // Group by phase
      const byPhase = items.reduce(
        (acc, item) => {
          if (!acc[item.phase]) {
            acc[item.phase] = { total: 0, completed: 0 };
          }
          acc[item.phase].total++;
          if (item.isCompleted || item.isOverridden) {
            acc[item.phase].completed++;
          }
          return acc;
        },
        {} as Record<string, { total: number; completed: number }>
      );

      // Check if can complete fieldwork
      const { canComplete, incompleteItems } =
        await checklistValidationService.canCompleteFieldwork(reviewId);

      return {
        totalItems: items.length,
        completedItems,
        progress: Math.round((completedItems / items.length) * 100),
        byPhase,
        canCompleteFieldwork: canComplete,
        incompleteItems,
      };
    }),

  /**
   * Complete fieldwork (transition review to next phase)
   */
  completeFieldwork: protectedProcedure
    .input(z.object({ reviewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { reviewId } = input;
      const userRole = ctx.session.user.role;

      // Only lead reviewers and coordinators can complete fieldwork
      const allowedRoles = [
        "SUPER_ADMIN",
        "PROGRAMME_COORDINATOR",
        "LEAD_REVIEWER",
      ];
      if (!allowedRoles.includes(userRole)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only lead reviewers and coordinators can complete fieldwork",
        });
      }

      // Validate all items are complete
      const { canComplete, incompleteItems } =
        await checklistValidationService.canCompleteFieldwork(reviewId);

      if (!canComplete) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot complete fieldwork. Incomplete items: ${incompleteItems.map((i) => i.labelEn).join(", ")}`,
        });
      }

      // Update review phase to REPORTING
      const updated = await ctx.db.review.update({
        where: { id: reviewId },
        data: {
          phase: "REPORTING",
          status: "REPORT_DRAFTING",
        },
      });

      return updated;
    }),
});
