import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../../trpc";
import { prisma } from "@/lib/db";
import type { ANSReviewArea } from "@prisma/client";
import {
  QuestionnaireImportSchema,
  CategoryImportSchema,
  ANSQuestionImportSchema,
  SMSQuestionImportSchema,
  QuestionnaireTypeSchema,
  type ValidationError,
  type ImportSummary,
} from "@/lib/questionnaire/import-schema";
import {
  parseJSON,
  parseCSV,
  parseANSImport,
  parseSMSImport,
} from "@/lib/questionnaire/import-parser";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const CreateQuestionnaireInput = QuestionnaireImportSchema;

const UpdateQuestionnaireInput = z.object({
  id: z.string().cuid(),
  data: QuestionnaireImportSchema.partial(),
});

const DeleteQuestionnaireInput = z.object({
  id: z.string().cuid(),
  hardDelete: z.boolean().default(false),
});

const ValidateImportInput = z.object({
  type: QuestionnaireTypeSchema,
  data: z.string(), // JSON or CSV string
  format: z.enum(["json", "csv"]).default("json"),
});

const ImportQuestionsInput = z.object({
  questionnaireId: z.string().cuid(),
  questions: z.array(z.union([ANSQuestionImportSchema, SMSQuestionImportSchema])),
  categories: z.array(CategoryImportSchema).optional(),
  updateExisting: z.boolean().default(false),
});

const BulkImportInput = z.object({
  type: QuestionnaireTypeSchema,
  data: z.string(), // JSON string
  createQuestionnaire: z.boolean().default(true),
  updateExisting: z.boolean().default(false),
});

// =============================================================================
// ADMIN QUESTIONNAIRE ROUTER
// =============================================================================

export const adminQuestionnaireRouter = router({
  /**
   * List all questionnaires (including inactive)
   */
  list: adminProcedure
    .input(
      z.object({
        includeInactive: z.boolean().default(true),
        type: QuestionnaireTypeSchema.optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const where: Record<string, unknown> = {};

      if (input?.type) {
        where.type = input.type;
      }

      if (!input?.includeInactive) {
        where.isActive = true;
      }

      const questionnaires = await prisma.questionnaire.findMany({
        where,
        include: {
          _count: {
            select: {
              questions: true,
              categories: true,
              assessments: true,
            },
          },
        },
        orderBy: [{ type: "asc" }, { effectiveDate: "desc" }],
      });

      return questionnaires;
    }),

  /**
   * Get questionnaire by ID with full details
   */
  getById: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input }) => {
      const questionnaire = await prisma.questionnaire.findUnique({
        where: { id: input.id },
        include: {
          categories: {
            orderBy: { sortOrder: "asc" },
          },
          questions: {
            include: {
              icaoReferences: true,
            },
            orderBy: { sortOrder: "asc" },
          },
          _count: {
            select: {
              assessments: true,
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
   * Create a new questionnaire
   */
  create: adminProcedure
    .input(CreateQuestionnaireInput)
    .mutation(async ({ input, ctx }) => {
      // Check for duplicate code
      const existing = await prisma.questionnaire.findUnique({
        where: { code: input.code },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Questionnaire with code "${input.code}" already exists`,
        });
      }

      const questionnaire = await prisma.questionnaire.create({
        data: {
          ...input,
          effectiveDate: new Date(input.effectiveDate),
          expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        },
      });

      console.log(
        `[Admin] User ${ctx.user.id} created questionnaire ${questionnaire.id}`
      );

      return questionnaire;
    }),

  /**
   * Update questionnaire metadata
   */
  update: adminProcedure
    .input(UpdateQuestionnaireInput)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.questionnaire.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Questionnaire not found",
        });
      }

      // Check for code conflict if updating code
      if (input.data.code && input.data.code !== existing.code) {
        const codeConflict = await prisma.questionnaire.findUnique({
          where: { code: input.data.code },
        });

        if (codeConflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Questionnaire with code "${input.data.code}" already exists`,
          });
        }
      }

      const questionnaire = await prisma.questionnaire.update({
        where: { id: input.id },
        data: {
          ...input.data,
          effectiveDate: input.data.effectiveDate
            ? new Date(input.data.effectiveDate)
            : undefined,
          expiryDate: input.data.expiryDate
            ? new Date(input.data.expiryDate)
            : undefined,
        },
      });

      console.log(
        `[Admin] User ${ctx.user.id} updated questionnaire ${questionnaire.id}`
      );

      return questionnaire;
    }),

  /**
   * Delete questionnaire (soft delete by default)
   */
  delete: adminProcedure
    .input(DeleteQuestionnaireInput)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.questionnaire.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { assessments: true },
          },
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Questionnaire not found",
        });
      }

      // Prevent hard delete if assessments exist
      if (input.hardDelete && existing._count.assessments > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot hard delete questionnaire with ${existing._count.assessments} assessments. Use soft delete instead.`,
        });
      }

      if (input.hardDelete) {
        // Delete all related data
        await prisma.$transaction([
          prisma.iCAOReference.deleteMany({
            where: { question: { questionnaireId: input.id } },
          }),
          prisma.question.deleteMany({
            where: { questionnaireId: input.id },
          }),
          prisma.questionnaireCategory.deleteMany({
            where: { questionnaireId: input.id },
          }),
          prisma.questionnaire.delete({
            where: { id: input.id },
          }),
        ]);

        console.log(
          `[Admin] User ${ctx.user.id} hard deleted questionnaire ${input.id}`
        );

        return { deleted: true, hard: true };
      }

      // Soft delete
      await prisma.questionnaire.update({
        where: { id: input.id },
        data: { isActive: false },
      });

      console.log(
        `[Admin] User ${ctx.user.id} soft deleted questionnaire ${input.id}`
      );

      return { deleted: true, hard: false };
    }),

  /**
   * Validate import data without committing
   */
  validateImport: adminProcedure
    .input(ValidateImportInput)
    .mutation(async ({ input }) => {
      let parsedData: unknown;

      // Parse input based on format
      if (input.format === "csv") {
        const csvResult = parseCSV(input.data);
        if (csvResult.errors.length > 0) {
          return {
            isValid: false,
            errors: csvResult.errors,
            warnings: [],
            summary: null,
          };
        }
        parsedData = { questions: csvResult.data };
      } else {
        const jsonResult = parseJSON(input.data);
        if (jsonResult.errors.length > 0) {
          return {
            isValid: false,
            errors: jsonResult.errors,
            warnings: [],
            summary: null,
          };
        }
        parsedData = jsonResult.data;
      }

      // Validate based on type
      const parseResult =
        input.type === "ANS_USOAP_CMA"
          ? parseANSImport(parsedData)
          : parseSMSImport(parsedData);

      const summary: ImportSummary = {
        totalQuestions: parseResult.questions.length,
        totalCategories: parseResult.categories.length,
        totalReferences: parseResult.questions.reduce(
          (sum, q) => sum + (q.icaoReferences?.length || 0),
          0
        ),
        newQuestions: parseResult.questions.length,
        updatedQuestions: 0,
        errors: parseResult.errors,
        warnings: parseResult.warnings,
      };

      return {
        isValid: parseResult.errors.length === 0,
        errors: parseResult.errors,
        warnings: parseResult.warnings,
        summary,
        preview: {
          questionnaire: parseResult.questionnaire,
          categories: parseResult.categories.slice(0, 10),
          questions: parseResult.questions.slice(0, 20),
        },
      };
    }),

  /**
   * Import questions into existing questionnaire
   */
  importQuestions: adminProcedure
    .input(ImportQuestionsInput)
    .mutation(async ({ input, ctx }) => {
      const questionnaire = await prisma.questionnaire.findUnique({
        where: { id: input.questionnaireId },
      });

      if (!questionnaire) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Questionnaire not found",
        });
      }

      const errors: ValidationError[] = [];
      let createdCount = 0;
      let updatedCount = 0;

      // Import categories first
      const categoryMap = new Map<string, string>();

      if (input.categories && input.categories.length > 0) {
        for (const cat of input.categories) {
          const existing = await prisma.questionnaireCategory.findFirst({
            where: {
              questionnaireId: input.questionnaireId,
              code: cat.code,
            },
          });

          if (existing) {
            if (input.updateExisting) {
              await prisma.questionnaireCategory.update({
                where: { id: existing.id },
                data: cat,
              });
            }
            categoryMap.set(cat.code, existing.id);
          } else {
            const created = await prisma.questionnaireCategory.create({
              data: {
                ...cat,
                questionnaireId: input.questionnaireId,
              },
            });
            categoryMap.set(cat.code, created.id);
          }
        }
      }

      // Get or create default category
      let defaultCategoryId: string;
      const defaultCategory = await prisma.questionnaireCategory.findFirst({
        where: {
          questionnaireId: input.questionnaireId,
          code: "DEFAULT",
        },
      });

      if (defaultCategory) {
        defaultCategoryId = defaultCategory.id;
      } else {
        const created = await prisma.questionnaireCategory.create({
          data: {
            questionnaireId: input.questionnaireId,
            code: "DEFAULT",
            nameEn: "Default Category",
            nameFr: "Catégorie par défaut",
            sortOrder: 0,
          },
        });
        defaultCategoryId = created.id;
      }

      // Import questions
      for (let i = 0; i < input.questions.length; i++) {
        const q = input.questions[i];

        try {
          // Check if question exists (by PQ number)
          const existing = q.pqNumber
            ? await prisma.question.findFirst({
                where: {
                  questionnaireId: input.questionnaireId,
                  pqNumber: q.pqNumber,
                },
              })
            : null;

          // Determine category ID
          const categoryId = defaultCategoryId;

          // Prepare question data
          const questionData = {
            questionnaireId: input.questionnaireId,
            categoryId,
            pqNumber: q.pqNumber || null,
            questionTextEn: q.questionTextEn,
            questionTextFr: q.questionTextFr,
            guidanceEn: q.guidanceEn || null,
            guidanceFr: q.guidanceFr || null,
            responseType: q.responseType || "SATISFACTORY_NOT",
            weight: q.weight || 1.0,
            maxScore: q.maxScore || 1.0,
            sortOrder: q.sortOrder,
            // ANS-specific fields
            auditArea: "auditArea" in q ? q.auditArea : null,
            reviewArea: "reviewArea" in q ? (q as Record<string, unknown>).reviewArea as ANSReviewArea | null : null,
            criticalElement: "criticalElement" in q ? q.criticalElement : null,
            isPriorityPQ: "isPriorityPQ" in q ? q.isPriorityPQ : false,
            requiresOnSite: "requiresOnSite" in q ? q.requiresOnSite : false,
            pqStatus: "pqStatus" in q ? q.pqStatus : "NO_CHANGE",
            previousPqNumber: "previousPqNumber" in q ? q.previousPqNumber : null,
            // SMS-specific fields
            smsComponent: "smsComponent" in q ? q.smsComponent : null,
            studyArea: "studyArea" in q ? q.studyArea : null,
            maturityLevel: "maturityLevel" in q ? q.maturityLevel : null,
          };

          if (existing && input.updateExisting) {
            // Update existing question
            await prisma.question.update({
              where: { id: existing.id },
              data: questionData,
            });

            // Update ICAO references
            if (q.icaoReferences && q.icaoReferences.length > 0) {
              await prisma.iCAOReference.deleteMany({
                where: { questionId: existing.id },
              });
              await prisma.iCAOReference.createMany({
                data: q.icaoReferences.map((ref) => ({
                  questionId: existing.id,
                  referenceType: ref.referenceType,
                  document: ref.document,
                  chapter: ref.chapter || null,
                  description: ref.description || null,
                })),
              });
            }

            updatedCount++;
          } else if (!existing) {
            // Create new question
            const created = await prisma.question.create({
              data: questionData,
            });

            // Create ICAO references
            if (q.icaoReferences && q.icaoReferences.length > 0) {
              await prisma.iCAOReference.createMany({
                data: q.icaoReferences.map((ref) => ({
                  questionId: created.id,
                  referenceType: ref.referenceType,
                  document: ref.document,
                  chapter: ref.chapter || null,
                  description: ref.description || null,
                })),
              });
            }

            createdCount++;
          }
        } catch (error) {
          errors.push({
            row: i,
            field: "question",
            message:
              error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      console.log(
        `[Admin] User ${ctx.user.id} imported ${createdCount} new, ${updatedCount} updated questions to questionnaire ${input.questionnaireId}`
      );

      return {
        success: errors.length === 0,
        created: createdCount,
        updated: updatedCount,
        errors,
      };
    }),

  /**
   * Bulk import with questionnaire creation
   */
  bulkImport: adminProcedure
    .input(BulkImportInput)
    .mutation(async ({ input, ctx }) => {
      // Parse JSON data
      const jsonResult = parseJSON(input.data);
      if (jsonResult.errors.length > 0) {
        return {
          success: false,
          errors: jsonResult.errors,
          questionnaireId: null,
        };
      }

      // Validate and parse based on type
      const parseResult =
        input.type === "ANS_USOAP_CMA"
          ? parseANSImport(jsonResult.data)
          : parseSMSImport(jsonResult.data);

      if (parseResult.errors.length > 0) {
        return {
          success: false,
          errors: parseResult.errors,
          questionnaireId: null,
        };
      }

      let questionnaireId: string;

      if (input.createQuestionnaire && parseResult.questionnaire) {
        // Check for existing
        const existing = await prisma.questionnaire.findUnique({
          where: { code: parseResult.questionnaire.code },
        });

        if (existing && !input.updateExisting) {
          return {
            success: false,
            errors: [
              {
                row: 0,
                field: "questionnaire.code",
                message: `Questionnaire with code "${parseResult.questionnaire.code}" already exists`,
              },
            ],
            questionnaireId: null,
          };
        }

        if (existing) {
          questionnaireId = existing.id;
        } else {
          const created = await prisma.questionnaire.create({
            data: {
              ...parseResult.questionnaire,
              effectiveDate: new Date(parseResult.questionnaire.effectiveDate),
              expiryDate: parseResult.questionnaire.expiryDate
                ? new Date(parseResult.questionnaire.expiryDate)
                : null,
            },
          });
          questionnaireId = created.id;
        }
      } else {
        return {
          success: false,
          errors: [
            {
              row: 0,
              field: "questionnaire",
              message: "Questionnaire metadata is required for bulk import",
            },
          ],
          questionnaireId: null,
        };
      }

      // Import categories and questions using existing procedure logic
      const importResult = await prisma.$transaction(async (tx) => {
        const categoryMap = new Map<string, string>();
        let createdQuestions = 0;
        let createdReferences = 0;

        // Create categories
        for (const cat of parseResult.categories) {
          const created = await tx.questionnaireCategory.create({
            data: {
              ...cat,
              questionnaireId,
            },
          });
          categoryMap.set(cat.code, created.id);
        }

        // Create default category if none exist
        if (categoryMap.size === 0) {
          const defaultCat = await tx.questionnaireCategory.create({
            data: {
              questionnaireId,
              code: "DEFAULT",
              nameEn: "Default Category",
              nameFr: "Catégorie par défaut",
              sortOrder: 0,
            },
          });
          categoryMap.set("DEFAULT", defaultCat.id);
        }

        const defaultCategoryId = categoryMap.get("DEFAULT") || Array.from(categoryMap.values())[0];

        // Create questions
        for (const q of parseResult.questions) {
          const questionData = {
            questionnaireId,
            categoryId: defaultCategoryId,
            pqNumber: q.pqNumber || null,
            questionTextEn: q.questionTextEn,
            questionTextFr: q.questionTextFr,
            guidanceEn: q.guidanceEn || null,
            guidanceFr: q.guidanceFr || null,
            responseType: q.responseType || (input.type === "ANS_USOAP_CMA" ? "SATISFACTORY_NOT" : "MATURITY_LEVEL"),
            weight: q.weight || 1.0,
            maxScore: q.maxScore || (input.type === "ANS_USOAP_CMA" ? 1.0 : 5.0),
            sortOrder: q.sortOrder,
            auditArea: "auditArea" in q ? q.auditArea : null,
            reviewArea: "reviewArea" in q ? (q as Record<string, unknown>).reviewArea as ANSReviewArea | null : null,
            criticalElement: "criticalElement" in q ? q.criticalElement : null,
            isPriorityPQ: "isPriorityPQ" in q ? q.isPriorityPQ : false,
            requiresOnSite: "requiresOnSite" in q ? q.requiresOnSite : false,
            pqStatus: "pqStatus" in q ? q.pqStatus : "NO_CHANGE",
            previousPqNumber: "previousPqNumber" in q ? q.previousPqNumber : null,
            smsComponent: "smsComponent" in q ? q.smsComponent : null,
            studyArea: "studyArea" in q ? q.studyArea : null,
            maturityLevel: "maturityLevel" in q ? q.maturityLevel : null,
          };

          const created = await tx.question.create({
            data: questionData,
          });

          createdQuestions++;

          // Create ICAO references
          if (q.icaoReferences && q.icaoReferences.length > 0) {
            await tx.iCAOReference.createMany({
              data: q.icaoReferences.map((ref) => ({
                questionId: created.id,
                referenceType: ref.referenceType,
                document: ref.document,
                chapter: ref.chapter || null,
                description: ref.description || null,
              })),
            });
            createdReferences += q.icaoReferences.length;
          }
        }

        return {
          categories: categoryMap.size,
          questions: createdQuestions,
          references: createdReferences,
        };
      });

      console.log(
        `[Admin] User ${ctx.user.id} bulk imported questionnaire ${questionnaireId}: ${importResult.categories} categories, ${importResult.questions} questions, ${importResult.references} references`
      );

      return {
        success: true,
        errors: [],
        questionnaireId,
        summary: {
          categories: importResult.categories,
          questions: importResult.questions,
          references: importResult.references,
        },
      };
    }),

  /**
   * Get import statistics for a questionnaire
   */
  getStats: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input }) => {
      const questionnaire = await prisma.questionnaire.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              categories: true,
              questions: true,
              assessments: true,
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

      // Get question breakdown
      const questionStats = await prisma.question.groupBy({
        by: ["pqStatus"],
        where: { questionnaireId: input.id },
        _count: true,
      });

      // Get priority PQ count
      const priorityCount = await prisma.question.count({
        where: { questionnaireId: input.id, isPriorityPQ: true },
      });

      // Get ICAO reference count
      const referenceCount = await prisma.iCAOReference.count({
        where: { question: { questionnaireId: input.id } },
      });

      return {
        questionnaire,
        totalCategories: questionnaire._count.categories,
        totalQuestions: questionnaire._count.questions,
        totalAssessments: questionnaire._count.assessments,
        priorityQuestions: priorityCount,
        totalReferences: referenceCount,
        questionsByStatus: questionStats.reduce(
          (acc, item) => {
            acc[item.pqStatus] = item._count;
            return acc;
          },
          {} as Record<string, number>
        ),
      };
    }),
});
