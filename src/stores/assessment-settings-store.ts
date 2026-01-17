"use client";

/**
 * Assessment Settings Store
 *
 * Zustand store with localStorage persistence for assessment workspace settings.
 * Includes display, auto-save, notification, and accessibility preferences.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// =============================================================================
// TYPES
// =============================================================================

export interface AssessmentSettings {
  // Display Settings
  questionTextSize: "small" | "medium" | "large";
  showQuestionNumbers: boolean;
  showIcaoReferences: boolean;
  showGuidanceByDefault: boolean;
  sidebarPosition: "left" | "right";
  compactMode: boolean;
  themeOverride: "light" | "dark" | "system";

  // Auto-save Settings
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // seconds
  saveIndicatorDuration: number; // seconds, 0 = always visible
  confirmBeforeLeaving: boolean;

  // Notification Preferences
  showSaveToast: boolean;
  showShortcutHints: boolean;
  showProgressMilestones: boolean;

  // Accessibility Settings
  reduceMotion: boolean;
  highContrast: boolean;
  screenReaderAnnouncements: boolean;
  enhancedFocusIndicators: boolean;
}

export interface AssessmentSettingsStore extends AssessmentSettings {
  /** Update a single setting */
  updateSetting: <K extends keyof AssessmentSettings>(
    key: K,
    value: AssessmentSettings[K]
  ) => void;
  /** Update multiple settings at once */
  updateSettings: (settings: Partial<AssessmentSettings>) => void;
  /** Reset all settings to defaults */
  resetToDefaults: () => void;
}

// =============================================================================
// DEFAULT SETTINGS
// =============================================================================

export const defaultSettings: AssessmentSettings = {
  // Display Settings
  questionTextSize: "medium",
  showQuestionNumbers: true,
  showIcaoReferences: true,
  showGuidanceByDefault: false,
  sidebarPosition: "left",
  compactMode: false,
  themeOverride: "system",

  // Auto-save Settings
  autoSaveEnabled: true,
  autoSaveInterval: 30,
  saveIndicatorDuration: 2,
  confirmBeforeLeaving: true,

  // Notification Preferences
  showSaveToast: true,
  showShortcutHints: true,
  showProgressMilestones: true,

  // Accessibility Settings
  reduceMotion: false,
  highContrast: false,
  screenReaderAnnouncements: true,
  enhancedFocusIndicators: false,
};

// =============================================================================
// STORE
// =============================================================================

export const useAssessmentSettings = create<AssessmentSettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,

      updateSetting: (key, value) =>
        set((state) => ({
          ...state,
          [key]: value,
        })),

      updateSettings: (settings) =>
        set((state) => ({
          ...state,
          ...settings,
        })),

      resetToDefaults: () => set(defaultSettings),
    }),
    {
      name: "assessment-settings",
      version: 1,
      // Only persist settings, not methods
      partialize: (state) => ({
        questionTextSize: state.questionTextSize,
        showQuestionNumbers: state.showQuestionNumbers,
        showIcaoReferences: state.showIcaoReferences,
        showGuidanceByDefault: state.showGuidanceByDefault,
        sidebarPosition: state.sidebarPosition,
        compactMode: state.compactMode,
        themeOverride: state.themeOverride,
        autoSaveEnabled: state.autoSaveEnabled,
        autoSaveInterval: state.autoSaveInterval,
        saveIndicatorDuration: state.saveIndicatorDuration,
        confirmBeforeLeaving: state.confirmBeforeLeaving,
        showSaveToast: state.showSaveToast,
        showShortcutHints: state.showShortcutHints,
        showProgressMilestones: state.showProgressMilestones,
        reduceMotion: state.reduceMotion,
        highContrast: state.highContrast,
        screenReaderAnnouncements: state.screenReaderAnnouncements,
        enhancedFocusIndicators: state.enhancedFocusIndicators,
      }),
    }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

/** Get display-related settings */
export const selectDisplaySettings = (state: AssessmentSettingsStore) => ({
  questionTextSize: state.questionTextSize,
  showQuestionNumbers: state.showQuestionNumbers,
  showIcaoReferences: state.showIcaoReferences,
  showGuidanceByDefault: state.showGuidanceByDefault,
  sidebarPosition: state.sidebarPosition,
  compactMode: state.compactMode,
  themeOverride: state.themeOverride,
});

/** Get auto-save settings */
export const selectAutoSaveSettings = (state: AssessmentSettingsStore) => ({
  autoSaveEnabled: state.autoSaveEnabled,
  autoSaveInterval: state.autoSaveInterval,
  saveIndicatorDuration: state.saveIndicatorDuration,
  confirmBeforeLeaving: state.confirmBeforeLeaving,
});

/** Get notification settings */
export const selectNotificationSettings = (state: AssessmentSettingsStore) => ({
  showSaveToast: state.showSaveToast,
  showShortcutHints: state.showShortcutHints,
  showProgressMilestones: state.showProgressMilestones,
});

/** Get accessibility settings */
export const selectAccessibilitySettings = (state: AssessmentSettingsStore) => ({
  reduceMotion: state.reduceMotion,
  highContrast: state.highContrast,
  screenReaderAnnouncements: state.screenReaderAnnouncements,
  enhancedFocusIndicators: state.enhancedFocusIndicators,
});

// =============================================================================
// UTILITIES
// =============================================================================

/** Get CSS classes for text size */
export function getTextSizeClasses(size: AssessmentSettings["questionTextSize"]): string {
  switch (size) {
    case "small":
      return "text-sm";
    case "large":
      return "text-lg";
    case "medium":
    default:
      return "text-base";
  }
}

/** Get CSS classes for accessibility settings */
export function getAccessibilityClasses(settings: {
  reduceMotion: boolean;
  highContrast: boolean;
  enhancedFocusIndicators: boolean;
}): string {
  const classes: string[] = [];

  if (settings.reduceMotion) {
    classes.push("motion-reduce");
  }

  if (settings.highContrast) {
    classes.push("high-contrast");
  }

  if (settings.enhancedFocusIndicators) {
    classes.push("enhanced-focus");
  }

  return classes.join(" ");
}

export default useAssessmentSettings;
