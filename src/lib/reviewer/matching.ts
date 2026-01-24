/**
 * Reviewer Matching Algorithm
 *
 * Finds optimal reviewers for peer review assignments based on
 * expertise, language, availability, and COI status.
 *
 * @module lib/reviewer/matching
 */

import type {
  ExpertiseArea,
  Language,
  COIType,
} from "@prisma/client";
import type { ReviewerProfileFull } from "@/types/reviewer";
import {
  scoreExpertise,
  scoreLanguage,
  scoreAvailability,
  scoreExperience,
  calculateTotalScore,
  type ExpertiseScoreResult,
  type LanguageScoreResult,
  type AvailabilityScoreResult,
  type ExperienceScoreResult,
} from "./scoring";
import { REVIEWER_CAPACITY } from "./constants";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Criteria for finding matching reviewers.
 */
export interface MatchingCriteria {
  targetOrganizationId: string;
  requiredExpertise: ExpertiseArea[];
  preferredExpertise?: ExpertiseArea[];
  requiredLanguages: Language[];
  reviewStartDate: Date;
  reviewEndDate: Date;
  teamSize: number;
  mustIncludeReviewerIds?: string[];
  excludeReviewerIds?: string[];
}

/**
 * COI status for a reviewer against target organization.
 */
export interface COIStatus {
  hasConflict: boolean;
  severity: "HARD" | "SOFT" | null;
  type?: COIType;
  reason?: string;
  isWaivable: boolean;
}

/**
 * Availability status for the review period.
 */
export interface AvailabilityStatus {
  isAvailable: boolean;
  availableDays: number;
  totalDays: number;
  coverage: number;
  conflicts: string[];
}

/**
 * Score breakdown for a reviewer match.
 */
export interface ScoreBreakdown {
  expertiseScore: number;
  languageScore: number;
  availabilityScore: number;
  experienceScore: number;
}

/**
 * Result of matching a single reviewer.
 */
export interface MatchResult {
  reviewerId: string;
  reviewerProfileId: string;
  fullName: string;
  organization: string;
  organizationId: string;
  score: number;
  maxScore: number;
  percentage: number;
  breakdown: ScoreBreakdown;
  expertiseDetails: ExpertiseScoreResult;
  languageDetails: LanguageScoreResult;
  availabilityDetails: AvailabilityScoreResult;
  experienceDetails: ExperienceScoreResult;
  coiStatus: COIStatus;
  availabilityStatus: AvailabilityStatus;
  warnings: string[];
  isEligible: boolean;
  ineligibilityReason?: string;
  ineligibilityReasonFr?: string;
  isLeadQualified: boolean;
  reviewsCompleted: number;
}

/**
 * Result of eligibility determination with reason.
 */
interface EligibilityResult {
  isEligible: boolean;
  reason?: string;
  reasonFr?: string;
}

/**
 * Coverage report for a team.
 */
export interface CoverageReport {
  expertiseCovered: ExpertiseArea[];
  expertiseMissing: ExpertiseArea[];
  expertiseCoverage: number;
  languagesCovered: Language[];
  languagesMissing: Language[];
  languageCoverage: number;
  hasLeadQualified: boolean;
  teamBalance: "GOOD" | "FAIR" | "POOR";
}

/**
 * Result of building a team.
 */
export interface TeamBuildResult {
  team: MatchResult[];
  coverageReport: CoverageReport;
  totalScore: number;
  averageScore: number;
  warnings: string[];
  isViable: boolean;
}

// =============================================================================
// MAIN MATCHING FUNCTIONS
// =============================================================================

/**
 * Find and rank all matching reviewers for given criteria.
 */
export function findMatchingReviewers(
  criteria: MatchingCriteria,
  allReviewers: ReviewerProfileFull[]
): MatchResult[] {
  const results: MatchResult[] = [];
  const excludeSet = new Set(criteria.excludeReviewerIds ?? []);

  for (const reviewer of allReviewers) {
    // Skip excluded reviewers
    if (excludeSet.has(reviewer.id)) continue;

    // Skip reviewers from target organization (automatic COI)
    if (reviewer.homeOrganizationId === criteria.targetOrganizationId) continue;

    const result = calculateMatchScore(reviewer, criteria);
    results.push(result);
  }

  // Sort by eligibility first, then by score
  results.sort((a, b) => {
    // Eligible reviewers first
    if (a.isEligible && !b.isEligible) return -1;
    if (!a.isEligible && b.isEligible) return 1;

    // Then by score (highest first)
    return b.score - a.score;
  });

  return results;
}

/**
 * Calculate match score for a single reviewer.
 */
export function calculateMatchScore(
  reviewer: ReviewerProfileFull,
  criteria: MatchingCriteria
): MatchResult {
  const warnings: string[] = [];

  // Calculate expertise score
  const expertiseResult = scoreExpertise(
    reviewer.expertiseRecords,
    criteria.requiredExpertise,
    criteria.preferredExpertise
  );

  // Calculate language score
  const languageResult = scoreLanguage(
    reviewer.languages,
    criteria.requiredLanguages
  );

  // Calculate availability score
  const availabilityResult = scoreAvailability(
    reviewer.availabilityPeriods ?? [],
    criteria.reviewStartDate,
    criteria.reviewEndDate
  );

  // Calculate experience score
  const experienceResult = scoreExperience(
    reviewer.yearsExperience,
    reviewer.reviewsCompleted
  );

  // Calculate total score
  const totalScore = calculateTotalScore(
    expertiseResult,
    languageResult,
    availabilityResult,
    experienceResult
  );

  // Check COI status
  const coiStatus = checkCOIStatus(
    reviewer.conflictsOfInterest ?? [],
    criteria.targetOrganizationId,
    reviewer.homeOrganizationId
  );

  // Build availability status
  const availabilityStatus: AvailabilityStatus = {
    isAvailable: availabilityResult.coverage >= 0.8,
    availableDays: availabilityResult.availableDays,
    totalDays: availabilityResult.totalDays,
    coverage: availabilityResult.coverage,
    conflicts: availabilityResult.conflicts,
  };

  // Generate warnings
  if (coiStatus.hasConflict) {
    if (coiStatus.severity === "HARD") {
      warnings.push(`Hard COI: ${coiStatus.reason}`);
    } else {
      warnings.push(`Soft COI: ${coiStatus.reason}`);
    }
  }

  if (expertiseResult.missingRequired.length > 0) {
    warnings.push(`Missing expertise: ${expertiseResult.missingRequired.join(", ")}`);
  }

  if (languageResult.missingLanguages.length > 0) {
    warnings.push(`Missing languages: ${languageResult.missingLanguages.join(", ")}`);
  }

  if (!availabilityStatus.isAvailable) {
    warnings.push(`Low availability: ${Math.round(availabilityStatus.coverage * 100)}%`);
  }

  if (!languageResult.canConductReview) {
    warnings.push("Cannot conduct review in required languages");
  }

  // Determine eligibility
  const eligibilityResult = determineEligibility(
    coiStatus,
    expertiseResult,
    languageResult,
    availabilityStatus
  );

  // Get display name and organization
  const fullName = `${reviewer.user.firstName} ${reviewer.user.lastName}`;
  const organization = reviewer.homeOrganization.organizationCode
    ? `${reviewer.homeOrganization.nameEn} (${reviewer.homeOrganization.organizationCode})`
    : reviewer.homeOrganization.nameEn;

  return {
    reviewerId: reviewer.userId,
    reviewerProfileId: reviewer.id,
    fullName,
    organization,
    organizationId: reviewer.homeOrganizationId,
    score: totalScore.totalScore,
    maxScore: totalScore.maxPossibleScore,
    percentage: totalScore.percentage,
    breakdown: {
      expertiseScore: totalScore.expertiseScore,
      languageScore: totalScore.languageScore,
      availabilityScore: totalScore.availabilityScore,
      experienceScore: totalScore.experienceScore,
    },
    expertiseDetails: expertiseResult,
    languageDetails: languageResult,
    availabilityDetails: availabilityResult,
    experienceDetails: experienceResult,
    coiStatus,
    availabilityStatus,
    warnings,
    isEligible: eligibilityResult.isEligible,
    ineligibilityReason: eligibilityResult.reason,
    ineligibilityReasonFr: eligibilityResult.reasonFr,
    isLeadQualified: reviewer.isLeadQualified,
    reviewsCompleted: reviewer.reviewsCompleted,
  };
}

/**
 * Determine if a reviewer is eligible for assignment.
 * Returns eligibility status with human-readable reason if ineligible.
 */
function determineEligibility(
  coiStatus: COIStatus,
  expertiseResult: ExpertiseScoreResult,
  languageResult: LanguageScoreResult,
  availabilityStatus: AvailabilityStatus
): EligibilityResult {
  // Hard COI = not eligible
  if (coiStatus.hasConflict && coiStatus.severity === "HARD") {
    // Determine specific reason based on COI type
    let reason = "Conflict of interest with target organization";
    let reasonFr = "Conflit d'intérêts avec l'organisation cible";

    if (coiStatus.type === "HOME_ORGANIZATION") {
      reason = "Works at target organization";
      reasonFr = "Travaille pour l'organisation cible";
    } else if (coiStatus.type === "FAMILY_RELATIONSHIP") {
      reason = "Has family member at target organization";
      reasonFr = "A un membre de la famille dans l'organisation cible";
    } else if (coiStatus.type === "FORMER_EMPLOYEE") {
      reason = "Former employee of target organization";
      reasonFr = "Ancien employé de l'organisation cible";
    } else if (coiStatus.type === "RECENT_REVIEW") {
      reason = "Recently reviewed this organization";
      reasonFr = "A récemment évalué cette organisation";
    }

    return { isEligible: false, reason, reasonFr };
  }

  // Must have at least 50% of required expertise
  const expertiseCoverage =
    expertiseResult.matchedRequired.length /
    (expertiseResult.matchedRequired.length + expertiseResult.missingRequired.length || 1);
  if (expertiseCoverage < 0.5) {
    return {
      isEligible: false,
      reason: "Insufficient expertise match",
      reasonFr: "Expertise insuffisante",
    };
  }

  // Must be able to conduct review in at least one required language
  if (!languageResult.canConductReview && languageResult.missingLanguages.length > 0) {
    return {
      isEligible: false,
      reason: "Cannot conduct review in required languages",
      reasonFr: "Ne peut pas effectuer la revue dans les langues requises",
    };
  }

  // Must have at least 50% availability
  if (availabilityStatus.coverage < 0.5) {
    return {
      isEligible: false,
      reason: "Unavailable during review period",
      reasonFr: "Indisponible pendant la période de revue",
    };
  }

  return { isEligible: true };
}

// =============================================================================
// COI CHECKING
// =============================================================================

/**
 * Check COI status for a reviewer against target organization.
 */
function checkCOIStatus(
  conflicts: ReviewerProfileFull["conflictsOfInterest"],
  targetOrganizationId: string,
  homeOrganizationId: string
): COIStatus {
  // Home organization is always a hard conflict
  if (homeOrganizationId === targetOrganizationId) {
    return {
      hasConflict: true,
      severity: "HARD",
      type: "HOME_ORGANIZATION",
      reason: "Home organization",
      isWaivable: false,
    };
  }

  // Guard against undefined/null/non-array conflicts
  if (!conflicts || !Array.isArray(conflicts)) {
    return {
      hasConflict: false,
      severity: null,
      isWaivable: false,
    };
  }

  // Check declared conflicts
  for (const coi of conflicts) {
    if (coi.organizationId === targetOrganizationId) {
      // Determine severity based on type
      const isHard = isHardConflict(coi.coiType);

      return {
        hasConflict: true,
        severity: isHard ? "HARD" : "SOFT",
        type: coi.coiType,
        reason: getConflictReason(coi.coiType),
        isWaivable: !isHard,
      };
    }
  }

  return {
    hasConflict: false,
    severity: null,
    isWaivable: false,
  };
}

/**
 * Determine if a COI type is a hard conflict.
 */
function isHardConflict(type: COIType): boolean {
  const hardConflicts: COIType[] = ["HOME_ORGANIZATION", "FAMILY_RELATIONSHIP"];
  return hardConflicts.includes(type);
}

/**
 * Get human-readable reason for COI type.
 */
function getConflictReason(type: COIType): string {
  const reasons: Record<COIType, string> = {
    // Legacy types
    EMPLOYMENT: "Employment relationship",
    FINANCIAL: "Financial interest",
    CONTRACTUAL: "Contractual relationship",
    PERSONAL: "Personal relationship",
    PREVIOUS_REVIEW: "Previously reviewed",
    // Current types
    HOME_ORGANIZATION: "Current employer",
    FAMILY_RELATIONSHIP: "Family relationship",
    FORMER_EMPLOYEE: "Former employee",
    BUSINESS_INTEREST: "Business interest",
    RECENT_REVIEW: "Recently reviewed this organization",
    OTHER: "Other declared conflict",
  };
  return reasons[type] ?? "Conflict of interest";
}

// =============================================================================
// TEAM BUILDING
// =============================================================================

/**
 * Build an optimal team from candidate reviewers.
 */
export function buildOptimalTeam(
  criteria: MatchingCriteria,
  candidates: MatchResult[]
): TeamBuildResult {
  const teamSize = Math.min(
    Math.max(criteria.teamSize, REVIEWER_CAPACITY.MIN_TEAM_SIZE),
    REVIEWER_CAPACITY.MAX_TEAM_SIZE
  );

  const warnings: string[] = [];
  const team: MatchResult[] = [];

  // First, add must-include reviewers
  const mustIncludeSet = new Set(criteria.mustIncludeReviewerIds ?? []);
  for (const candidate of candidates) {
    if (mustIncludeSet.has(candidate.reviewerProfileId)) {
      team.push(candidate);
      if (!candidate.isEligible) {
        warnings.push(`Required reviewer ${candidate.fullName} has eligibility issues`);
      }
    }
  }

  // Get eligible candidates not already in team
  const eligibleCandidates = candidates.filter(
    (c) => c.isEligible && !team.some((t) => t.reviewerProfileId === c.reviewerProfileId)
  );

  // Build team using greedy algorithm with coverage optimization
  while (team.length < teamSize && eligibleCandidates.length > 0) {
    const nextMember = selectNextTeamMember(team, eligibleCandidates);

    if (!nextMember) break;

    team.push(nextMember);

    // Remove from candidates
    const index = eligibleCandidates.findIndex(
      (c) => c.reviewerProfileId === nextMember.reviewerProfileId
    );
    if (index !== -1) {
      eligibleCandidates.splice(index, 1);
    }
  }

  // Generate coverage report
  const coverageReport = generateCoverageReport(
    team,
    criteria.requiredExpertise,
    criteria.requiredLanguages
  );

  // Check team viability
  const isViable = checkTeamViability(team, coverageReport, teamSize);

  if (team.length < teamSize) {
    warnings.push(`Could only find ${team.length} of ${teamSize} required team members`);
  }

  if (!coverageReport.hasLeadQualified) {
    warnings.push("Team has no lead-qualified reviewer");
  }

  if (coverageReport.expertiseMissing.length > 0) {
    warnings.push(`Missing expertise coverage: ${coverageReport.expertiseMissing.join(", ")}`);
  }

  if (coverageReport.languagesMissing.length > 0) {
    warnings.push(`Missing language coverage: ${coverageReport.languagesMissing.join(", ")}`);
  }

  // Calculate team scores
  const totalScore = team.reduce((sum, m) => sum + m.score, 0);
  const averageScore = team.length > 0 ? totalScore / team.length : 0;

  return {
    team,
    coverageReport,
    totalScore: Math.round(totalScore * 10) / 10,
    averageScore: Math.round(averageScore * 10) / 10,
    warnings,
    isViable,
  };
}

/**
 * Select the next best team member considering current coverage.
 */
function selectNextTeamMember(
  currentTeam: MatchResult[],
  candidates: MatchResult[]
): MatchResult | null {
  if (candidates.length === 0) return null;

  // Get current team coverage
  const coveredExpertise = new Set<ExpertiseArea>();
  const coveredLanguages = new Set<Language>();
  let hasLead = false;

  for (const member of currentTeam) {
    for (const exp of member.expertiseDetails.matchedRequired) {
      coveredExpertise.add(exp);
    }
    for (const lang of member.languageDetails.matchedLanguages) {
      coveredLanguages.add(lang);
    }
    if (member.isLeadQualified) hasLead = true;
  }

  // Score candidates based on what they add to the team
  const scoredCandidates = candidates.map((candidate) => {
    let additionalValue = 0;

    // Value for new expertise coverage
    for (const exp of candidate.expertiseDetails.matchedRequired) {
      if (!coveredExpertise.has(exp)) {
        additionalValue += 10;
      }
    }

    // Value for new language coverage
    for (const lang of candidate.languageDetails.matchedLanguages) {
      if (!coveredLanguages.has(lang)) {
        additionalValue += 8;
      }
    }

    // Value for lead qualification if team doesn't have one
    if (!hasLead && candidate.isLeadQualified) {
      additionalValue += 15;
    }

    // Combine with base score
    const combinedScore = candidate.score * 0.7 + additionalValue * 0.3;

    return {
      candidate,
      combinedScore,
    };
  });

  // Sort by combined score
  scoredCandidates.sort((a, b) => b.combinedScore - a.combinedScore);

  return scoredCandidates[0]?.candidate ?? null;
}

/**
 * Generate coverage report for a team.
 */
function generateCoverageReport(
  team: MatchResult[],
  requiredExpertise: ExpertiseArea[],
  requiredLanguages: Language[]
): CoverageReport {
  const coveredExpertise = new Set<ExpertiseArea>();
  const coveredLanguages = new Set<Language>();
  let hasLead = false;

  for (const member of team) {
    for (const exp of member.expertiseDetails.matchedRequired) {
      coveredExpertise.add(exp);
    }
    for (const exp of member.expertiseDetails.matchedPreferred) {
      coveredExpertise.add(exp);
    }
    for (const lang of member.languageDetails.matchedLanguages) {
      coveredLanguages.add(lang);
    }
    if (member.isLeadQualified) hasLead = true;
  }

  const expertiseMissing = requiredExpertise.filter((e) => !coveredExpertise.has(e));
  const languagesMissing = requiredLanguages.filter((l) => !coveredLanguages.has(l));

  const expertiseCoverage =
    requiredExpertise.length > 0
      ? (requiredExpertise.length - expertiseMissing.length) / requiredExpertise.length
      : 1;

  const languageCoverage =
    requiredLanguages.length > 0
      ? (requiredLanguages.length - languagesMissing.length) / requiredLanguages.length
      : 1;

  // Determine team balance
  let teamBalance: "GOOD" | "FAIR" | "POOR" = "GOOD";
  if (expertiseCoverage < 0.8 || languageCoverage < 1 || !hasLead) {
    teamBalance = "FAIR";
  }
  if (expertiseCoverage < 0.5 || languageCoverage < 0.5) {
    teamBalance = "POOR";
  }

  return {
    expertiseCovered: Array.from(coveredExpertise),
    expertiseMissing,
    expertiseCoverage: Math.round(expertiseCoverage * 100) / 100,
    languagesCovered: Array.from(coveredLanguages),
    languagesMissing,
    languageCoverage: Math.round(languageCoverage * 100) / 100,
    hasLeadQualified: hasLead,
    teamBalance,
  };
}

/**
 * Check if a team is viable for the review.
 */
function checkTeamViability(
  team: MatchResult[],
  coverage: CoverageReport,
  requiredSize: number
): boolean {
  // Must have minimum team size
  if (team.length < REVIEWER_CAPACITY.MIN_TEAM_SIZE) {
    return false;
  }

  // Should have at least 80% of required size
  if (team.length < requiredSize * 0.8) {
    return false;
  }

  // Must have at least 50% expertise coverage
  if (coverage.expertiseCoverage < 0.5) {
    return false;
  }

  // Must have at least one required language covered
  if (coverage.languageCoverage < 0.5) {
    return false;
  }

  return true;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Filter candidates by minimum score threshold.
 */
export function filterByMinScore(
  candidates: MatchResult[],
  minScore: number
): MatchResult[] {
  return candidates.filter((c) => c.score >= minScore);
}

/**
 * Filter candidates to only eligible ones.
 */
export function filterEligibleOnly(candidates: MatchResult[]): MatchResult[] {
  return candidates.filter((c) => c.isEligible);
}

/**
 * Get top N candidates.
 */
export function getTopCandidates(
  candidates: MatchResult[],
  limit: number
): MatchResult[] {
  return candidates.slice(0, limit);
}

/**
 * Check if a specific reviewer can be assigned to a review.
 */
export function canAssignReviewer(
  reviewer: ReviewerProfileFull,
  criteria: MatchingCriteria
): { canAssign: boolean; reasons: string[] } {
  const result = calculateMatchScore(reviewer, criteria);

  if (result.isEligible) {
    return { canAssign: true, reasons: [] };
  }

  return { canAssign: false, reasons: result.warnings };
}
