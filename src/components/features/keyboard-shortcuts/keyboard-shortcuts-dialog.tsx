"use client";

import { useTranslations } from "next-intl";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Keyboard, Navigation, Zap, MousePointer } from "lucide-react";
import { cn } from "@/lib/utils";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
const modKey = isMac ? "⌘" : "Ctrl";

interface ShortcutGroup {
  id: string;
  icon: React.ElementType;
  color: string;
  shortcuts: { keys: string[]; label: string; description?: string }[];
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const t = useTranslations("shortcuts");

  const shortcutGroups: ShortcutGroup[] = [
    {
      id: "essential",
      icon: Zap,
      color: "text-amber-500",
      shortcuts: [
        { keys: [modKey, "K"], label: t("essential.commandPalette"), description: t("essential.commandPaletteDesc") },
        { keys: [modKey, "/"], label: t("essential.showShortcuts") },
        { keys: [modKey, "Shift", "L"], label: t("essential.cycleTheme") },
        { keys: ["Esc"], label: t("essential.closeCancel") },
      ],
    },
    {
      id: "navigation",
      icon: Navigation,
      color: "text-blue-500",
      shortcuts: [
        { keys: ["G", "→", "H"], label: t("navigation.dashboard") },
        { keys: ["G", "→", "R"], label: t("navigation.reviews") },
        { keys: ["G", "→", "F"], label: t("navigation.findings") },
        { keys: ["G", "→", "C"], label: t("navigation.caps") },
        { keys: ["G", "→", "A"], label: t("navigation.assessments") },
        { keys: ["G", "→", "B"], label: t("navigation.bestPractices") },
        { keys: ["G", "→", "S"], label: t("navigation.settings") },
      ],
    },
    {
      id: "create",
      icon: MousePointer,
      color: "text-green-500",
      shortcuts: [
        { keys: ["N", "→", "R"], label: t("create.newReview") },
        { keys: ["N", "→", "F"], label: t("create.newFinding") },
        { keys: ["N", "→", "A"], label: t("create.newAssessment") },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] p-0 gap-0 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Keyboard className="h-5 w-5 text-primary" />
              </div>
              {t("title")}
              <Badge variant="secondary" className="ml-2 text-xs">{isMac ? "macOS" : "Windows/Linux"}</Badge>
            </DialogTitle>
            <DialogDescription className="text-sm mt-2">{t("description")}</DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[55vh]">
          <div className="p-6 grid gap-6 md:grid-cols-3">
            {shortcutGroups.map((group) => (
              <ShortcutGroupCard key={group.id} group={group} t={t} />
            ))}
          </div>
        </ScrollArea>

        <div className="border-t bg-muted/30 px-6 py-3">
          <p className="text-xs text-center text-muted-foreground">{t("footer", { key: `${modKey}+K` })}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutGroupCard({ group, t }: { group: ShortcutGroup; t: (key: string) => string }) {
  const Icon = group.icon;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Icon className={cn("h-4 w-4", group.color)} />
        <h3 className="text-sm font-semibold">{t(`groups.${group.id}`)}</h3>
      </div>
      <div className="space-y-2">
        {group.shortcuts.map((shortcut, idx) => (
          <div key={idx} className="flex items-center justify-between gap-2 py-1">
            <span className="text-sm truncate">{shortcut.label}</span>
            <KeyCombo keys={shortcut.keys} />
          </div>
        ))}
      </div>
    </div>
  );
}

function KeyCombo({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-0.5 flex-shrink-0">
      {keys.map((key, idx) => (
        key === "→" ? (
          <span key={idx} className="text-xs text-muted-foreground mx-1">then</span>
        ) : (
          <Key key={idx} value={key} />
        )
      ))}
    </div>
  );
}

function Key({ value }: { value: string }) {
  const isModifier = ["⌘", "Ctrl", "Alt", "Shift", "Esc"].includes(value);
  return (
    <kbd className={cn(
      "inline-flex items-center justify-center min-w-[26px] h-6 px-1.5",
      "text-xs font-mono rounded border shadow-sm",
      isModifier ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-border"
    )}>
      {value}
    </kbd>
  );
}

export default KeyboardShortcutsDialog;
