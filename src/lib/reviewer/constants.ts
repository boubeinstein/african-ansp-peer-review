/**
 * Reviewer Profile Module Constants
 * Programme-specific constraints and configuration
 *
 * @module lib/reviewer/constants
 */

// ============================================
// PROGRAMME CAPACITY LIMITS
// Per African ANSP Peer Review Programme Guidelines
// ============================================

export const REVIEWER_CAPACITY = {
  /** Maximum reviewers that can be nominated */
  MAX_NOMINATED: 99,
  /** Maximum reviewers in the selected pool */
  MAX_SELECTED: 45,
  /** Minimum team size for a peer review */
  MIN_TEAM_SIZE: 2,
  /** Maximum team size for a peer review */
  MAX_TEAM_SIZE: 5,
  /** Ideal team size for a peer review */
  IDEAL_TEAM_SIZE: 3,
} as const;

// ============================================
// QUALIFICATION REQUIREMENTS
// Per ICAO Doc 9734 and CANSO SoE
// ============================================

export const QUALIFICATION_REQUIREMENTS = {
  /** Minimum expertise areas required */
  MIN_EXPERTISE_AREAS: 1,
  /** Maximum expertise areas allowed */
  MAX_EXPERTISE_AREAS: 10,
  /** Minimum languages required (EN + FR for African programme) */
  MIN_LANGUAGES: 2,
  /** Maximum languages tracked */
  MAX_LANGUAGES: 6,
  /** Minimum years of ANS experience for nomination */
  MIN_YEARS_EXPERIENCE: 5,
  /** Minimum reviews completed to qualify as Lead Reviewer */
  MIN_REVIEWS_FOR_LEAD: 2,
  /** Training validity period in months */
  TRAINING_VALIDITY_MONTHS: 36,
  /** Certification refresh period in months */
  CERTIFICATION_REFRESH_MONTHS: 24,
} as const;

// ============================================
// MATCHING ALGORITHM WEIGHTS
// For reviewer assignment scoring
// ============================================

export const MATCHING_WEIGHTS = {
  /** Weight for expertise match (out of 100) */
  EXPERTISE: 40,
  /** Weight for language proficiency (out of 100) */
  LANGUAGE: 30,
  /** Weight for availability coverage (out of 100) */
  AVAILABILITY: 20,
  /** Weight for experience/reviews completed (out of 100) */
  EXPERIENCE: 10,
} as const;

// ============================================
// COI (CONFLICT OF INTEREST) RULES
// Per programme governance guidelines
// ============================================

export const COI_RULES = {
  /** Cooling-off period in months for previous reviewer assignments */
  COOLING_OFF_MONTHS: 24,
  /** Minimum time since employment to clear employment COI */
  EMPLOYMENT_COI_CLEAR_MONTHS: 36,
  /** Maximum COI declarations per reviewer */
  MAX_COI_DECLARATIONS: 20,
} as const;

// ============================================
// AVAILABILITY CONFIGURATION
// ============================================

export const AVAILABILITY_CONFIG = {
  /** Maximum days to look ahead for availability */
  MAX_LOOKAHEAD_DAYS: 365,
  /** Minimum review duration in days */
  MIN_REVIEW_DAYS: 3,
  /** Maximum review duration in days */
  MAX_REVIEW_DAYS: 14,
  /** Typical review duration in days */
  TYPICAL_REVIEW_DAYS: 5,
} as const;

// ============================================
// PAGINATION DEFAULTS
// ============================================

export const PAGINATION_DEFAULTS = {
  /** Default page size for reviewer lists */
  PAGE_SIZE: 20,
  /** Maximum page size allowed */
  MAX_PAGE_SIZE: 100,
} as const;

// ============================================
// AFRICAN REGIONS
// For reviewer distribution analysis
// ============================================

export const AFRICAN_REGIONS = {
  NORTH: {
    code: "NORTH",
    nameEn: "North Africa",
    nameFr: "Afrique du Nord",
    countries: ["DZ", "EG", "LY", "MA", "SD", "TN"],
  },
  WEST: {
    code: "WEST",
    nameEn: "West Africa",
    nameFr: "Afrique de l'Ouest",
    countries: ["BJ", "BF", "CV", "CI", "GM", "GH", "GN", "GW", "LR", "ML", "MR", "NE", "NG", "SN", "SL", "TG"],
  },
  CENTRAL: {
    code: "CENTRAL",
    nameEn: "Central Africa",
    nameFr: "Afrique centrale",
    countries: ["AO", "CM", "CF", "TD", "CG", "CD", "GQ", "GA", "ST"],
  },
  EAST: {
    code: "EAST",
    nameEn: "East Africa",
    nameFr: "Afrique de l'Est",
    countries: ["BI", "KM", "DJ", "ER", "ET", "KE", "MG", "MU", "RW", "SC", "SO", "SS", "TZ", "UG"],
  },
  SOUTH: {
    code: "SOUTH",
    nameEn: "Southern Africa",
    nameFr: "Afrique australe",
    countries: ["BW", "SZ", "LS", "MW", "MZ", "NA", "ZA", "ZM", "ZW"],
  },
} as const;

export type AfricanRegion = keyof typeof AFRICAN_REGIONS;

// ============================================
// TYPE EXPORTS
// ============================================

export type ReviewerCapacity = typeof REVIEWER_CAPACITY;
export type QualificationRequirements = typeof QUALIFICATION_REQUIREMENTS;
export type MatchingWeights = typeof MATCHING_WEIGHTS;
export type COIRules = typeof COI_RULES;
export type AvailabilityConfig = typeof AVAILABILITY_CONFIG;
