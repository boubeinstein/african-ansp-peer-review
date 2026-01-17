/**
 * Score Color Utilities
 *
 * Centralized color management for match scores with
 * consistent theming and accessibility.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ScoreColorSet {
  bg: string;
  text: string;
  border: string;
  label: string;
}

export type ScoreLevel = "excellent" | "good" | "fair" | "poor";

// =============================================================================
// SCORE THRESHOLDS
// =============================================================================

export const SCORE_THRESHOLDS = {
  excellent: 80,
  good: 60,
  fair: 40,
} as const;

// =============================================================================
// COLOR DEFINITIONS
// =============================================================================

const SCORE_COLORS: Record<ScoreLevel, ScoreColorSet> = {
  excellent: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-500",
    label: "excellent",
  },
  good: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-500",
    label: "good",
  },
  fair: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-500",
    label: "fair",
  },
  poor: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-500",
    label: "poor",
  },
};

// Badge-specific colors (solid backgrounds)
const BADGE_COLORS: Record<ScoreLevel, string> = {
  excellent: "bg-green-500 hover:bg-green-600 text-white",
  good: "bg-yellow-500 hover:bg-yellow-600 text-white",
  fair: "bg-orange-500 hover:bg-orange-600 text-white",
  poor: "bg-red-500 hover:bg-red-600 text-white",
};

// Progress bar colors
const PROGRESS_COLORS: Record<ScoreLevel, string> = {
  excellent: "bg-green-500",
  good: "bg-yellow-500",
  fair: "bg-orange-500",
  poor: "bg-red-500",
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Determine the score level based on percentage
 */
export function getScoreLevel(score: number): ScoreLevel {
  if (score >= SCORE_THRESHOLDS.excellent) return "excellent";
  if (score >= SCORE_THRESHOLDS.good) return "good";
  if (score >= SCORE_THRESHOLDS.fair) return "fair";
  return "poor";
}

/**
 * Get the full color set for a score
 */
export function getScoreColor(score: number): ScoreColorSet {
  const level = getScoreLevel(score);
  return SCORE_COLORS[level];
}

/**
 * Get badge-specific styling for a score
 */
export function getScoreBadgeColor(score: number): string {
  const level = getScoreLevel(score);
  return BADGE_COLORS[level];
}

/**
 * Get progress bar color for a score
 */
export function getScoreProgressColor(score: number): string {
  const level = getScoreLevel(score);
  return PROGRESS_COLORS[level];
}

/**
 * Get simple text color class for a score
 */
export function getScoreTextColor(score: number): string {
  const level = getScoreLevel(score);
  return SCORE_COLORS[level].text;
}

/**
 * Get a CSS gradient for visual score representation
 */
export function getScoreGradient(score: number): string {
  if (score >= SCORE_THRESHOLDS.excellent) {
    return "from-green-500 to-emerald-500";
  }
  if (score >= SCORE_THRESHOLDS.good) {
    return "from-yellow-500 to-amber-500";
  }
  if (score >= SCORE_THRESHOLDS.fair) {
    return "from-orange-500 to-amber-600";
  }
  return "from-red-500 to-rose-500";
}

/**
 * Get ring/outline color for focused score elements
 */
export function getScoreRingColor(score: number): string {
  const level = getScoreLevel(score);
  const ringColors: Record<ScoreLevel, string> = {
    excellent: "ring-green-500/50",
    good: "ring-yellow-500/50",
    fair: "ring-orange-500/50",
    poor: "ring-red-500/50",
  };
  return ringColors[level];
}

/**
 * Format score for display (ensures consistent decimal places)
 */
export function formatScore(score: number, decimals: number = 0): string {
  return score.toFixed(decimals);
}

/**
 * Calculate percentage from raw score and max
 */
export function calculatePercentage(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.round((score / maxScore) * 100);
}
