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
import { useLegacyKeyboardShortcuts, useSequenceShortcuts, type SequenceShortcut } from "@/hooks/use-keyboard-shortcuts";
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
  useLegacyKeyboardShortcuts([
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

  // Sequence shortcuts — aligned with restructured sidebar
  const sequenceShortcuts: SequenceShortcut[] = [
    // Navigation (g prefix)
    {
      id: "nav-dashboard",
      keys: "g h",
      description: "Go to Dashboard",
      category: "navigation",
      action: () => navigate("/dashboard"),
    },
    {
      id: "nav-programme-intelligence",
      keys: "g i",
      description: "Go to Programme Intelligence",
      category: "navigation",
      action: () => navigate("/analytics"),
    },
    {
      id: "nav-questionnaires-assessments",
      keys: "g a",
      description: "Go to Questionnaires & Assessments",
      category: "navigation",
      action: () => navigate("/assessments"),
    },
    {
      id: "nav-reviews",
      keys: "g r",
      description: "Go to Peer Reviews",
      category: "navigation",
      action: () => navigate("/reviews"),
    },
    {
      id: "nav-knowledge-base",
      keys: "g k",
      description: "Go to Knowledge Base",
      category: "navigation",
      action: () => navigate("/knowledge"),
    },
    {
      id: "nav-reviewer-pool",
      keys: "g v",
      description: "Go to Reviewer Pool",
      category: "navigation",
      action: () => navigate("/reviewers"),
    },
    {
      id: "nav-training",
      keys: "g t",
      description: "Go to Training & Resources",
      category: "navigation",
      action: () => navigate("/training"),
    },
    {
      id: "nav-settings",
      keys: "g s",
      description: "Go to Settings",
      category: "navigation",
      action: () => navigate("/settings"),
    },
    // Quick actions (n prefix)
    {
      id: "action-new-review",
      keys: "n r",
      description: "New review request",
      category: "actions",
      action: () => navigate("/reviews/new"),
    },
    {
      id: "action-new-assessment",
      keys: "n a",
      description: "New assessment",
      category: "actions",
      action: () => navigate("/assessments/new"),
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
