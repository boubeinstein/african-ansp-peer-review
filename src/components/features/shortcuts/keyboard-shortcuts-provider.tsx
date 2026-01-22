"use client";

/**
 * Keyboard Shortcuts Provider
 *
 * Provides global keyboard shortcuts functionality throughout the app.
 * Wraps the app with shortcuts context and renders necessary dialogs.
 */

import { createContext, useContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useKeyboardShortcuts, useSequenceShortcuts, type SequenceShortcut } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsHelp } from "./keyboard-shortcuts-help";
import { CommandPalette } from "./command-palette";

// =============================================================================
// CONTEXT
// =============================================================================

interface KeyboardShortcutsContextValue {
  /** Open the command palette */
  openCommandPalette: () => void;
  /** Open the shortcuts help dialog */
  openShortcutsHelp: () => void;
  /** Current key sequence being typed */
  currentSequence: string;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

export function useKeyboardShortcutsContext() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error(
      "useKeyboardShortcutsContext must be used within KeyboardShortcutsProvider"
    );
  }
  return context;
}

// =============================================================================
// PROVIDER
// =============================================================================

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
}

export function KeyboardShortcutsProvider({
  children,
}: KeyboardShortcutsProviderProps) {
  const router = useRouter();
  const locale = useLocale();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);

  // Navigation helper
  const navigate = useCallback(
    (path: string) => {
      router.push(`/${locale}${path}`);
    },
    [router, locale]
  );

  // Open command palette
  const openCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  // Open shortcuts help
  const openShortcutsHelp = useCallback(() => {
    setIsShortcutsHelpOpen(true);
  }, []);

  // Register modifier shortcuts (Ctrl+K, Ctrl+/, etc.)
  useKeyboardShortcuts([
    {
      key: "k",
      ctrlKey: true,
      action: openCommandPalette,
      description: "Open quick search",
    },
    {
      key: "/",
      ctrlKey: true,
      action: openShortcutsHelp,
      description: "Show keyboard shortcuts",
    },
    {
      key: "?",
      action: openShortcutsHelp,
      description: "Show keyboard shortcuts",
    },
    {
      key: "Escape",
      action: () => {
        if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
        if (isShortcutsHelpOpen) setIsShortcutsHelpOpen(false);
      },
      description: "Close dialog",
    },
  ]);

  // Sequence shortcuts
  const sequenceShortcuts: SequenceShortcut[] = [
    // Navigation (g prefix)
    {
      id: "nav-dashboard",
      keys: "g d",
      description: "Go to Dashboard",
      category: "navigation",
      action: () => navigate("/dashboard"),
    },
    {
      id: "nav-reviews",
      keys: "g r",
      description: "Go to Reviews",
      category: "navigation",
      action: () => navigate("/reviews"),
    },
    {
      id: "nav-findings",
      keys: "g f",
      description: "Go to Findings",
      category: "navigation",
      action: () => navigate("/findings"),
    },
    {
      id: "nav-caps",
      keys: "g c",
      description: "Go to CAPs",
      category: "navigation",
      action: () => navigate("/caps"),
    },
    {
      id: "nav-organizations",
      keys: "g o",
      description: "Go to Organizations",
      category: "navigation",
      action: () => navigate("/organizations"),
    },
    {
      id: "nav-reviewers",
      keys: "g e",
      description: "Go to Reviewers",
      category: "navigation",
      action: () => navigate("/reviewers"),
    },
    {
      id: "nav-analytics",
      keys: "g a",
      description: "Go to Analytics",
      category: "navigation",
      action: () => navigate("/analytics"),
    },
    {
      id: "nav-settings",
      keys: "g s",
      description: "Go to Settings",
      category: "navigation",
      action: () => navigate("/settings"),
    },
    // Reviews (r prefix)
    {
      id: "reviews-new",
      keys: "r n",
      description: "New review request",
      category: "reviews",
      action: () => navigate("/reviews/new"),
    },
    {
      id: "reviews-list",
      keys: "r l",
      description: "Reviews list",
      category: "reviews",
      action: () => navigate("/reviews"),
    },
    // Findings (f prefix)
    {
      id: "findings-list",
      keys: "f l",
      description: "Findings list",
      category: "findings",
      action: () => navigate("/findings"),
    },
    // CAPs (c prefix)
    {
      id: "caps-list",
      keys: "c l",
      description: "CAPs list",
      category: "caps",
      action: () => navigate("/caps"),
    },
  ];

  const { currentSequence } = useSequenceShortcuts(sequenceShortcuts);

  // Context value
  const contextValue: KeyboardShortcutsContextValue = {
    openCommandPalette,
    openShortcutsHelp,
    currentSequence,
  };

  return (
    <KeyboardShortcutsContext.Provider value={contextValue}>
      {children}

      {/* Sequence indicator */}
      {currentSequence && (
        <div className="fixed bottom-4 right-4 z-50 bg-background border shadow-lg rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Shortcut:</span>
            <div className="flex items-center gap-1">
              {currentSequence.split(" ").map((key, i) => (
                <kbd
                  key={i}
                  className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-medium bg-muted border rounded"
                >
                  {key.toUpperCase()}
                </kbd>
              ))}
              <span className="text-muted-foreground animate-pulse">...</span>
            </div>
          </div>
        </div>
      )}

      {/* Command Palette */}
      <CommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        onShowShortcuts={openShortcutsHelp}
      />

      {/* Shortcuts Help Dialog */}
      <KeyboardShortcutsHelp
        open={isShortcutsHelpOpen}
        onOpenChange={setIsShortcutsHelpOpen}
      />
    </KeyboardShortcutsContext.Provider>
  );
}

export default KeyboardShortcutsProvider;
