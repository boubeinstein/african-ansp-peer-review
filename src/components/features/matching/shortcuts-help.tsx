"use client";

/**
 * Keyboard Shortcuts Help Dialog
 *
 * Displays available keyboard shortcuts for the matching interface.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface ShortcutDisplay {
  keys: string[];
  description: string;
}

export interface ShortcutsHelpDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ShortcutsHelpDialog({
  open,
  onOpenChange,
  trigger,
  className,
}: ShortcutsHelpDialogProps) {
  const t = useTranslations("reviewer.matching.shortcuts");
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

  const shortcuts: ShortcutDisplay[] = [
    { keys: ["F"], description: t("findMatches") },
    { keys: ["A"], description: t("autoSelect") },
    { keys: ["C"], description: t("clearFilters") },
    { keys: ["E"], description: t("exportTeam") },
    { keys: ["1"], description: t("resultsTab") },
    { keys: ["2"], description: t("teamTab") },
    { keys: ["Shift", "?"], description: t("showHelp") },
    { keys: ["Esc"], description: t("closeDialog") },
  ];

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className={cn("text-muted-foreground gap-1.5", className)}
    >
      <Keyboard className="w-4 h-4" />
      <span className="hidden sm:inline">{t("title")}</span>
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            {t("dialogTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1 mt-4">
          {shortcuts.map(({ keys, description }) => (
            <div
              key={keys.join("+")}
              className="flex justify-between items-center py-2 px-2 rounded hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm">{description}</span>
              <div className="flex gap-1">
                {keys.map((key, index) => (
                  <span key={`${key}-${index}`} className="flex items-center gap-1">
                    <kbd className="px-2 py-1 bg-muted border rounded text-xs font-mono min-w-[28px] text-center">
                      {key}
                    </kbd>
                    {index < keys.length - 1 && (
                      <span className="text-muted-foreground text-xs">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {t("note")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShortcutsHelpDialog;
