/**
 * Report Types
 *
 * Type definitions for the peer review report generation.
 */

import type { Locale } from "./styles";

// =============================================================================
// REVIEW DATA
// =============================================================================

export interface ReviewReportData {
  // Basic info
  id: string;
  reference: string;
  hostOrganization: OrganizationInfo;
  status: string;
  classification?: string;

  // Dates
  startDate: Date;
  endDate: Date;
  reportDate: Date;

  // Team
  leadReviewer: TeamMemberInfo;
  teamMembers: TeamMemberInfo[];

  // Scope
  areasInScope: string[];
  documentsExamined: DocumentInfo[];
  interviewsConducted: InterviewInfo[];
  facilitiesVisited: string[];

  // Assessment
  overallAssessment: string;
  keyStrengths: string[];
  areasForImprovement: string[];

  // Findings
  findings: FindingInfo[];
  findingsSummary: FindingsSummary;

  // CAPs
  caps: CAPInfo[];
  capSummary: CAPSummary;

  // Best practices
  bestPractices: BestPracticeInfo[];

  // Conclusion
  recommendations: string[];
  acknowledgments?: string;

  // Annexes
  acronyms: AcronymInfo[];
}

// =============================================================================
// SUB-TYPES
// =============================================================================

export interface OrganizationInfo {
  id: string;
  name: string;
  shortName: string;
  country: string;
  type: string;
}

export interface TeamMemberInfo {
  id: string;
  firstName: string;
  lastName: string;
  organization: string;
  role: string;
  expertise: string[];
}

export interface DocumentInfo {
  title: string;
  reference: string;
  type: string;
  dateReviewed?: Date;
}

export interface InterviewInfo {
  interviewee: string;
  position: string;
  organization: string;
  date: Date;
  topics?: string[];
}

export interface FindingInfo {
  id: string;
  reference: string;
  title: string;
  severity: "CRITICAL" | "MAJOR" | "MINOR" | "OBSERVATION";
  type: "NON_CONFORMITY" | "CONCERN" | "OBSERVATION" | "GOOD_PRACTICE";
  reviewArea: string;
  description: string;
  evidence: string;
  icaoReference?: string;
  capRequired: boolean;
  rootCause?: string;
  recommendation?: string;
}

export interface FindingsSummary {
  total: number;
  bySeverity: {
    critical: number;
    major: number;
    minor: number;
    observation: number;
  };
  byArea: Record<string, number>;
  goodPractices: number;
}

export interface CAPInfo {
  id: string;
  reference: string;
  findingReference: string;
  findingTitle: string;
  status: "PENDING" | "IN_PROGRESS" | "SUBMITTED" | "ACCEPTED" | "VERIFIED" | "OVERDUE";
  dueDate: Date;
  progress: number;
  description?: string;
}

export interface CAPSummary {
  total: number;
  byStatus: {
    pending: number;
    inProgress: number;
    submitted: number;
    accepted: number;
    verified: number;
    overdue: number;
  };
  averageProgress: number;
}

export interface BestPracticeInfo {
  id: string;
  reference: string;
  title: string;
  reviewArea: string;
  description: string;
  benefit: string;
  applicability: string;
}

export interface AcronymInfo {
  acronym: string;
  meaning: string;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface ReportPageProps {
  review: ReviewReportData;
  locale: Locale;
}

export interface SectionProps {
  locale: Locale;
}

// =============================================================================
// SEVERITY HELPERS
// =============================================================================

export const severityOrder = ["CRITICAL", "MAJOR", "MINOR", "OBSERVATION"] as const;

export function getSeverityLabel(
  severity: string,
  locale: Locale
): string {
  const labels: Record<string, Record<Locale, string>> = {
    CRITICAL: { en: "Critical", fr: "Critique" },
    MAJOR: { en: "Major", fr: "Majeure" },
    MINOR: { en: "Minor", fr: "Mineure" },
    OBSERVATION: { en: "Observation", fr: "Observation" },
  };
  return labels[severity]?.[locale] || severity;
}

export function getStatusLabel(
  status: string,
  locale: Locale
): string {
  const labels: Record<string, Record<Locale, string>> = {
    PENDING: { en: "Pending", fr: "En attente" },
    IN_PROGRESS: { en: "In Progress", fr: "En cours" },
    SUBMITTED: { en: "Submitted", fr: "Soumis" },
    ACCEPTED: { en: "Accepted", fr: "Accepté" },
    VERIFIED: { en: "Verified", fr: "Vérifié" },
    OVERDUE: { en: "Overdue", fr: "En retard" },
  };
  return labels[status]?.[locale] || status;
}

export function getRoleLabel(
  role: string,
  locale: Locale
): string {
  const labels: Record<string, Record<Locale, string>> = {
    LEAD_REVIEWER: { en: "Lead Reviewer", fr: "Évaluateur principal" },
    TEAM_MEMBER: { en: "Team Member", fr: "Membre de l'équipe" },
    OBSERVER: { en: "Observer", fr: "Observateur" },
    TECHNICAL_EXPERT: { en: "Technical Expert", fr: "Expert technique" },
  };
  return labels[role]?.[locale] || role;
}
