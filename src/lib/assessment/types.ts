/**
 * Self-Assessment Module - TypeScript Types
 *
 * Defines interfaces and types for the assessment system, aligned with:
 * - ICAO USOAP CMA methodology for ANS assessments
 * - CANSO Standard of Excellence (SoE) for SMS assessments
 */

import type { QuestionnaireType, SMSComponent, CANSOStudyArea, USOAPAuditArea, CriticalElement } from "@prisma/client";

// =============================================================================
// ENUMS & LITERAL TYPES
// =============================================================================

/**
 * Assessment status workflow
 * DRAFT → IN_PROGRESS → SUBMITTED → UNDER_REVIEW → COMPLETED → ARCHIVED
 */
export type AssessmentStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "COMPLETED"
  | "ARCHIVED";

/**
 * Assessment types for different use cases
 */
export type AssessmentType =
  | "SELF_ASSESSMENT"   // Organization self-evaluation
  | "GAP_ANALYSIS"      // Identify gaps before peer review
  | "PRE_REVIEW"        // Preparation for upcoming review
  | "MOCK_REVIEW";      // Practice/simulation review

/**
 * ANS Response values (USOAP CMA aligned)
 * Used for Protocol Questions in ANS USOAP CMA assessments
 */
export type ANSResponseValue =
  | "SATISFACTORY"      // S - Critical element implemented
  | "NOT_SATISFACTORY"  // NS - Not or partially implemented
  | "NOT_APPLICABLE"    // NA - Not applicable to State
  | "NOT_REVIEWED";     // NR - Not yet assessed

/**
 * SMS Maturity levels (CANSO SoE aligned)
 * 5-level maturity model for SMS assessments
 */
export type SMSMaturityLevel = "A" | "B" | "C" | "D" | "E" | null;

/**
 * Evidence types for supporting assessment responses
 */
export type EvidenceType =
  | "DOCUMENT"      // Policies, procedures, manuals
  | "PROCEDURE"     // Documented procedures, work instructions
  | "RECORD"        // Training records, audit reports, minutes
  | "INTERVIEW"     // Staff interviews, management discussions
  | "OBSERVATION"   // Facility tours, process observations
  | "OTHER";        // Photos, screenshots, external reports

// =============================================================================
// CORE INTERFACES
// =============================================================================

/**
 * Main Assessment entity
 * Represents a complete self-assessment or gap analysis
 */
export interface Assessment {
  id: string;
  organizationId: string;
  questionnaireId: string;
  questionnaireType: QuestionnaireType;
  assessmentType: AssessmentType;
  status: AssessmentStatus;

  // Descriptive fields
  title: string;
  description?: string;

  // Temporal data
  startedAt: Date;
  submittedAt?: Date;
  completedAt?: Date;
  dueDate?: Date;

  // Scoring results
  overallScore?: number;              // EI percentage for ANS (0-100)
  maturityLevel?: SMSMaturityLevel;   // Overall level for SMS
  eiScore?: number;                   // Effective Implementation score
  categoryScores?: Record<string, number>;

  // Audit fields
  createdById: string;
  createdAt: Date;
  lastModifiedById: string;
  lastModifiedAt: Date;

  // Relationships
  reviewId?: string;                  // If part of peer review
  previousAssessmentId?: string;      // For tracking improvements
}

/**
 * Assessment with related data
 */
export interface AssessmentWithRelations extends Assessment {
  organization: {
    id: string;
    name: string;
    code: string;
  };
  questionnaire: {
    id: string;
    code: string;
    titleEn: string;
    titleFr: string;
    type: QuestionnaireType;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  responses?: AssessmentResponse[];
  _count?: {
    responses: number;
  };
}

/**
 * Individual question response within an assessment
 */
export interface AssessmentResponse {
  id: string;
  assessmentId: string;
  questionId: string;

  // Response data (one of these based on questionnaire type)
  responseValue: ANSResponseValue | null;  // For ANS USOAP CMA
  maturityLevel: SMSMaturityLevel;         // For SMS CANSO SoE
  score?: number;                          // Calculated score

  // Evidence and documentation
  evidenceDescription?: string;
  evidenceUrls: string[];

  // Comments
  assessorComments?: string;               // Official assessor comments
  internalNotes?: string;                  // Private notes (not shared)

  // Audit trail
  respondedById: string;
  respondedAt: Date;
  lastModifiedAt: Date;

  // Status
  isComplete: boolean;                     // Has required evidence
  needsReview: boolean;                    // Flagged for review
}

/**
 * Response with question details
 */
export interface AssessmentResponseWithQuestion extends AssessmentResponse {
  question: {
    id: string;
    pqNumber?: string;
    questionTextEn: string;
    questionTextFr: string;
    auditArea?: USOAPAuditArea;
    criticalElement?: CriticalElement;
    smsComponent?: SMSComponent;
    studyArea?: CANSOStudyArea;
    isPriorityPQ: boolean;
    requiresOnSite: boolean;
    weight: number;
  };
}

/**
 * Evidence attached to an assessment response
 */
export interface AssessmentEvidence {
  id: string;
  responseId: string;
  assessmentId: string;

  // Evidence details
  type: EvidenceType;
  title: string;
  description?: string;

  // File information
  fileUrl?: string;
  fileName?: string;
  fileType?: string;           // MIME type
  fileSize?: number;           // Bytes

  // Reference information
  documentReference?: string;  // Internal doc reference
  icaoReference?: string;      // ICAO document reference
  externalUrl?: string;        // Link to external resource

  // Audit
  uploadedById: string;
  uploadedAt: Date;

  // Validity
  validFrom?: Date;
  validUntil?: Date;
  isVerified: boolean;
}

// =============================================================================
// PROGRESS & STATISTICS
// =============================================================================

/**
 * Assessment progress tracking
 */
export interface AssessmentProgress {
  assessmentId: string;
  questionnaireType: QuestionnaireType;

  // Overall progress
  totalQuestions: number;
  answeredQuestions: number;       // Has a response value
  completedQuestions: number;      // Has response + evidence
  skippedQuestions: number;        // Marked as N/A
  percentComplete: number;         // 0-100
  percentAnswered: number;         // 0-100

  // Progress by category
  categoryProgress: CategoryProgress[];

  // Progress by audit area (ANS) or component (SMS)
  elementProgress: ElementProgress[];

  // Time tracking
  estimatedTimeRemaining?: number; // Minutes
  averageTimePerQuestion?: number; // Minutes
  lastActivityAt?: Date;
}

/**
 * Progress within a category
 */
export interface CategoryProgress {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  total: number;
  answered: number;
  completed: number;
  percentComplete: number;
}

/**
 * Progress by audit area (ANS) or SMS component
 */
export interface ElementProgress {
  element: string;                          // Audit area code or SMS component
  elementName: string;
  total: number;
  answered: number;
  completed: number;

  // ANS-specific
  satisfactoryCount?: number;
  notSatisfactoryCount?: number;
  notApplicableCount?: number;
  eiScore?: number;

  // SMS-specific
  maturityDistribution?: Record<string, number>; // A, B, C, D, E counts
  averageMaturity?: number;                      // 1-5 scale
  maturityLevel?: SMSMaturityLevel;
}

// =============================================================================
// SCORING INTERFACES
// =============================================================================

/**
 * EI Score calculation result (USOAP CMA)
 */
export interface EIScoreResult {
  overallEI: number;                              // 0-100 percentage
  totalApplicable: number;                        // Total - N/A
  satisfactoryCount: number;
  notSatisfactoryCount: number;
  notApplicableCount: number;
  notReviewedCount: number;

  // By audit area
  auditAreaScores: Record<USOAPAuditArea, {
    ei: number;
    satisfactory: number;
    notSatisfactory: number;
    notApplicable: number;
    total: number;
  }>;

  // By critical element
  criticalElementScores: Record<CriticalElement, {
    ei: number;
    satisfactory: number;
    notSatisfactory: number;
    total: number;
  }>;

  // Priority PQ metrics
  priorityPQScore?: number;
}

/**
 * SMS Maturity calculation result (CANSO SoE)
 */
export interface SMSMaturityResult {
  overallLevel: SMSMaturityLevel;
  overallScore: number;                           // 1-5 scale
  overallPercentage: number;                      // 0-100

  // By component (weighted)
  componentLevels: Record<SMSComponent, {
    level: SMSMaturityLevel;
    score: number;
    weight: number;
    weightedScore: number;
    questionCount: number;
  }>;

  // By study area
  studyAreaLevels: Record<CANSOStudyArea, {
    level: SMSMaturityLevel;
    score: number;
    questionCount: number;
  }>;

  // Distribution
  maturityDistribution: Record<string, number>;   // Count per level

  // Gaps identified
  gapAreas: string[];                             // Areas below target
}

/**
 * Combined score summary
 */
export interface AssessmentScoreSummary {
  assessmentId: string;
  questionnaireType: QuestionnaireType;
  calculatedAt: Date;

  // For ANS
  eiScore?: EIScoreResult;

  // For SMS
  smsMaturity?: SMSMaturityResult;

  // Comparison with previous
  previousScore?: number;
  scoreDelta?: number;
  trend: "IMPROVING" | "DECLINING" | "STABLE" | "NEW";
}

// =============================================================================
// FILTER & QUERY INTERFACES
// =============================================================================

/**
 * Assessment list filters
 */
export interface AssessmentFilters {
  organizationId?: string;
  questionnaireId?: string;
  questionnaireType?: QuestionnaireType;
  assessmentType?: AssessmentType;
  status?: AssessmentStatus | AssessmentStatus[];
  createdById?: string;

  // Date filters
  startedAfter?: Date;
  startedBefore?: Date;
  dueAfter?: Date;
  dueBefore?: Date;

  // Score filters
  minScore?: number;
  maxScore?: number;

  // Search
  search?: string;
}

/**
 * Response filters for querying
 */
export interface ResponseFilters {
  assessmentId: string;
  questionId?: string;
  responseValue?: ANSResponseValue;
  maturityLevel?: SMSMaturityLevel;
  isComplete?: boolean;
  needsReview?: boolean;

  // ANS filters
  auditArea?: USOAPAuditArea;
  criticalElement?: CriticalElement;
  isPriorityPQ?: boolean;

  // SMS filters
  smsComponent?: SMSComponent;
  studyArea?: CANSOStudyArea;
}

// =============================================================================
// INPUT/OUTPUT TYPES
// =============================================================================
// Note: Primary input types are defined in schemas.ts via Zod inference
// The following are additional interface types not covered by Zod schemas

/**
 * Input for bulk response update (interface version)
 */
export interface BulkResponseInput {
  assessmentId: string;
  responses: {
    questionId: string;
    responseValue?: ANSResponseValue;
    maturityLevel?: SMSMaturityLevel;
  }[];
}
