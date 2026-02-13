"use client";

/**
 * Command Palette Component
 *
 * A Spotlight-style quick search and command interface.
 * Features:
 * - Trigger: Ctrl+K / Cmd+K
 * - Search across: Reviews, Findings, CAPs, Organizations, Best Practices
 * - Recent searches with localStorage persistence
 * - Quick actions and navigation
 * - Full keyboard navigation
 */

import { useState, useCallback, useMemo } from "react";
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
  Clock,
  Lightbulb,
  GraduationCap,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { useDebounce } from "@/hooks/use-debounce";

// =============================================================================
// TYPES
// =============================================================================

type CommandCategory = "recent" | "action" | "navigation" | "search";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: CommandCategory;
  keywords: string[];
  action: () => void;
  shortcut?: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

interface SearchResult {
  id: string;
  type: "review" | "finding" | "cap" | "organization" | "bestPractice";
  title: string;
  subtitle?: string;
  status?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowShortcuts?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RECENT_SEARCHES_KEY = "command-palette-recent";
const MAX_RECENT_SEARCHES = 5;

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
  bestPractices: <Lightbulb className="h-4 w-4" />,
  training: <GraduationCap className="h-4 w-4" />,
  recent: <Clock className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  review: <ClipboardList className="h-4 w-4" />,
  finding: <AlertTriangle className="h-4 w-4" />,
  cap: <CheckSquare className="h-4 w-4" />,
  organization: <Building2 className="h-4 w-4" />,
  bestPractice: <Lightbulb className="h-4 w-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  review: "text-blue-600",
  finding: "text-amber-600",
  cap: "text-green-600",
  organization: "text-purple-600",
  bestPractice: "text-cyan-600",
};

// =============================================================================
// RECENT SEARCHES HOOK
// =============================================================================

function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>(() => {
    // Lazy initialization - runs only once on mount
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addRecentSearch = useCallback((result: SearchResult) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((r) => r.id !== result.id);
      const updated = [result, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  return { recentSearches, addRecentSearch, clearRecentSearches };
}

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
  const debouncedSearch = useDebounce(search, 300);

  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();

  // Search query - only runs when there's a search term
  const { data: searchResults, isLoading: isSearching } = trpc.search.global.useQuery(
    { query: debouncedSearch, limit: 8 },
    {
      enabled: debouncedSearch.length >= 2,
      staleTime: 30000,
    }
  );

  // Navigate to a path
  const navigate = useCallback(
    (path: string, searchResult?: SearchResult) => {
      if (searchResult) {
        addRecentSearch(searchResult);
      }
      router.push(`/${locale}${path}`);
      onOpenChange(false);
    },
    [router, locale, onOpenChange, addRecentSearch]
  );

  // Define navigation commands — aligned with restructured sidebar
  const navigationCommands: CommandItem[] = useMemo(
    () => [
      {
        id: "nav-dashboard",
        label: t("commands.dashboard"),
        description: t("descriptions.dashboard"),
        icon: ICONS.dashboard,
        category: "navigation",
        keywords: ["dashboard", "home", "main", "accueil"],
        action: () => navigate("/dashboard"),
        shortcut: "G H",
      },
      {
        id: "nav-programme-intelligence",
        label: t("commands.programmeIntelligence"),
        description: t("descriptions.programmeIntelligence"),
        icon: ICONS.analytics,
        category: "navigation",
        keywords: ["analytics", "intelligence", "trends", "benchmarks", "programme", "analyses"],
        action: () => navigate("/analytics"),
        shortcut: "G I",
      },
      {
        id: "nav-questionnaires-assessments",
        label: t("commands.questionnairesAssessments"),
        description: t("descriptions.questionnairesAssessments"),
        icon: ICONS.reviews,
        category: "navigation",
        keywords: ["questionnaires", "assessments", "usoap", "canso", "evaluations"],
        action: () => navigate("/assessments"),
        shortcut: "G A",
      },
      {
        id: "nav-reviews",
        label: t("commands.reviews"),
        description: t("descriptions.reviews"),
        icon: ICONS.search,
        category: "navigation",
        keywords: ["reviews", "peer", "audit", "findings", "caps", "revues", "constats"],
        action: () => navigate("/reviews"),
        shortcut: "G R",
      },
      {
        id: "nav-knowledge-base",
        label: t("commands.knowledgeBase"),
        description: t("descriptions.knowledgeBase"),
        icon: ICONS.bestPractices,
        category: "navigation",
        keywords: ["knowledge", "best", "practices", "lessons", "bonnes", "pratiques", "leçons"],
        action: () => navigate("/knowledge"),
        shortcut: "G K",
      },
      {
        id: "nav-reviewer-pool",
        label: t("commands.reviewerPool"),
        description: t("descriptions.reviewerPool"),
        icon: ICONS.reviewers,
        category: "navigation",
        keywords: ["reviewers", "pool", "experts", "teams", "evaluateurs", "equipes"],
        action: () => navigate("/reviewers"),
        shortcut: "G V",
      },
      {
        id: "nav-training",
        label: t("commands.training"),
        description: t("descriptions.training"),
        icon: ICONS.training,
        category: "navigation",
        keywords: ["training", "modules", "formation", "learn", "resources"],
        action: () => navigate("/training"),
        shortcut: "G T",
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
    ],
    [t, navigate]
  );

  // Define action commands
  const actionCommands: CommandItem[] = useMemo(
    () => [
      {
        id: "action-new-review",
        label: t("commands.newReview"),
        description: t("descriptions.newReview"),
        icon: <Plus className="h-4 w-4 text-green-600" />,
        category: "action",
        keywords: ["new", "create", "review", "request", "nouveau"],
        action: () => navigate("/reviews/new"),
        shortcut: "R N",
      },
      {
        id: "action-new-assessment",
        label: "New Assessment",
        description: "Start a new self-assessment",
        icon: <Plus className="h-4 w-4 text-blue-600" />,
        category: "action",
        keywords: ["new", "create", "assessment", "evaluation"],
        action: () => navigate("/assessments/new"),
        shortcut: "A N",
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

  // Convert recent searches to command items
  const recentCommands: CommandItem[] = useMemo(
    () =>
      recentSearches.map((result) => ({
        id: `recent-${result.id}`,
        label: result.title,
        description: result.subtitle,
        icon: <span className={TYPE_COLORS[result.type]}>{TYPE_ICONS[result.type]}</span>,
        category: "recent" as const,
        keywords: [result.title, result.type],
        action: () => {
          const paths: Record<string, string> = {
            review: `/reviews/${result.id}`,
            finding: `/findings/${result.id}`,
            cap: `/caps/${result.id}`,
            organization: `/organizations/${result.id}`,
            bestPractice: `/best-practices/${result.id}`,
          };
          navigate(paths[result.type], result);
        },
        badge: result.type,
      })),
    [recentSearches, navigate]
  );

  // Convert search results to command items
  const searchCommands: CommandItem[] = useMemo(() => {
    if (!searchResults?.results) return [];

    return searchResults.results.map((result) => ({
      id: `search-${result.id}`,
      label: result.title,
      description: result.subtitle,
      icon: <span className={TYPE_COLORS[result.type]}>{TYPE_ICONS[result.type]}</span>,
      category: "search" as const,
      keywords: [result.title],
      action: () => {
        const paths: Record<string, string> = {
          review: `/reviews/${result.id}`,
          finding: `/findings/${result.id}`,
          cap: `/caps/${result.id}`,
          organization: `/organizations/${result.id}`,
          bestPractice: `/best-practices/${result.id}`,
        };
        navigate(paths[result.type], {
          id: result.id,
          type: result.type,
          title: result.title,
          subtitle: result.subtitle,
        });
      },
      badge: result.type,
      badgeVariant: "secondary" as const,
    }));
  }, [searchResults, navigate]);

  // All commands combined
  const allCommands = useMemo(() => {
    if (debouncedSearch.length >= 2) {
      // When searching, show search results + filtered commands
      const searchLower = debouncedSearch.toLowerCase();
      const filteredNav = navigationCommands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(searchLower) ||
          cmd.keywords.some((kw) => kw.toLowerCase().includes(searchLower))
      );
      const filteredActions = actionCommands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(searchLower) ||
          cmd.keywords.some((kw) => kw.toLowerCase().includes(searchLower))
      );
      return [...searchCommands, ...filteredActions, ...filteredNav];
    }
    // When not searching, show recent + actions + navigation
    return [...recentCommands, ...actionCommands, ...navigationCommands];
  }, [
    debouncedSearch,
    searchCommands,
    navigationCommands,
    actionCommands,
    recentCommands,
  ]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<CommandCategory, CommandItem[]> = {
      recent: [],
      action: [],
      navigation: [],
      search: [],
    };

    allCommands.forEach((cmd) => {
      groups[cmd.category]?.push(cmd);
    });

    return groups;
  }, [allCommands]);

  // Handle search change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setSelectedIndex(0);
    },
    []
  );

  // Handle dialog open change
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        setSearch("");
        setSelectedIndex(0);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const totalItems = allCommands.length;

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
          if (allCommands[selectedIndex]) {
            allCommands[selectedIndex].action();
          }
          break;
        case "Escape":
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [allCommands, selectedIndex, onOpenChange]
  );

  // Get flat list index for item
  const getItemIndex = useCallback(
    (category: CommandCategory, itemIndex: number): number => {
      let index = 0;
      const categoryOrder: CommandCategory[] = ["search", "recent", "action", "navigation"];

      for (const cat of categoryOrder) {
        if (cat === category) {
          return index + itemIndex;
        }
        index += groupedCommands[cat]?.length || 0;
      }
      return index + itemIndex;
    },
    [groupedCommands]
  );

  // Category labels
  const categoryLabels: Record<CommandCategory, string> = {
    recent: "Recent",
    action: t("categories.actions"),
    navigation: t("categories.navigation"),
    search: "Search Results",
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>{t("title")}</DialogTitle>
        </VisuallyHidden>

        {/* Search Input */}
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
            autoFocus
          />
          {isSearching && (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground ml-2">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[400px]">
          {allCommands.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {isSearching ? "Searching..." : t("noResults")}
            </div>
          ) : (
            <div className="p-2">
              {/* Search Results */}
              {groupedCommands.search.length > 0 && (
                <CommandGroup
                  label={categoryLabels.search}
                  badge={`${groupedCommands.search.length}`}
                >
                  {groupedCommands.search.map((cmd, index) => (
                    <CommandItemRow
                      key={cmd.id}
                      command={cmd}
                      isSelected={selectedIndex === getItemIndex("search", index)}
                      onClick={cmd.action}
                    />
                  ))}
                </CommandGroup>
              )}

              {/* Recent Searches */}
              {groupedCommands.recent.length > 0 && !debouncedSearch && (
                <CommandGroup
                  label={categoryLabels.recent}
                  action={
                    <button
                      onClick={clearRecentSearches}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  }
                >
                  {groupedCommands.recent.map((cmd, index) => (
                    <CommandItemRow
                      key={cmd.id}
                      command={cmd}
                      isSelected={selectedIndex === getItemIndex("recent", index)}
                      onClick={cmd.action}
                    />
                  ))}
                </CommandGroup>
              )}

              {/* Actions */}
              {groupedCommands.action.length > 0 && (
                <CommandGroup label={categoryLabels.action}>
                  {groupedCommands.action.map((cmd, index) => (
                    <CommandItemRow
                      key={cmd.id}
                      command={cmd}
                      isSelected={selectedIndex === getItemIndex("action", index)}
                      onClick={cmd.action}
                    />
                  ))}
                </CommandGroup>
              )}

              {/* Navigation */}
              {groupedCommands.navigation.length > 0 && (
                <CommandGroup label={categoryLabels.navigation}>
                  {groupedCommands.navigation.map((cmd, index) => (
                    <CommandItemRow
                      key={cmd.id}
                      command={cmd}
                      isSelected={selectedIndex === getItemIndex("navigation", index)}
                      onClick={cmd.action}
                    />
                  ))}
                </CommandGroup>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground bg-muted/30">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-background px-1.5 py-0.5">
                <span className="text-[10px]">↑</span>
              </kbd>
              <kbd className="rounded border bg-background px-1.5 py-0.5">
                <span className="text-[10px]">↓</span>
              </kbd>
              <span className="ml-1">{t("footer.navigate")}</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-background px-1.5 py-0.5">
                <span className="text-[10px]">Enter</span>
              </kbd>
              <span className="ml-1">{t("footer.select")}</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-background px-1.5 py-0.5">Esc</kbd>
            <span className="ml-1">{t("footer.close")}</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// COMMAND GROUP
// =============================================================================

function CommandGroup({
  label,
  badge,
  action,
  children,
}: {
  label: string;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {badge && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              {badge}
            </Badge>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
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
        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
      )}
      onClick={onClick}
    >
      <span className="shrink-0 text-muted-foreground">{command.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{command.label}</span>
          {command.badge && (
            <Badge
              variant={command.badgeVariant || "outline"}
              className="h-4 px-1 text-[10px] capitalize"
            >
              {command.badge}
            </Badge>
          )}
        </div>
        {command.description && (
          <div className="text-xs text-muted-foreground truncate">
            {command.description}
          </div>
        )}
      </div>
      {command.shortcut && (
        <div className="shrink-0 flex items-center gap-0.5">
          {command.shortcut.split(" ").map((key, i) => (
            <span key={i} className="flex items-center">
              <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs bg-muted border rounded">
                {key}
              </kbd>
              {i < command.shortcut!.split(" ").length - 1 && (
                <span className="mx-0.5 text-[10px] text-muted-foreground">+</span>
              )}
            </span>
          ))}
        </div>
      )}
      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100" />
    </button>
  );
}

export default CommandPalette;
