"use client";

/**
 * Keyboard Shortcuts Help Dialog
 *
 * Displays all available keyboard shortcuts organized by category.
 * Can be opened with Ctrl+/ or ?
 */

import { useTranslations } from "next-intl";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface ShortcutItem {
  keys: string;
  description: string;
}

interface ShortcutCategory {
  id: string;
  label: string;
  shortcuts: ShortcutItem[];
}

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// SHORTCUT DATA
// =============================================================================

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    id: "global",
    label: "Global",
    shortcuts: [
      { keys: "Ctrl+K", description: "Open quick search" },
      { keys: "Ctrl+N", description: "New (context-aware)" },
      { keys: "Ctrl+/", description: "Show keyboard shortcuts" },
      { keys: "?", description: "Show keyboard shortcuts" },
      { keys: "Escape", description: "Close dialog / Cancel" },
    ],
  },
  {
    id: "navigation",
    label: "Navigation",
    shortcuts: [
      { keys: "G D", description: "Go to Dashboard" },
      { keys: "G R", description: "Go to Reviews" },
      { keys: "G F", description: "Go to Findings" },
      { keys: "G C", description: "Go to CAPs" },
      { keys: "G O", description: "Go to Organizations" },
      { keys: "G E", description: "Go to Reviewers (Experts)" },
      { keys: "G A", description: "Go to Analytics" },
      { keys: "G S", description: "Go to Settings" },
    ],
  },
  {
    id: "reviews",
    label: "Reviews",
    shortcuts: [
      { keys: "R N", description: "New review request" },
      { keys: "R L", description: "Reviews list" },
    ],
  },
  {
    id: "findings",
    label: "Findings",
    shortcuts: [
      { keys: "F L", description: "Findings list" },
    ],
  },
  {
    id: "caps",
    label: "CAPs",
    shortcuts: [
      { keys: "C L", description: "CAPs list" },
    ],
  },
];

// =============================================================================
// KEY BADGE COMPONENT
// =============================================================================

function KeyBadge({ keyText }: { keyText: string }) {
  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

  // Replace Ctrl with Cmd symbol on Mac
  const displayKey = keyText
    .replace(/Ctrl/g, isMac ? "⌘" : "Ctrl")
    .replace(/Alt/g, isMac ? "⌥" : "Alt");

  // Split by + for modifier combinations
  const parts = displayKey.includes("+")
    ? displayKey.split("+")
    : displayKey.split(" ");

  return (
    <div className="flex items-center gap-1">
      {parts.map((part, index) => (
        <span key={index}>
          <kbd
            className={cn(
              "inline-flex items-center justify-center",
              "min-w-[24px] h-6 px-1.5",
              "text-xs font-medium",
              "bg-muted border border-border rounded",
              "shadow-[0_1px_0_1px_rgba(0,0,0,0.05)]"
            )}
          >
            {part.trim()}
          </kbd>
          {index < parts.length - 1 && parts.length > 1 && displayKey.includes(" ") && (
            <span className="mx-0.5 text-muted-foreground text-xs">then</span>
          )}
        </span>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function KeyboardShortcutsHelp({
  open,
  onOpenChange,
}: KeyboardShortcutsHelpProps) {
  const t = useTranslations("shortcuts");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {SHORTCUT_CATEGORIES.map((category, categoryIndex) => (
              <div key={category.id}>
                {categoryIndex > 0 && <Separator className="mb-4" />}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t(`categories.${category.id}`)}
                  </h3>
                  <div className="space-y-2">
                    {category.shortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-1.5"
                      >
                        <span className="text-sm text-muted-foreground">
                          {t(`shortcuts.${category.id}.${shortcut.keys.toLowerCase().replace(/[+\s]/g, "_")}`, {
                            defaultValue: shortcut.description,
                          })}
                        </span>
                        <KeyBadge keyText={shortcut.keys} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {t("tip")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsHelp;
