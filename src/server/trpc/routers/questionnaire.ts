import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import type { Prisma } from "@prisma/client";

// =============================================================================
// INPUT VALIDATION SCHEMAS
// =============================================================================

const listInputSchema = z.object({
  type: z.enum(["ANS_USOAP_CMA", "SMS_CANSO_SOE"]).optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

const getByIdInputSchema = z.object({
  id: z.string().cuid(),
});

const getQuestionsInputSchema = z.object({
  questionnaireId: z.string().cuid(),
  categoryId: z.string().cuid().optional(),
  auditArea: z
    .enum(["LEG", "ORG", "PEL", "OPS", "AIR", "AIG", "ANS", "AGA", "SSP"])
    .optional(),
  reviewArea: z
    .enum(["ATS", "FPD", "AIS", "MAP", "MET", "CNS", "SAR", "SMS"])
    .optional(),
  criticalElement: z
    .enum(["CE_1", "CE_2", "CE_3", "CE_4", "CE_5", "CE_6", "CE_7", "CE_8"])
    .optional(),
  smsComponent: z
    .enum([
      "SAFETY_POLICY_OBJECTIVES",
      "SAFETY_RISK_MANAGEMENT",
      "SAFETY_ASSURANCE",
      "SAFETY_PROMOTION",
    ])
    .optional(),
  studyArea: z
    .enum([
      "SA_1_1",
      "SA_1_2",
      "SA_1_3",
      "SA_1_4",
      "SA_1_5",
      "SA_2_1",
      "SA_2_2",
      "SA_3_1",
      "SA_3_2",
      "SA_3_3",
      "SA_4_1",
      "SA_4_2",
    ])
    .optional(),
  isPriorityPQ: z.boolean().optional(),
  search: z.string().max(200).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(50),
});

const getQuestionByIdInputSchema = z.object({
  id: z.string().cuid(),
});

const getCategoriesInputSchema = z.object({
  questionnaireId: z.string().cuid(),
});

const getStatsInputSchema = z.object({
  questionnaireId: z.string().cuid(),
});

const getANSQuestionsGroupedInputSchema = z.object({
  reviewAreas: z
    .array(z.enum(["ATS", "FPD", "AIS", "MAP", "MET", "CNS", "SAR"]))
    .optional(),
  isPriorityPQ: z.boolean().optional(),
  isNewOrRevised: z.boolean().optional(),
  search: z.string().max(200).optional(),
});

// =============================================================================
// QUESTIONNAIRE ROUTER
// =============================================================================

export const questionnaireRouter = router({
  /**
   * List questionnaires with pagination and filtering
   */
  list: publicProcedure.input(listInputSchema).query(async ({ ctx, input }) => {
    const { type, isActive, page, limit } = input;
    const skip = (page - 1) * limit;

    const where: Prisma.QuestionnaireWhereInput = {};

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [questionnaires, total] = await Promise.all([
      ctx.db.questionnaire.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          code: true,
          type: true,
          version: true,
          titleEn: true,
          titleFr: true,
          descriptionEn: true,
          descriptionFr: true,
          effectiveDate: true,
          expiryDate: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              categories: true,
              questions: true,
            },
          },
        },
      }),
      ctx.db.questionnaire.count({ where }),
    ]);

    return {
      questionnaires,
      total,
      pages: Math.ceil(total / limit),
      page,
      limit,
    };
  }),

  /**
   * Get single questionnaire by ID with categories (without questions for performance)
   */
  getById: publicProcedure
    .input(getByIdInputSchema)
    .query(async ({ ctx, input }) => {
      const questionnaire = await ctx.db.questionnaire.findUnique({
        where: { id: input.id },
        include: {
          categories: {
            orderBy: { sortOrder: "asc" },
            include: {
              _count: {
                select: { questions: true },
              },
            },
          },
          _count: {
            select: {
              questions: true,
            },
          },
        },
      });

      if (!questionnaire) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Questionnaire not found",
        });
      }

      return questionnaire;
    }),

  /**
   * Get questions for a questionnaire with advanced filtering
   */
  getQuestions: publicProcedure
    .input(getQuestionsInputSchema)
    .query(async ({ ctx, input }) => {
      const {
        questionnaireId,
        categoryId,
        auditArea,
        reviewArea,
        criticalElement,
        smsComponent,
        studyArea,
        isPriorityPQ,
        search,
        page,
        limit,
      } = input;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.QuestionWhereInput = {
        questionnaireId,
        isActive: true,
      };

      if (categoryId) {
        where.categoryId = categoryId;
      }

      if (reviewArea) {
        where.reviewArea = reviewArea;
      } else if (auditArea) {
        where.auditArea = auditArea;
      }

      if (criticalElement) {
        where.criticalElement = criticalElement;
      }

      if (smsComponent) {
        where.smsComponent = smsComponent;
      }

      if (studyArea) {
        where.studyArea = studyArea;
      }

      if (isPriorityPQ !== undefined) {
        where.isPriorityPQ = isPriorityPQ;
      }

      if (search) {
        where.OR = [
          { questionTextEn: { contains: search, mode: "insensitive" } },
          { questionTextFr: { contains: search, mode: "insensitive" } },
          { pqNumber: { contains: search, mode: "insensitive" } },
        ];
      }

      const [questions, total] = await Promise.all([
        ctx.db.question.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ sortOrder: "asc" }],
          include: {
            category: {
              select: {
                id: true,
                code: true,
                nameEn: true,
                nameFr: true,
              },
            },
            icaoReferences: true,
          },
        }),
        ctx.db.question.count({ where }),
      ]);

      return {
        questions,
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      };
    }),

  /**
   * Get single question by ID with ICAO references
   */
  getQuestionById: publicProcedure
    .input(getQuestionByIdInputSchema)
    .query(async ({ ctx, input }) => {
      const question = await ctx.db.question.findUnique({
        where: { id: input.id },
        include: {
          questionnaire: {
            select: {
              id: true,
              code: true,
              type: true,
              titleEn: true,
              titleFr: true,
            },
          },
          category: {
            select: {
              id: true,
              code: true,
              nameEn: true,
              nameFr: true,
              auditArea: true,
              reviewArea: true,
              criticalElement: true,
              smsComponent: true,
              studyArea: true,
            },
          },
          icaoReferences: {
            orderBy: { referenceType: "asc" },
          },
        },
      });

      if (!question) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question not found",
        });
      }

      return question;
    }),

  /**
   * Get categories for a questionnaire
   */
  getCategories: publicProcedure
    .input(getCategoriesInputSchema)
    .query(async ({ ctx, input }) => {
      const categories = await ctx.db.questionnaireCategory.findMany({
        where: { questionnaireId: input.questionnaireId },
        orderBy: { sortOrder: "asc" },
        include: {
          _count: {
            select: { questions: true },
          },
        },
      });

      return categories;
    }),

  /**
   * Get all ANS protocol questions grouped by review area.
   * Returns all matching questions (no pagination — 132 PQs total).
   */
  getANSQuestionsGrouped: publicProcedure
    .input(getANSQuestionsGroupedInputSchema)
    .query(async ({ ctx, input }) => {
      const { reviewAreas, isPriorityPQ, isNewOrRevised, search } = input;

      // Find the ANS questionnaire
      const ansQuestionnaire = await ctx.db.questionnaire.findFirst({
        where: { type: "ANS_USOAP_CMA", isActive: true },
        select: { id: true },
      });

      if (!ansQuestionnaire) {
        return { groups: [], totalCount: 0 };
      }

      // Build where clause
      const where: Prisma.QuestionWhereInput = {
        questionnaireId: ansQuestionnaire.id,
        isActive: true,
        reviewArea: { not: null },
      };

      if (reviewAreas && reviewAreas.length > 0) {
        where.reviewArea = { in: reviewAreas };
      }

      if (isPriorityPQ) {
        where.isPriorityPQ = true;
      }

      if (isNewOrRevised) {
        where.pqStatus = { in: ["NEW", "REVISED"] };
      }

      if (search) {
        where.OR = [
          { questionTextEn: { contains: search, mode: "insensitive" } },
          { questionTextFr: { contains: search, mode: "insensitive" } },
          { pqNumber: { contains: search, mode: "insensitive" } },
        ];
      }

      // Fetch all matching questions
      const questions = await ctx.db.question.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }],
        include: {
          category: {
            select: {
              id: true,
              code: true,
              nameEn: true,
              nameFr: true,
              reviewArea: true,
            },
          },
          icaoReferences: true,
        },
      });

      // Get counts per review area (unfiltered by search/priority for sidebar)
      const areaCounts = await ctx.db.question.groupBy({
        by: ["reviewArea"],
        where: {
          questionnaireId: ansQuestionnaire.id,
          isActive: true,
          reviewArea: { not: null },
        },
        _count: { id: true },
      });

      const countsByArea: Record<string, number> = {};
      for (const item of areaCounts) {
        if (item.reviewArea) {
          countsByArea[item.reviewArea] = item._count.id;
        }
      }

      // Group questions by review area
      const areaOrder = ["ATS", "FPD", "AIS", "MAP", "MET", "CNS", "SAR"];
      const grouped: Record<string, typeof questions> = {};

      for (const q of questions) {
        const area = q.reviewArea as string;
        if (!grouped[area]) {
          grouped[area] = [];
        }
        grouped[area].push(q);
      }

      const groups = areaOrder
        .filter((area) => grouped[area] && grouped[area].length > 0)
        .map((area) => ({
          reviewArea: area,
          questions: grouped[area],
          filteredCount: grouped[area].length,
        }));

      return {
        groups,
        totalCount: questions.length,
        countsByArea,
      };
    }),

  /**
   * Get lightweight ANS review area stats (PQ counts per area).
   * Used by the assessments page review area grid.
   */
  getANSStats: publicProcedure.query(async ({ ctx }) => {
    const ansQuestionnaire = await ctx.db.questionnaire.findFirst({
      where: { type: "ANS_USOAP_CMA", isActive: true },
      select: { id: true },
    });

    if (!ansQuestionnaire) {
      return { totalCount: 0, priorityCount: 0, countsByArea: {} as Record<string, number> };
    }

    const [totalCount, priorityCount, areaCounts] = await Promise.all([
      ctx.db.question.count({
        where: {
          questionnaireId: ansQuestionnaire.id,
          isActive: true,
          reviewArea: { not: null },
        },
      }),
      ctx.db.question.count({
        where: {
          questionnaireId: ansQuestionnaire.id,
          isActive: true,
          reviewArea: { not: null },
          isPriorityPQ: true,
        },
      }),
      ctx.db.question.groupBy({
        by: ["reviewArea"],
        where: {
          questionnaireId: ansQuestionnaire.id,
          isActive: true,
          reviewArea: { not: null },
        },
        _count: { id: true },
      }),
    ]);

    const countsByArea: Record<string, number> = {};
    for (const item of areaCounts) {
      if (item.reviewArea) {
        countsByArea[item.reviewArea] = item._count.id;
      }
    }

    return { totalCount, priorityCount, countsByArea };
  }),

  /**
   * Get statistics for a questionnaire
   */
  getStats: protectedProcedure
    .input(getStatsInputSchema)
    .query(async ({ ctx, input }) => {
      const questionnaire = await ctx.db.questionnaire.findUnique({
        where: { id: input.questionnaireId },
        select: { type: true },
      });

      if (!questionnaire) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Questionnaire not found",
        });
      }

      // Get total questions count
      const totalQuestions = await ctx.db.question.count({
        where: {
          questionnaireId: input.questionnaireId,
          isActive: true,
        },
      });

      // Get priority PQs count
      const priorityPQs = await ctx.db.question.count({
        where: {
          questionnaireId: input.questionnaireId,
          isActive: true,
          isPriorityPQ: true,
        },
      });

      // Get on-site required count
      const requiresOnSite = await ctx.db.question.count({
        where: {
          questionnaireId: input.questionnaireId,
          isActive: true,
          requiresOnSite: true,
        },
      });

      // Get breakdown by audit area (for USOAP)
      const byAuditArea = await ctx.db.question.groupBy({
        by: ["auditArea"],
        where: {
          questionnaireId: input.questionnaireId,
          isActive: true,
          auditArea: { not: null },
        },
        _count: { id: true },
      });

      // Get breakdown by AAPRP review area
      const byReviewArea = await ctx.db.question.groupBy({
        by: ["reviewArea"],
        where: {
          questionnaireId: input.questionnaireId,
          isActive: true,
          reviewArea: { not: null },
        },
        _count: { id: true },
      });

      // Get breakdown by critical element (for USOAP)
      const byCriticalElement = await ctx.db.question.groupBy({
        by: ["criticalElement"],
        where: {
          questionnaireId: input.questionnaireId,
          isActive: true,
          criticalElement: { not: null },
        },
        _count: { id: true },
      });

      // Get breakdown by SMS component (for CANSO SoE)
      const bySmsComponent = await ctx.db.question.groupBy({
        by: ["smsComponent"],
        where: {
          questionnaireId: input.questionnaireId,
          isActive: true,
          smsComponent: { not: null },
        },
        _count: { id: true },
      });

      // Get breakdown by study area (for CANSO SoE)
      const byStudyArea = await ctx.db.question.groupBy({
        by: ["studyArea"],
        where: {
          questionnaireId: input.questionnaireId,
          isActive: true,
          studyArea: { not: null },
        },
        _count: { id: true },
      });

      // Get breakdown by PQ amendment status
      const byPqStatus = await ctx.db.question.groupBy({
        by: ["pqStatus"],
        where: {
          questionnaireId: input.questionnaireId,
          isActive: true,
        },
        _count: { id: true },
      });

      // Get categories count
      const categoriesCount = await ctx.db.questionnaireCategory.count({
        where: { questionnaireId: input.questionnaireId },
      });

      return {
        questionnaireType: questionnaire.type,
        totalQuestions,
        priorityPQs,
        requiresOnSite,
        categoriesCount,
        byAuditArea: byAuditArea.map((item) => ({
          auditArea: item.auditArea,
          count: item._count.id,
        })),
        byReviewArea: byReviewArea.map((item) => ({
          reviewArea: item.reviewArea,
          count: item._count.id,
        })),
        byCriticalElement: byCriticalElement.map((item) => ({
          criticalElement: item.criticalElement,
          count: item._count.id,
        })),
        bySmsComponent: bySmsComponent.map((item) => ({
          smsComponent: item.smsComponent,
          count: item._count.id,
        })),
        byStudyArea: byStudyArea.map((item) => ({
          studyArea: item.studyArea,
          count: item._count.id,
        })),
        byPqStatus: byPqStatus.map((item) => ({
          status: item.pqStatus,
          count: item._count.id,
        })),
      };
    }),
});
