"use client";

/**
 * Assessment Workspace Keyboard Shortcuts Hook
 *
 * Provides comprehensive keyboard shortcuts for the assessment workspace
 * including navigation, responses, saving, and help functionality.
 */

import { useMemo } from "react";
import { useKeyboardShortcuts, ShortcutConfig } from "./use-keyboard-shortcuts";

// =============================================================================
// TYPES
// =============================================================================

export interface AssessmentShortcutHandlers {
  // Navigation
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onOpenQuestion?: () => void;

  // Response selection (ANS - USOAP CMA)
  onSelectSatisfactory?: () => void;
  onSelectNotSatisfactory?: () => void;
  onSelectNotApplicable?: () => void;
  onSelectNotReviewed?: () => void;

  // Response selection (SMS - CANSO SOE - maturity levels)
  onSelectLevelA?: () => void;
  onSelectLevelB?: () => void;
  onSelectLevelC?: () => void;
  onSelectLevelD?: () => void;
  onSelectLevelE?: () => void;

  // Actions
  onSave?: () => void;
  onSaveAndNext?: () => void;
  onToggleFlag?: () => void;
  onOpenEvidence?: () => void;
  onOpenNotes?: () => void;
  onShowHelp?: () => void;
  onEscape?: () => void;
}

export interface UseAssessmentShortcutsOptions {
  /** Handlers for keyboard shortcuts */
  handlers: AssessmentShortcutHandlers;
  /** Type of questionnaire (affects which response shortcuts are active) */
  questionnaireType?: "ANS_USOAP_CMA" | "SMS_CANSO_SOE";
  /** Whether shortcuts are enabled (default: true) */
  enabled?: boolean;
  /** Whether a modal/dialog is currently open (disables most shortcuts) */
  isModalOpen?: boolean;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for assessment workspace keyboard shortcuts
 *
 * @example
 * ```tsx
 * useAssessmentShortcuts({
 *   handlers: {
 *     onNavigateNext: () => selectNextQuestion(),
 *     onNavigatePrevious: () => selectPreviousQuestion(),
 *     onSave: () => saveCurrentResponse(),
 *     onShowHelp: () => setHelpOpen(true),
 *   },
 *   questionnaireType: "ANS_USOAP_CMA",
 *   enabled: !isModalOpen,
 * });
 * ```
 */
export function useAssessmentShortcuts({
  handlers,
  questionnaireType = "ANS_USOAP_CMA",
  enabled = true,
  isModalOpen = false,
}: UseAssessmentShortcutsOptions) {
  // Memoize handlers to prevent unnecessary re-renders
  const {
    onNavigatePrevious,
    onNavigateNext,
    onNavigateUp,
    onNavigateDown,
    onOpenQuestion,
    onSelectSatisfactory,
    onSelectNotSatisfactory,
    onSelectNotApplicable,
    onSelectNotReviewed,
    onSelectLevelA,
    onSelectLevelB,
    onSelectLevelC,
    onSelectLevelD,
    onSelectLevelE,
    onSave,
    onSaveAndNext,
    onToggleFlag,
    onOpenEvidence,
    onOpenNotes,
    onShowHelp,
    onEscape,
  } = handlers;

  // Build shortcuts array based on questionnaire type and provided handlers
  const shortcuts = useMemo<ShortcutConfig[]>(() => {
    const configs: ShortcutConfig[] = [];

    // Navigation shortcuts (always available when not in modal)
    if (onNavigateUp) {
      configs.push({
        key: "ArrowUp",
        action: onNavigateUp,
        description: "Navigate to previous question",
      });
    }
    if (onNavigateDown) {
      configs.push({
        key: "ArrowDown",
        action: onNavigateDown,
        description: "Navigate to next question",
      });
    }
    if (onNavigatePrevious) {
      configs.push({
        key: "ArrowLeft",
        action: onNavigatePrevious,
        description: "Navigate to previous section",
      });
    }
    if (onNavigateNext) {
      configs.push({
        key: "ArrowRight",
        action: onNavigateNext,
        description: "Navigate to next section",
      });
    }
    if (onOpenQuestion) {
      configs.push({
        key: "Enter",
        action: onOpenQuestion,
        description: "Open selected question",
      });
    }

    // ANS response shortcuts (1-4)
    if (questionnaireType === "ANS_USOAP_CMA") {
      if (onSelectSatisfactory) {
        configs.push({
          key: "1",
          action: onSelectSatisfactory,
          description: "Mark as Satisfactory",
        });
      }
      if (onSelectNotSatisfactory) {
        configs.push({
          key: "2",
          action: onSelectNotSatisfactory,
          description: "Mark as Not Satisfactory",
        });
      }
      if (onSelectNotApplicable) {
        configs.push({
          key: "3",
          action: onSelectNotApplicable,
          description: "Mark as Not Applicable",
        });
      }
      if (onSelectNotReviewed) {
        configs.push({
          key: "4",
          action: onSelectNotReviewed,
          description: "Mark as Not Reviewed",
        });
      }
    }

    // SMS maturity level shortcuts (A-E)
    if (questionnaireType === "SMS_CANSO_SOE") {
      if (onSelectLevelA) {
        configs.push({
          key: "a",
          action: onSelectLevelA,
          description: "Select Maturity Level A",
        });
      }
      if (onSelectLevelB) {
        configs.push({
          key: "b",
          action: onSelectLevelB,
          description: "Select Maturity Level B",
        });
      }
      if (onSelectLevelC) {
        configs.push({
          key: "c",
          action: onSelectLevelC,
          description: "Select Maturity Level C",
        });
      }
      if (onSelectLevelD) {
        configs.push({
          key: "d",
          action: onSelectLevelD,
          description: "Select Maturity Level D",
        });
      }
      if (onSelectLevelE) {
        configs.push({
          key: "e",
          action: onSelectLevelE,
          description: "Select Maturity Level E",
        });
      }
    }

    // Flag toggle (F)
    if (onToggleFlag) {
      configs.push({
        key: "f",
        action: onToggleFlag,
        description: "Toggle question flag",
      });
    }

    // Save shortcuts
    if (onSave) {
      configs.push({
        key: "s",
        ctrlKey: true,
        action: onSave,
        description: "Save current response",
      });
    }
    if (onSaveAndNext) {
      configs.push({
        key: "Enter",
        ctrlKey: true,
        action: onSaveAndNext,
        description: "Save and go to next question",
      });
    }

    // Evidence and Notes
    if (onOpenEvidence) {
      configs.push({
        key: "e",
        ctrlKey: true,
        action: onOpenEvidence,
        description: "Open evidence panel",
      });
    }
    if (onOpenNotes) {
      configs.push({
        key: "n",
        ctrlKey: true,
        action: onOpenNotes,
        description: "Open notes panel",
      });
    }

    // Help (? or F1) - these have special handling in the help dialog itself
    if (onShowHelp) {
      configs.push({
        key: "?",
        action: onShowHelp,
        description: "Show help dialog",
      });
      configs.push({
        key: "F1",
        action: onShowHelp,
        description: "Show help dialog",
      });
    }

    // Escape
    if (onEscape) {
      configs.push({
        key: "Escape",
        action: onEscape,
        description: "Close dialog or deselect",
      });
    }

    return configs;
  }, [
    questionnaireType,
    onNavigatePrevious,
    onNavigateNext,
    onNavigateUp,
    onNavigateDown,
    onOpenQuestion,
    onSelectSatisfactory,
    onSelectNotSatisfactory,
    onSelectNotApplicable,
    onSelectNotReviewed,
    onSelectLevelA,
    onSelectLevelB,
    onSelectLevelC,
    onSelectLevelD,
    onSelectLevelE,
    onSave,
    onSaveAndNext,
    onToggleFlag,
    onOpenEvidence,
    onOpenNotes,
    onShowHelp,
    onEscape,
  ]);

  // Use the base keyboard shortcuts hook
  // Disable when modal is open (except for escape which is handled separately)
  useKeyboardShortcuts(shortcuts, enabled && !isModalOpen);

  // Return the shortcuts for documentation/help dialogs
  return {
    shortcuts,
    questionnaireType,
  };
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get default shortcuts documentation based on questionnaire type
 */
export function getDefaultShortcutsDoc(
  questionnaireType: "ANS_USOAP_CMA" | "SMS_CANSO_SOE" = "ANS_USOAP_CMA"
) {
  const navigationShortcuts = [
    { keys: ["↑"], description: "Previous question" },
    { keys: ["↓"], description: "Next question" },
    { keys: ["←"], description: "Previous section" },
    { keys: ["→"], description: "Next section" },
    { keys: ["Enter"], description: "Open question" },
  ];

  const responseShortcuts =
    questionnaireType === "ANS_USOAP_CMA"
      ? [
          { keys: ["1"], description: "Satisfactory" },
          { keys: ["2"], description: "Not Satisfactory" },
          { keys: ["3"], description: "Not Applicable" },
          { keys: ["4"], description: "Not Reviewed" },
        ]
      : [
          { keys: ["A"], description: "Level A (Initial)" },
          { keys: ["B"], description: "Level B (Defined)" },
          { keys: ["C"], description: "Level C (Managed)" },
          { keys: ["D"], description: "Level D (Optimizing)" },
          { keys: ["E"], description: "Level E (Excelling)" },
        ];

  const actionShortcuts = [
    { keys: ["Ctrl", "S"], description: "Save response" },
    { keys: ["Ctrl", "Enter"], description: "Save and next" },
    { keys: ["F"], description: "Toggle flag" },
    { keys: ["Ctrl", "E"], description: "Open evidence" },
    { keys: ["Ctrl", "N"], description: "Open notes" },
    { keys: ["?", "F1"], description: "Show help" },
    { keys: ["Esc"], description: "Close dialog" },
  ];

  return {
    navigation: navigationShortcuts,
    responses: responseShortcuts,
    actions: actionShortcuts,
  };
}

export default useAssessmentShortcuts;
