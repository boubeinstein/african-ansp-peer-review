/**
 * Matching Components
 *
 * Components for displaying match scores, breakdowns,
 * and related matching UI elements.
 */

export {
  ScoreBadge,
  CircularScoreBadge,
  type ScoreBadgeProps,
  type CircularScoreBadgeProps,
} from "./score-badge";

export {
  ScoreBreakdown,
  ReviewerScoreBreakdown,
  HorizontalScoreBreakdown,
  DEFAULT_BREAKDOWN_CONFIG,
  type ScoreBreakdownProps,
  type ScoreBreakdownItem,
  type ReviewerScoreBreakdownProps,
  type HorizontalScoreBreakdownProps,
} from "./score-breakdown";

export {
  MatchingEmptyState,
  type MatchingEmptyStateProps,
  type EmptyStateType,
} from "./empty-state";

export {
  ShortcutsHelpDialog,
  type ShortcutsHelpDialogProps,
} from "./shortcuts-help";

export {
  ScoreHelpTooltip,
  CoverageHelpTooltip,
  ExpertiseAreaTooltip,
  ExpertiseBadgeWithTooltip,
  EligibilityHelpTooltip,
  type ScoreHelpTooltipProps,
  type CoverageHelpTooltipProps,
  type ExpertiseAreaTooltipProps,
  type ExpertiseBadgeWithTooltipProps,
  type EligibilityHelpTooltipProps,
  type CoverageType,
} from "./score-explanation";
