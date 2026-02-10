"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutGroup {
  title: string;
  combo?: boolean;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const t = useTranslations("reviews.detail.keyboard");

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: t("quickNav"),
      combo: true,
      shortcuts: [
        { keys: ["Alt", "W"], description: t("goToWorkspace") },
        { keys: ["Alt", "F"], description: t("goToFindings") },
        { keys: ["Alt", "D"], description: t("goToDocuments") },
        { keys: ["Alt", "R"], description: t("goToReport") },
        { keys: ["Alt", "O"], description: t("goToOverview") },
        { keys: ["Alt", "T"], description: t("goToRetrospective") },
        { keys: ["Alt", "S"], description: t("goToSettings") },
        { keys: ["Alt", "N"], description: t("newItem") },
      ],
    },
    {
      title: t("navigation"),
      shortcuts: [
        { keys: ["g", "1"], description: t("goToOverview") },
        { keys: ["g", "2"], description: t("goToWorkspace") },
        { keys: ["g", "3"], description: t("goToDocuments") },
        { keys: ["g", "4"], description: t("goToFindings") },
        { keys: ["g", "5"], description: t("goToReport") },
        { keys: ["g", "6"], description: t("goToRetrospective") },
        { keys: ["g", "7"], description: t("goToSettings") },
      ],
    },
    {
      title: t("actions"),
      shortcuts: [
        { keys: ["n"], description: t("newItem") },
        { keys: ["e"], description: t("edit") },
        { keys: ["?"], description: t("showShortcuts") },
        { keys: ["Esc"], description: t("closeDialog") },
      ],
    },
    {
      title: t("global"),
      shortcuts: [
        { keys: ["\u2318", "K"], description: t("quickSearch") },
        { keys: ["\u2318", "S"], description: t("save") },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4 max-h-[60vh] overflow-y-auto pr-1">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">{group.title}</h4>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          <kbd
                            className={cn(
                              "px-2 py-1 text-xs font-mono rounded border",
                              "bg-muted text-muted-foreground"
                            )}
                          >
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs">
                              {group.combo ? "+" : "then"}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          {t("altShortcutsTip")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
