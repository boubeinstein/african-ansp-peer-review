/**
 * Peer Review Module Types
 *
 * TypeScript types and Zod schemas for the peer review system including
 * reviews, team assignments, findings, and corrective action plans.
 */

import { z } from "zod";

// =============================================================================
// ENUMS
// =============================================================================

export const ReviewStatus = {
  DRAFT: "DRAFT",
  REQUESTED: "REQUESTED",
  SCHEDULED: "SCHEDULED",
  CONFIRMED: "CONFIRMED",
  IN_PROGRESS: "IN_PROGRESS",
  REPORT_DRAFT: "REPORT_DRAFT",
  REPORT_REVIEW: "REPORT_REVIEW",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const ReviewType = {
  FULL: "FULL",
  FOCUSED: "FOCUSED",
  FOLLOW_UP: "FOLLOW_UP",
} as const;

export type ReviewType = (typeof ReviewType)[keyof typeof ReviewType];

export const ReviewLocationType = {
  ON_SITE: "ON_SITE",
  REMOTE: "REMOTE",
  HYBRID: "HYBRID",
} as const;

export type ReviewLocationType = (typeof ReviewLocationType)[keyof typeof ReviewLocationType];

export const FindingType = {
  NON_CONFORMITY: "NON_CONFORMITY",
  OBSERVATION: "OBSERVATION",
  GOOD_PRACTICE: "GOOD_PRACTICE",
  RECOMMENDATION: "RECOMMENDATION",
} as const;

export type FindingType = (typeof FindingType)[keyof typeof FindingType];

export const FindingSeverity = {
  CRITICAL: "CRITICAL",
  MAJOR: "MAJOR",
  MINOR: "MINOR",
  OBSERVATION: "OBSERVATION",
} as const;

export type FindingSeverity = (typeof FindingSeverity)[keyof typeof FindingSeverity];

export const CAPStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  IN_PROGRESS: "IN_PROGRESS",
  VERIFICATION: "VERIFICATION",
  CLOSED: "CLOSED",
  REJECTED: "REJECTED",
} as const;

export type CAPStatus = (typeof CAPStatus)[keyof typeof CAPStatus];

export const ReviewTeamRole = {
  LEAD_REVIEWER: "LEAD_REVIEWER",
  PEER_REVIEWER: "PEER_REVIEWER",
  OBSERVER: "OBSERVER",
  TECHNICAL_EXPERT: "TECHNICAL_EXPERT",
} as const;

export type ReviewTeamRole = (typeof ReviewTeamRole)[keyof typeof ReviewTeamRole];

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

// Review Request Schema
export const reviewRequestSchema = z.object({
  hostOrganizationId: z.string().uuid(),
  reviewType: z.nativeEnum(ReviewType),
  locationType: z.nativeEnum(ReviewLocationType),
  requestedStartDate: z.string().datetime().optional(),
  requestedEndDate: z.string().datetime().optional(),
  focusAreas: z.array(z.string()).optional(),
  objectives: z.string().optional(),
  specialRequirements: z.string().optional(),
});

export type ReviewRequest = z.infer<typeof reviewRequestSchema>;

// Review Update Schema
export const reviewUpdateSchema = z.object({
  status: z.nativeEnum(ReviewStatus).optional(),
  locationType: z.nativeEnum(ReviewLocationType).optional(),
  scheduledStartDate: z.string().datetime().optional(),
  scheduledEndDate: z.string().datetime().optional(),
  actualStartDate: z.string().datetime().optional(),
  actualEndDate: z.string().datetime().optional(),
  focusAreas: z.array(z.string()).optional(),
  objectives: z.string().optional(),
  specialRequirements: z.string().optional(),
});

export type ReviewUpdate = z.infer<typeof reviewUpdateSchema>;

// Team Member Assignment Schema
export const teamMemberAssignmentSchema = z.object({
  reviewId: z.string().uuid(),
  reviewerProfileId: z.string().uuid(),
  role: z.nativeEnum(ReviewTeamRole),
  assignedAreas: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export type TeamMemberAssignment = z.infer<typeof teamMemberAssignmentSchema>;

// Finding Schema
export const findingSchema = z.object({
  reviewId: z.string().uuid(),
  findingType: z.nativeEnum(FindingType),
  severity: z.nativeEnum(FindingSeverity).optional(),
  referenceNumber: z.string().optional(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  requirement: z.string().optional(),
  evidence: z.string().optional(),
  areaOfConcern: z.string().optional(),
  recommendation: z.string().optional(),
  rootCause: z.string().optional(),
});

export type FindingInput = z.infer<typeof findingSchema>;

// Finding Update Schema
export const findingUpdateSchema = findingSchema.partial().extend({
  status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED", "VERIFIED"]).optional(),
});

export type FindingUpdate = z.infer<typeof findingUpdateSchema>;

// CAP Schema
export const capSchema = z.object({
  findingId: z.string().uuid(),
  actionDescription: z.string().min(1),
  responsiblePerson: z.string().optional(),
  targetCompletionDate: z.string().datetime().optional(),
  resources: z.string().optional(),
  milestones: z.string().optional(),
});

export type CAPInput = z.infer<typeof capSchema>;

// CAP Update Schema
export const capUpdateSchema = capSchema.partial().extend({
  status: z.nativeEnum(CAPStatus).optional(),
  actualCompletionDate: z.string().datetime().optional(),
  verificationNotes: z.string().optional(),
  evidenceDescription: z.string().optional(),
});

export type CAPUpdate = z.infer<typeof capUpdateSchema>;

// =============================================================================
// DISPLAY TYPES
// =============================================================================

export interface PeerReviewSummary {
  id: string;
  referenceNumber: string;
  reviewType: ReviewType;
  status: ReviewStatus;
  hostOrganization: {
    id: string;
    nameEn: string;
    nameFr: string;
    icaoCode: string | null;
  };
  scheduledStartDate: Date | null;
  scheduledEndDate: Date | null;
  leadReviewer: {
    id: string;
    fullName: string;
  } | null;
  teamSize: number;
  findingsCount: number;
  createdAt: Date;
}

export interface PeerReviewDetail extends PeerReviewSummary {
  locationType: ReviewLocationType;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  focusAreas: string[];
  objectives: string | null;
  specialRequirements: string | null;
  teamMembers: ReviewTeamMemberDetail[];
  findings: FindingSummary[];
  createdBy: {
    id: string;
    name: string;
  };
  updatedAt: Date;
}

export interface ReviewTeamMemberDetail {
  id: string;
  role: ReviewTeamRole;
  assignedAreas: string[];
  confirmedAt: Date | null;
  reviewer: {
    id: string;
    fullName: string;
    organization: string;
    expertiseAreas: string[];
    languages: string[];
    isLeadQualified: boolean;
  };
}

export interface FindingSummary {
  id: string;
  referenceNumber: string | null;
  findingType: FindingType;
  severity: FindingSeverity | null;
  title: string;
  status: string;
  areaOfConcern: string | null;
  hasCAP: boolean;
  createdAt: Date;
}

export interface FindingDetail extends FindingSummary {
  description: string;
  requirement: string | null;
  evidence: string | null;
  recommendation: string | null;
  rootCause: string | null;
  attachments: FindingAttachmentInfo[];
  correctiveActionPlan: CAPDetail | null;
  raisedBy: {
    id: string;
    name: string;
  };
  updatedAt: Date;
}

export interface FindingAttachmentInfo {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  uploadedBy: {
    id: string;
    name: string;
  };
}

export interface CAPDetail {
  id: string;
  status: CAPStatus;
  actionDescription: string;
  responsiblePerson: string | null;
  targetCompletionDate: Date | null;
  actualCompletionDate: Date | null;
  resources: string | null;
  milestones: string | null;
  verificationNotes: string | null;
  evidenceDescription: string | null;
  submittedAt: Date | null;
  approvedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getReviewStatusColor(status: ReviewStatus): string {
  const colors: Record<ReviewStatus, string> = {
    DRAFT: "gray",
    REQUESTED: "yellow",
    SCHEDULED: "blue",
    CONFIRMED: "indigo",
    IN_PROGRESS: "purple",
    REPORT_DRAFT: "orange",
    REPORT_REVIEW: "amber",
    COMPLETED: "green",
    CANCELLED: "red",
  };
  return colors[status] || "gray";
}

export function getReviewTypeLabel(type: ReviewType): string {
  const labels: Record<ReviewType, string> = {
    FULL: "Full Review",
    FOCUSED: "Focused Review",
    FOLLOW_UP: "Follow-up Review",
  };
  return labels[type] || type;
}

export function getFindingTypeColor(type: FindingType): string {
  const colors: Record<FindingType, string> = {
    NON_CONFORMITY: "red",
    OBSERVATION: "yellow",
    GOOD_PRACTICE: "green",
    RECOMMENDATION: "blue",
  };
  return colors[type] || "gray";
}

export function getFindingSeverityColor(severity: FindingSeverity): string {
  const colors: Record<FindingSeverity, string> = {
    CRITICAL: "red",
    MAJOR: "orange",
    MINOR: "yellow",
    OBSERVATION: "blue",
  };
  return colors[severity] || "gray";
}

export function getCAPStatusColor(status: CAPStatus): string {
  const colors: Record<CAPStatus, string> = {
    DRAFT: "gray",
    SUBMITTED: "blue",
    UNDER_REVIEW: "yellow",
    APPROVED: "indigo",
    IN_PROGRESS: "purple",
    VERIFICATION: "orange",
    CLOSED: "green",
    REJECTED: "red",
  };
  return colors[status] || "gray";
}

// =============================================================================
// WORKFLOW HELPERS
// =============================================================================

export const REVIEW_STATUS_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  DRAFT: ["REQUESTED", "CANCELLED"],
  REQUESTED: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["CONFIRMED", "REQUESTED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "SCHEDULED", "CANCELLED"],
  IN_PROGRESS: ["REPORT_DRAFT", "CANCELLED"],
  REPORT_DRAFT: ["REPORT_REVIEW"],
  REPORT_REVIEW: ["COMPLETED", "REPORT_DRAFT"],
  COMPLETED: [],
  CANCELLED: [],
};

export const CAP_STATUS_TRANSITIONS: Record<CAPStatus, CAPStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "DRAFT"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["IN_PROGRESS"],
  IN_PROGRESS: ["VERIFICATION"],
  VERIFICATION: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
  REJECTED: ["DRAFT"],
};

export function canTransitionReviewTo(
  currentStatus: ReviewStatus,
  targetStatus: ReviewStatus
): boolean {
  return REVIEW_STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}

export function canTransitionCAPTo(
  currentStatus: CAPStatus,
  targetStatus: CAPStatus
): boolean {
  return CAP_STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}
