/**
 * Reviewer Matching Scoring Functions
 *
 * Calculates scores for expertise, language, availability, and experience
 * to determine optimal reviewer assignments.
 *
 * @module lib/reviewer/scoring
 */

import type {
  ExpertiseArea,
  Language,
  ProficiencyLevel,
  LanguageProficiency as LanguageProficiencyEnum,
  AvailabilityType,
} from "@prisma/client";
import { MATCHING_WEIGHTS, QUALIFICATION_REQUIREMENTS } from "./constants";

// =============================================================================
// INPUT TYPES (minimal fields required for scoring)
// =============================================================================

/**
 * Minimal expertise fields required for scoring
 */
export interface ExpertiseInput {
  area: ExpertiseArea;
  proficiencyLevel: ProficiencyLevel;
  yearsExperience: number;
}

/**
 * Minimal language fields required for scoring
 */
export interface LanguageInput {
  language: Language;
  proficiency: LanguageProficiencyEnum;
  canConductInterviews: boolean;
}

/**
 * Minimal availability slot fields required for scoring
 */
export interface AvailabilitySlotInput {
  startDate: Date;
  endDate: Date;
  availabilityType: AvailabilityType;
  notes?: string | null;
}

// =============================================================================
// TYPES
// =============================================================================

export interface ExpertiseScoreResult {
  score: number;
  maxScore: number;
  matchedRequired: ExpertiseArea[];
  matchedPreferred: ExpertiseArea[];
  missingRequired: ExpertiseArea[];
}

export interface LanguageScoreResult {
  score: number;
  maxScore: number;
  matchedLanguages: Language[];
  missingLanguages: Language[];
  canConductReview: boolean;
}

export interface AvailabilityScoreResult {
  score: number;
  maxScore: number;
  availableDays: number;
  totalDays: number;
  coverage: number;
  conflicts: string[];
}

export interface ExperienceScoreResult {
  score: number;
  maxScore: number;
  yearsBonus: number;
  reviewsBonus: number;
}

// =============================================================================
// EXPERTISE SCORING (Max 40 points)
// =============================================================================

/**
 * Score reviewer expertise against required and preferred areas.
 *
 * Scoring breakdown:
 * - Required expertise match: up to 30 points (60% of required matched = full points)
 * - Preferred expertise match: up to 10 points (bonus)
 * - Proficiency level bonus: multiplier 1.0-1.5 based on level
 */
export function scoreExpertise(
  reviewerExpertise: ExpertiseInput[],
  required: ExpertiseArea[],
  preferred: ExpertiseArea[] = []
): ExpertiseScoreResult {
  const maxScore = MATCHING_WEIGHTS.EXPERTISE;
  const requiredMaxPoints = 30; // Out of 40
  const preferredMaxPoints = 10; // Out of 40

  if (required.length === 0) {
    return {
      score: maxScore, // Full score if no requirements
      maxScore,
      matchedRequired: [],
      matchedPreferred: [],
      missingRequired: [],
    };
  }

  // Create a map of reviewer expertise for quick lookup
  const expertiseMap = new Map<ExpertiseArea, { level: ProficiencyLevel; years: number }>();
  for (const exp of reviewerExpertise) {
    expertiseMap.set(exp.area, {
      level: exp.proficiencyLevel,
      years: exp.yearsExperience,
    });
  }

  // Calculate required expertise score
  const matchedRequired: ExpertiseArea[] = [];
  const missingRequired: ExpertiseArea[] = [];
  let requiredScore = 0;

  for (const area of required) {
    const expertise = expertiseMap.get(area);
    if (expertise) {
      matchedRequired.push(area);
      // Base points + proficiency bonus
      const proficiencyMultiplier = getProficiencyMultiplier(expertise.level);
      const pointsPerArea = requiredMaxPoints / required.length;
      requiredScore += pointsPerArea * proficiencyMultiplier;
    } else {
      missingRequired.push(area);
    }
  }

  // Cap required score at max
  requiredScore = Math.min(requiredScore, requiredMaxPoints);

  // Calculate preferred expertise score (bonus)
  const matchedPreferred: ExpertiseArea[] = [];
  let preferredScore = 0;

  if (preferred.length > 0) {
    for (const area of preferred) {
      // Don't double count if already in required
      if (required.includes(area)) continue;

      const expertise = expertiseMap.get(area);
      if (expertise) {
        matchedPreferred.push(area);
        const proficiencyMultiplier = getProficiencyMultiplier(expertise.level);
        const pointsPerArea = preferredMaxPoints / preferred.length;
        preferredScore += pointsPerArea * proficiencyMultiplier;
      }
    }
  }

  // Cap preferred score at max
  preferredScore = Math.min(preferredScore, preferredMaxPoints);

  const totalScore = Math.min(requiredScore + preferredScore, maxScore);

  return {
    score: Math.round(totalScore * 10) / 10,
    maxScore,
    matchedRequired,
    matchedPreferred,
    missingRequired,
  };
}

/**
 * Get proficiency multiplier for expertise scoring.
 * BASIC: 0.6, COMPETENT: 0.8, PROFICIENT: 1.0, EXPERT: 1.2
 */
function getProficiencyMultiplier(level: ProficiencyLevel): number {
  const multipliers: Record<ProficiencyLevel, number> = {
    BASIC: 0.6,
    COMPETENT: 0.8,
    PROFICIENT: 1.0,
    EXPERT: 1.2,
  };
  return multipliers[level] ?? 1.0;
}

// =============================================================================
// LANGUAGE SCORING (Max 25 points)
// =============================================================================

/**
 * Score reviewer language proficiency against required languages.
 *
 * Scoring breakdown:
 * - Language match: points based on coverage
 * - Proficiency bonus: higher proficiency = more points
 * - Ability to conduct interviews: bonus points
 */
export function scoreLanguage(
  reviewerLanguages: LanguageInput[],
  required: Language[]
): LanguageScoreResult {
  const maxScore = 25; // Adjusted from MATCHING_WEIGHTS.LANGUAGE (30) to match spec

  if (required.length === 0) {
    return {
      score: maxScore,
      maxScore,
      matchedLanguages: [],
      missingLanguages: [],
      canConductReview: true,
    };
  }

  // Create language map for quick lookup
  const languageMap = new Map<Language, LanguageInput>();
  for (const lang of reviewerLanguages) {
    languageMap.set(lang.language, lang);
  }

  const matchedLanguages: Language[] = [];
  const missingLanguages: Language[] = [];
  let totalScore = 0;
  let canConductReview = true;

  const pointsPerLanguage = maxScore / required.length;

  for (const lang of required) {
    const reviewerLang = languageMap.get(lang);
    if (reviewerLang) {
      matchedLanguages.push(lang);

      // Base score for having the language
      let langScore = pointsPerLanguage * 0.6;

      // Proficiency bonus
      const proficiencyBonus = getLanguageProficiencyBonus(reviewerLang.proficiency);
      langScore += pointsPerLanguage * 0.25 * proficiencyBonus;

      // Can conduct interviews bonus
      if (reviewerLang.canConductInterviews) {
        langScore += pointsPerLanguage * 0.15;
      }

      totalScore += langScore;

      // Check if can conduct review in this language
      if (!canConductReviewInLanguage(reviewerLang.proficiency)) {
        canConductReview = false;
      }
    } else {
      missingLanguages.push(lang);
      canConductReview = false;
    }
  }

  return {
    score: Math.round(Math.min(totalScore, maxScore) * 10) / 10,
    maxScore,
    matchedLanguages,
    missingLanguages,
    canConductReview,
  };
}

/**
 * Get proficiency bonus for language scoring.
 */
function getLanguageProficiencyBonus(proficiency: LanguageProficiencyEnum): number {
  const bonuses: Record<LanguageProficiencyEnum, number> = {
    BASIC: 0.25,
    INTERMEDIATE: 0.5,
    ADVANCED: 0.8,
    NATIVE: 1.0,
  };
  return bonuses[proficiency] ?? 0.5;
}

/**
 * Check if proficiency level is sufficient for conducting reviews.
 */
function canConductReviewInLanguage(proficiency: LanguageProficiencyEnum): boolean {
  const sufficientLevels: LanguageProficiencyEnum[] = ["INTERMEDIATE", "ADVANCED", "NATIVE"];
  return sufficientLevels.includes(proficiency);
}

// =============================================================================
// AVAILABILITY SCORING (Max 25 points)
// =============================================================================

/**
 * Score reviewer availability for the review period.
 *
 * Scoring breakdown:
 * - Full coverage: 25 points
 * - Partial coverage: proportional points
 * - No coverage: 0 points
 */
export function scoreAvailability(
  availabilitySlots: AvailabilitySlotInput[],
  startDate: Date,
  endDate: Date
): AvailabilityScoreResult {
  const maxScore = 25; // Adjusted from MATCHING_WEIGHTS.AVAILABILITY (20) to match spec

  const totalDays = getDaysBetween(startDate, endDate);
  if (totalDays <= 0) {
    return {
      score: 0,
      maxScore,
      availableDays: 0,
      totalDays: 0,
      coverage: 0,
      conflicts: ["Invalid date range"],
    };
  }

  // Build a map of each day's availability
  const dayAvailability = new Map<string, "AVAILABLE" | "TENTATIVE" | "UNAVAILABLE" | "ON_ASSIGNMENT">();
  const conflicts: string[] = [];

  // Initialize all days as unavailable (no slots = not available)
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dayAvailability.set(formatDateKey(currentDate), "UNAVAILABLE");
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Apply availability slots
  for (const slot of availabilitySlots) {
    const slotStart = new Date(slot.startDate);
    const slotEnd = new Date(slot.endDate);

    // Check if slot overlaps with review period
    if (slotEnd < startDate || slotStart > endDate) continue;

    const iterStart = new Date(Math.max(slotStart.getTime(), startDate.getTime()));
    const iterEnd = new Date(Math.min(slotEnd.getTime(), endDate.getTime()));

    const iterDate = new Date(iterStart);
    while (iterDate <= iterEnd) {
      const dateKey = formatDateKey(iterDate);
      dayAvailability.set(dateKey, slot.availabilityType);

      // Track conflicts
      if (slot.availabilityType === "ON_ASSIGNMENT" && slot.notes) {
        conflicts.push(slot.notes);
      }

      iterDate.setDate(iterDate.getDate() + 1);
    }
  }

  // Count available days (AVAILABLE = 1.0, TENTATIVE = 0.5)
  let availableDays = 0;
  let weightedAvailability = 0;

  for (const status of dayAvailability.values()) {
    if (status === "AVAILABLE") {
      availableDays++;
      weightedAvailability += 1.0;
    } else if (status === "TENTATIVE") {
      availableDays += 0.5;
      weightedAvailability += 0.5;
    }
  }

  const coverage = totalDays > 0 ? weightedAvailability / totalDays : 0;
  const score = Math.round(coverage * maxScore * 10) / 10;

  return {
    score: Math.min(score, maxScore),
    maxScore,
    availableDays: Math.round(availableDays * 10) / 10,
    totalDays,
    coverage: Math.round(coverage * 100) / 100,
    conflicts: [...new Set(conflicts)], // Remove duplicates
  };
}

/**
 * Get number of days between two dates (inclusive).
 */
function getDaysBetween(start: Date, end: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round(Math.abs((e.getTime() - s.getTime()) / oneDay)) + 1;
}

/**
 * Format date as YYYY-MM-DD string for map key.
 */
function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

// =============================================================================
// EXPERIENCE SCORING (Max 10 points)
// =============================================================================

/**
 * Score reviewer based on experience.
 *
 * Scoring breakdown:
 * - Years in aviation: up to 5 points (max at 15+ years)
 * - Reviews completed: up to 5 points (max at 10+ reviews)
 */
export function scoreExperience(
  yearsInAviation: number,
  reviewsCompleted: number
): ExperienceScoreResult {
  const maxScore = 10; // MATCHING_WEIGHTS.EXPERIENCE

  // Years bonus (0-5 points)
  // 5 years = 1 point, 10 years = 3 points, 15+ years = 5 points
  let yearsBonus = 0;
  if (yearsInAviation >= 15) {
    yearsBonus = 5;
  } else if (yearsInAviation >= 10) {
    yearsBonus = 3;
  } else if (yearsInAviation >= QUALIFICATION_REQUIREMENTS.MIN_YEARS_EXPERIENCE) {
    yearsBonus = 1 + ((yearsInAviation - 5) / 5) * 2;
  }
  yearsBonus = Math.min(yearsBonus, 5);

  // Reviews bonus (0-5 points)
  // 2 reviews = 1 point, 5 reviews = 3 points, 10+ reviews = 5 points
  let reviewsBonus = 0;
  if (reviewsCompleted >= 10) {
    reviewsBonus = 5;
  } else if (reviewsCompleted >= 5) {
    reviewsBonus = 3;
  } else if (reviewsCompleted >= QUALIFICATION_REQUIREMENTS.MIN_REVIEWS_FOR_LEAD) {
    reviewsBonus = 1 + ((reviewsCompleted - 2) / 3) * 2;
  } else if (reviewsCompleted > 0) {
    reviewsBonus = reviewsCompleted * 0.5;
  }
  reviewsBonus = Math.min(reviewsBonus, 5);

  const totalScore = Math.round((yearsBonus + reviewsBonus) * 10) / 10;

  return {
    score: Math.min(totalScore, maxScore),
    maxScore,
    yearsBonus: Math.round(yearsBonus * 10) / 10,
    reviewsBonus: Math.round(reviewsBonus * 10) / 10,
  };
}

// =============================================================================
// TOTAL SCORE CALCULATION
// =============================================================================

export interface TotalScoreBreakdown {
  expertiseScore: number;
  languageScore: number;
  availabilityScore: number;
  experienceScore: number;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
}

/**
 * Calculate total matching score from all components.
 */
export function calculateTotalScore(
  expertise: ExpertiseScoreResult,
  language: LanguageScoreResult,
  availability: AvailabilityScoreResult,
  experience: ExperienceScoreResult
): TotalScoreBreakdown {
  const maxPossibleScore = 100;
  const totalScore =
    expertise.score + language.score + availability.score + experience.score;

  return {
    expertiseScore: expertise.score,
    languageScore: language.score,
    availabilityScore: availability.score,
    experienceScore: experience.score,
    totalScore: Math.round(totalScore * 10) / 10,
    maxPossibleScore,
    percentage: Math.round((totalScore / maxPossibleScore) * 100),
  };
}
