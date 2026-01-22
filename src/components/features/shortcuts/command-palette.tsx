"use client";

/**
 * Command Palette Component
 *
 * A Spotlight-style quick search and command interface.
 * Opened with Ctrl+K, allows quick navigation and actions.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Search,
  FileText,
  Users,
  Building2,
  BarChart3,
  Settings,
  ClipboardList,
  AlertTriangle,
  CheckSquare,
  Plus,
  ArrowRight,
  Keyboard,
  Home,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: "navigation" | "action" | "search";
  keywords: string[];
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowShortcuts?: () => void;
}

// =============================================================================
// ICON MAP
// =============================================================================

const ICONS = {
  dashboard: <Home className="h-4 w-4" />,
  reviews: <ClipboardList className="h-4 w-4" />,
  findings: <AlertTriangle className="h-4 w-4" />,
  caps: <CheckSquare className="h-4 w-4" />,
  organizations: <Building2 className="h-4 w-4" />,
  reviewers: <Users className="h-4 w-4" />,
  analytics: <BarChart3 className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  new: <Plus className="h-4 w-4" />,
  search: <Search className="h-4 w-4" />,
  keyboard: <Keyboard className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CommandPalette({
  open,
  onOpenChange,
  onShowShortcuts,
}: CommandPaletteProps) {
  const t = useTranslations("commandPalette");
  const router = useRouter();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Navigate to a path
  const navigate = useCallback(
    (path: string) => {
      router.push(`/${locale}${path}`);
      onOpenChange(false);
    },
    [router, locale, onOpenChange]
  );

  // Define all commands
  const allCommands: CommandItem[] = useMemo(
    () => [
      // Navigation commands
      {
        id: "nav-dashboard",
        label: t("commands.dashboard"),
        description: t("descriptions.dashboard"),
        icon: ICONS.dashboard,
        category: "navigation",
        keywords: ["dashboard", "home", "main", "accueil"],
        action: () => navigate("/dashboard"),
        shortcut: "G D",
      },
      {
        id: "nav-reviews",
        label: t("commands.reviews"),
        description: t("descriptions.reviews"),
        icon: ICONS.reviews,
        category: "navigation",
        keywords: ["reviews", "peer", "audit", "revues"],
        action: () => navigate("/reviews"),
        shortcut: "G R",
      },
      {
        id: "nav-findings",
        label: t("commands.findings"),
        description: t("descriptions.findings"),
        icon: ICONS.findings,
        category: "navigation",
        keywords: ["findings", "issues", "problems", "constats"],
        action: () => navigate("/findings"),
        shortcut: "G F",
      },
      {
        id: "nav-caps",
        label: t("commands.caps"),
        description: t("descriptions.caps"),
        icon: ICONS.caps,
        category: "navigation",
        keywords: ["caps", "corrective", "action", "plans", "pac"],
        action: () => navigate("/caps"),
        shortcut: "G C",
      },
      {
        id: "nav-organizations",
        label: t("commands.organizations"),
        description: t("descriptions.organizations"),
        icon: ICONS.organizations,
        category: "navigation",
        keywords: ["organizations", "ansp", "caa", "organisations"],
        action: () => navigate("/organizations"),
        shortcut: "G O",
      },
      {
        id: "nav-reviewers",
        label: t("commands.reviewers"),
        description: t("descriptions.reviewers"),
        icon: ICONS.reviewers,
        category: "navigation",
        keywords: ["reviewers", "experts", "team", "examinateurs"],
        action: () => navigate("/reviewers"),
        shortcut: "G E",
      },
      {
        id: "nav-analytics",
        label: t("commands.analytics"),
        description: t("descriptions.analytics"),
        icon: ICONS.analytics,
        category: "navigation",
        keywords: ["analytics", "statistics", "reports", "analytique"],
        action: () => navigate("/analytics"),
        shortcut: "G A",
      },
      {
        id: "nav-settings",
        label: t("commands.settings"),
        description: t("descriptions.settings"),
        icon: ICONS.settings,
        category: "navigation",
        keywords: ["settings", "preferences", "config", "parametres"],
        action: () => navigate("/settings"),
        shortcut: "G S",
      },
      // Action commands
      {
        id: "action-new-review",
        label: t("commands.newReview"),
        description: t("descriptions.newReview"),
        icon: ICONS.new,
        category: "action",
        keywords: ["new", "create", "review", "request", "nouveau"],
        action: () => navigate("/reviews/new"),
        shortcut: "R N",
      },
      {
        id: "action-show-shortcuts",
        label: t("commands.showShortcuts"),
        description: t("descriptions.showShortcuts"),
        icon: ICONS.keyboard,
        category: "action",
        keywords: ["shortcuts", "keyboard", "help", "raccourcis"],
        action: () => {
          onOpenChange(false);
          onShowShortcuts?.();
        },
        shortcut: "?",
      },
    ],
    [t, navigate, onOpenChange, onShowShortcuts]
  );

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return allCommands;

    const searchLower = search.toLowerCase();
    return allCommands.filter((cmd) => {
      return (
        cmd.label.toLowerCase().includes(searchLower) ||
        cmd.description?.toLowerCase().includes(searchLower) ||
        cmd.keywords.some((kw) => kw.toLowerCase().includes(searchLower))
      );
    });
  }, [allCommands, search]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      action: [],
      navigation: [],
      search: [],
    };

    filteredCommands.forEach((cmd) => {
      groups[cmd.category]?.push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Reset search when dialog opens
  useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const totalItems = filteredCommands.length;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % totalItems);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case "Escape":
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [filteredCommands, selectedIndex, onOpenChange]
  );

  // Get flat list index for item
  const getItemIndex = (category: string, itemIndex: number): number => {
    let index = 0;
    const categoryOrder = ["action", "navigation", "search"];

    for (const cat of categoryOrder) {
      if (cat === category) {
        return index + itemIndex;
      }
      index += groupedCommands[cat]?.length || 0;
    }
    return index + itemIndex;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            <span>Esc</span>
          </kbd>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[300px]">
          {filteredCommands.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t("noResults")}
            </div>
          ) : (
            <div className="p-2">
              {/* Actions */}
              {groupedCommands.action.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {t("categories.actions")}
                  </div>
                  {groupedCommands.action.map((cmd, index) => (
                    <CommandItemRow
                      key={cmd.id}
                      command={cmd}
                      isSelected={selectedIndex === getItemIndex("action", index)}
                      onClick={() => cmd.action()}
                    />
                  ))}
                </div>
              )}

              {/* Navigation */}
              {groupedCommands.navigation.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {t("categories.navigation")}
                  </div>
                  {groupedCommands.navigation.map((cmd, index) => (
                    <CommandItemRow
                      key={cmd.id}
                      command={cmd}
                      isSelected={
                        selectedIndex === getItemIndex("navigation", index)
                      }
                      onClick={() => cmd.action()}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1">↑</kbd>
              <kbd className="rounded border bg-muted px-1">↓</kbd>
              {t("footer.navigate")}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1">↵</kbd>
              {t("footer.select")}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1">Esc</kbd>
            {t("footer.close")}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// COMMAND ITEM ROW
// =============================================================================

function CommandItemRow({
  command,
  isSelected,
  onClick,
}: {
  command: CommandItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-3 w-full px-2 py-2 rounded-md text-left",
        "transition-colors",
        isSelected
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50"
      )}
      onClick={onClick}
    >
      <span className="shrink-0 text-muted-foreground">{command.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{command.label}</div>
        {command.description && (
          <div className="text-xs text-muted-foreground truncate">
            {command.description}
          </div>
        )}
      </div>
      {command.shortcut && (
        <div className="shrink-0 flex items-center gap-0.5">
          {command.shortcut.split(" ").map((key, i) => (
            <span key={i}>
              <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs bg-muted border rounded">
                {key}
              </kbd>
              {i < command.shortcut!.split(" ").length - 1 && (
                <span className="mx-0.5 text-xs text-muted-foreground">+</span>
              )}
            </span>
          ))}
        </div>
      )}
      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
    </button>
  );
}

export default CommandPalette;
