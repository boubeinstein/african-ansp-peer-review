/**
 * Client-safe Prisma Enum Types
 * 
 * This file provides browser-safe versions of all Prisma enums.
 * DO NOT import @/types/prisma-enums in client components - use these instead.
 * 
 * Values MUST match exactly what's defined in prisma/schema.prisma
 * 
 * Last synced with schema: February 2026
 */

// =============================================================================
// USER & SETTINGS ENUMS
// =============================================================================

export const Locale = {
  EN: "EN",
  FR: "FR",
} as const;
export type Locale = (typeof Locale)[keyof typeof Locale];

export const Theme = {
  LIGHT: "LIGHT",
  DARK: "DARK",
  SYSTEM: "SYSTEM",
} as const;
export type Theme = (typeof Theme)[keyof typeof Theme];

export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  STEERING_COMMITTEE: "STEERING_COMMITTEE",
  PROGRAMME_COORDINATOR: "PROGRAMME_COORDINATOR",
  LEAD_REVIEWER: "LEAD_REVIEWER",
  PEER_REVIEWER: "PEER_REVIEWER",
  OBSERVER: "OBSERVER",
  ANSP_ADMIN: "ANSP_ADMIN",
  SAFETY_MANAGER: "SAFETY_MANAGER",
  QUALITY_MANAGER: "QUALITY_MANAGER",
  STAFF: "STAFF",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// =============================================================================
// ORGANIZATION ENUMS
// =============================================================================

export const AfricanRegion = {
  WACAF: "WACAF",
  ESAF: "ESAF",
  NORTHERN: "NORTHERN",
} as const;
export type AfricanRegion = (typeof AfricanRegion)[keyof typeof AfricanRegion];

export const MembershipStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  INACTIVE: "INACTIVE",
} as const;
export type MembershipStatus = (typeof MembershipStatus)[keyof typeof MembershipStatus];

export const ParticipationStatus = {
  REGISTERED: "REGISTERED",
  APPLIED: "APPLIED",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  REJECTED: "REJECTED",
} as const;
export type ParticipationStatus = (typeof ParticipationStatus)[keyof typeof ParticipationStatus];

export const JoinRequestStatus = {
  PENDING: "PENDING",
  COORDINATOR_REVIEW: "COORDINATOR_REVIEW",
  SC_REVIEW: "SC_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  MORE_INFO: "MORE_INFO",
  WITHDRAWN: "WITHDRAWN",
} as const;
export type JoinRequestStatus = (typeof JoinRequestStatus)[keyof typeof JoinRequestStatus];

export const JoinRequestType = {
  PROGRAMME_JOIN: "PROGRAMME_JOIN",
  USER_ACCESS: "USER_ACCESS",
} as const;
export type JoinRequestType = (typeof JoinRequestType)[keyof typeof JoinRequestType];

// =============================================================================
// QUESTIONNAIRE ENUMS
// =============================================================================

export const QuestionnaireType = {
  ANS_USOAP_CMA: "ANS_USOAP_CMA",
  SMS_CANSO_SOE: "SMS_CANSO_SOE",
} as const;
export type QuestionnaireType = (typeof QuestionnaireType)[keyof typeof QuestionnaireType];

export const USOAPAuditArea = {
  LEG: "LEG",
  ORG: "ORG",
  PEL: "PEL",
  OPS: "OPS",
  AIR: "AIR",
  AIG: "AIG",
  ANS: "ANS",
  AGA: "AGA",
  SSP: "SSP",
} as const;
export type USOAPAuditArea = (typeof USOAPAuditArea)[keyof typeof USOAPAuditArea];

export const ANSReviewArea = {
  ATS: "ATS",
  FPD: "FPD",
  AIS: "AIS",
  MAP: "MAP",
  MET: "MET",
  CNS: "CNS",
  SAR: "SAR",
  SMS: "SMS",
} as const;
export type ANSReviewArea = (typeof ANSReviewArea)[keyof typeof ANSReviewArea];

export const CriticalElement = {
  CE_1: "CE_1",
  CE_2: "CE_2",
  CE_3: "CE_3",
  CE_4: "CE_4",
  CE_5: "CE_5",
  CE_6: "CE_6",
  CE_7: "CE_7",
  CE_8: "CE_8",
} as const;
export type CriticalElement = (typeof CriticalElement)[keyof typeof CriticalElement];

export const SMSComponent = {
  SAFETY_POLICY_OBJECTIVES: "SAFETY_POLICY_OBJECTIVES",
  SAFETY_RISK_MANAGEMENT: "SAFETY_RISK_MANAGEMENT",
  SAFETY_ASSURANCE: "SAFETY_ASSURANCE",
  SAFETY_PROMOTION: "SAFETY_PROMOTION",
} as const;
export type SMSComponent = (typeof SMSComponent)[keyof typeof SMSComponent];

export const CANSOStudyArea = {
  SA_1_1: "SA_1_1",
  SA_1_2: "SA_1_2",
  SA_1_3: "SA_1_3",
  SA_1_4: "SA_1_4",
  SA_1_5: "SA_1_5",
  SA_2_1: "SA_2_1",
  SA_2_2: "SA_2_2",
  SA_3_1: "SA_3_1",
  SA_3_2: "SA_3_2",
  SA_3_3: "SA_3_3",
  SA_4_1: "SA_4_1",
  SA_4_2: "SA_4_2",
} as const;
export type CANSOStudyArea = (typeof CANSOStudyArea)[keyof typeof CANSOStudyArea];

export const TransversalArea = {
  SPM: "SPM",
  HP: "HP",
  CI: "CI",
} as const;
export type TransversalArea = (typeof TransversalArea)[keyof typeof TransversalArea];

export const MaturityLevel = {
  LEVEL_A: "LEVEL_A",
  LEVEL_B: "LEVEL_B",
  LEVEL_C: "LEVEL_C",
  LEVEL_D: "LEVEL_D",
  LEVEL_E: "LEVEL_E",
} as const;
export type MaturityLevel = (typeof MaturityLevel)[keyof typeof MaturityLevel];

export const PQAmendmentStatus = {
  NO_CHANGE: "NO_CHANGE",
  REVISED: "REVISED",
  NEW: "NEW",
  MERGED: "MERGED",
  DELETED: "DELETED",
  REFERENCE_REVISED: "REFERENCE_REVISED",
} as const;
export type PQAmendmentStatus = (typeof PQAmendmentStatus)[keyof typeof PQAmendmentStatus];

export const ResponseType = {
  SATISFACTORY_NOT: "SATISFACTORY_NOT",
  MATURITY_LEVEL: "MATURITY_LEVEL",
  YES_NO: "YES_NO",
  SCALE_1_5: "SCALE_1_5",
  TEXT: "TEXT",
  MULTI_SELECT: "MULTI_SELECT",
} as const;
export type ResponseType = (typeof ResponseType)[keyof typeof ResponseType];

export const ICAOReferenceType = {
  CC: "CC",
  STD: "STD",
  RP: "RP",
  PANS: "PANS",
  GM: "GM",
  Cir: "Cir",
  SUPPS: "SUPPS",
} as const;
export type ICAOReferenceType = (typeof ICAOReferenceType)[keyof typeof ICAOReferenceType];

// =============================================================================
// REVIEWER ENUMS
// =============================================================================

export const ReviewerStatus = {
  NOMINATED: "NOMINATED",
  SELECTED: "SELECTED",
  IN_TRAINING: "IN_TRAINING",
  CERTIFIED: "CERTIFIED",
  LEAD_QUALIFIED: "LEAD_QUALIFIED",
  INACTIVE: "INACTIVE",
  RETIRED: "RETIRED",
} as const;
export type ReviewerStatus = (typeof ReviewerStatus)[keyof typeof ReviewerStatus];

export const ReviewerSelectionStatus = {
  NOMINATED: "NOMINATED",
  UNDER_REVIEW: "UNDER_REVIEW",
  SELECTED: "SELECTED",
  INACTIVE: "INACTIVE",
  WITHDRAWN: "WITHDRAWN",
  REJECTED: "REJECTED",
} as const;
export type ReviewerSelectionStatus = (typeof ReviewerSelectionStatus)[keyof typeof ReviewerSelectionStatus];

export const ReviewerType = {
  PEER_REVIEWER: "PEER_REVIEWER",
  LEAD_REVIEWER: "LEAD_REVIEWER",
  SENIOR_REVIEWER: "SENIOR_REVIEWER",
  OBSERVER: "OBSERVER",
} as const;
export type ReviewerType = (typeof ReviewerType)[keyof typeof ReviewerType];

export const ContactMethod = {
  EMAIL: "EMAIL",
  PHONE: "PHONE",
  WHATSAPP: "WHATSAPP",
  TEAMS: "TEAMS",
} as const;
export type ContactMethod = (typeof ContactMethod)[keyof typeof ContactMethod];

export const ProficiencyLevel = {
  BASIC: "BASIC",
  COMPETENT: "COMPETENT",
  PROFICIENT: "PROFICIENT",
  EXPERT: "EXPERT",
} as const;
export type ProficiencyLevel = (typeof ProficiencyLevel)[keyof typeof ProficiencyLevel];

export const AvailabilityType = {
  AVAILABLE: "AVAILABLE",
  TENTATIVE: "TENTATIVE",
  UNAVAILABLE: "UNAVAILABLE",
  ON_ASSIGNMENT: "ON_ASSIGNMENT",
} as const;
export type AvailabilityType = (typeof AvailabilityType)[keyof typeof AvailabilityType];

export const COIType = {
  EMPLOYMENT: "EMPLOYMENT",
  FINANCIAL: "FINANCIAL",
  CONTRACTUAL: "CONTRACTUAL",
  PERSONAL: "PERSONAL",
  PREVIOUS_REVIEW: "PREVIOUS_REVIEW",
  OTHER: "OTHER",
  HOME_ORGANIZATION: "HOME_ORGANIZATION",
  FAMILY_RELATIONSHIP: "FAMILY_RELATIONSHIP",
  FORMER_EMPLOYEE: "FORMER_EMPLOYEE",
  BUSINESS_INTEREST: "BUSINESS_INTEREST",
  RECENT_REVIEW: "RECENT_REVIEW",
} as const;
export type COIType = (typeof COIType)[keyof typeof COIType];

export const COISeverity = {
  HARD_BLOCK: "HARD_BLOCK",
  SOFT_WARNING: "SOFT_WARNING",
} as const;
export type COISeverity = (typeof COISeverity)[keyof typeof COISeverity];

export const ExpertiseArea = {
  ATS: "ATS",
  AIM_AIS: "AIM_AIS",
  FPD: "FPD",
  MAP: "MAP",
  MET: "MET",
  CNS: "CNS",
  PANS_OPS: "PANS_OPS",
  SAR: "SAR",
  SMS_POLICY: "SMS_POLICY",
  SMS_RISK: "SMS_RISK",
  SMS_ASSURANCE: "SMS_ASSURANCE",
  SMS_PROMOTION: "SMS_PROMOTION",
  AERODROME: "AERODROME",
  RFF: "RFF",
  ENGINEERING: "ENGINEERING",
  QMS: "QMS",
  TRAINING: "TRAINING",
  HUMAN_FACTORS: "HUMAN_FACTORS",
} as const;
export type ExpertiseArea = (typeof ExpertiseArea)[keyof typeof ExpertiseArea];

export const Language = {
  EN: "EN",
  FR: "FR",
  AR: "AR",
  PT: "PT",
  ES: "ES",
} as const;
export type Language = (typeof Language)[keyof typeof Language];

export const LanguageProficiency = {
  BASIC: "BASIC",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
  NATIVE: "NATIVE",
} as const;
export type LanguageProficiency = (typeof LanguageProficiency)[keyof typeof LanguageProficiency];

export const CertificationType = {
  PEER_REVIEWER: "PEER_REVIEWER",
  LEAD_REVIEWER: "LEAD_REVIEWER",
  SMS_ASSESSOR: "SMS_ASSESSOR",
  ICAO_AUDITOR: "ICAO_AUDITOR",
  CANSO_TRAINER: "CANSO_TRAINER",
  ATC_LICENSE: "ATC_LICENSE",
  OTHER: "OTHER",
} as const;
export type CertificationType = (typeof CertificationType)[keyof typeof CertificationType];

export const TrainingType = {
  INITIAL_REVIEWER: "INITIAL_REVIEWER",
  REFRESHER: "REFRESHER",
  LEAD_REVIEWER: "LEAD_REVIEWER",
  SMS_ASSESSMENT: "SMS_ASSESSMENT",
  USOAP_CMA: "USOAP_CMA",
  CANSO_SOE: "CANSO_SOE",
  SPECIALIZED: "SPECIALIZED",
} as const;
export type TrainingType = (typeof TrainingType)[keyof typeof TrainingType];

export const TrainingStatus = {
  SCHEDULED: "SCHEDULED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  INCOMPLETE: "INCOMPLETE",
  CANCELLED: "CANCELLED",
} as const;
export type TrainingStatus = (typeof TrainingStatus)[keyof typeof TrainingStatus];

// =============================================================================
// ASSESSMENT ENUMS
// =============================================================================

export const AssessmentType = {
  SELF_ASSESSMENT: "SELF_ASSESSMENT",
  PEER_REVIEW: "PEER_REVIEW",
  GAP_ANALYSIS: "GAP_ANALYSIS",
  FOLLOW_UP: "FOLLOW_UP",
} as const;
export type AssessmentType = (typeof AssessmentType)[keyof typeof AssessmentType];

export const AssessmentStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED",
} as const;
export type AssessmentStatus = (typeof AssessmentStatus)[keyof typeof AssessmentStatus];

// =============================================================================
// REVIEW ENUMS
// =============================================================================

export const ReviewType = {
  FULL: "FULL",
  FOCUSED: "FOCUSED",
  FOLLOW_UP: "FOLLOW_UP",
  SURVEILLANCE: "SURVEILLANCE",
} as const;
export type ReviewType = (typeof ReviewType)[keyof typeof ReviewType];

export const ReviewLocationType = {
  ON_SITE: "ON_SITE",
  REMOTE: "REMOTE",
  HYBRID: "HYBRID",
} as const;
export type ReviewLocationType = (typeof ReviewLocationType)[keyof typeof ReviewLocationType];

export const LanguagePreference = {
  EN: "EN",
  FR: "FR",
  BOTH: "BOTH",
} as const;
export type LanguagePreference = (typeof LanguagePreference)[keyof typeof LanguagePreference];

export const ReviewStatus = {
  REQUESTED: "REQUESTED",
  APPROVED: "APPROVED",
  PLANNING: "PLANNING",
  SCHEDULED: "SCHEDULED",
  IN_PROGRESS: "IN_PROGRESS",
  REPORT_DRAFTING: "REPORT_DRAFTING",
  REPORT_REVIEW: "REPORT_REVIEW",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const ApprovalStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  DEFERRED: "DEFERRED",
} as const;
export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const ReviewPhase = {
  PLANNING: "PLANNING",
  PREPARATION: "PREPARATION",
  ON_SITE: "ON_SITE",
  REPORTING: "REPORTING",
  FOLLOW_UP: "FOLLOW_UP",
  CLOSED: "CLOSED",
} as const;
export type ReviewPhase = (typeof ReviewPhase)[keyof typeof ReviewPhase];

export const FieldworkPhase = {
  PRE_VISIT: "PRE_VISIT",
  ON_SITE: "ON_SITE",
  POST_VISIT: "POST_VISIT",
} as const;
export type FieldworkPhase = (typeof FieldworkPhase)[keyof typeof FieldworkPhase];

export const TeamRole = {
  LEAD_REVIEWER: "LEAD_REVIEWER",
  REVIEWER: "REVIEWER",
  TECHNICAL_EXPERT: "TECHNICAL_EXPERT",
  OBSERVER: "OBSERVER",
  TRAINEE: "TRAINEE",
} as const;
export type TeamRole = (typeof TeamRole)[keyof typeof TeamRole];

export const InvitationStatus = {
  PENDING: "PENDING",
  INVITED: "INVITED",
  CONFIRMED: "CONFIRMED",
  DECLINED: "DECLINED",
  WITHDRAWN: "WITHDRAWN",
} as const;
export type InvitationStatus = (typeof InvitationStatus)[keyof typeof InvitationStatus];

// =============================================================================
// FINDING ENUMS
// =============================================================================

export const FindingType = {
  NON_CONFORMITY: "NON_CONFORMITY",
  OBSERVATION: "OBSERVATION",
  RECOMMENDATION: "RECOMMENDATION",
  GOOD_PRACTICE: "GOOD_PRACTICE",
  CONCERN: "CONCERN",
} as const;
export type FindingType = (typeof FindingType)[keyof typeof FindingType];

export const FindingSeverity = {
  CRITICAL: "CRITICAL",
  MAJOR: "MAJOR",
  MINOR: "MINOR",
  OBSERVATION: "OBSERVATION",
} as const;
export type FindingSeverity = (typeof FindingSeverity)[keyof typeof FindingSeverity];

export const FindingStatus = {
  OPEN: "OPEN",
  CAP_REQUIRED: "CAP_REQUIRED",
  CAP_SUBMITTED: "CAP_SUBMITTED",
  CAP_ACCEPTED: "CAP_ACCEPTED",
  IN_PROGRESS: "IN_PROGRESS",
  VERIFICATION: "VERIFICATION",
  CLOSED: "CLOSED",
  DEFERRED: "DEFERRED",
} as const;
export type FindingStatus = (typeof FindingStatus)[keyof typeof FindingStatus];

// =============================================================================
// CAP ENUMS
// =============================================================================

export const CAPStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  VERIFIED: "VERIFIED",
  CLOSED: "CLOSED",
} as const;
export type CAPStatus = (typeof CAPStatus)[keyof typeof CAPStatus];

export const MilestoneStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  OVERDUE: "OVERDUE",
  CANCELLED: "CANCELLED",
} as const;
export type MilestoneStatus = (typeof MilestoneStatus)[keyof typeof MilestoneStatus];

// =============================================================================
// EVIDENCE ENUMS
// =============================================================================

export const EvidenceCategory = {
  PROCEDURE_UPDATE: "PROCEDURE_UPDATE",
  TRAINING_RECORD: "TRAINING_RECORD",
  PHOTO: "PHOTO",
  REPORT: "REPORT",
  OTHER: "OTHER",
} as const;
export type EvidenceCategory = (typeof EvidenceCategory)[keyof typeof EvidenceCategory];

export const EvidenceStatus = {
  PENDING: "PENDING",
  UNDER_REVIEW: "UNDER_REVIEW",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  MORE_INFO_REQUIRED: "MORE_INFO_REQUIRED",
} as const;
export type EvidenceStatus = (typeof EvidenceStatus)[keyof typeof EvidenceStatus];

// =============================================================================
// DOCUMENT ENUMS
// =============================================================================

export const ResourceType = {
  DOCUMENT: "DOCUMENT",
  VIDEO: "VIDEO",
  PRESENTATION: "PRESENTATION",
  CHECKLIST: "CHECKLIST",
  TEMPLATE: "TEMPLATE",
  EXTERNAL_LINK: "EXTERNAL_LINK",
} as const;
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

export const DocumentCategory = {
  POLICY: "POLICY",
  PROCEDURE: "PROCEDURE",
  RECORD: "RECORD",
  CERTIFICATE: "CERTIFICATE",
  REPORT: "REPORT",
  TRAINING: "TRAINING",
  EVIDENCE: "EVIDENCE",
  OTHER: "OTHER",
  PRE_VISIT_REQUEST: "PRE_VISIT_REQUEST",
  HOST_SUBMISSION: "HOST_SUBMISSION",
  INTERVIEW_NOTES: "INTERVIEW_NOTES",
  DRAFT_REPORT: "DRAFT_REPORT",
  FINAL_REPORT: "FINAL_REPORT",
  CAP_EVIDENCE: "CAP_EVIDENCE",
  CORRESPONDENCE: "CORRESPONDENCE",
} as const;
export type DocumentCategory = (typeof DocumentCategory)[keyof typeof DocumentCategory];

export const DocumentStatus = {
  UPLOADED: "UPLOADED",
  UNDER_REVIEW: "UNDER_REVIEW",
  REVIEWED: "REVIEWED",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const DocumentClassification = {
  EVIDENCE: "EVIDENCE",
  SUPPORTING: "SUPPORTING",
  REFERENCE: "REFERENCE",
  DRAFT: "DRAFT",
  TEMPLATE: "TEMPLATE",
  CORRESPONDENCE: "CORRESPONDENCE",
} as const;
export type DocumentClassification = (typeof DocumentClassification)[keyof typeof DocumentClassification];

export const HashAlgorithm = {
  SHA256: "SHA256",
  SHA512: "SHA512",
  MD5: "MD5",
} as const;
export type HashAlgorithm = (typeof HashAlgorithm)[keyof typeof HashAlgorithm];

// =============================================================================
// EVENT & NOTIFICATION ENUMS
// =============================================================================

export const EventType = {
  CREATED: "CREATED",
  STARTED: "STARTED",
  RESPONSE_SAVED: "RESPONSE_SAVED",
  EVIDENCE_ADDED: "EVIDENCE_ADDED",
  EVIDENCE_REMOVED: "EVIDENCE_REMOVED",
  STATUS_CHANGED: "STATUS_CHANGED",
  SUBMITTED: "SUBMITTED",
  REVIEWED: "REVIEWED",
  COMPLETED: "COMPLETED",
  REOPENED: "REOPENED",
  COMMENT_ADDED: "COMMENT_ADDED",
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];

export const DigestFrequency = {
  IMMEDIATE: "IMMEDIATE",
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
} as const;
export type DigestFrequency = (typeof DigestFrequency)[keyof typeof DigestFrequency];

export const NotificationType = {
  REVIEW_REQUESTED: "REVIEW_REQUESTED",
  REVIEW_APPROVED: "REVIEW_APPROVED",
  REVIEW_REJECTED: "REVIEW_REJECTED",
  TEAM_ASSIGNED: "TEAM_ASSIGNED",
  TEAM_INVITATION: "TEAM_INVITATION",
  TEAM_INVITATION_RESPONSE: "TEAM_INVITATION_RESPONSE",
  REVIEW_STATUS_CHANGED: "REVIEW_STATUS_CHANGED",
  REVIEW_DATES_CONFIRMED: "REVIEW_DATES_CONFIRMED",
  REVIEW_SCHEDULED: "REVIEW_SCHEDULED",
  REVIEW_STARTED: "REVIEW_STARTED",
  REVIEW_COMPLETED: "REVIEW_COMPLETED",
  FINDING_CREATED: "FINDING_CREATED",
  FINDING_UPDATED: "FINDING_UPDATED",
  CAP_REQUIRED: "CAP_REQUIRED",
  CAP_SUBMITTED: "CAP_SUBMITTED",
  CAP_ACCEPTED: "CAP_ACCEPTED",
  CAP_REJECTED: "CAP_REJECTED",
  CAP_DEADLINE_APPROACHING: "CAP_DEADLINE_APPROACHING",
  CAP_OVERDUE: "CAP_OVERDUE",
  CAP_VERIFIED: "CAP_VERIFIED",
  CAP_CLOSED: "CAP_CLOSED",
  REPORT_DRAFT_READY: "REPORT_DRAFT_READY",
  REPORT_SUBMITTED: "REPORT_SUBMITTED",
  REPORT_APPROVED: "REPORT_APPROVED",
  SYSTEM_ANNOUNCEMENT: "SYSTEM_ANNOUNCEMENT",
  REMINDER: "REMINDER",
  BEST_PRACTICE_PROMOTED: "BEST_PRACTICE_PROMOTED",
  MENTION: "MENTION",
  RETROSPECTIVE_SUBMITTED: "RETROSPECTIVE_SUBMITTED",
  RETROSPECTIVE_PUBLISHED: "RETROSPECTIVE_PUBLISHED",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationPriority = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;
export type NotificationPriority = (typeof NotificationPriority)[keyof typeof NotificationPriority];

// =============================================================================
// AUDIT ENUMS
// =============================================================================

export const AuditAction = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  STATUS_CHANGE: "STATUS_CHANGE",
  APPROVAL: "APPROVAL",
  REJECTION: "REJECTION",
  ASSIGNMENT: "ASSIGNMENT",
  SUBMISSION: "SUBMISSION",
  VERIFICATION: "VERIFICATION",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  LOGIN_FAILED: "LOGIN_FAILED",
  EXPORT: "EXPORT",
  VIEW_SENSITIVE: "VIEW_SENSITIVE",
  INTEGRITY_CHECK: "INTEGRITY_CHECK",
  VERSION_LOCK: "VERSION_LOCK",
  VERSION_UNLOCK: "VERSION_UNLOCK",
  TOKEN_CREATE: "TOKEN_CREATE",
  TOKEN_ACCESS: "TOKEN_ACCESS",
  TOKEN_REVOKE: "TOKEN_REVOKE",
  TOKEN_REVOKE_ALL: "TOKEN_REVOKE_ALL",
  SESSION_REVOKED: "SESSION_REVOKED",
  ALL_SESSIONS_REVOKED: "ALL_SESSIONS_REVOKED",
  ADMIN_SESSION_REVOKED: "ADMIN_SESSION_REVOKED",
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

// =============================================================================
// BEST PRACTICE ENUMS
// =============================================================================

export const BestPracticeCategory = {
  SAFETY_MANAGEMENT: "SAFETY_MANAGEMENT",
  OPERATIONAL_EFFICIENCY: "OPERATIONAL_EFFICIENCY",
  TRAINING_COMPETENCY: "TRAINING_COMPETENCY",
  TECHNOLOGY_INNOVATION: "TECHNOLOGY_INNOVATION",
  REGULATORY_COMPLIANCE: "REGULATORY_COMPLIANCE",
  STAKEHOLDER_ENGAGEMENT: "STAKEHOLDER_ENGAGEMENT",
} as const;
export type BestPracticeCategory = (typeof BestPracticeCategory)[keyof typeof BestPracticeCategory];

export const BestPracticeStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;
export type BestPracticeStatus = (typeof BestPracticeStatus)[keyof typeof BestPracticeStatus];

export const PromotionTargetType = {
  ALL_ANSPS: "ALL_ANSPS",
  BY_TEAM: "BY_TEAM",
  BY_ORGANIZATION: "BY_ORGANIZATION",
} as const;
export type PromotionTargetType = (typeof PromotionTargetType)[keyof typeof PromotionTargetType];

export const PromotionStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;
export type PromotionStatus = (typeof PromotionStatus)[keyof typeof PromotionStatus];

export const LessonStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
} as const;
export type LessonStatus = (typeof LessonStatus)[keyof typeof LessonStatus];

export const MentorshipStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
} as const;
export type MentorshipStatus = (typeof MentorshipStatus)[keyof typeof MentorshipStatus];

export const RetrospectiveStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  PUBLISHED: "PUBLISHED",
} as const;
export type RetrospectiveStatus = (typeof RetrospectiveStatus)[keyof typeof RetrospectiveStatus];

export const LessonType = {
  BEST_PRACTICE_IDENTIFIED: "BEST_PRACTICE_IDENTIFIED",
  SYSTEMIC_ISSUE: "SYSTEMIC_ISSUE",
  PROCESS_IMPROVEMENT: "PROCESS_IMPROVEMENT",
  TRAINING_GAP: "TRAINING_GAP",
  RESOURCE_CONSTRAINT: "RESOURCE_CONSTRAINT",
} as const;
export type LessonType = (typeof LessonType)[keyof typeof LessonType];

// =============================================================================
// TASK ENUMS
// =============================================================================

export const TaskStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

// =============================================================================
// SESSION ENUMS
// =============================================================================

export const SessionType = {
  FIELDWORK: "FIELDWORK",
  REMOTE: "REMOTE",
  DOCUMENT_REVIEW: "DOCUMENT_REVIEW",
  DEBRIEF: "DEBRIEF",
  PLANNING: "PLANNING",
} as const;
export type SessionType = (typeof SessionType)[keyof typeof SessionType];

export const SessionStatus = {
  SCHEDULED: "SCHEDULED",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const ParticipantRole = {
  HOST: "HOST",
  PRESENTER: "PRESENTER",
  PARTICIPANT: "PARTICIPANT",
  OBSERVER: "OBSERVER",
} as const;
export type ParticipantRole = (typeof ParticipantRole)[keyof typeof ParticipantRole];

export const ActivityType = {
  SESSION_JOIN: "SESSION_JOIN",
  SESSION_LEAVE: "SESSION_LEAVE",
  SESSION_PAUSE: "SESSION_PAUSE",
  SESSION_RESUME: "SESSION_RESUME",
  FINDING_VIEW: "FINDING_VIEW",
  FINDING_CREATE: "FINDING_CREATE",
  FINDING_EDIT: "FINDING_EDIT",
  FINDING_DELETE: "FINDING_DELETE",
  COMMENT_ADD: "COMMENT_ADD",
  COMMENT_EDIT: "COMMENT_EDIT",
  COMMENT_DELETE: "COMMENT_DELETE",
  DOCUMENT_VIEW: "DOCUMENT_VIEW",
  DOCUMENT_UPLOAD: "DOCUMENT_UPLOAD",
  DOCUMENT_ANNOTATE: "DOCUMENT_ANNOTATE",
  CURSOR_MOVE: "CURSOR_MOVE",
  SELECTION_CHANGE: "SELECTION_CHANGE",
  FOCUS_CHANGE: "FOCUS_CHANGE",
  TASK_CREATE: "TASK_CREATE",
  TASK_UPDATE: "TASK_UPDATE",
  TASK_COMPLETE: "TASK_COMPLETE",
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

// =============================================================================
// ANNOTATION ENUMS
// =============================================================================

export const AnnotationType = {
  HIGHLIGHT: "HIGHLIGHT",
  COMMENT: "COMMENT",
  DRAWING: "DRAWING",
  STAMP: "STAMP",
  TEXT: "TEXT",
} as const;
export type AnnotationType = (typeof AnnotationType)[keyof typeof AnnotationType];

// =============================================================================
// WORKFLOW ENUMS
// =============================================================================

export const WorkflowEntityType = {
  CAP: "CAP",
  FINDING: "FINDING",
  REVIEW: "REVIEW",
} as const;
export type WorkflowEntityType = (typeof WorkflowEntityType)[keyof typeof WorkflowEntityType];

export const WorkflowStateType = {
  INITIAL: "INITIAL",
  INTERMEDIATE: "INTERMEDIATE",
  TERMINAL: "TERMINAL",
  REJECTED: "REJECTED",
} as const;
export type WorkflowStateType = (typeof WorkflowStateType)[keyof typeof WorkflowStateType];

export const TransitionTrigger = {
  MANUAL: "MANUAL",
  AUTOMATIC: "AUTOMATIC",
  SCHEDULED: "SCHEDULED",
  SLA_BREACH: "SLA_BREACH",
} as const;
export type TransitionTrigger = (typeof TransitionTrigger)[keyof typeof TransitionTrigger];

export const EscalationAction = {
  NOTIFY: "NOTIFY",
  REASSIGN: "REASSIGN",
  ESCALATE: "ESCALATE",
  AUTO_REJECT: "AUTO_REJECT",
  AUTO_CLOSE: "AUTO_CLOSE",
} as const;
export type EscalationAction = (typeof EscalationAction)[keyof typeof EscalationAction];

export const SLAStatus = {
  NOT_STARTED: "NOT_STARTED",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  BREACHED: "BREACHED",
  COMPLETED: "COMPLETED",
} as const;
export type SLAStatus = (typeof SLAStatus)[keyof typeof SLAStatus];
