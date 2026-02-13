"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

// =============================================================================
// NEW SIMPLIFIED API
// =============================================================================

interface UseKeyboardShortcutsOptions {
  onOpenSearch?: () => void;
  onOpenShortcuts?: () => void;
  onPendingKeyChange?: (key: string | null) => void;
}

export function useKeyboardShortcuts({
  onOpenSearch,
  onOpenShortcuts,
  onPendingKeyChange,
}: UseKeyboardShortcutsOptions = {}) {
  const router = useRouter();
  const locale = useLocale();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    onPendingKeyChange?.(pendingKey);
  }, [pendingKey, onPendingKeyChange]);

  const navigate = useCallback((path: string) => {
    router.push(`/${locale}${path}`);
  }, [router, locale]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" ||
      target.isContentEditable || target.closest("[role='dialog']");
    if (isInput) return;

    const isMod = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();

    // Modifier shortcuts
    if (isMod) {
      if (key === "k") { event.preventDefault(); onOpenSearch?.(); return; }
      if (key === "/") { event.preventDefault(); onOpenShortcuts?.(); return; }
    }

    // Handle pending sequence
    if (pendingKey) {
      event.preventDefault();

      if (pendingKey === "G") {
        const navMap: Record<string, string> = {
          h: "/dashboard", i: "/analytics", a: "/assessments", r: "/reviews",
          k: "/knowledge", v: "/reviewers", t: "/training", s: "/settings",
        };
        if (navMap[key]) navigate(navMap[key]);
      }

      if (pendingKey === "N") {
        const createMap: Record<string, string> = {
          r: "/reviews/new", f: "/findings/new", a: "/assessments/new", c: "/caps/new",
        };
        if (createMap[key]) navigate(createMap[key]);
      }

      setPendingKey(null);
      return;
    }

    // Start sequence
    if (key === "g" || key === "n") {
      event.preventDefault();
      setPendingKey(key.toUpperCase());
      setTimeout(() => setPendingKey(null), 1500);
    }
  }, [pendingKey, navigate, onOpenSearch, onOpenShortcuts]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { pendingKey };
}

// =============================================================================
// LEGACY API (for backward compatibility)
// =============================================================================

export interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  category?: "global" | "navigation" | "reviews" | "findings" | "caps" | "actions";
}

export interface SequenceShortcut {
  id: string;
  keys: string;
  action: () => void;
  description: string;
  category: "global" | "navigation" | "reviews" | "findings" | "caps" | "actions";
}

/**
 * Legacy hook for handling keyboard shortcuts (array-based config)
 */
export function useLegacyKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  enabled = true
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

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
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrlKey === (event.ctrlKey || event.metaKey);
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

  let key = shortcut.key;
  if (key === " ") key = "Space";
  if (key === "Escape") key = "Esc";
  if (key.length === 1) key = key.toUpperCase();

  parts.push(key);

  return parts.join("+");
}

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

  let key = shortcut.key;
  if (key === " ") key = "Space";
  if (key === "Escape") key = "Esc";
  if (key.length === 1) key = key.toUpperCase();

  keys.push(key);

  return keys;
}

const SEQUENCE_TIMEOUT = 1000;

export function useSequenceShortcuts(
  shortcuts: SequenceShortcut[],
  enabled = true
) {
  const [currentSequence, setCurrentSequence] = useState("");
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable ||
        target.tagName === "SELECT"
      ) {
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
          return;
        }
      }

      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }

      const pressedKey = event.key.toLowerCase();
      const newSequence = currentSequence ? `${currentSequence} ${pressedKey}` : pressedKey;

      for (const shortcut of shortcuts) {
        const keys = shortcut.keys.toLowerCase();
        if (newSequence === keys) {
          event.preventDefault();
          shortcut.action();
          setCurrentSequence("");
          return;
        }
      }

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

export function formatSequenceShortcut(keys: string): string[] {
  return keys.split(" ").map((k) => k.toUpperCase());
}

export default useKeyboardShortcuts;
