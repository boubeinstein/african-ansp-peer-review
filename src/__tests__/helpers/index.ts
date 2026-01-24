/**
 * Test Helpers
 *
 * Utility functions for creating test data and managing test state.
 */

import type {
  User,
  Organization,
  Assessment,
  Questionnaire,
  Question,
  QuestionnaireCategory,
  UserRole,
  QuestionnaireType,
  AssessmentType,
  AssessmentStatus,
  ResponseType,
  MaturityLevel,
} from "@prisma/client";

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

let idCounter = 0;

export function generateId(): string {
  return `test_${++idCounter}_${Date.now()}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

// =============================================================================
// MOCK USER
// =============================================================================

export interface MockUserOptions {
  role?: UserRole;
  organizationId?: string;
  locale?: "EN" | "FR";
}

export function createMockUser(options: MockUserOptions = {}): Partial<User> {
  const id = generateId();
  return {
    id,
    email: `user_${id}@test.com`,
    firstName: "Test",
    lastName: "User",
    role: options.role ?? "STAFF",
    organizationId: options.organizationId ?? null,
    locale: options.locale ?? "EN",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// =============================================================================
// MOCK ORGANIZATION
// =============================================================================

export function createMockOrganization(): Partial<Organization> {
  const id = generateId();
  return {
    id,
    nameEn: `Test Organization ${id}`,
    nameFr: `Organisation Test ${id}`,
    organizationCode: `TST${id.slice(-3).toUpperCase()}`,
    country: "Test Country",
    region: "WACAF",
    membershipStatus: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// =============================================================================
// MOCK QUESTIONNAIRE
// =============================================================================

export interface MockQuestionnaireOptions {
  type?: QuestionnaireType;
  questionCount?: number;
  categoryCount?: number;
}

export function createMockQuestionnaire(
  options: MockQuestionnaireOptions = {}
): Partial<Questionnaire> {
  const id = generateId();
  const type = options.type ?? "ANS_USOAP_CMA";
  return {
    id,
    code: type === "ANS_USOAP_CMA" ? "ANS_2024" : "SMS_2024",
    type,
    version: "2024",
    titleEn:
      type === "ANS_USOAP_CMA"
        ? "USOAP CMA Protocol Questions"
        : "CANSO Standard of Excellence",
    titleFr:
      type === "ANS_USOAP_CMA"
        ? "Questions du protocole USOAP CMA"
        : "Norme d'excellence CANSO",
    descriptionEn: "Test questionnaire description",
    descriptionFr: "Description du questionnaire de test",
    effectiveDate: new Date("2024-07-01"),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// =============================================================================
// MOCK CATEGORY
// =============================================================================

export interface MockCategoryOptions {
  questionnaireId: string;
  code?: string;
  sortOrder?: number;
}

export function createMockCategory(
  options: MockCategoryOptions
): Partial<QuestionnaireCategory> {
  const id = generateId();
  return {
    id,
    questionnaireId: options.questionnaireId,
    code: options.code ?? `CAT_${id}`,
    sortOrder: options.sortOrder ?? 1,
    nameEn: `Test Category ${options.code ?? id}`,
    nameFr: `Catégorie Test ${options.code ?? id}`,
    descriptionEn: "Test category description",
    descriptionFr: "Description de la catégorie de test",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// =============================================================================
// MOCK QUESTION
// =============================================================================

export interface MockQuestionOptions {
  questionnaireId: string;
  categoryId: string;
  pqNumber?: string;
  responseType?: ResponseType;
  auditArea?: string;
  criticalElement?: string;
  smsComponent?: string;
  studyArea?: string;
  isPriorityPQ?: boolean;
  sortOrder?: number;
}

export function createMockQuestion(
  options: MockQuestionOptions
): Partial<Question> {
  const id = generateId();
  return {
    id,
    questionnaireId: options.questionnaireId,
    categoryId: options.categoryId,
    pqNumber: options.pqNumber ?? `PQ_${id}`,
    questionTextEn: `Test question ${options.pqNumber ?? id}?`,
    questionTextFr: `Question de test ${options.pqNumber ?? id}?`,
    guidanceEn: "Test guidance for this question.",
    guidanceFr: "Guide de test pour cette question.",
    responseType: options.responseType ?? "SATISFACTORY_NOT",
    requiredEvidence: [],
    weight: 1.0,
    maxScore: 1.0,
    sortOrder: options.sortOrder ?? 1,
    isPriorityPQ: options.isPriorityPQ ?? false,
    requiresOnSite: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// =============================================================================
// MOCK ASSESSMENT
// =============================================================================

export interface MockAssessmentOptions {
  organizationId: string;
  questionnaireId: string;
  type?: AssessmentType;
  status?: AssessmentStatus;
  progress?: number;
}

export function createMockAssessment(
  options: MockAssessmentOptions
): Partial<Assessment> {
  const id = generateId();
  return {
    id,
    organizationId: options.organizationId,
    questionnaireId: options.questionnaireId,
    type: options.type ?? "SELF_ASSESSMENT",
    title: `Test Assessment ${id}`,
    description: "Test assessment description",
    status: options.status ?? "DRAFT",
    progress: options.progress ?? 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// =============================================================================
// MOCK RESPONSES
// =============================================================================

export type ANSResponseValue =
  | "SATISFACTORY"
  | "NOT_SATISFACTORY"
  | "NOT_APPLICABLE"
  | "NOT_REVIEWED";

export type SMSResponseValue =
  | "LEVEL_A"
  | "LEVEL_B"
  | "LEVEL_C"
  | "LEVEL_D"
  | "LEVEL_E";

export interface MockANSResponse {
  questionId: string;
  value: ANSResponseValue;
}

export interface MockSMSResponse {
  questionId: string;
  value: SMSResponseValue;
}

/**
 * Generate random ANS responses with distribution
 */
export function generateANSResponses(
  questionIds: string[],
  distribution?: {
    satisfactory?: number;
    notSatisfactory?: number;
    notApplicable?: number;
    notReviewed?: number;
  }
): MockANSResponse[] {
  const dist = {
    satisfactory: distribution?.satisfactory ?? 60,
    notSatisfactory: distribution?.notSatisfactory ?? 20,
    notApplicable: distribution?.notApplicable ?? 10,
    notReviewed: distribution?.notReviewed ?? 10,
  };

  const total =
    dist.satisfactory +
    dist.notSatisfactory +
    dist.notApplicable +
    dist.notReviewed;

  return questionIds.map((questionId, index) => {
    const rand = (index * 7) % total; // Deterministic pseudo-random
    let value: ANSResponseValue;

    if (rand < dist.satisfactory) {
      value = "SATISFACTORY";
    } else if (rand < dist.satisfactory + dist.notSatisfactory) {
      value = "NOT_SATISFACTORY";
    } else if (
      rand <
      dist.satisfactory + dist.notSatisfactory + dist.notApplicable
    ) {
      value = "NOT_APPLICABLE";
    } else {
      value = "NOT_REVIEWED";
    }

    return { questionId, value };
  });
}

/**
 * Generate random SMS responses with distribution
 */
export function generateSMSResponses(
  questionIds: string[],
  distribution?: {
    levelA?: number;
    levelB?: number;
    levelC?: number;
    levelD?: number;
    levelE?: number;
  }
): MockSMSResponse[] {
  const dist = {
    levelA: distribution?.levelA ?? 5,
    levelB: distribution?.levelB ?? 15,
    levelC: distribution?.levelC ?? 40,
    levelD: distribution?.levelD ?? 30,
    levelE: distribution?.levelE ?? 10,
  };

  const total =
    dist.levelA + dist.levelB + dist.levelC + dist.levelD + dist.levelE;

  return questionIds.map((questionId, index) => {
    const rand = (index * 7) % total; // Deterministic pseudo-random
    let value: SMSResponseValue;

    if (rand < dist.levelA) {
      value = "LEVEL_A";
    } else if (rand < dist.levelA + dist.levelB) {
      value = "LEVEL_B";
    } else if (rand < dist.levelA + dist.levelB + dist.levelC) {
      value = "LEVEL_C";
    } else if (
      rand <
      dist.levelA + dist.levelB + dist.levelC + dist.levelD
    ) {
      value = "LEVEL_D";
    } else {
      value = "LEVEL_E";
    }

    return { questionId, value };
  });
}

// =============================================================================
// SCORING HELPERS
// =============================================================================

/**
 * Calculate expected EI score from responses
 */
export function calculateExpectedEI(responses: MockANSResponse[]): number {
  const satisfactory = responses.filter(
    (r) => r.value === "SATISFACTORY"
  ).length;
  const notSatisfactory = responses.filter(
    (r) => r.value === "NOT_SATISFACTORY"
  ).length;
  const applicable = satisfactory + notSatisfactory;

  if (applicable === 0) return 0;
  return (satisfactory / applicable) * 100;
}

/**
 * Calculate expected SMS maturity score from responses
 */
export function calculateExpectedSMSScore(
  responses: MockSMSResponse[]
): number {
  if (responses.length === 0) return 0;

  const levelValues: Record<SMSResponseValue, number> = {
    LEVEL_A: 1,
    LEVEL_B: 2,
    LEVEL_C: 3,
    LEVEL_D: 4,
    LEVEL_E: 5,
  };

  const total = responses.reduce(
    (sum, r) => sum + levelValues[r.value],
    0
  );
  return total / responses.length;
}

/**
 * Convert numeric score to maturity level
 */
export function scoreToMaturityLevel(score: number): MaturityLevel {
  if (score < 1.5) return "LEVEL_A";
  if (score < 2.5) return "LEVEL_B";
  if (score < 3.5) return "LEVEL_C";
  if (score < 4.5) return "LEVEL_D";
  return "LEVEL_E";
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Assert that a number is within tolerance of expected value
 */
export function expectCloseTo(
  actual: number,
  expected: number,
  tolerance = 0.01
): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `Expected ${actual} to be close to ${expected} (tolerance: ${tolerance})`
    );
  }
}

/**
 * Assert that arrays contain same elements (order-independent)
 */
export function expectSameElements<T>(
  actual: T[],
  expected: T[]
): void {
  if (actual.length !== expected.length) {
    throw new Error(
      `Arrays have different lengths: ${actual.length} vs ${expected.length}`
    );
  }

  const sortedActual = [...actual].sort();
  const sortedExpected = [...expected].sort();

  for (let i = 0; i < sortedActual.length; i++) {
    if (sortedActual[i] !== sortedExpected[i]) {
      throw new Error(
        `Arrays differ at index ${i}: ${sortedActual[i]} vs ${sortedExpected[i]}`
      );
    }
  }
}
