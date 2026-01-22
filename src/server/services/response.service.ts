/**
 * Response Service
 *
 * Business logic for assessment response management.
 * Handles saving, validation, progress calculation, and scoring preparation.
 */

import { prisma } from "@/lib/db";
import {
  Prisma,
  MaturityLevel,
  QuestionnaireType,
  AssessmentStatus,
  UserRole,
  USOAPAuditArea,
  CriticalElement,
  SMSComponent,
  CANSOStudyArea,
  AuditAction,
} from "@prisma/client";
import {
  MATURITY_LEVEL_MAP,
  MATURITY_LEVEL_REVERSE,
  maturityLevelToScore,
  type SaveResponseInput,
  type BulkSaveResponsesInput,
  type GetResponsesInput,
  type ResponseProgress,
  type SaveResponseResult,
  type BulkSaveResult,
} from "@/lib/validations/response";
import {
  isANSResponseAnswered,
  isSMSResponseAnswered,
} from "@/lib/utils/assessment-helpers";

// =============================================================================
// TYPES
// =============================================================================

export interface AssessmentAccessResult {
  assessment: Prisma.AssessmentGetPayload<{
    include: {
      organization: true;
      questionnaire: true;
    };
  }> | null;
  hasAccess: boolean;
  canWrite: boolean;
  reason?: string;
}

export interface ResponseWithQuestion {
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
  createdAt: Date;
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
    categoryId: string | null;
  };
}

// =============================================================================
// ACCESS CONTROL
// =============================================================================

/**
 * Roles that can manage assessments
 */
const ASSESSMENT_MANAGER_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "ANSP_ADMIN",
  "SAFETY_MANAGER",
  "QUALITY_MANAGER",
  "STAFF",
];

/**
 * Check if user has access to an assessment
 */
export async function checkAssessmentAccess(
  assessmentId: string,
  userId: string,
  userRole: UserRole,
  userOrgId: string | null,
  requireWrite: boolean = false
): Promise<AssessmentAccessResult> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      organization: true,
      questionnaire: true,
    },
  });

  if (!assessment) {
    return {
      assessment: null,
      hasAccess: false,
      canWrite: false,
      reason: "Assessment not found",
    };
  }

  // Super admins and system admins have full access
  if (["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(userRole)) {
    return {
      assessment,
      hasAccess: true,
      canWrite: true,
    };
  }

  // Check organization membership
  if (userOrgId !== assessment.organizationId) {
    // Peer reviewers can view submitted assessments
    if (
      ["PEER_REVIEWER", "LEAD_REVIEWER"].includes(userRole) &&
      ["SUBMITTED", "UNDER_REVIEW", "COMPLETED"].includes(assessment.status) &&
      !requireWrite
    ) {
      return { assessment, hasAccess: true, canWrite: false };
    }

    // Steering committee can view completed assessments
    if (
      userRole === "STEERING_COMMITTEE" &&
      assessment.status === "COMPLETED" &&
      !requireWrite
    ) {
      return { assessment, hasAccess: true, canWrite: false };
    }

    return {
      assessment,
      hasAccess: false,
      canWrite: false,
      reason: "You do not have access to this organization's assessments",
    };
  }

  // Organization members - check role for write access
  const canWrite = ASSESSMENT_MANAGER_ROLES.includes(userRole);

  if (requireWrite && !canWrite) {
    return {
      assessment,
      hasAccess: true,
      canWrite: false,
      reason: "You do not have permission to modify assessments",
    };
  }

  return { assessment, hasAccess: true, canWrite };
}

/**
 * Check if assessment is editable
 */
export function isAssessmentEditable(status: AssessmentStatus): boolean {
  return status === "DRAFT";
}

// =============================================================================
// RESPONSE MANAGEMENT
// =============================================================================

/**
 * Save a single response
 */
export async function saveResponse(
  input: SaveResponseInput,
  userId: string,
  questionnaireType: QuestionnaireType
): Promise<SaveResponseResult> {
  // Build update data based on questionnaire type
  const updateData: Prisma.AssessmentResponseUpdateInput = {
    respondedBy: { connect: { id: userId } },
    respondedAt: new Date(),
  };

  if (questionnaireType === "ANS_USOAP_CMA") {
    updateData.responseValue = input.ansResponse || null;
    updateData.maturityLevel = null;
  } else {
    updateData.maturityLevel = input.smsResponse
      ? MATURITY_LEVEL_MAP[input.smsResponse]
      : null;
    updateData.responseValue = null;

    // Calculate score for maturity level
    if (input.smsResponse) {
      updateData.score = maturityLevelToScore(input.smsResponse);
    }
  }

  if (input.notes !== undefined) {
    updateData.notes = input.notes;
  }

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
      responseValue:
        questionnaireType === "ANS_USOAP_CMA" ? input.ansResponse || null : null,
      maturityLevel:
        questionnaireType === "SMS_CANSO_SOE" && input.smsResponse
          ? MATURITY_LEVEL_MAP[input.smsResponse]
          : null,
      score: input.smsResponse ? maturityLevelToScore(input.smsResponse) : null,
      notes: input.notes,
      respondedBy: { connect: { id: userId } },
      respondedAt: new Date(),
    },
  });

  // Calculate updated progress
  const progress = await calculateProgress(input.assessmentId, questionnaireType);

  // Update assessment progress
  await prisma.assessment.update({
    where: { id: input.assessmentId },
    data: { progress: progress.percentage },
  });

  return {
    success: true,
    response: {
      id: response.id,
      questionId: response.questionId,
      value:
        questionnaireType === "ANS_USOAP_CMA"
          ? response.responseValue
          : response.maturityLevel,
      isDraft: input.isDraft,
      updatedAt: response.updatedAt,
    },
    progress: {
      answered: progress.answeredQuestions,
      total: progress.totalQuestions,
      percentage: progress.percentage,
    },
  };
}

/**
 * Save multiple responses in bulk
 */
export async function saveResponses(
  input: BulkSaveResponsesInput,
  userId: string,
  questionnaireType: QuestionnaireType
): Promise<BulkSaveResult> {
  const errors: Array<{ questionId: string; error: string }> = [];
  let updatedCount = 0;

  // Process all responses in a transaction
  await prisma.$transaction(async (tx) => {
    for (const response of input.responses) {
      try {
        const updateData: Prisma.AssessmentResponseUpdateInput = {
          respondedBy: { connect: { id: userId } },
          respondedAt: new Date(),
        };

        if (questionnaireType === "ANS_USOAP_CMA") {
          updateData.responseValue = response.ansResponse || null;
        } else {
          updateData.maturityLevel = response.smsResponse
            ? MATURITY_LEVEL_MAP[response.smsResponse]
            : null;
          if (response.smsResponse) {
            updateData.score = maturityLevelToScore(response.smsResponse);
          }
        }

        if (response.notes !== undefined) {
          updateData.notes = response.notes;
        }

        await tx.assessmentResponse.upsert({
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
            responseValue:
              questionnaireType === "ANS_USOAP_CMA"
                ? response.ansResponse || null
                : null,
            maturityLevel:
              questionnaireType === "SMS_CANSO_SOE" && response.smsResponse
                ? MATURITY_LEVEL_MAP[response.smsResponse]
                : null,
            score: response.smsResponse
              ? maturityLevelToScore(response.smsResponse)
              : null,
            notes: response.notes,
            respondedBy: { connect: { id: userId } },
            respondedAt: new Date(),
          },
        });

        updatedCount++;
      } catch (error) {
        errors.push({
          questionId: response.questionId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  });

  // Calculate updated progress
  const progress = await calculateProgress(input.assessmentId, questionnaireType);

  // Update assessment progress
  await prisma.assessment.update({
    where: { id: input.assessmentId },
    data: { progress: progress.percentage },
  });

  return {
    success: errors.length === 0,
    updatedCount,
    failedCount: errors.length,
    errors,
    progress: {
      answered: progress.answeredQuestions,
      total: progress.totalQuestions,
      percentage: progress.percentage,
    },
  };
}

/**
 * Get responses with filters
 */
export async function getResponses(
  input: GetResponsesInput,
  questionnaireType: QuestionnaireType
): Promise<{
  responses: ResponseWithQuestion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  // Build filter
  const where: Prisma.AssessmentResponseWhereInput = {
    assessmentId: input.assessmentId,
  };

  // Question filters
  const questionWhere: Prisma.QuestionWhereInput = {};

  if (input.categoryId) {
    questionWhere.categoryId = input.categoryId;
  }
  if (input.questionId) {
    where.questionId = input.questionId;
  }
  if (input.auditArea) {
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

  if (Object.keys(questionWhere).length > 0) {
    where.question = questionWhere;
  }

  // Filter for unanswered only
  if (input.onlyUnanswered) {
    if (questionnaireType === "ANS_USOAP_CMA") {
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
        select: {
          id: true,
          pqNumber: true,
          questionTextEn: true,
          questionTextFr: true,
          auditArea: true,
          criticalElement: true,
          smsComponent: true,
          studyArea: true,
          isPriorityPQ: true,
          requiresOnSite: true,
          weight: true,
          categoryId: true,
        },
      },
    },
    orderBy: { question: { sortOrder: "asc" } },
    skip: (input.page - 1) * input.limit,
    take: input.limit,
  });

  return {
    responses: responses as ResponseWithQuestion[],
    total,
    page: input.page,
    limit: input.limit,
    totalPages: Math.ceil(total / input.limit),
  };
}

/**
 * Get a single response by question ID
 */
export async function getResponseByQuestion(
  assessmentId: string,
  questionId: string
): Promise<ResponseWithQuestion | null> {
  const response = await prisma.assessmentResponse.findUnique({
    where: {
      assessmentId_questionId: {
        assessmentId,
        questionId,
      },
    },
    include: {
      question: {
        select: {
          id: true,
          pqNumber: true,
          questionTextEn: true,
          questionTextFr: true,
          auditArea: true,
          criticalElement: true,
          smsComponent: true,
          studyArea: true,
          isPriorityPQ: true,
          requiresOnSite: true,
          weight: true,
          categoryId: true,
        },
      },
    },
  });

  return response as ResponseWithQuestion | null;
}

/**
 * Clear/delete a response (reset to unanswered)
 */
export async function clearResponse(
  assessmentId: string,
  questionId: string,
  questionnaireType: QuestionnaireType
): Promise<{ success: boolean; progress: ResponseProgress }> {
  await prisma.assessmentResponse.update({
    where: {
      assessmentId_questionId: {
        assessmentId,
        questionId,
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

  const progress = await calculateProgress(assessmentId, questionnaireType);

  // Update assessment progress
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { progress: progress.percentage },
  });

  return { success: true, progress };
}

// =============================================================================
// EVIDENCE MANAGEMENT
// =============================================================================

/**
 * Add evidence URL to a response
 */
export async function addEvidence(
  assessmentId: string,
  questionId: string,
  evidenceUrl: string
): Promise<ResponseWithQuestion> {
  const response = await prisma.assessmentResponse.findUnique({
    where: {
      assessmentId_questionId: {
        assessmentId,
        questionId,
      },
    },
  });

  if (!response) {
    throw new Error("Response not found");
  }

  const updated = await prisma.assessmentResponse.update({
    where: { id: response.id },
    data: {
      evidenceUrls: {
        push: evidenceUrl,
      },
    },
    include: {
      question: {
        select: {
          id: true,
          pqNumber: true,
          questionTextEn: true,
          questionTextFr: true,
          auditArea: true,
          criticalElement: true,
          smsComponent: true,
          studyArea: true,
          isPriorityPQ: true,
          requiresOnSite: true,
          weight: true,
          categoryId: true,
        },
      },
    },
  });

  return updated as ResponseWithQuestion;
}

/**
 * Remove evidence URL from a response
 */
export async function removeEvidence(
  assessmentId: string,
  questionId: string,
  evidenceUrl: string
): Promise<ResponseWithQuestion> {
  const response = await prisma.assessmentResponse.findUnique({
    where: {
      assessmentId_questionId: {
        assessmentId,
        questionId,
      },
    },
  });

  if (!response) {
    throw new Error("Response not found");
  }

  const updatedUrls = response.evidenceUrls.filter((url) => url !== evidenceUrl);

  const updated = await prisma.assessmentResponse.update({
    where: { id: response.id },
    data: {
      evidenceUrls: updatedUrls,
    },
    include: {
      question: {
        select: {
          id: true,
          pqNumber: true,
          questionTextEn: true,
          questionTextFr: true,
          auditArea: true,
          criticalElement: true,
          smsComponent: true,
          studyArea: true,
          isPriorityPQ: true,
          requiresOnSite: true,
          weight: true,
          categoryId: true,
        },
      },
    },
  });

  return updated as ResponseWithQuestion;
}

// =============================================================================
// PROGRESS CALCULATION
// =============================================================================

/**
 * Calculate completion progress for an assessment
 */
export async function calculateProgress(
  assessmentId: string,
  questionnaireType: QuestionnaireType
): Promise<ResponseProgress> {
  const responses = await prisma.assessmentResponse.findMany({
    where: { assessmentId },
    include: {
      question: {
        select: {
          categoryId: true,
        },
      },
    },
  });

  const totalQuestions = responses.length;
  let answeredQuestions = 0;
  const draftResponses = 0;
  let finalizedResponses = 0;
  const byCategory: Record<
    string,
    { total: number; answered: number; percentage: number }
  > = {};

  for (const r of responses) {
    const categoryId = r.question.categoryId || "uncategorized";

    // Initialize category
    if (!byCategory[categoryId]) {
      byCategory[categoryId] = { total: 0, answered: 0, percentage: 0 };
    }
    byCategory[categoryId].total++;

    // Check if answered - use centralized helper for consistency
    const isAnswered =
      questionnaireType === "ANS_USOAP_CMA"
        ? isANSResponseAnswered(r.responseValue)
        : isSMSResponseAnswered(r.maturityLevel);

    if (isAnswered) {
      answeredQuestions++;
      byCategory[categoryId].answered++;

      // For now, treat all responses as finalized (isDraft field not in schema)
      finalizedResponses++;
    }
  }

  // Calculate category percentages
  for (const categoryId of Object.keys(byCategory)) {
    const cat = byCategory[categoryId];
    cat.percentage = cat.total > 0 ? Math.round((cat.answered / cat.total) * 100) : 0;
  }

  const percentage =
    totalQuestions > 0
      ? Math.round((answeredQuestions / totalQuestions) * 100)
      : 0;

  // Estimate remaining time (rough: 2 minutes per question)
  const remainingQuestions = totalQuestions - answeredQuestions;
  const estimatedTimeRemaining =
    remainingQuestions > 0 ? remainingQuestions * 2 : null;

  return {
    totalQuestions,
    answeredQuestions,
    draftResponses,
    finalizedResponses,
    percentage,
    estimatedTimeRemaining,
    byCategory,
  };
}

/**
 * Get detailed progress with category breakdown
 */
export async function getDetailedProgress(
  assessmentId: string,
  questionnaireType: QuestionnaireType
): Promise<ResponseProgress & { categories: Array<{ id: string; name: string; progress: number }> }> {
  const progress = await calculateProgress(assessmentId, questionnaireType);

  // Get category names
  const categories = await prisma.questionnaireCategory.findMany({
    where: {
      id: { in: Object.keys(progress.byCategory) },
    },
    select: {
      id: true,
      nameEn: true,
    },
  });

  const categoryDetails = Object.entries(progress.byCategory).map(([id, data]) => {
    const cat = categories.find((c) => c.id === id);
    return {
      id,
      name: cat?.nameEn || "Uncategorized",
      progress: data.percentage,
    };
  });

  return {
    ...progress,
    categories: categoryDetails,
  };
}

// =============================================================================
// SCORING PREPARATION
// =============================================================================

/**
 * Transform responses for scoring functions
 */
export function transformResponsesForScoring(
  responses: ResponseWithQuestion[]
): Array<{
  id: string;
  assessmentId: string;
  questionId: string;
  responseValue: "SATISFACTORY" | "NOT_SATISFACTORY" | "NOT_APPLICABLE" | "NOT_REVIEWED" | null;
  maturityLevel: "A" | "B" | "C" | "D" | "E" | null;
  score: number | undefined;
  evidenceDescription: string | undefined;
  evidenceUrls: string[];
  respondedById: string;
  respondedAt: Date;
  lastModifiedAt: Date;
  isComplete: boolean;
  needsReview: boolean;
  question: {
    id: string;
    pqNumber: string | undefined;
    questionTextEn: string;
    questionTextFr: string;
    auditArea: USOAPAuditArea | undefined;
    criticalElement: CriticalElement | undefined;
    smsComponent: SMSComponent | undefined;
    studyArea: CANSOStudyArea | undefined;
    isPriorityPQ: boolean;
    requiresOnSite: boolean;
    weight: number;
  };
}> {
  return responses.map((r) => ({
    id: r.id,
    assessmentId: r.assessmentId,
    questionId: r.questionId,
    responseValue: r.responseValue as
      | "SATISFACTORY"
      | "NOT_SATISFACTORY"
      | "NOT_APPLICABLE"
      | "NOT_REVIEWED"
      | null,
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

/**
 * Get all responses for scoring
 */
export async function getResponsesForScoring(
  assessmentId: string
): Promise<ResponseWithQuestion[]> {
  const responses = await prisma.assessmentResponse.findMany({
    where: { assessmentId },
    include: {
      question: {
        select: {
          id: true,
          pqNumber: true,
          questionTextEn: true,
          questionTextFr: true,
          auditArea: true,
          criticalElement: true,
          smsComponent: true,
          studyArea: true,
          isPriorityPQ: true,
          requiresOnSite: true,
          weight: true,
          categoryId: true,
        },
      },
    },
  });

  return responses as ResponseWithQuestion[];
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate response value for questionnaire type
 */
export function validateResponseValue(
  questionnaireType: QuestionnaireType,
  ansResponse?: string | null,
  smsResponse?: string | null
): { valid: boolean; error?: string } {
  if (questionnaireType === "ANS_USOAP_CMA") {
    if (smsResponse && !ansResponse) {
      return {
        valid: false,
        error: "SMS maturity level cannot be used for ANS questionnaire",
      };
    }
    const validValues = ["SATISFACTORY", "NOT_SATISFACTORY", "NOT_APPLICABLE", "NOT_REVIEWED"];
    if (ansResponse && !validValues.includes(ansResponse)) {
      return {
        valid: false,
        error: `Invalid ANS response value. Must be one of: ${validValues.join(", ")}`,
      };
    }
  } else {
    if (ansResponse && !smsResponse) {
      return {
        valid: false,
        error: "ANS response value cannot be used for SMS questionnaire",
      };
    }
    const validLevels = ["A", "B", "C", "D", "E"];
    if (smsResponse && !validLevels.includes(smsResponse)) {
      return {
        valid: false,
        error: `Invalid SMS maturity level. Must be one of: ${validLevels.join(", ")}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate question belongs to questionnaire
 */
export async function validateQuestionInQuestionnaire(
  questionId: string,
  questionnaireId: string
): Promise<boolean> {
  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      questionnaireId: questionnaireId,
    },
  });

  return question !== null;
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

/**
 * Log audit entry for response changes
 */
export async function logResponseAudit(
  userId: string,
  action: AuditAction,
  assessmentId: string,
  questionId: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType: "AssessmentResponse",
        entityId: `${assessmentId}:${questionId}`,
        newState: data ? JSON.stringify(data) : Prisma.JsonNull,
      },
    });
  } catch (error) {
    console.error("[Audit] Failed to log response entry:", error);
  }
}
