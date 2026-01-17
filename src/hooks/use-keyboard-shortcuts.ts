"use client";

/**
 * Keyboard Shortcuts Hook
 *
 * Provides keyboard shortcut handling with support for
 * modifier keys and automatic input field detection.
 */

import { useEffect, useCallback } from "react";

// =============================================================================
// TYPES
// =============================================================================

export interface ShortcutConfig {
  /** The key to listen for (case-insensitive) */
  key: string;
  /** Require Ctrl key (or Cmd on Mac) */
  ctrlKey?: boolean;
  /** Require Shift key */
  shiftKey?: boolean;
  /** Require Alt key (or Option on Mac) */
  altKey?: boolean;
  /** The action to perform when shortcut is triggered */
  action: () => void;
  /** Description of what the shortcut does (for help dialogs) */
  description: string;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for handling keyboard shortcuts
 *
 * @param shortcuts - Array of shortcut configurations
 * @param enabled - Whether shortcuts are currently enabled (default: true)
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: "f", action: handleSearch, description: "Find matches" },
 *   { key: "c", ctrlKey: true, action: handleCopy, description: "Copy" },
 *   { key: "?", shiftKey: true, action: showHelp, description: "Show help" },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  enabled = true
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable ||
        target.tagName === "SELECT"
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch =
          event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch =
          !!shortcut.ctrlKey === (event.ctrlKey || event.metaKey);
        const shiftMatch = !!shortcut.shiftKey === event.shiftKey;
        const altMatch = !!shortcut.altKey === event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Format a shortcut for display (e.g., "Ctrl+Shift+F")
 */
export function formatShortcut(shortcut: ShortcutConfig): string {
  const parts: string[] = [];

  if (shortcut.ctrlKey) {
    parts.push(typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌘" : "Ctrl");
  }
  if (shortcut.altKey) {
    parts.push(typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌥" : "Alt");
  }
  if (shortcut.shiftKey) {
    parts.push("Shift");
  }

  // Format the key nicely
  let key = shortcut.key;
  if (key === " ") key = "Space";
  if (key === "Escape") key = "Esc";
  if (key.length === 1) key = key.toUpperCase();

  parts.push(key);

  return parts.join("+");
}

/**
 * Get shortcut keys as an array (for rendering individual key badges)
 */
export function getShortcutKeys(shortcut: ShortcutConfig): string[] {
  const keys: string[] = [];

  if (shortcut.ctrlKey) {
    keys.push(typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌘" : "Ctrl");
  }
  if (shortcut.altKey) {
    keys.push(typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌥" : "Alt");
  }
  if (shortcut.shiftKey) {
    keys.push("Shift");
  }

  // Format the key nicely
  let key = shortcut.key;
  if (key === " ") key = "Space";
  if (key === "Escape") key = "Esc";
  if (key.length === 1) key = key.toUpperCase();

  keys.push(key);

  return keys;
}

export default useKeyboardShortcuts;
