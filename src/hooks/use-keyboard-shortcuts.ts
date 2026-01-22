"use client";

/**
 * Keyboard Shortcuts Hook
 *
 * Provides keyboard shortcut handling with support for
 * modifier keys, key sequences, and automatic input field detection.
 */

import { useEffect, useCallback, useRef, useState } from "react";

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
  /** Category for grouping in help dialog */
  category?: "global" | "navigation" | "reviews" | "findings" | "caps" | "actions";
}

export interface SequenceShortcut {
  /** Unique identifier */
  id: string;
  /** Key sequence (e.g., "g d" for Go to Dashboard) */
  keys: string;
  /** The action to perform */
  action: () => void;
  /** Description for help dialog */
  description: string;
  /** Category for grouping */
  category: "global" | "navigation" | "reviews" | "findings" | "caps" | "actions";
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

// =============================================================================
// SEQUENCE SHORTCUTS HOOK
// =============================================================================

const SEQUENCE_TIMEOUT = 1000; // Time window for key sequences (ms)

/**
 * Hook for handling key sequence shortcuts (e.g., "g d" for Go to Dashboard)
 */
export function useSequenceShortcuts(
  shortcuts: SequenceShortcut[],
  enabled = true
) {
  const [currentSequence, setCurrentSequence] = useState("");
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable ||
        target.tagName === "SELECT"
      ) {
        // Allow modifier shortcuts in inputs
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
          return;
        }
      }

      // Clear previous timeout
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }

      const pressedKey = event.key.toLowerCase();

      // Build new sequence
      const newSequence = currentSequence
        ? `${currentSequence} ${pressedKey}`
        : pressedKey;

      // Check for matching shortcuts
      for (const shortcut of shortcuts) {
        const keys = shortcut.keys.toLowerCase();

        // Exact match
        if (newSequence === keys) {
          event.preventDefault();
          shortcut.action();
          setCurrentSequence("");
          return;
        }
      }

      // Check if any shortcuts start with the current sequence
      const hasMatchingPrefix = shortcuts.some((s) =>
        s.keys.toLowerCase().startsWith(newSequence)
      );

      if (hasMatchingPrefix) {
        setCurrentSequence(newSequence);
        sequenceTimeoutRef.current = setTimeout(() => {
          setCurrentSequence("");
        }, SEQUENCE_TIMEOUT);
      } else {
        setCurrentSequence("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
    };
  }, [enabled, shortcuts, currentSequence]);

  return { currentSequence };
}

/**
 * Format a sequence shortcut for display
 */
export function formatSequenceShortcut(keys: string): string[] {
  return keys.split(" ").map((k) => k.toUpperCase());
}

export default useKeyboardShortcuts;
