/**
 * COI (Conflict of Interest) Types and Constants
 *
 * Defines all types, constants, and configurations for the COI management system.
 * Aligned with ICAO Doc 9734 and AFI Peer Review Programme COI policy.
 */

import type { COIType, COISeverity, ReviewerCOI as PrismaReviewerCOI, COIOverride as PrismaCOIOverride } from "@prisma/client";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * All COI types
 */
export const COI_TYPES = [
  "HOME_ORGANIZATION",
  "FAMILY_RELATIONSHIP",
  "FORMER_EMPLOYEE",
  "BUSINESS_INTEREST",
  "RECENT_REVIEW",
  "OTHER",
] as const;

/**
 * COI severity levels
 */
export const COI_SEVERITIES = [
  "HARD_BLOCK",
  "SOFT_WARNING",
] as const;

/**
 * Cooldown period for RECENT_REVIEW COI (in years)
 */
export const RECENT_REVIEW_COOLDOWN_YEARS = 2;

/**
 * Cooldown period for FORMER_EMPLOYEE COI (in years)
 */
export const FORMER_EMPLOYEE_COOLDOWN_YEARS = 3;

/**
 * Minimum characters for override justification
 */
export const MIN_OVERRIDE_JUSTIFICATION_LENGTH = 50;

/**
 * Minimum characters for COI reason
 */
export const MIN_COI_REASON_LENGTH = 10;

// =============================================================================
// TYPE CONFIGURATION
// =============================================================================

export interface COITypeConfig {
  labelEn: string;
  labelFr: string;
  descriptionEn: string;
  descriptionFr: string;
  defaultSeverity: COISeverity;
  isAutoDetectable: boolean;
}

/**
 * Configuration for each COI type
 */
export const COI_TYPE_CONFIG: Record<COIType, COITypeConfig> = {
  HOME_ORGANIZATION: {
    labelEn: "Home Organization",
    labelFr: "Organisation d'appartenance",
    descriptionEn: "Reviewer's current employer - cannot review their own organization",
    descriptionFr: "Employeur actuel de l'évaluateur - ne peut pas évaluer sa propre organisation",
    defaultSeverity: "HARD_BLOCK",
    isAutoDetectable: true,
  },
  FAMILY_RELATIONSHIP: {
    labelEn: "Family Relationship",
    labelFr: "Lien familial",
    descriptionEn: "Immediate family member works at the organization",
    descriptionFr: "Un membre de la famille immédiate travaille dans l'organisation",
    defaultSeverity: "HARD_BLOCK",
    isAutoDetectable: false,
  },
  FORMER_EMPLOYEE: {
    labelEn: "Former Employee",
    labelFr: "Ancien employé",
    descriptionEn: "Worked at the organization within the last 3 years",
    descriptionFr: "A travaillé dans l'organisation au cours des 3 dernières années",
    defaultSeverity: "SOFT_WARNING",
    isAutoDetectable: false,
  },
  BUSINESS_INTEREST: {
    labelEn: "Business Interest",
    labelFr: "Intérêt commercial",
    descriptionEn: "Financial or consulting ties with the organization",
    descriptionFr: "Liens financiers ou de conseil avec l'organisation",
    defaultSeverity: "SOFT_WARNING",
    isAutoDetectable: false,
  },
  RECENT_REVIEW: {
    labelEn: "Recent Review",
    labelFr: "Revue récente",
    descriptionEn: "Reviewed this organization within the 2-year cooldown period",
    descriptionFr: "A évalué cette organisation au cours des 2 dernières années",
    defaultSeverity: "SOFT_WARNING",
    isAutoDetectable: true,
  },
  OTHER: {
    labelEn: "Other Conflict",
    labelFr: "Autre conflit",
    descriptionEn: "Other declared conflict of interest",
    descriptionFr: "Autre conflit d'intérêts déclaré",
    defaultSeverity: "SOFT_WARNING",
    isAutoDetectable: false,
  },
};

/**
 * Severity configuration
 */
export const COI_SEVERITY_CONFIG: Record<COISeverity, {
  labelEn: string;
  labelFr: string;
  descriptionEn: string;
  descriptionFr: string;
  canOverride: boolean;
  color: string;
}> = {
  HARD_BLOCK: {
    labelEn: "Hard Block",
    labelFr: "Blocage strict",
    descriptionEn: "Cannot be overridden - reviewer is ineligible",
    descriptionFr: "Ne peut pas être contourné - l'évaluateur est inéligible",
    canOverride: false,
    color: "red",
  },
  SOFT_WARNING: {
    labelEn: "Soft Warning",
    labelFr: "Avertissement",
    descriptionEn: "Can be overridden with documented justification",
    descriptionFr: "Peut être contourné avec une justification documentée",
    canOverride: true,
    color: "yellow",
  },
};

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Full ReviewerCOI with relations
 */
export interface ReviewerCOIWithRelations extends PrismaReviewerCOI {
  reviewerProfile?: {
    id: string;
    userId: string;
    user?: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  organization?: {
    id: string;
    nameEn: string;
    nameFr: string;
    icaoCode: string | null;
  };
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  verifiedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

/**
 * COI Override with relations
 */
export interface COIOverrideWithRelations extends PrismaCOIOverride {
  reviewerProfile?: {
    id: string;
    userId: string;
    user?: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  organization?: {
    id: string;
    nameEn: string;
    nameFr: string;
    icaoCode: string | null;
  };
  approvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  revokedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  review?: {
    id: string;
    referenceNumber: string;
  } | null;
}

/**
 * Individual conflict detail
 */
export interface COIConflictDetail {
  id: string;
  type: COIType;
  severity: COISeverity;
  reasonEn: string | null;
  reasonFr: string | null;
  isAutoDetected: boolean;
  startDate: Date;
  endDate: Date | null;
  config: COITypeConfig;
}

/**
 * Override information for a specific conflict
 */
export interface COIOverrideInfo {
  id: string;
  justification: string;
  approvedById: string;
  approvedByName: string;
  approvedAt: Date;
  expiresAt: Date | null;
  isRevoked: boolean;
  isExpired: boolean;
  isValid: boolean;
}

/**
 * Result of checking COI for a single reviewer against an organization
 */
export interface COICheckResult {
  reviewerProfileId: string;
  organizationId: string;
  hasConflict: boolean;
  hasHardBlock: boolean;
  hasSoftWarning: boolean;
  canProceedWithOverride: boolean;
  conflicts: COIConflictDetail[];
  hardBlocks: COIConflictDetail[];
  softWarnings: COIConflictDetail[];
  activeOverride: COIOverrideInfo | null;
}

/**
 * Reviewer eligibility status for team COI check
 */
export interface ReviewerEligibility {
  reviewerProfileId: string;
  reviewerName: string;
  status: "eligible" | "blocked" | "warning" | "override_active";
  checkResult: COICheckResult;
}

/**
 * Result of checking COI for a team against an organization
 */
export interface TeamCOICheckResult {
  organizationId: string;
  organizationName: string;
  reviewers: ReviewerEligibility[];
  summary: {
    total: number;
    eligible: number;
    blocked: number;
    warning: number;
    overrideActive: number;
  };
  canProceed: boolean;
  blockedReviewerIds: string[];
  warningReviewerIds: string[];
}

/**
 * COI statistics for dashboard
 */
export interface COIStats {
  total: number;
  active: number;
  inactive: number;
  byType: Record<COIType, number>;
  bySeverity: Record<COISeverity, number>;
  autoDetected: number;
  manuallyDeclared: number;
  activeOverrides: number;
}

/**
 * COI list item for display
 */
export interface COIListItem {
  id: string;
  reviewerProfileId: string;
  reviewerName: string;
  organizationId: string;
  organizationName: string;
  coiType: COIType;
  severity: COISeverity;
  reasonEn: string | null;
  reasonFr: string | null;
  isAutoDetected: boolean;
  isActive: boolean;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  hasActiveOverride: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the default severity for a COI type
 */
export function getDefaultSeverity(type: COIType): COISeverity {
  return COI_TYPE_CONFIG[type].defaultSeverity;
}

/**
 * Check if a COI type is auto-detectable
 */
export function isAutoDetectable(type: COIType): boolean {
  return COI_TYPE_CONFIG[type].isAutoDetectable;
}

/**
 * Check if a severity can be overridden
 */
export function canOverride(severity: COISeverity): boolean {
  return COI_SEVERITY_CONFIG[severity].canOverride;
}

/**
 * Get COI type label
 */
export function getCOITypeLabel(type: COIType, locale: "en" | "fr"): string {
  const config = COI_TYPE_CONFIG[type];
  return locale === "fr" ? config.labelFr : config.labelEn;
}

/**
 * Get COI severity label
 */
export function getCOISeverityLabel(severity: COISeverity, locale: "en" | "fr"): string {
  const config = COI_SEVERITY_CONFIG[severity];
  return locale === "fr" ? config.labelFr : config.labelEn;
}

/**
 * Get manual COI types (non-auto-detectable)
 */
export function getManualCOITypes(): COIType[] {
  return COI_TYPES.filter(type => !COI_TYPE_CONFIG[type].isAutoDetectable) as COIType[];
}

/**
 * Check if an override is valid (not expired, not revoked)
 */
export function isOverrideValid(override: {
  isRevoked: boolean;
  expiresAt: Date | null;
}): boolean {
  if (override.isRevoked) return false;
  if (override.expiresAt && new Date(override.expiresAt) < new Date()) return false;
  return true;
}
