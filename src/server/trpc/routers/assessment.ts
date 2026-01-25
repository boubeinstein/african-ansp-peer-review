/**
 * Assessment Router - Self-Assessment Module API
 *
 * Provides comprehensive CRUD operations, scoring, and progress tracking
 * for both ANS USOAP CMA and SMS CANSO SoE assessments.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  roleProcedure,
} from "../trpc";
import { prisma } from "@/lib/db";
import {
  AssessmentStatus,
  AssessmentType,
  MaturityLevel,
  UserRole,
  QuestionnaireType,
  USOAPAuditArea,
  SMSComponent,
  CriticalElement,
  CANSOStudyArea,
  Prisma,
  AuditAction,
} from "@prisma/client";
import {
  calculateEIScore,
  calculateSMSMaturity,
  calculateCategoryScores,
  calculateProgress,
  validateAssessmentForSubmission,
  maturityLevelToScore,
} from "@/lib/assessment";
import type {
  AssessmentResponseWithQuestion,
} from "@/lib/assessment";
import {
  canDeleteAssessment,
  canArchiveAssessment,
} from "@/lib/auth/permissions";
import {
  generateAssessmentReferenceNumber,
  generateAssessmentTitle,
  getAssessmentTypeCode,
} from "@/lib/utils/reference-number";
import {
  isANSResponseAnswered,
  isSMSResponseAnswered,
} from "@/lib/utils/assessment-helpers";

// =============================================================================
// CONSTANTS & HELPERS
// =============================================================================

/**
 * Roles with full access to organization assessments
 */
const ASSESSMENT_MANAGER_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "ANSP_ADMIN",
  "SAFETY_MANAGER",
  "QUALITY_MANAGER",
];

/**
 * Valid status transitions
 */
const STATUS_TRANSITIONS: Record<AssessmentStatus, AssessmentStatus[]> = {
  DRAFT: ["SUBMITTED", "ARCHIVED"],
  SUBMITTED: ["UNDER_REVIEW", "DRAFT"],
  UNDER_REVIEW: ["COMPLETED", "SUBMITTED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
};

/**
 * Maturity level mapping for database/display conversion
 */
const MATURITY_LEVEL_MAP: Record<string, MaturityLevel> = {
  A: "LEVEL_A",
  B: "LEVEL_B",
  C: "LEVEL_C",
  D: "LEVEL_D",
  E: "LEVEL_E",
};

const MATURITY_LEVEL_REVERSE: Record<MaturityLevel, string> = {
  LEVEL_A: "A",
  LEVEL_B: "B",
  LEVEL_C: "C",
  LEVEL_D: "D",
  LEVEL_E: "E",
};

/**
 * Build a Prisma where clause for questions filtered by selected audit areas
 */
function getQuestionsWhereClause(
  questionnaireId: string,
  selectedAuditAreas: USOAPAuditArea[] | null
): Prisma.QuestionWhereInput {
  const whereClause: Prisma.QuestionWhereInput = {
    questionnaireId,
    isActive: true,
  };

  // Only filter by audit area if specific areas were selected
  if (selectedAuditAreas && selectedAuditAreas.length > 0) {
    whereClause.auditArea = {
      in: selectedAuditAreas,
    };
  }

  return whereClause;
}

/**
 * Assessment with relations type
 */
type AssessmentWithRelations = Prisma.AssessmentGetPayload<{
  include: {
    organization: true;
    questionnaire: true;
  };
}>;

/**
 * Check if user has access to assessment
 */
async function checkAssessmentAccess(
  assessmentId: string,
  userId: string,
  userRole: UserRole,
  userOrgId: string | null,
  requireWrite: boolean = false
): Promise<{
  assessment: AssessmentWithRelations | null;
  hasAccess: boolean;
  reason?: string;
}> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      organization: true,
      questionnaire: true,
    },
  });

  if (!assessment) {
    return { assessment: null, hasAccess: false, reason: "Assessment not found" };
  }

  // Super admins and system admins have full access
  if (["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(userRole)) {
    return { assessment, hasAccess: true };
  }

  // Check organization membership
  if (userOrgId !== assessment.organizationId) {
    // Peer reviewers can view submitted assessments
    if (
      ["PEER_REVIEWER", "LEAD_REVIEWER"].includes(userRole) &&
      ["SUBMITTED", "UNDER_REVIEW", "COMPLETED"].includes(assessment.status) &&
      !requireWrite
    ) {
      return { assessment, hasAccess: true };
    }

    // Steering committee can view all completed assessments
    if (
      userRole === "STEERING_COMMITTEE" &&
      assessment.status === "COMPLETED" &&
      !requireWrite
    ) {
      return { assessment, hasAccess: true };
    }

    return {
      assessment,
      hasAccess: false,
      reason: "You do not have access to this organization's assessments",
    };
  }

  // Organization members - check role for write access
  if (requireWrite && !ASSESSMENT_MANAGER_ROLES.includes(userRole)) {
    return {
      assessment,
      hasAccess: false,
      reason: "You do not have permission to modify assessments",
    };
  }

  return { assessment, hasAccess: true };
}

/**
 * Log audit entry
 */
async function logAuditEntry(
  userId: string,
  action: AuditAction,
  entityType: string,
  entityId: string,
  newData?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        newState: newData ? JSON.stringify(newData) : Prisma.JsonNull,
      },
    });
  } catch (error) {
    console.error("[Audit] Failed to log entry:", error);
  }
}

/**
 * Transform responses for scoring functions
 */
function transformResponsesForScoring(
  responses: Array<{
    id: string;
    assessmentId: string;
    questionId: string;
    responseValue: string | null;
    maturityLevel: MaturityLevel | null;
    score: number | null;
    notes: string | null;
    evidenceUrls: string[];
    respondedById: string | null;
    respondedAt: Date | null;
    updatedAt: Date;
    question: {
      id: string;
      pqNumber: string | null;
      questionTextEn: string;
      questionTextFr: string;
      auditArea: USOAPAuditArea | null;
      criticalElement: CriticalElement | null;
      smsComponent: SMSComponent | null;
      studyArea: CANSOStudyArea | null;
      isPriorityPQ: boolean;
      requiresOnSite: boolean;
      weight: number;
    };
  }>
): AssessmentResponseWithQuestion[] {
  return responses.map((r) => ({
    id: r.id,
    assessmentId: r.assessmentId,
    questionId: r.questionId,
    responseValue: r.responseValue as "SATISFACTORY" | "NOT_SATISFACTORY" | "NOT_APPLICABLE" | "NOT_REVIEWED" | null,
    maturityLevel: r.maturityLevel
      ? (MATURITY_LEVEL_REVERSE[r.maturityLevel] as "A" | "B" | "C" | "D" | "E")
      : null,
    score: r.score ?? undefined,
    evidenceDescription: r.notes ?? undefined,
    evidenceUrls: r.evidenceUrls,
    respondedById: r.respondedById ?? "",
    respondedAt: r.respondedAt ?? new Date(),
    lastModifiedAt: r.updatedAt,
    isComplete: r.evidenceUrls.length > 0 || (r.notes?.length ?? 0) > 0,
    needsReview: false,
    question: {
      id: r.question.id,
      pqNumber: r.question.pqNumber ?? undefined,
      questionTextEn: r.question.questionTextEn,
      questionTextFr: r.question.questionTextFr,
      auditArea: r.question.auditArea ?? undefined,
      criticalElement: r.question.criticalElement ?? undefined,
      smsComponent: r.question.smsComponent ?? undefined,
      studyArea: r.question.studyArea ?? undefined,
      isPriorityPQ: r.question.isPriorityPQ,
      requiresOnSite: r.question.requiresOnSite,
      weight: r.question.weight,
    },
  }));
}

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const CreateAssessmentInput = z.object({
  // Organization ID - required for all users
  organizationId: z.string().min(1, "Organization is required"),
  // Either questionnaireId or questionnaireType must be provided
  questionnaireId: z.string().cuid().optional(),
  questionnaireType: z.nativeEnum(QuestionnaireType).optional(),
  assessmentType: z.nativeEnum(AssessmentType).default("SELF_ASSESSMENT"),
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  dueDate: z.date().optional(),
  // Selected audit areas for ANS assessments (when empty, all areas are included)
  selectedAuditAreas: z.array(z.nativeEnum(USOAPAuditArea)).default([]),
}).refine(
  (data) => data.questionnaireId || data.questionnaireType,
  { message: "Either questionnaireId or questionnaireType must be provided" }
);

const AssessmentFilterInput = z.object({
  organizationId: z.string().cuid().optional(),
  questionnaireId: z.string().cuid().optional(),
  questionnaireType: z.nativeEnum(QuestionnaireType).optional(),
  type: z.nativeEnum(AssessmentType).optional(),
  status: z
    .union([z.nativeEnum(AssessmentStatus), z.array(z.nativeEnum(AssessmentStatus))])
    .optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "updatedAt", "status", "progress"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const SaveResponseInput = z.object({
  assessmentId: z.string().cuid(),
  questionId: z.string().cuid(),
  responseValue: z.string().optional().nullable(),
  maturityLevel: z.enum(["A", "B", "C", "D", "E"]).optional().nullable(),
  notes: z.string().max(2000).optional(),
  evidenceUrls: z.array(z.string().url()).optional(),
});

const BulkSaveResponsesInput = z.object({
  assessmentId: z.string().cuid(),
  responses: z.array(
    z.object({
      questionId: z.string().cuid(),
      responseValue: z.string().optional().nullable(),
      maturityLevel: z.enum(["A", "B", "C", "D", "E"]).optional().nullable(),
      notes: z.string().max(2000).optional(),
    })
  ).min(1).max(100),
});

const GetResponsesInput = z.object({
  assessmentId: z.string().cuid(),
  categoryId: z.string().optional(),
  auditArea: z.string().optional(),
  criticalElement: z.string().optional(),
  smsComponent: z.string().optional(),
  studyArea: z.string().optional(),
  onlyUnanswered: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(500).default(500),
});

const AddEvidenceInput = z.object({
  assessmentId: z.string().cuid(),
  questionId: z.string().cuid(),
  evidenceUrl: z.string().url(),
});

const ExportInput = z.object({
  assessmentId: z.string().cuid(),
  format: z.enum(["JSON", "CSV"]),
  includeEvidence: z.boolean().default(true),
  includeNotes: z.boolean().default(true),
});

// =============================================================================
// ASSESSMENT ROUTER
// =============================================================================

export const assessmentRouter = router({
  // ============================================
  // ASSESSMENT CREATION CONTEXT
  // ============================================

  /**
   * Get context for assessment creation
   * Returns user role, organization info, and available organizations
   */
  getCreationContext: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx;

    // Roles that can create assessments for any organization
    const globalRoles: UserRole[] = [
      "SUPER_ADMIN",
      "PROGRAMME_COORDINATOR",
      "STEERING_COMMITTEE",
    ];
    const canSelectOrganization = globalRoles.includes(user.role);

    // Roles that can only create for their own organization
    const orgRoles: UserRole[] = [
      "ANSP_ADMIN",
      "SAFETY_MANAGER",
      "QUALITY_MANAGER",
    ];
    const canCreateForOwnOrg = orgRoles.includes(user.role);

    if (!canSelectOrganization && !canCreateForOwnOrg) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to create assessments",
      });
    }

    // Get user's organization
    let userOrganization = null;
    if (user.organizationId) {
      userOrganization = await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: {
          id: true,
          nameEn: true,
          nameFr: true,
          organizationCode: true,
          country: true,
        },
      });
    }

    // Get available organizations for selection
    let availableOrganizations: {
      id: string;
      name: string;
      code: string;
      country: string;
    }[] = [];

    if (canSelectOrganization) {
      // Programme coordinators can see all active organizations
      const orgs = await prisma.organization.findMany({
        where: { membershipStatus: "ACTIVE" },
        select: {
          id: true,
          nameEn: true,
          nameFr: true,
          organizationCode: true,
          country: true,
        },
        orderBy: { nameEn: "asc" },
      });
      availableOrganizations = orgs.map((org) => ({
        id: org.id,
        name: org.nameEn,
        code: org.organizationCode ?? "",
        country: org.country,
      }));
    } else if (userOrganization) {
      // Org-level users can only see their own organization
      availableOrganizations = [
        {
          id: userOrganization.id,
          name: userOrganization.nameEn,
          code: userOrganization.organizationCode ?? "",
          country: userOrganization.country,
        },
      ];
    }

    return {
      userRole: user.role,
      userOrganizationId: user.organizationId,
      userOrganizationName: userOrganization?.nameEn ?? null,
      canSelectOrganization,
      availableOrganizations,
    };
  }),

  // ============================================
  // ASSESSMENT CRUD
  // ============================================

  /**
   * Create a new assessment
   */
  create: protectedProcedure
    .input(CreateAssessmentInput)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;

      // Validate permission to create assessments
      const globalRoles: UserRole[] = [
        "SUPER_ADMIN",
        "SYSTEM_ADMIN",
        "PROGRAMME_COORDINATOR",
        "STEERING_COMMITTEE",
      ];
      const orgRoles: UserRole[] = [
        "ANSP_ADMIN",
        "SAFETY_MANAGER",
        "QUALITY_MANAGER",
      ];

      const canCreateForAnyOrg = globalRoles.includes(user.role);
      const canCreateForOwnOrg = orgRoles.includes(user.role);

      if (!canCreateForAnyOrg && !canCreateForOwnOrg) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to create assessments",
        });
      }

      // Org-level users can only create for their own organization
      if (!canCreateForAnyOrg && user.organizationId !== input.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only create assessments for your own organization",
        });
      }

      // Verify the organization exists and is active
      const targetOrg = await prisma.organization.findUnique({
        where: { id: input.organizationId },
        select: { id: true, nameEn: true, nameFr: true, organizationCode: true, membershipStatus: true },
      });

      if (!targetOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      if (targetOrg.membershipStatus !== "ACTIVE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot create assessment for inactive organization",
        });
      }

      const targetOrganizationId = input.organizationId;

      // Resolve questionnaire - either by ID or by type
      let questionnaire;
      if (input.questionnaireId) {
        questionnaire = await prisma.questionnaire.findUnique({
          where: { id: input.questionnaireId },
          include: {
            _count: { select: { questions: true } },
          },
        });
      } else if (input.questionnaireType) {
        // Find the active questionnaire of this type
        questionnaire = await prisma.questionnaire.findFirst({
          where: {
            type: input.questionnaireType,
            isActive: true,
          },
          orderBy: { version: "desc" },
          include: {
            _count: { select: { questions: true } },
          },
        });
      }

      if (!questionnaire) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: input.questionnaireType
            ? `No active questionnaire found for type ${input.questionnaireType}`
            : "Questionnaire not found",
        });
      }

      if (!questionnaire.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot create assessment for inactive questionnaire",
        });
      }

      // Check for existing active assessment of same type
      const existingAssessment = await prisma.assessment.findFirst({
        where: {
          organizationId: targetOrganizationId,
          questionnaireId: questionnaire.id,
          type: input.assessmentType,
          status: { notIn: ["COMPLETED", "ARCHIVED"] },
        },
      });

      if (existingAssessment) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `An active ${input.assessmentType.toLowerCase().replace("_", " ")} already exists for this questionnaire. Please complete or archive it before creating a new one.`,
        });
      }

      // Build question filter based on selectedAuditAreas
      const questionFilter: Prisma.QuestionWhereInput = {
        questionnaireId: questionnaire.id,
      };
      if (input.selectedAuditAreas && input.selectedAuditAreas.length > 0) {
        if (questionnaire.type === "ANS_USOAP_CMA") {
          questionFilter.auditArea = { in: input.selectedAuditAreas };
        }
        // Note: For SMS assessments, selectedAuditAreas is not applicable
      }

      // Determine assessment type code
      const assessmentTypeCode = getAssessmentTypeCode(questionnaire.type);

      // Generate unique reference number
      const orgCode = targetOrg.organizationCode || targetOrg.nameEn.substring(0, 6);
      const referenceNumber = await generateAssessmentReferenceNumber({
        organizationCode: orgCode,
        assessmentType: assessmentTypeCode,
      });

      // Generate title (use user-provided title or generate one)
      const title = input.title || generateAssessmentTitle(assessmentTypeCode, referenceNumber);

      // Create assessment with empty responses for all questions
      // Use extended timeout for bulk response creation (150+ responses possible)
      const assessment = await prisma.$transaction(
        async (tx) => {
          // Store selectedAuditAreas from input (only applicable for ANS assessments)
          const selectedAuditAreas =
            questionnaire.type === "ANS_USOAP_CMA"
              ? input.selectedAuditAreas
              : [];

          const newAssessment = await tx.assessment.create({
            data: {
              referenceNumber,
              type: input.assessmentType,
              title,
              description: input.description,
              dueDate: input.dueDate,
              questionnaireId: questionnaire.id,
              organizationId: targetOrganizationId,
              status: "DRAFT",
              progress: 0,
              selectedAuditAreas,
            },
            include: {
              questionnaire: true,
              organization: true,
            },
          });

          console.log("[Assessment Create]", {
            id: newAssessment.id,
            title: newAssessment.title,
            selectedAuditAreas: newAssessment.selectedAuditAreas,
          });

          // Get questions for this questionnaire (filtered by scope if provided)
          const questions = await tx.question.findMany({
            where: questionFilter,
            select: { id: true },
          });

          // Bulk create empty responses using createMany (fast!)
          if (questions.length > 0) {
            await tx.assessmentResponse.createMany({
              data: questions.map((q) => ({
                assessmentId: newAssessment.id,
                questionId: q.id,
              })),
              skipDuplicates: true,
            });

            console.log(
              `[Assessment Create] Created ${questions.length} response records`
            );
          }

          return newAssessment;
        },
        {
          timeout: 30000, // 30 seconds for bulk operations
          maxWait: 10000, // Max 10s wait to acquire connection
        }
      );

      // Log audit entry
      await logAuditEntry(user.id, AuditAction.CREATE, "Assessment", assessment.id, {
        referenceNumber,
        type: input.assessmentType,
        title,
        questionnaireId: questionnaire.id,
        questionnaireType: questionnaire.type,
        organizationId: user.organizationId,
        selectedAuditAreas: input.selectedAuditAreas,
      });

      console.log(
        `[Assessment] User ${user.id} created assessment ${assessment.id} for org ${user.organizationId}`
      );

      return assessment;
    }),

  /**
   * Get assessment by ID with full details
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.id,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        false
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || "Assessment not found",
        });
      }

      // Get full assessment with responses
      const fullAssessment = await prisma.assessment.findUnique({
        where: { id: input.id },
        include: {
          organization: {
            select: { id: true, nameEn: true, nameFr: true, organizationCode: true },
          },
          questionnaire: {
            select: {
              id: true,
              code: true,
              type: true,
              titleEn: true,
              titleFr: true,
              version: true,
            },
          },
          responses: {
            include: {
              question: {
                include: {
                  category: true,
                  icaoReferences: true,
                },
              },
              respondedBy: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
            orderBy: { question: { sortOrder: "asc" } },
          },
          _count: {
            select: { responses: true },
          },
        },
      });

      if (!fullAssessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }

      // Get filtered question counts based on selected audit areas
      const questionsWhere = getQuestionsWhereClause(
        fullAssessment.questionnaireId,
        fullAssessment.selectedAuditAreas
      );

      const totalQuestions = await prisma.question.count({
        where: questionsWhere,
      });

      // Get IDs of questions in selected audit areas
      const requiredQuestions = await prisma.question.findMany({
        where: questionsWhere,
        select: { id: true },
      });
      const requiredQuestionIdSet = new Set(requiredQuestions.map((q) => q.id));

      // Count answered questions in selected audit areas only
      const answeredQuestions = fullAssessment.responses.filter((r) => {
        // Only count responses for questions in the selected scope
        if (!requiredQuestionIdSet.has(r.questionId)) return false;

        if (fullAssessment.questionnaire.type === "ANS_USOAP_CMA") {
          return isANSResponseAnswered(r.responseValue);
        }
        return isSMSResponseAnswered(r.maturityLevel);
      }).length;

      // Calculate correct progress
      const progress = totalQuestions > 0
        ? Math.round((answeredQuestions / totalQuestions) * 100)
        : 0;

      return {
        ...fullAssessment,
        calculatedProgress: progress,
        totalQuestions,
        answeredQuestions,
      };
    }),

  /**
   * Get accurate response count for an assessment (used before submission)
   */
  getResponseCount: protectedProcedure
    .input(z.object({ assessmentId: z.string().cuid() }))
    .query(async ({ input }) => {
      const { assessmentId } = input;

      // Get assessment with selectedAuditAreas
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          questionnaire: true,
        },
      });

      if (!assessment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
      }

      // Build question filter using helper function
      const questionsWhere = getQuestionsWhereClause(
        assessment.questionnaireId,
        assessment.selectedAuditAreas
      );

      // Get questions filtered by selectedAuditAreas
      const questions = await prisma.question.findMany({
        where: questionsWhere,
        select: { id: true },
      });

      // Get all responses for this assessment
      const responses = await prisma.assessmentResponse.findMany({
        where: { assessmentId },
        select: { questionId: true, responseValue: true, maturityLevel: true },
      });

      const questionnaireType = assessment.questionnaire.type;
      const totalQuestions = questions.length;

      // Build set of valid question IDs (only those in selectedAuditAreas scope)
      const validQuestionIds = new Set(questions.map((q) => q.id));

      // Count only properly answered questions that are in scope
      const answeredQuestionIds = new Set(
        responses
          .filter((r) => {
            // Only count responses for questions in the selected scope
            if (!validQuestionIds.has(r.questionId)) return false;

            if (questionnaireType === "ANS_USOAP_CMA") {
              return isANSResponseAnswered(r.responseValue);
            }
            return isSMSResponseAnswered(r.maturityLevel);
          })
          .map((r) => r.questionId)
      );

      const answeredCount = answeredQuestionIds.size;
      const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

      return {
        totalQuestions,
        answeredCount,
        progress,
        isComplete: answeredCount >= totalQuestions,
      };
    }),

  /**
   * List assessments with filters
   */
  list: protectedProcedure
    .input(AssessmentFilterInput)
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      const { page, limit, sortBy, sortOrder, ...filters } = input;

      // Build where clause based on user role
      const where: Prisma.AssessmentWhereInput = {};

      // Apply organization filter based on role
      if (["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(user.role)) {
        // Admin can see all - apply optional filter
        if (filters.organizationId) {
          where.organizationId = filters.organizationId;
        }
      } else if (["STEERING_COMMITTEE"].includes(user.role)) {
        // Can only see completed assessments
        where.status = "COMPLETED";
        if (filters.organizationId) {
          where.organizationId = filters.organizationId;
        }
      } else if (["PEER_REVIEWER", "LEAD_REVIEWER"].includes(user.role)) {
        // Can see submitted+ assessments
        where.status = { in: ["SUBMITTED", "UNDER_REVIEW", "COMPLETED"] };
        if (filters.organizationId) {
          where.organizationId = filters.organizationId;
        }
      } else {
        // Regular users can only see their organization's assessments
        if (!user.organizationId) {
          return { assessments: [], total: 0, page, limit, totalPages: 0 };
        }
        where.organizationId = user.organizationId;
      }

      // Apply other filters
      if (filters.questionnaireId) {
        where.questionnaireId = filters.questionnaireId;
      }
      if (filters.type) {
        where.type = filters.type;
      }
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          where.status = { in: filters.status };
        } else {
          where.status = filters.status;
        }
      }
      if (filters.questionnaireType) {
        where.questionnaire = { type: filters.questionnaireType };
      }

      // Get total count
      const total = await prisma.assessment.count({ where });

      // Get paginated assessments with responses for progress calculation
      const assessments = await prisma.assessment.findMany({
        where,
        include: {
          organization: {
            select: { id: true, nameEn: true, nameFr: true, organizationCode: true },
          },
          questionnaire: {
            select: {
              id: true,
              code: true,
              type: true,
              titleEn: true,
              titleFr: true,
            },
          },
          responses: {
            select: {
              questionId: true,
              responseValue: true,
              maturityLevel: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      });

      // Calculate progress dynamically for each assessment
      const assessmentsWithProgress = await Promise.all(
        assessments.map(async (assessment) => {
          const selectedAuditAreas = assessment.selectedAuditAreas as USOAPAuditArea[] | null;
          const questionnaireType = assessment.questionnaire.type;

          // Build question filter respecting selectedAuditAreas
          const questionsWhere = getQuestionsWhereClause(
            assessment.questionnaireId,
            selectedAuditAreas
          );

          // Get total questions for this assessment's scope
          const totalQuestions = await prisma.question.count({
            where: questionsWhere,
          });

          // Get IDs of questions in scope
          const questionsInScope = await prisma.question.findMany({
            where: questionsWhere,
            select: { id: true },
          });
          const questionIdSet = new Set(questionsInScope.map((q) => q.id));

          // Count answered responses (only those in scope)
          const answeredQuestions = assessment.responses.filter((r) => {
            if (!questionIdSet.has(r.questionId)) return false;
            if (questionnaireType === "ANS_USOAP_CMA") {
              return isANSResponseAnswered(r.responseValue);
            }
            return isSMSResponseAnswered(r.maturityLevel);
          }).length;

          // Calculate progress
          const calculatedProgress = totalQuestions > 0
            ? Math.round((answeredQuestions / totalQuestions) * 100)
            : 0;

          // Return assessment with calculated progress (omit raw responses to reduce payload)
          return {
            id: assessment.id,
            referenceNumber: assessment.referenceNumber,
            title: assessment.title,
            type: assessment.type,
            status: assessment.status,
            progress: calculatedProgress,
            answeredQuestions,
            totalQuestions,
            overallScore: assessment.overallScore,
            eiScore: assessment.eiScore,
            maturityLevel: assessment.maturityLevel,
            startedAt: assessment.startedAt,
            submittedAt: assessment.submittedAt,
            completedAt: assessment.completedAt,
            dueDate: assessment.dueDate,
            createdAt: assessment.createdAt,
            updatedAt: assessment.updatedAt,
            organization: assessment.organization,
            questionnaire: assessment.questionnaire,
          };
        })
      );

      return {
        assessments: assessmentsWithProgress,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * List assessments by organization for review scheduling
   * Used by coordinators when creating a new review
   */
  listByOrganization: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
        status: z.nativeEnum(AssessmentStatus).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.user;

      // Only coordinators and admins can fetch assessments for any organization
      if (
        ![
          "SUPER_ADMIN",
          "SYSTEM_ADMIN",
          "PROGRAMME_COORDINATOR",
          "STEERING_COMMITTEE",
        ].includes(user.role)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view these assessments",
        });
      }

      const where: Prisma.AssessmentWhereInput = {
        organizationId: input.organizationId,
      };

      if (input.status) {
        where.status = input.status;
      }

      return prisma.assessment.findMany({
        where,
        select: {
          id: true,
          status: true,
          type: true,
          eiScore: true,
          submittedAt: true,
          questionnaire: {
            select: {
              id: true,
              code: true,
              type: true,
              titleEn: true,
              titleFr: true,
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      });
    }),

  /**
   * Get assessments for current user's organization
   */
  getMyAssessments: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(AssessmentStatus).optional(),
        questionnaireType: z.nativeEnum(QuestionnaireType).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.user;

      if (!user.organizationId) {
        return [];
      }

      const where: Prisma.AssessmentWhereInput = {
        organizationId: user.organizationId,
      };

      if (input.status) {
        where.status = input.status;
      }
      if (input.questionnaireType) {
        where.questionnaire = { type: input.questionnaireType };
      }

      return prisma.assessment.findMany({
        where,
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
          _count: {
            select: { responses: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      });
    }),

  /**
   * Delete assessment (permanently removes DRAFT/IN_PROGRESS assessments)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.id,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        true
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || "Assessment not found",
        });
      }

      // Only DRAFT assessments can be deleted
      if (assessment.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft assessments can be deleted. Use archive for submitted assessments.",
        });
      }

      // Check if user is the creator by looking at the first event
      const firstEvent = await prisma.assessmentEvent.findFirst({
        where: { assessmentId: input.id, type: "CREATED" },
        select: { userId: true },
      });
      const isOwner = firstEvent?.userId === ctx.user.id;

      // Check RBAC permissions based on role
      const canDelete = canDeleteAssessment(
        ctx.user.role,
        assessment.status,
        isOwner,
        assessment.organizationId === ctx.user.organizationId
      );

      if (!canDelete) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this assessment",
        });
      }

      // Delete in transaction: first responses, then events, then assessment
      await prisma.$transaction(async (tx) => {
        // Delete all responses
        await tx.assessmentResponse.deleteMany({
          where: { assessmentId: input.id },
        });

        // Delete all events
        await tx.assessmentEvent.deleteMany({
          where: { assessmentId: input.id },
        });

        // Delete the assessment
        await tx.assessment.delete({
          where: { id: input.id },
        });
      });

      await logAuditEntry(ctx.user.id, AuditAction.DELETE, "Assessment", input.id, {
        previousStatus: assessment.status,
        title: assessment.title,
      });

      console.log(
        `[Assessment] User ${ctx.user.id} permanently deleted assessment ${input.id}`
      );

      return { success: true, message: "Assessment deleted successfully" };
    }),

  /**
   * Archive assessment (soft delete for SUBMITTED/COMPLETED assessments)
   */
  archive: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.id,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        true
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || "Assessment not found",
        });
      }

      // Only SUBMITTED, UNDER_REVIEW, and COMPLETED assessments can be archived
      if (!["SUBMITTED", "UNDER_REVIEW", "COMPLETED"].includes(assessment.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only submitted, under review, or completed assessments can be archived. Use delete for draft assessments.",
        });
      }

      // Check RBAC permissions
      const canArchive = canArchiveAssessment(
        ctx.user.role,
        assessment.status,
        assessment.organizationId === ctx.user.organizationId
      );

      if (!canArchive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to archive this assessment",
        });
      }

      const archived = await prisma.assessment.update({
        where: { id: input.id },
        data: { status: "ARCHIVED" },
      });

      await logAuditEntry(ctx.user.id, AuditAction.STATUS_CHANGE, "Assessment", input.id, {
        previousStatus: assessment.status,
      });

      console.log(
        `[Assessment] User ${ctx.user.id} archived assessment ${input.id}`
      );

      return archived;
    }),

  // ============================================
  // STATUS TRANSITIONS
  // ============================================

  /**
   * Start assessment (set startedAt timestamp)
   */
  start: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.id,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        true
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || "Assessment not found",
        });
      }

      if (assessment.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Assessment has already been started",
        });
      }

      const updated = await prisma.assessment.update({
        where: { id: input.id },
        data: {
          startedAt: new Date(),
        },
        include: {
          questionnaire: true,
          organization: true,
        },
      });

      await logAuditEntry(ctx.user.id, AuditAction.STATUS_CHANGE, "Assessment", input.id, {
        startedAt: updated.startedAt?.toISOString(),
      });

      console.log(
        `[Assessment] User ${ctx.user.id} started assessment ${input.id}`
      );

      return updated;
    }),

  /**
   * Submit assessment for review (DRAFT -> SUBMITTED)
   */
  submit: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        submissionNotes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.id,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        true
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || "Assessment not found",
        });
      }

      if (!STATUS_TRANSITIONS[assessment.status].includes("SUBMITTED")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot submit assessment with status "${assessment.status}"`,
        });
      }

      // Get the assessment with selectedAuditAreas
      const fullAssessment = await prisma.assessment.findUnique({
        where: { id: input.id },
        select: { selectedAuditAreas: true },
      });

      // Build where clause filtered by selected audit areas using helper function
      const questionsWhere = getQuestionsWhereClause(
        assessment.questionnaireId,
        fullAssessment?.selectedAuditAreas ?? null
      );

      // Count total questions for selected audit areas only
      const totalQuestions = await prisma.question.count({
        where: questionsWhere,
      });

      // Get IDs of questions that should be answered
      const requiredQuestions = await prisma.question.findMany({
        where: questionsWhere,
        select: { id: true, pqNumber: true },
      });
      const requiredQuestionIdSet = new Set(requiredQuestions.map((q) => q.id));

      // Get all responses with questions
      const responses = await prisma.assessmentResponse.findMany({
        where: { assessmentId: input.id },
        include: {
          question: true,
        },
      });

      const questionnaireType = assessment.questionnaire.type;

      // Count answered questions (only those in selected audit areas)
      const answeredQuestions = responses.filter((r) => {
        // Only count responses for questions in the selected scope
        if (!requiredQuestionIdSet.has(r.questionId)) return false;

        if (questionnaireType === "ANS_USOAP_CMA") {
          return isANSResponseAnswered(r.responseValue);
        }
        return isSMSResponseAnswered(r.maturityLevel);
      }).length;

      // Find unanswered questions for error message
      const answeredQuestionIds = new Set(
        responses
          .filter((r) => {
            if (questionnaireType === "ANS_USOAP_CMA") {
              return isANSResponseAnswered(r.responseValue);
            }
            return isSMSResponseAnswered(r.maturityLevel);
          })
          .map((r) => r.questionId)
      );

      const unansweredQuestions = requiredQuestions.filter(
        (q) => !answeredQuestionIds.has(q.id)
      );

      const unansweredCount = totalQuestions - answeredQuestions;

      // Log for debugging
      console.log(`[Assessment Submit] Assessment ${input.id}:`, {
        selectedAuditAreas: fullAssessment?.selectedAuditAreas || [],
        totalQuestions,
        answeredCount: answeredQuestions,
        unansweredCount,
        unansweredPQs: unansweredQuestions.slice(0, 10).map((q) => q.pqNumber || q.id.slice(0, 8)),
      });

      // Validate all required questions are answered
      if (answeredQuestions < totalQuestions) {
        const percentage = Math.round((answeredQuestions / totalQuestions) * 100);
        const unansweredPQs = unansweredQuestions
          .map((q) => q.pqNumber)
          .filter(Boolean)
          .slice(0, 5);
        const moreCount = unansweredCount - unansweredPQs.length;

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Assessment cannot be submitted:\nOnly ${answeredQuestions} of ${totalQuestions} questions answered (${percentage}%).\nUnanswered questions: ${unansweredPQs.join(", ")}${moreCount > 0 ? ` and ${moreCount} more...` : ""}`,
        });
      }

      // Transform for validation
      const responsesForValidation = responses.map((r) => ({
        id: r.id,
        assessmentId: r.assessmentId,
        questionId: r.questionId,
        responseValue: r.responseValue as "SATISFACTORY" | "NOT_SATISFACTORY" | "NOT_APPLICABLE" | "NOT_REVIEWED" | null,
        maturityLevel: r.maturityLevel
          ? (MATURITY_LEVEL_REVERSE[r.maturityLevel] as "A" | "B" | "C" | "D" | "E")
          : null,
        score: r.score ?? undefined,
        evidenceDescription: r.notes ?? undefined,
        evidenceUrls: r.evidenceUrls,
        respondedById: r.respondedById ?? "",
        respondedAt: r.respondedAt ?? new Date(),
        lastModifiedAt: r.updatedAt,
        isComplete: false,
        needsReview: false,
      }));

      // Validate submission requirements
      const validation = validateAssessmentForSubmission(
        responsesForValidation,
        totalQuestions,
        questionnaireType
      );

      if (!validation.isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Assessment cannot be submitted:\n${validation.errors.join("\n")}`,
        });
      }

      // Calculate scores
      const responsesForScoring = transformResponsesForScoring(
        responses.map((r) => ({
          ...r,
          question: {
            id: r.question.id,
            pqNumber: r.question.pqNumber,
            questionTextEn: r.question.questionTextEn,
            questionTextFr: r.question.questionTextFr,
            auditArea: r.question.auditArea,
            criticalElement: r.question.criticalElement,
            smsComponent: r.question.smsComponent,
            studyArea: r.question.studyArea,
            isPriorityPQ: r.question.isPriorityPQ,
            requiresOnSite: r.question.requiresOnSite,
            weight: r.question.weight,
          },
        }))
      );

      let overallScore: number | undefined;
      let eiScore: number | undefined;
      let maturityLevel: MaturityLevel | undefined;
      let categoryScores: Record<string, number> = {};

      if (questionnaireType === "ANS_USOAP_CMA") {
        const eiResult = calculateEIScore(responsesForScoring);
        eiScore = eiResult.overallEI;
        overallScore = eiScore;
        categoryScores = calculateCategoryScores(responsesForScoring, questionnaireType);
      } else {
        const smsResult = calculateSMSMaturity(responsesForScoring);
        if (smsResult.overallLevel) {
          maturityLevel = MATURITY_LEVEL_MAP[smsResult.overallLevel];
        }
        overallScore = smsResult.overallPercentage;
        categoryScores = calculateCategoryScores(responsesForScoring, questionnaireType);
      }

      // Update assessment with scores and status
      const updated = await prisma.assessment.update({
        where: { id: input.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          progress: 100,
          overallScore,
          eiScore,
          maturityLevel,
          categoryScores,
        },
        include: {
          organization: true,
          questionnaire: true,
        },
      });

      await logAuditEntry(ctx.user.id, AuditAction.SUBMISSION, "Assessment", input.id, {
        overallScore,
        eiScore,
        maturityLevel,
        submissionNotes: input.submissionNotes,
      });

      console.log(
        `[Assessment] User ${ctx.user.id} submitted assessment ${input.id} with score ${overallScore}`
      );

      return {
        assessment: updated,
        warnings: validation.warnings,
      };
    }),

  /**
   * Start review (SUBMITTED -> UNDER_REVIEW)
   */
  startReview: roleProcedure(
    "SUPER_ADMIN",
    "SYSTEM_ADMIN",
    "PROGRAMME_COORDINATOR",
    "LEAD_REVIEWER",
    "PEER_REVIEWER"
  )
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const assessment = await prisma.assessment.findUnique({
        where: { id: input.id },
      });

      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }

      if (!STATUS_TRANSITIONS[assessment.status].includes("UNDER_REVIEW")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot start review for assessment with status "${assessment.status}"`,
        });
      }

      const updated = await prisma.assessment.update({
        where: { id: input.id },
        data: { status: "UNDER_REVIEW" },
      });

      await logAuditEntry(ctx.user.id, AuditAction.STATUS_CHANGE, "Assessment", input.id);

      return updated;
    }),

  /**
   * Complete assessment (UNDER_REVIEW -> COMPLETED)
   */
  complete: roleProcedure(
    "SUPER_ADMIN",
    "SYSTEM_ADMIN",
    "PROGRAMME_COORDINATOR",
    "LEAD_REVIEWER"
  )
    .input(
      z.object({
        id: z.string().cuid(),
        completionNotes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assessment = await prisma.assessment.findUnique({
        where: { id: input.id },
        include: { questionnaire: true, organization: true },
      });

      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }

      if (!STATUS_TRANSITIONS[assessment.status].includes("COMPLETED")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot complete assessment with status "${assessment.status}". It must be under review first.`,
        });
      }

      const updated = await prisma.assessment.update({
        where: { id: input.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
        include: {
          organization: true,
          questionnaire: true,
        },
      });

      await logAuditEntry(ctx.user.id, AuditAction.STATUS_CHANGE, "Assessment", input.id, {
        completionNotes: input.completionNotes,
      });

      console.log(
        `[Assessment] User ${ctx.user.id} completed assessment ${input.id}`
      );

      return updated;
    }),

  /**
   * Reopen assessment (SUBMITTED -> DRAFT)
   */
  reopen: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        reason: z.string().min(10).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.id,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        true
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || "Assessment not found",
        });
      }

      if (!STATUS_TRANSITIONS[assessment.status].includes("DRAFT")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot reopen assessment with status "${assessment.status}"`,
        });
      }

      const updated = await prisma.assessment.update({
        where: { id: input.id },
        data: {
          status: "DRAFT",
          submittedAt: null,
        },
        include: {
          organization: true,
          questionnaire: true,
        },
      });

      await logAuditEntry(ctx.user.id, AuditAction.STATUS_CHANGE, "Assessment", input.id, {
        reason: input.reason,
        previousStatus: assessment.status,
      });

      console.log(
        `[Assessment] User ${ctx.user.id} reopened assessment ${input.id}: ${input.reason}`
      );

      return updated;
    }),

  // ============================================
  // RESPONSES
  // ============================================

  /**
   * Save single response
   */
  saveResponse: protectedProcedure
    .input(SaveResponseInput)
    .mutation(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        true
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || "Assessment not found",
        });
      }

      // Can only edit DRAFT assessments
      if (assessment.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Assessment is not editable. Only draft assessments can be modified.",
        });
      }

      // Verify question belongs to this questionnaire
      const question = await prisma.question.findFirst({
        where: {
          id: input.questionId,
          questionnaireId: assessment.questionnaireId,
        },
      });

      if (!question) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question not found in this questionnaire",
        });
      }

      // Build update data based on questionnaire type
      const updateData: Prisma.AssessmentResponseUpdateInput = {
        respondedBy: { connect: { id: ctx.user.id } },
        respondedAt: new Date(),
      };

      if (assessment.questionnaire.type === "ANS_USOAP_CMA") {
        updateData.responseValue = input.responseValue;
        updateData.maturityLevel = null;
      } else {
        updateData.maturityLevel = input.maturityLevel
          ? MATURITY_LEVEL_MAP[input.maturityLevel]
          : null;
        updateData.responseValue = null;

        // Calculate score for maturity level
        if (input.maturityLevel) {
          updateData.score = maturityLevelToScore(input.maturityLevel);
        }
      }

      if (input.notes !== undefined) {
        updateData.notes = input.notes;
      }
      if (input.evidenceUrls !== undefined) {
        updateData.evidenceUrls = input.evidenceUrls;
      }

      // Debug: Log save attempt
      console.log("[SAVE_RESPONSE] Saving:", {
        assessmentId: input.assessmentId,
        questionId: input.questionId,
        responseValue: input.responseValue,
        maturityLevel: input.maturityLevel,
      });

      // Upsert response
      const response = await prisma.assessmentResponse.upsert({
        where: {
          assessmentId_questionId: {
            assessmentId: input.assessmentId,
            questionId: input.questionId,
          },
        },
        update: updateData,
        create: {
          assessment: { connect: { id: input.assessmentId } },
          question: { connect: { id: input.questionId } },
          responseValue: assessment.questionnaire.type === "ANS_USOAP_CMA" ? input.responseValue : null,
          maturityLevel: assessment.questionnaire.type === "SMS_CANSO_SOE" && input.maturityLevel
            ? MATURITY_LEVEL_MAP[input.maturityLevel]
            : null,
          score: input.maturityLevel ? maturityLevelToScore(input.maturityLevel) : null,
          notes: input.notes,
          evidenceUrls: input.evidenceUrls || [],
          respondedBy: { connect: { id: ctx.user.id } },
          respondedAt: new Date(),
        },
        include: {
          question: {
            include: { category: true },
          },
        },
      });

      // Debug: Log save success
      console.log("[SAVE_RESPONSE] Saved successfully:", {
        responseId: response.id,
        savedValue: response.responseValue,
      });

      // Get assessment's selectedAuditAreas for progress calculation
      const assessmentWithAreas = await prisma.assessment.findUnique({
        where: { id: input.assessmentId },
        select: { selectedAuditAreas: true },
      });

      // Calculate progress based on selected audit areas
      const questionsWhere = getQuestionsWhereClause(
        assessment.questionnaireId,
        assessmentWithAreas?.selectedAuditAreas ?? null
      );

      const totalQuestions = await prisma.question.count({
        where: questionsWhere,
      });

      // Get IDs of questions in selected audit areas
      const requiredQuestions = await prisma.question.findMany({
        where: questionsWhere,
        select: { id: true },
      });
      const requiredQuestionIdSet = new Set(requiredQuestions.map((q) => q.id));

      // Get all responses for this assessment
      const allResponses = await prisma.assessmentResponse.findMany({
        where: { assessmentId: input.assessmentId },
      });

      // Count answered questions (only those in selected audit areas)
      const answeredQuestions = allResponses.filter((r) => {
        // Only count responses for questions in the selected scope
        if (!requiredQuestionIdSet.has(r.questionId)) return false;

        if (assessment.questionnaire.type === "ANS_USOAP_CMA") {
          return isANSResponseAnswered(r.responseValue);
        }
        return isSMSResponseAnswered(r.maturityLevel);
      }).length;

      const progress = totalQuestions > 0
        ? Math.round((answeredQuestions / totalQuestions) * 100)
        : 0;

      await prisma.assessment.update({
        where: { id: input.assessmentId },
        data: { progress },
      });

      // Debug: Log progress update
      console.log("[SAVE_RESPONSE] Progress:", {
        totalQuestions,
        answeredQuestions,
        progress,
        selectedAreas: assessmentWithAreas?.selectedAuditAreas || [],
      });

      return {
        response,
        progress,
        answeredQuestions,
        totalQuestions,
      };
    }),

  /**
   * Save multiple responses (bulk update)
   */
  saveResponses: protectedProcedure
    .input(BulkSaveResponsesInput)
    .mutation(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        true
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || "Assessment not found",
        });
      }

      if (assessment.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Assessment is not editable",
        });
      }

      const questionnaireType = assessment.questionnaire.type;

      // Process all responses in a transaction
      const results = await prisma.$transaction(async (tx) => {
        const updatedResponses = [];

        for (const response of input.responses) {
          const updateData: Prisma.AssessmentResponseUpdateInput = {
            respondedBy: { connect: { id: ctx.user.id } },
            respondedAt: new Date(),
          };

          if (questionnaireType === "ANS_USOAP_CMA") {
            updateData.responseValue = response.responseValue;
          } else {
            updateData.maturityLevel = response.maturityLevel
              ? MATURITY_LEVEL_MAP[response.maturityLevel]
              : null;
            if (response.maturityLevel) {
              updateData.score = maturityLevelToScore(response.maturityLevel);
            }
          }

          if (response.notes !== undefined) {
            updateData.notes = response.notes;
          }

          const updated = await tx.assessmentResponse.upsert({
            where: {
              assessmentId_questionId: {
                assessmentId: input.assessmentId,
                questionId: response.questionId,
              },
            },
            update: updateData,
            create: {
              assessment: { connect: { id: input.assessmentId } },
              question: { connect: { id: response.questionId } },
              responseValue: questionnaireType === "ANS_USOAP_CMA" ? response.responseValue : null,
              maturityLevel: questionnaireType === "SMS_CANSO_SOE" && response.maturityLevel
                ? MATURITY_LEVEL_MAP[response.maturityLevel]
                : null,
              score: response.maturityLevel ? maturityLevelToScore(response.maturityLevel) : null,
              notes: response.notes,
              respondedBy: { connect: { id: ctx.user.id } },
              respondedAt: new Date(),
            },
          });

          updatedResponses.push(updated);
        }

        return updatedResponses;
      });

      // Get assessment's selectedAuditAreas for progress calculation
      const assessmentWithAreas = await prisma.assessment.findUnique({
        where: { id: input.assessmentId },
        select: { selectedAuditAreas: true },
      });

      // Calculate progress based on selected audit areas
      const questionsWhere = getQuestionsWhereClause(
        assessment.questionnaireId,
        assessmentWithAreas?.selectedAuditAreas ?? null
      );

      const totalQuestions = await prisma.question.count({
        where: questionsWhere,
      });

      // Get IDs of questions in selected audit areas
      const requiredQuestions = await prisma.question.findMany({
        where: questionsWhere,
        select: { id: true },
      });
      const requiredQuestionIdSet = new Set(requiredQuestions.map((q) => q.id));

      // Get all responses for this assessment
      const allResponses = await prisma.assessmentResponse.findMany({
        where: { assessmentId: input.assessmentId },
      });

      // Count answered questions (only those in selected audit areas)
      const answeredQuestions = allResponses.filter((r) => {
        // Only count responses for questions in the selected scope
        if (!requiredQuestionIdSet.has(r.questionId)) return false;

        if (questionnaireType === "ANS_USOAP_CMA") {
          return isANSResponseAnswered(r.responseValue);
        }
        return isSMSResponseAnswered(r.maturityLevel);
      }).length;

      const progress = totalQuestions > 0
        ? Math.round((answeredQuestions / totalQuestions) * 100)
        : 0;

      await prisma.assessment.update({
        where: { id: input.assessmentId },
        data: { progress },
      });

      await logAuditEntry(ctx.user.id, AuditAction.UPDATE, "Assessment", input.assessmentId, {
        responseCount: results.length,
      });

      return {
        updatedCount: results.length,
        progress,
        answeredQuestions,
        totalQuestions,
      };
    }),

  /**
   * Get responses for assessment
   */
  getResponses: protectedProcedure
    .input(GetResponsesInput)
    .query(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        false
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || "Assessment not found",
        });
      }

      // Get assessment's selectedAuditAreas
      const assessmentWithAreas = await prisma.assessment.findUnique({
        where: { id: input.assessmentId },
        select: { selectedAuditAreas: true },
      });

      // Build filter
      const where: Prisma.AssessmentResponseWhereInput = {
        assessmentId: input.assessmentId,
      };

      // Add question filters
      const questionWhere: Prisma.QuestionWhereInput = {
        isActive: true,
      };

      if (input.categoryId) {
        questionWhere.categoryId = input.categoryId;
      }

      // Apply selected audit areas filter
      const selectedAreas = assessmentWithAreas?.selectedAuditAreas;
      if (selectedAreas && selectedAreas.length > 0) {
        if (input.auditArea) {
          // Specific area requested - check if it's in selected areas
          const requestedArea = input.auditArea as USOAPAuditArea;
          if (selectedAreas.includes(requestedArea)) {
            questionWhere.auditArea = requestedArea;
          } else {
            // Requested area not in selected areas - return empty
            return {
              responses: [],
              total: 0,
              page: input.page,
              limit: input.limit,
              totalPages: 0,
            };
          }
        } else {
          // No specific area - use all selected areas
          questionWhere.auditArea = { in: selectedAreas };
        }
      } else if (input.auditArea) {
        // No areas selected (means all), specific area requested
        questionWhere.auditArea = input.auditArea as USOAPAuditArea;
      }

      if (input.criticalElement) {
        questionWhere.criticalElement = input.criticalElement as CriticalElement;
      }
      if (input.smsComponent) {
        questionWhere.smsComponent = input.smsComponent as SMSComponent;
      }
      if (input.studyArea) {
        questionWhere.studyArea = input.studyArea as CANSOStudyArea;
      }

      // Always apply question filter (at least for isActive)
      where.question = questionWhere;

      // Filter for unanswered only
      if (input.onlyUnanswered) {
        if (assessment.questionnaire.type === "ANS_USOAP_CMA") {
          where.responseValue = null;
        } else {
          where.maturityLevel = null;
        }
      }

      const total = await prisma.assessmentResponse.count({ where });

      const responses = await prisma.assessmentResponse.findMany({
        where,
        include: {
          question: {
            include: {
              category: true,
              icaoReferences: true,
            },
          },
          respondedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { question: { sortOrder: "asc" } },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      });

      return {
        responses,
        total,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  /**
   * Clear response (reset to unanswered)
   */
  clearResponse: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string().cuid(),
        questionId: z.string().cuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        true
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || "Assessment not found",
        });
      }

      if (assessment.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Assessment is not editable",
        });
      }

      const response = await prisma.assessmentResponse.update({
        where: {
          assessmentId_questionId: {
            assessmentId: input.assessmentId,
            questionId: input.questionId,
          },
        },
        data: {
          responseValue: null,
          maturityLevel: null,
          score: null,
          notes: null,
          evidenceUrls: [],
          respondedById: null,
          respondedAt: null,
        },
      });

      // Update progress - use centralized helper for consistency with UI
      const allResponses = await prisma.assessmentResponse.findMany({
        where: { assessmentId: input.assessmentId },
      });

      const totalQuestions = allResponses.length;
      const answeredQuestions = allResponses.filter((r) => {
        if (assessment.questionnaire.type === "ANS_USOAP_CMA") {
          return isANSResponseAnswered(r.responseValue);
        }
        return isSMSResponseAnswered(r.maturityLevel);
      }).length;

      const progress =
        totalQuestions > 0
          ? Math.round((answeredQuestions / totalQuestions) * 100)
          : 0;

      await prisma.assessment.update({
        where: { id: input.assessmentId },
        data: { progress },
      });

      return { response, progress };
    }),

  // ============================================
  // EVIDENCE
  // ============================================

  /**
   * Add evidence URL to response
   */
  addEvidence: protectedProcedure
    .input(AddEvidenceInput)
    .mutation(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        true
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || "Assessment not found",
        });
      }

      if (assessment.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Assessment is not editable",
        });
      }

      // Get current response
      const response = await prisma.assessmentResponse.findUnique({
        where: {
          assessmentId_questionId: {
            assessmentId: input.assessmentId,
            questionId: input.questionId,
          },
        },
      });

      if (!response) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Response not found",
        });
      }

      // Add URL to evidence array
      const updatedResponse = await prisma.assessmentResponse.update({
        where: { id: response.id },
        data: {
          evidenceUrls: {
            push: input.evidenceUrl,
          },
        },
        include: {
          question: true,
        },
      });

      await logAuditEntry(ctx.user.id, AuditAction.UPDATE, "AssessmentResponse", response.id, {
        evidenceUrl: input.evidenceUrl,
      });

      return updatedResponse;
    }),

  /**
   * Remove evidence URL from response
   */
  removeEvidence: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string().cuid(),
        questionId: z.string().cuid(),
        evidenceUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        true
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || "Assessment not found",
        });
      }

      if (assessment.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Assessment is not editable",
        });
      }

      const response = await prisma.assessmentResponse.findUnique({
        where: {
          assessmentId_questionId: {
            assessmentId: input.assessmentId,
            questionId: input.questionId,
          },
        },
      });

      if (!response) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Response not found",
        });
      }

      // Remove URL from evidence array
      const updatedUrls = response.evidenceUrls.filter(
        (url) => url !== input.evidenceUrl
      );

      const updatedResponse = await prisma.assessmentResponse.update({
        where: { id: response.id },
        data: {
          evidenceUrls: updatedUrls,
        },
      });

      await logAuditEntry(ctx.user.id, AuditAction.UPDATE, "AssessmentResponse", response.id, {
        removedUrl: input.evidenceUrl,
      });

      return updatedResponse;
    }),

  // ============================================
  // SCORING & PROGRESS
  // ============================================

  /**
   * Calculate current scores
   */
  calculateScores: protectedProcedure
    .input(z.object({ assessmentId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        false
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || "Assessment not found",
        });
      }

      // Get all responses with questions
      const responses = await prisma.assessmentResponse.findMany({
        where: { assessmentId: input.assessmentId },
        include: { question: true },
      });

      const questionnaireType = assessment.questionnaire.type;

      // Transform responses for scoring functions
      const responsesForScoring = transformResponsesForScoring(
        responses.map((r) => ({
          ...r,
          question: {
            id: r.question.id,
            pqNumber: r.question.pqNumber,
            questionTextEn: r.question.questionTextEn,
            questionTextFr: r.question.questionTextFr,
            auditArea: r.question.auditArea,
            criticalElement: r.question.criticalElement,
            smsComponent: r.question.smsComponent,
            studyArea: r.question.studyArea,
            isPriorityPQ: r.question.isPriorityPQ,
            requiresOnSite: r.question.requiresOnSite,
            weight: r.question.weight,
          },
        }))
      );

      if (questionnaireType === "ANS_USOAP_CMA") {
        const eiResult = calculateEIScore(responsesForScoring);
        const categoryScores = calculateCategoryScores(responsesForScoring, questionnaireType);

        return {
          type: "ANS" as const,
          eiScore: eiResult,
          categoryScores,
          overallScore: eiResult.overallEI,
        };
      } else {
        const smsResult = calculateSMSMaturity(responsesForScoring);
        const categoryScores = calculateCategoryScores(responsesForScoring, questionnaireType);

        return {
          type: "SMS" as const,
          smsMaturity: smsResult,
          categoryScores,
          overallScore: smsResult.overallPercentage,
          overallLevel: smsResult.overallLevel,
        };
      }
    }),

  /**
   * Get detailed progress
   */
  getProgress: protectedProcedure
    .input(z.object({ assessmentId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        false
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || "Assessment not found",
        });
      }

      // Get all responses with questions
      const responses = await prisma.assessmentResponse.findMany({
        where: { assessmentId: input.assessmentId },
        include: { question: true },
      });

      const questionnaireType = assessment.questionnaire.type;
      const totalQuestions = responses.length;

      // Transform for progress calculation
      const responsesForProgress = transformResponsesForScoring(
        responses.map((r) => ({
          ...r,
          question: {
            id: r.question.id,
            pqNumber: r.question.pqNumber,
            questionTextEn: r.question.questionTextEn,
            questionTextFr: r.question.questionTextFr,
            auditArea: r.question.auditArea,
            criticalElement: r.question.criticalElement,
            smsComponent: r.question.smsComponent,
            studyArea: r.question.studyArea,
            isPriorityPQ: r.question.isPriorityPQ,
            requiresOnSite: r.question.requiresOnSite,
            weight: r.question.weight,
          },
        }))
      );

      const progress = calculateProgress(
        responsesForProgress,
        totalQuestions,
        questionnaireType
      );

      return progress;
    }),

  /**
   * Get assessment summary for dashboard
   */
  getSummary: protectedProcedure
    .input(z.object({ assessmentId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        false
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || "Assessment not found",
        });
      }

      // Get response counts by status
      const responses = await prisma.assessmentResponse.findMany({
        where: { assessmentId: input.assessmentId },
        include: { question: true },
      });

      const questionnaireType = assessment.questionnaire.type;
      const totalQuestions = responses.length;

      let answeredCount = 0;
      let satisfactoryCount = 0;
      let notSatisfactoryCount = 0;
      let notApplicableCount = 0;
      let withEvidenceCount = 0;

      const maturityCounts: Record<string, number> = {
        A: 0, B: 0, C: 0, D: 0, E: 0,
      };

      for (const r of responses) {
        const hasEvidence = r.evidenceUrls.length > 0 || (r.notes?.length ?? 0) > 0;
        if (hasEvidence) withEvidenceCount++;

        if (questionnaireType === "ANS_USOAP_CMA") {
          // Use centralized helper for consistency with UI and submit validation
          if (isANSResponseAnswered(r.responseValue)) {
            answeredCount++;
            switch (r.responseValue) {
              case "SATISFACTORY":
                satisfactoryCount++;
                break;
              case "NOT_SATISFACTORY":
                notSatisfactoryCount++;
                break;
              case "NOT_APPLICABLE":
                notApplicableCount++;
                break;
            }
          }
        } else {
          // Use centralized helper for consistency with UI and submit validation
          if (isSMSResponseAnswered(r.maturityLevel ? MATURITY_LEVEL_REVERSE[r.maturityLevel] : null)) {
            answeredCount++;
            const level = MATURITY_LEVEL_REVERSE[r.maturityLevel!];
            maturityCounts[level]++;
          }
        }
      }

      // Calculate key metrics
      const progressPercent = totalQuestions > 0
        ? Math.round((answeredCount / totalQuestions) * 100)
        : 0;

      const evidencePercent = totalQuestions > 0
        ? Math.round((withEvidenceCount / totalQuestions) * 100)
        : 0;

      // Calculate score preview
      let scorePreview: number | null = null;
      let levelPreview: string | null = null;

      if (questionnaireType === "ANS_USOAP_CMA") {
        const applicable = satisfactoryCount + notSatisfactoryCount;
        scorePreview = applicable > 0
          ? Math.round((satisfactoryCount / applicable) * 100)
          : null;
      } else {
        if (answeredCount > 0) {
          const totalScore = Object.entries(maturityCounts)
            .reduce((sum, [level, count]) => {
              const scores: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5 };
              return sum + (scores[level] * count);
            }, 0);
          const avgScore = totalScore / answeredCount;
          scorePreview = Math.round((avgScore / 5) * 100);

          // Determine level
          if (avgScore >= 4.5) levelPreview = "E";
          else if (avgScore >= 3.5) levelPreview = "D";
          else if (avgScore >= 2.5) levelPreview = "C";
          else if (avgScore >= 1.5) levelPreview = "B";
          else levelPreview = "A";
        }
      }

      // Determine next steps
      const nextSteps: string[] = [];
      if (progressPercent < 100) {
        nextSteps.push(`Complete remaining ${totalQuestions - answeredCount} questions`);
      }
      if (evidencePercent < 80) {
        nextSteps.push(`Add evidence to improve documentation (currently ${evidencePercent}%)`);
      }
      if (progressPercent === 100 && assessment.status === "DRAFT") {
        nextSteps.push("Ready to submit for review");
      }

      return {
        assessment: {
          id: assessment.id,
          status: assessment.status,
          type: assessment.type,
          progress: assessment.progress,
          startedAt: assessment.startedAt,
          submittedAt: assessment.submittedAt,
          completedAt: assessment.completedAt,
        },
        questionnaire: {
          id: assessment.questionnaire.id,
          code: assessment.questionnaire.code,
          type: questionnaireType,
        },
        stats: {
          totalQuestions,
          answeredQuestions: answeredCount,
          progressPercent,
          evidencePercent,
          ...(questionnaireType === "ANS_USOAP_CMA"
            ? {
                satisfactoryCount,
                notSatisfactoryCount,
                notApplicableCount,
              }
            : {
                maturityDistribution: maturityCounts,
              }),
        },
        scorePreview,
        levelPreview,
        nextSteps,
      };
    }),

  // ============================================
  // EXPORT & REPORTING
  // ============================================

  /**
   * Export assessment data
   */
  export: protectedProcedure
    .input(ExportInput)
    .mutation(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        false
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || "Assessment not found",
        });
      }

      // Get full assessment data
      const fullAssessment = await prisma.assessment.findUnique({
        where: { id: input.assessmentId },
        include: {
          organization: true,
          questionnaire: true,
          responses: {
            include: {
              question: {
                include: { category: true },
              },
              respondedBy: {
                select: { firstName: true, lastName: true },
              },
            },
            orderBy: { question: { sortOrder: "asc" } },
          },
        },
      });

      if (!fullAssessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }

      await logAuditEntry(ctx.user.id, AuditAction.EXPORT, "Assessment", input.assessmentId, {
        format: input.format,
      });

      if (input.format === "JSON") {
        return {
          format: "JSON" as const,
          data: fullAssessment,
          filename: `assessment-${fullAssessment.id}-${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      // CSV format
      const headers = [
        "Question ID",
        "PQ Number",
        "Category",
        "Question (EN)",
        "Response",
        ...(input.includeNotes ? ["Notes"] : []),
        ...(input.includeEvidence ? ["Evidence URLs"] : []),
        "Responded By",
        "Responded At",
      ];

      const rows = fullAssessment.responses.map((r) => {
        const responseValue = assessment.questionnaire.type === "ANS_USOAP_CMA"
          ? r.responseValue
          : r.maturityLevel
            ? MATURITY_LEVEL_REVERSE[r.maturityLevel]
            : "";

        return [
          r.questionId,
          r.question.pqNumber || "",
          r.question.category?.nameEn || "",
          r.question.questionTextEn.substring(0, 200),
          responseValue || "",
          ...(input.includeNotes ? [r.notes || ""] : []),
          ...(input.includeEvidence ? [r.evidenceUrls.join("; ")] : []),
          r.respondedBy ? `${r.respondedBy.firstName} ${r.respondedBy.lastName}` : "",
          r.respondedAt ? r.respondedAt.toISOString() : "",
        ];
      });

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      return {
        format: "CSV" as const,
        data: csvContent,
        filename: `assessment-${fullAssessment.id}-${new Date().toISOString().split("T")[0]}.csv`,
      };
    }),

  /**
   * Get report data for PDF generation
   */
  getReportData: protectedProcedure
    .input(z.object({ assessmentId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { assessment, hasAccess, reason } = await checkAssessmentAccess(
        input.assessmentId,
        ctx.user.id,
        ctx.user.role,
        ctx.user.organizationId ?? null,
        false
      );

      if (!hasAccess || !assessment) {
        throw new TRPCError({
          code: assessment ? "FORBIDDEN" : "NOT_FOUND",
          message: reason || "Assessment not found",
        });
      }

      // Get full assessment with all data
      const fullAssessment = await prisma.assessment.findUnique({
        where: { id: input.assessmentId },
        include: {
          organization: true,
          questionnaire: true,
          responses: {
            include: {
              question: {
                include: {
                  category: true,
                  icaoReferences: true,
                },
              },
            },
            orderBy: { question: { sortOrder: "asc" } },
          },
        },
      });

      if (!fullAssessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }

      // Transform responses for scoring
      const questionnaireType = fullAssessment.questionnaire.type;
      const responsesForScoring = transformResponsesForScoring(
        fullAssessment.responses.map((r) => ({
          ...r,
          question: {
            id: r.question.id,
            pqNumber: r.question.pqNumber,
            questionTextEn: r.question.questionTextEn,
            questionTextFr: r.question.questionTextFr,
            auditArea: r.question.auditArea,
            criticalElement: r.question.criticalElement,
            smsComponent: r.question.smsComponent,
            studyArea: r.question.studyArea,
            isPriorityPQ: r.question.isPriorityPQ,
            requiresOnSite: r.question.requiresOnSite,
            weight: r.question.weight,
          },
        }))
      );

      // Calculate scores
      let scores;
      if (questionnaireType === "ANS_USOAP_CMA") {
        scores = calculateEIScore(responsesForScoring);
      } else {
        scores = calculateSMSMaturity(responsesForScoring);
      }

      const categoryScores = calculateCategoryScores(responsesForScoring, questionnaireType);

      // Group responses by category for the report
      const responsesByCategory: Record<string, typeof fullAssessment.responses> = {};
      for (const response of fullAssessment.responses) {
        const categoryId = response.question.category?.id || "uncategorized";
        if (!responsesByCategory[categoryId]) {
          responsesByCategory[categoryId] = [];
        }
        responsesByCategory[categoryId].push(response);
      }

      return {
        assessment: fullAssessment,
        scores,
        categoryScores,
        responsesByCategory,
        generatedAt: new Date(),
      };
    }),

  // ============================================
  // DASHBOARD STATS
  // ============================================

  /**
   * Get organization assessment statistics
   */
  getOrgStats: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    if (!user.organizationId) {
      return null;
    }

    const assessments = await prisma.assessment.findMany({
      where: { organizationId: user.organizationId },
      include: {
        questionnaire: {
          select: { type: true },
        },
      },
    });

    const stats = {
      total: assessments.length,
      byStatus: {
        DRAFT: 0,
        SUBMITTED: 0,
        UNDER_REVIEW: 0,
        COMPLETED: 0,
        ARCHIVED: 0,
      } as Record<AssessmentStatus, number>,
      byType: {
        ANS_USOAP_CMA: 0,
        SMS_CANSO_SOE: 0,
      } as Record<QuestionnaireType, number>,
      averageProgress: 0,
      averageScore: null as number | null,
    };

    let totalProgress = 0;
    let scoreSum = 0;
    let scoreCount = 0;

    for (const assessment of assessments) {
      stats.byStatus[assessment.status]++;
      stats.byType[assessment.questionnaire.type]++;
      totalProgress += assessment.progress;

      if (assessment.overallScore !== null) {
        scoreSum += assessment.overallScore;
        scoreCount++;
      }
    }

    stats.averageProgress = assessments.length > 0
      ? Math.round(totalProgress / assessments.length)
      : 0;

    stats.averageScore = scoreCount > 0
      ? Math.round((scoreSum / scoreCount) * 10) / 10
      : null;

    return stats;
  }),
});

export type AssessmentRouter = typeof assessmentRouter;
