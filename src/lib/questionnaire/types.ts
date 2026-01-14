import { z } from "zod";
import type {
  Questionnaire,
  QuestionnaireCategory,
  Question,
  ICAOReference,
  QuestionnaireType,
  USOAPAuditArea,
  CriticalElement,
  SMSComponent,
  CANSOStudyArea,
  TransversalArea,
  MaturityLevel,
  PQAmendmentStatus,
  ResponseType,
  ICAOReferenceType,
} from "@prisma/client";

// =============================================================================
// QUESTIONNAIRE INTERFACES
// =============================================================================

/**
 * Question with all related ICAO references
 */
export interface QuestionWithRelations extends Question {
  icaoReferences: ICAOReference[];
}

/**
 * Category with its questions and relations
 */
export interface CategoryWithQuestions extends QuestionnaireCategory {
  questions: QuestionWithRelations[];
}

/**
 * Full questionnaire with categories and questions
 */
export interface QuestionnaireWithRelations extends Questionnaire {
  categories: CategoryWithQuestions[];
  questions: QuestionWithRelations[];
}

/**
 * Light questionnaire for list views
 */
export interface QuestionnaireListItem
  extends Pick<
    Questionnaire,
    | "id"
    | "code"
    | "type"
    | "version"
    | "titleEn"
    | "titleFr"
    | "effectiveDate"
    | "isActive"
  > {
  _count: {
    categories: number;
    questions: number;
  };
}

// =============================================================================
// FILTER AND PAGINATION INTERFACES
// =============================================================================

/**
 * Filters for questionnaire search
 */
export interface QuestionnaireFilters {
  type?: QuestionnaireType;
  isActive?: boolean;
  search?: string;
  effectiveDateFrom?: Date;
  effectiveDateTo?: Date;
}

/**
 * Filters for question search within a questionnaire
 */
export interface QuestionFilters {
  questionnaireId?: string;
  categoryId?: string;
  auditArea?: USOAPAuditArea;
  criticalElement?: CriticalElement;
  smsComponent?: SMSComponent;
  studyArea?: CANSOStudyArea;
  transversalArea?: TransversalArea;
  maturityLevel?: MaturityLevel;
  isPriorityPQ?: boolean;
  requiresOnSite?: boolean;
  pqStatus?: PQAmendmentStatus;
  responseType?: ResponseType;
  search?: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated questionnaire list
 */
export interface PaginatedQuestionnaires {
  data: QuestionnaireListItem[];
  meta: PaginationMeta;
}

/**
 * Paginated question list
 */
export interface PaginatedQuestions {
  data: QuestionWithRelations[];
  meta: PaginationMeta;
}

// =============================================================================
// METADATA INTERFACES
// =============================================================================

/**
 * Bilingual label structure
 */
export interface BilingualLabel {
  en: string;
  fr: string;
}

/**
 * Audit area metadata
 */
export interface AuditAreaMeta {
  code: USOAPAuditArea;
  name: BilingualLabel;
  description: BilingualLabel;
  pqCount: number;
  sortOrder: number;
}

/**
 * Critical element metadata
 */
export interface CriticalElementMeta {
  code: CriticalElement;
  number: number;
  name: BilingualLabel;
  description: BilingualLabel;
  sortOrder: number;
}

/**
 * SMS component metadata
 */
export interface SMSComponentMeta {
  code: SMSComponent;
  number: number;
  name: BilingualLabel;
  description: BilingualLabel;
  weight: number;
  sortOrder: number;
}

/**
 * CANSO study area metadata
 */
export interface StudyAreaMeta {
  code: CANSOStudyArea;
  componentNumber: number;
  areaNumber: number;
  name: BilingualLabel;
  description: BilingualLabel;
  sortOrder: number;
}

/**
 * Maturity level metadata
 */
export interface MaturityLevelMeta {
  code: MaturityLevel;
  level: string;
  name: BilingualLabel;
  description: BilingualLabel;
  score: number;
  sortOrder: number;
}

/**
 * Transversal area metadata
 */
export interface TransversalAreaMeta {
  code: TransversalArea;
  name: BilingualLabel;
  description: BilingualLabel;
  sortOrder: number;
}

/**
 * ICAO reference type metadata
 */
export interface ICAOReferenceTypeMeta {
  code: ICAOReferenceType;
  name: BilingualLabel;
  description: BilingualLabel;
  sortOrder: number;
}

// =============================================================================
// SCORE AND ANALYSIS INTERFACES
// =============================================================================

/**
 * Category score breakdown
 */
export interface CategoryScore {
  categoryId: string;
  categoryCode: string;
  categoryName: BilingualLabel;
  totalQuestions: number;
  answeredQuestions: number;
  score: number;
  maxScore: number;
  percentage: number;
  maturityLevel?: MaturityLevel;
}

/**
 * Audit area score breakdown
 */
export interface AuditAreaScore {
  auditArea: USOAPAuditArea;
  name: BilingualLabel;
  totalQuestions: number;
  satisfactory: number;
  notSatisfactory: number;
  notApplicable: number;
  eiScore: number;
}

/**
 * SMS component score breakdown
 */
export interface SMSComponentScore {
  component: SMSComponent;
  name: BilingualLabel;
  weight: number;
  studyAreas: StudyAreaScore[];
  averageMaturity: number;
  maturityLevel: MaturityLevel;
}

/**
 * Study area score breakdown
 */
export interface StudyAreaScore {
  studyArea: CANSOStudyArea;
  name: BilingualLabel;
  totalQuestions: number;
  answeredQuestions: number;
  averageMaturity: number;
  maturityLevel: MaturityLevel;
}

/**
 * Overall assessment score
 */
export interface AssessmentScore {
  questionnaireType: QuestionnaireType;
  overallScore: number;
  overallPercentage: number;
  overallMaturity?: MaturityLevel;
  eiScore?: number;
  categoryScores: CategoryScore[];
  auditAreaScores?: AuditAreaScore[];
  componentScores?: SMSComponentScore[];
  totalQuestions: number;
  answeredQuestions: number;
  completionPercentage: number;
}

// =============================================================================
// ZOD VALIDATION SCHEMAS
// =============================================================================

export const QuestionnaireFiltersSchema = z.object({
  type: z.enum(["ANS_USOAP_CMA", "SMS_CANSO_SOE"]).optional(),
  isActive: z.boolean().optional(),
  search: z.string().max(100).optional(),
  effectiveDateFrom: z.coerce.date().optional(),
  effectiveDateTo: z.coerce.date().optional(),
});

export const QuestionFiltersSchema = z.object({
  questionnaireId: z.string().cuid().optional(),
  categoryId: z.string().cuid().optional(),
  auditArea: z
    .enum(["LEG", "ORG", "PEL", "OPS", "AIR", "AIG", "ANS", "AGA", "SSP"])
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
  transversalArea: z.enum(["SPM", "HP", "CI"]).optional(),
  maturityLevel: z
    .enum(["LEVEL_A", "LEVEL_B", "LEVEL_C", "LEVEL_D", "LEVEL_E"])
    .optional(),
  isPriorityPQ: z.boolean().optional(),
  requiresOnSite: z.boolean().optional(),
  pqStatus: z
    .enum([
      "NO_CHANGE",
      "REVISED",
      "NEW",
      "MERGED",
      "DELETED",
      "REFERENCE_REVISED",
    ])
    .optional(),
  responseType: z
    .enum([
      "SATISFACTORY_NOT",
      "MATURITY_LEVEL",
      "YES_NO",
      "SCALE_1_5",
      "TEXT",
      "MULTI_SELECT",
    ])
    .optional(),
  search: z.string().max(200).optional(),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Type exports from schemas
export type QuestionnaireFiltersInput = z.infer<
  typeof QuestionnaireFiltersSchema
>;
export type QuestionFiltersInput = z.infer<typeof QuestionFiltersSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
