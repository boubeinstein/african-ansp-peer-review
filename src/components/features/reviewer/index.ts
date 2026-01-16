/**
 * Reviewer Profile Module Components
 *
 * UI components for viewing, editing, and managing reviewer profiles,
 * expertise areas, language proficiencies, and certifications.
 *
 * @module components/features/reviewer
 */

// Profile Components
export { ReviewerProfileView } from "./reviewer-profile-view";
export { ReviewerProfileForm } from "./reviewer-profile-form";

// Management Components
export { ExpertiseSelector } from "./expertise-selector";
export type { ExpertiseItem } from "./expertise-selector";

export { LanguageProficiencyManager } from "./language-proficiency-manager";
export type { LanguageItem } from "./language-proficiency-manager";

export { CertificationManager } from "./certification-manager";
export type { CertificationItem } from "./certification-manager";

// COI (Conflict of Interest) Components
export { COIBadge, COIStatusIndicator } from "./coi-badge";
export type { COISeverity, COIStatus } from "./coi-badge";

export { COICheck, InlineCOICheck, COICheckSkeleton } from "./coi-check";
export type { COICheckResult } from "./coi-check";

export { COIVerificationDialog } from "./coi-verification-dialog";
export type { VerificationDecision } from "./coi-verification-dialog";

export { COIManager } from "./coi-manager";

// Directory Components
export { ReviewerDirectory } from "./reviewer-directory";
export { ReviewerCard } from "./reviewer-card";
export { ReviewerTable } from "./reviewer-table";
export { ReviewerSearchFilters } from "./reviewer-search-filters";

// Availability Components
export { AvailabilityCalendar } from "./availability-calendar";
export { AvailabilitySlotDialog } from "./availability-slot-dialog";
export { AvailabilityLegend } from "./availability-legend";
export { AvailabilitySummary } from "./availability-summary";
export { BulkAvailability } from "./bulk-availability";

// Matching & Assignment Components
export { MatchScoreCard } from "./match-score-card";
export { TeamCoverageReport } from "./team-coverage-report";
export { ReviewerMatcher } from "./reviewer-matcher";
