"use client";

/**
 * Reviewer Matcher Component
 *
 * Main interface for finding and selecting reviewers for a peer review.
 * Includes criteria input, results display, and team building.
 */

import { useState, useMemo, useCallback, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Keyboard,
  Loader2,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { MatchScoreCard } from "./match-score-card";
import { TeamCoverageReport } from "./team-coverage-report";
import { MatchingEmptyState, ShortcutsHelpDialog } from "@/components/features/matching";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  findMatchingReviewers,
  buildOptimalTeam,
  type MatchingCriteria,
  type MatchResult,
  type TeamBuildResult,
} from "@/lib/reviewer/matching";
import type { ReviewerProfileFull } from "@/types/reviewer";
import type { ExpertiseArea, Language } from "@prisma/client";
import {
  EXPERTISE_AREA_ABBREV,
  LANGUAGE_LABELS,
  getExpertiseAreasByCategory,
} from "@/lib/reviewer/labels";
import { REVIEWER_CAPACITY } from "@/lib/reviewer/constants";

// =============================================================================
// TYPES
// =============================================================================

export interface ReviewerMatcherProps {
  targetOrganizationId: string;
  targetOrganizationName: string;
  availableReviewers: ReviewerProfileFull[];
  onTeamSelected?: (team: MatchResult[]) => void;
  onExport?: (team: MatchResult[]) => void;
  className?: string;
}

interface CriteriaFormState {
  requiredExpertise: ExpertiseArea[];
  preferredExpertise: ExpertiseArea[];
  requiredLanguages: Language[];
  startDate: string;
  endDate: string;
  teamSize: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_LANGUAGES: Language[] = ["EN", "FR"];

const ALL_LANGUAGES: Language[] = ["EN", "FR", "PT", "AR", "ES"];

// Quick filter presets
type PresetKey = "standardANS" | "smsReview" | "fullReview";

const PRESETS: Record<PresetKey, {
  expertise: ExpertiseArea[];
  languages: Language[];
  teamSize: number;
}> = {
  standardANS: {
    expertise: ["ATS", "AIM_AIS", "MET", "CNS"],
    languages: ["EN", "FR"],
    teamSize: 4,
  },
  smsReview: {
    expertise: ["SMS_POLICY", "SMS_RISK", "SMS_ASSURANCE", "SMS_PROMOTION"],
    languages: ["EN", "FR"],
    teamSize: 3,
  },
  fullReview: {
    expertise: ["ATS", "AIM_AIS", "MET", "CNS", "SAR", "PANS_OPS", "SMS_POLICY", "SMS_RISK"],
    languages: ["EN", "FR"],
    teamSize: 5,
  },
};

// =============================================================================
// HELPERS
// =============================================================================

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getDefaultDates(): { start: string; end: string } {
  const start = new Date();
  start.setMonth(start.getMonth() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 5);
  return {
    start: formatDateForInput(start),
    end: formatDateForInput(end),
  };
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ExpertiseSelectorProps {
  label: string;
  selected: ExpertiseArea[];
  onChange: (areas: ExpertiseArea[]) => void;
  disabled?: ExpertiseArea[];
}

function ExpertiseSelector({ label, selected, onChange, disabled = [] }: ExpertiseSelectorProps) {
  const locale = useLocale() as "en" | "fr";
  const t = useTranslations("reviewer.matching.expertiseHelp");
  const categories = getExpertiseAreasByCategory(locale);
  const [isOpen, setIsOpen] = useState(false);

  const toggleArea = (area: ExpertiseArea) => {
    if (disabled.includes(area)) return;
    if (selected.includes(area)) {
      onChange(selected.filter((a) => a !== area));
    } else {
      onChange([...selected, area]);
    }
  };

  // Get expertise description with fallback
  const getExpertiseDescription = (area: string): string => {
    try {
      return t(area);
    } catch {
      return area;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{label}</Label>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {selected.length > 0 && <Badge variant="secondary">{selected.length}</Badge>}
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* Selected chips with tooltips */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selected.map((area) => (
              <TooltipProvider key={area} delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="gap-1 cursor-pointer hover:bg-destructive/20"
                      onClick={() => toggleArea(area)}
                    >
                      {EXPERTISE_AREA_ABBREV[area]}
                      <X className="h-3 w-3" />
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-medium">{EXPERTISE_AREA_ABBREV[area]}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getExpertiseDescription(area)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}

        <CollapsibleContent>
          <div className="border rounded-lg p-3 space-y-3 mt-2">
            {categories.map((category) => (
              <div key={category.category}>
                <p className="text-xs font-medium text-muted-foreground mb-2">{category.category}</p>
                <div className="flex flex-wrap gap-1.5">
                  {category.areas.map((area) => (
                    <TooltipProvider key={area.value} delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={selected.includes(area.value) ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "h-7 text-xs transition-all duration-150",
                              selected.includes(area.value) && "shadow-sm ring-2 ring-primary/30"
                            )}
                            disabled={disabled.includes(area.value)}
                            onClick={() => toggleArea(area.value)}
                          >
                            {selected.includes(area.value) && <Check className="h-3 w-3 mr-1" />}
                            {area.abbrev}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="font-medium">{area.abbrev}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getExpertiseDescription(area.value)}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface LanguageSelectorProps {
  label: string;
  selected: Language[];
  onChange: (languages: Language[]) => void;
}

function LanguageSelector({ label, selected, onChange }: LanguageSelectorProps) {
  const locale = useLocale() as "en" | "fr";
  const t = useTranslations("reviewer.matching.languageHelp");

  const toggleLanguage = (lang: Language) => {
    if (selected.includes(lang)) {
      onChange(selected.filter((l) => l !== lang));
    } else {
      onChange([...selected, lang]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        <InfoTooltip
          content={
            <div className="space-y-2">
              <p className="font-medium">{t("title")}</p>
              <p className="text-sm">{t("description")}</p>
            </div>
          }
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {ALL_LANGUAGES.map((lang) => {
          const isSelected = selected.includes(lang);
          return (
            <Button
              key={lang}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => toggleLanguage(lang)}
              className={cn(
                "transition-all duration-200",
                isSelected && "shadow-sm ring-2 ring-primary/30",
                !isSelected && "hover:border-primary/50"
              )}
            >
              {isSelected && <Check className="h-3 w-3 mr-1" />}
              {LANGUAGE_LABELS[lang][locale]}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ReviewerMatcher({
  targetOrganizationId,
  targetOrganizationName,
  availableReviewers,
  onTeamSelected,
  onExport,
  className,
}: ReviewerMatcherProps) {
  const t = useTranslations("reviewer.matching");

  // Default dates
  const defaultDates = useMemo(() => getDefaultDates(), []);

  // Form state
  const [criteria, setCriteria] = useState<CriteriaFormState>({
    requiredExpertise: [],
    preferredExpertise: [],
    requiredLanguages: DEFAULT_LANGUAGES,
    startDate: defaultDates.start,
    endDate: defaultDates.end,
    teamSize: REVIEWER_CAPACITY.IDEAL_TEAM_SIZE,
  });

  // Results state
  const [results, setResults] = useState<MatchResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Quick filter state
  const [showLeadQualifiedOnly, setShowLeadQualifiedOnly] = useState(false);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<string>("results");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  // Ref for tabs component
  const tabsRef = useRef<HTMLDivElement>(null);

  // Computed values
  const hasActiveFilters = useMemo(() => {
    return (
      criteria.requiredExpertise.length > 0 ||
      criteria.preferredExpertise.length > 0 ||
      criteria.requiredLanguages.length !== DEFAULT_LANGUAGES.length ||
      !criteria.requiredLanguages.every((l) => DEFAULT_LANGUAGES.includes(l)) ||
      criteria.startDate !== defaultDates.start ||
      criteria.endDate !== defaultDates.end ||
      criteria.teamSize !== REVIEWER_CAPACITY.IDEAL_TEAM_SIZE
    );
  }, [criteria, defaultDates]);

  const selectedMembers = useMemo(
    () => results.filter((r) => selectedIds.has(r.reviewerProfileId)),
    [results, selectedIds]
  );

  const teamResult = useMemo((): TeamBuildResult | null => {
    if (selectedMembers.length === 0) return null;

    return buildOptimalTeam(
      {
        targetOrganizationId,
        requiredExpertise: criteria.requiredExpertise,
        preferredExpertise: criteria.preferredExpertise,
        requiredLanguages: criteria.requiredLanguages,
        reviewStartDate: new Date(criteria.startDate),
        reviewEndDate: new Date(criteria.endDate),
        teamSize: criteria.teamSize,
        mustIncludeReviewerIds: Array.from(selectedIds),
      },
      selectedMembers
    );
  }, [selectedMembers, criteria, targetOrganizationId, selectedIds]);

  // Handlers
  const handleSearch = useCallback(() => {
    setIsSearching(true);
    setHasSearched(true);

    // Simulate async operation
    setTimeout(() => {
      const matchingCriteria: MatchingCriteria = {
        targetOrganizationId,
        requiredExpertise: criteria.requiredExpertise,
        preferredExpertise: criteria.preferredExpertise,
        requiredLanguages: criteria.requiredLanguages,
        reviewStartDate: new Date(criteria.startDate),
        reviewEndDate: new Date(criteria.endDate),
        teamSize: criteria.teamSize,
      };

      const matchResults = findMatchingReviewers(matchingCriteria, availableReviewers);
      setResults(matchResults);
      setSelectedIds(new Set());
      setIsSearching(false);

      // Announce results for screen readers
      if (matchResults.length > 0) {
        const eligibleCount = matchResults.filter((r) => r.isEligible).length;
        setAnnouncement(
          t("announce.results", {
            eligible: eligibleCount,
            total: matchResults.length,
          })
        );
      }
    }, 500);
  }, [criteria, targetOrganizationId, availableReviewers, t]);

  const handleAutoSelect = useCallback(() => {
    if (results.length === 0) return;

    const matchingCriteria: MatchingCriteria = {
      targetOrganizationId,
      requiredExpertise: criteria.requiredExpertise,
      preferredExpertise: criteria.preferredExpertise,
      requiredLanguages: criteria.requiredLanguages,
      reviewStartDate: new Date(criteria.startDate),
      reviewEndDate: new Date(criteria.endDate),
      teamSize: criteria.teamSize,
    };

    const optimalTeam = buildOptimalTeam(matchingCriteria, results);
    setSelectedIds(new Set(optimalTeam.team.map((m) => m.reviewerProfileId)));
  }, [results, criteria, targetOrganizationId]);

  const toggleSelection = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleConfirmTeam = useCallback(() => {
    if (onTeamSelected && selectedMembers.length > 0) {
      onTeamSelected(selectedMembers);
    }
  }, [onTeamSelected, selectedMembers]);

  const handleExport = useCallback(() => {
    if (onExport && selectedMembers.length > 0) {
      onExport(selectedMembers);
    }
  }, [onExport, selectedMembers]);

  const handleClearFilters = useCallback(() => {
    setCriteria({
      requiredExpertise: [],
      preferredExpertise: [],
      requiredLanguages: DEFAULT_LANGUAGES,
      startDate: defaultDates.start,
      endDate: defaultDates.end,
      teamSize: REVIEWER_CAPACITY.IDEAL_TEAM_SIZE,
    });
  }, [defaultDates]);

  const applyPreset = useCallback((presetKey: PresetKey) => {
    const preset = PRESETS[presetKey];
    setCriteria((prev) => ({
      ...prev,
      requiredExpertise: preset.expertise,
      requiredLanguages: preset.languages,
      teamSize: preset.teamSize,
    }));
  }, []);

  const handleExpandSearch = useCallback(() => {
    // Expand the date range by 2 weeks on each side
    const newStart = new Date(criteria.startDate);
    newStart.setDate(newStart.getDate() - 14);
    const newEnd = new Date(criteria.endDate);
    newEnd.setDate(newEnd.getDate() + 14);

    setCriteria((prev) => ({
      ...prev,
      startDate: formatDateForInput(newStart),
      endDate: formatDateForInput(newEnd),
      // Keep only the first 2 required expertise areas if there are more
      requiredExpertise: prev.requiredExpertise.slice(0, 2),
    }));

    // Trigger a new search after expanding
    setTimeout(() => handleSearch(), 100);
  }, [criteria.startDate, criteria.endDate, handleSearch]);

  // Filter results with quick filters applied
  const filteredResults = useMemo(() => {
    let filtered = results;

    if (showLeadQualifiedOnly) {
      filtered = filtered.filter((r) => r.isLeadQualified);
    }

    if (showAvailableOnly) {
      filtered = filtered.filter((r) => r.availabilityStatus.coverage >= 1.0);
    }

    return filtered;
  }, [results, showLeadQualifiedOnly, showAvailableOnly]);

  const eligibleResults = filteredResults.filter((r) => r.isEligible);
  const ineligibleResults = filteredResults.filter((r) => !r.isEligible);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "f",
      action: handleSearch,
      description: "Find matches",
    },
    {
      key: "a",
      action: handleAutoSelect,
      description: "Auto-select best team",
    },
    {
      key: "c",
      action: handleClearFilters,
      description: "Clear filters",
    },
    {
      key: "e",
      action: handleExport,
      description: "Export team",
    },
    {
      key: "1",
      action: () => setActiveTab("results"),
      description: "Switch to results tab",
    },
    {
      key: "2",
      action: () => setActiveTab("team"),
      description: "Switch to team tab",
    },
    {
      key: "?",
      shiftKey: true,
      action: () => setShowShortcuts(true),
      description: "Show shortcuts help",
    },
    {
      key: "Escape",
      action: () => setShowShortcuts(false),
      description: "Close dialog",
    },
  ]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Screen reader live region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground">
            {t("targetOrganization")}: <span className="font-medium">{targetOrganizationName}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,320px)_1fr] gap-6">
        {/* Criteria Panel */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {t("criteria")}
              </CardTitle>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-muted-foreground hover:text-foreground h-8"
                >
                  <X className="w-4 h-4 mr-1" />
                  {t("criteriaSection.clearAll")}
                </Button>
              )}
            </div>
            <CardDescription>{t("criteriaDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Presets */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("presets.title")}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset("standardANS")}
                  className="h-7 text-xs"
                >
                  {t("presets.standardANS")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset("smsReview")}
                  className="h-7 text-xs"
                >
                  {t("presets.smsReview")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset("fullReview")}
                  className="h-7 text-xs"
                >
                  {t("presets.fullReview")}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Expertise Selection */}
            <ExpertiseSelector
              label={t("requiredExpertise")}
              selected={criteria.requiredExpertise}
              onChange={(areas) => setCriteria((prev) => ({ ...prev, requiredExpertise: areas }))}
            />

            <ExpertiseSelector
              label={t("preferredExpertise")}
              selected={criteria.preferredExpertise}
              onChange={(areas) => setCriteria((prev) => ({ ...prev, preferredExpertise: areas }))}
              disabled={criteria.requiredExpertise}
            />

            <Separator />

            {/* Language Selection */}
            <LanguageSelector
              label={t("requiredLanguages")}
              selected={criteria.requiredLanguages}
              onChange={(langs) => setCriteria((prev) => ({ ...prev, requiredLanguages: langs }))}
            />

            <Separator />

            {/* Date Range */}
            <div className="space-y-4">
              <Label>{t("reviewPeriod")}</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("startDate")}</Label>
                  <Input
                    type="date"
                    value={criteria.startDate}
                    onChange={(e) =>
                      setCriteria((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("endDate")}</Label>
                  <Input
                    type="date"
                    value={criteria.endDate}
                    onChange={(e) => setCriteria((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Team Size */}
            <div className="space-y-2">
              <Label>{t("teamSize")}</Label>
              <Select
                value={criteria.teamSize.toString()}
                onValueChange={(v) =>
                  setCriteria((prev) => ({ ...prev, teamSize: parseInt(v) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5].map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size} {t("reviewers")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
            <Button
              className="w-full bg-primary hover:bg-primary/90 shadow-md font-medium"
              size="lg"
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("searching")}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  {t("findMatches")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <div className="min-w-0 space-y-4">
          {!hasSearched ? (
            <MatchingEmptyState type="initial" className="h-[400px]" />
          ) : isSearching ? (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">{t("searching")}</span>
                </div>
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-16 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : results.length === 0 ? (
            <MatchingEmptyState
              type="no-results"
              onClearFilters={handleClearFilters}
              onExpandSearch={handleExpandSearch}
              className="h-[400px]"
            />
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-4"
              ref={tabsRef}
            >
              <div className="flex items-center justify-between">
                <TabsList aria-label={t("tabsLabel")}>
                  <TabsTrigger value="results" className="gap-2">
                    {t("results")}
                    <Badge variant="secondary">{results.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="team" className="gap-2">
                    {t("team.title")}
                    <Badge variant="secondary">{selectedIds.size}</Badge>
                  </TabsTrigger>
                </TabsList>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleAutoSelect}>
                    <Sparkles className="h-4 w-4 mr-1" />
                    {t("autoSelect")}
                  </Button>
                  {selectedIds.size > 0 && onExport && (
                    <Button variant="outline" size="sm" onClick={handleExport}>
                      <Download className="h-4 w-4 mr-1" />
                      {t("export")}
                    </Button>
                  )}
                  <ShortcutsHelpDialog
                    open={showShortcuts}
                    onOpenChange={setShowShortcuts}
                    trigger={
                      <Button variant="outline" size="sm">
                        <Keyboard className="h-4 w-4 mr-1" />
                        {t("shortcuts.title")}
                      </Button>
                    }
                  />
                </div>
              </div>

              {/* Results Tab */}
              <TabsContent value="results" className="space-y-4">
                {/* Quick Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">{t("quickFilters")}:</span>
                  <Toggle
                    pressed={showLeadQualifiedOnly}
                    onPressedChange={setShowLeadQualifiedOnly}
                    size="sm"
                    className="h-7 px-2 text-xs"
                  >
                    <Star className="w-3 h-3 mr-1" />
                    {t("leadQualifiedOnly")}
                  </Toggle>
                  <Toggle
                    pressed={showAvailableOnly}
                    onPressedChange={setShowAvailableOnly}
                    size="sm"
                    className="h-7 px-2 text-xs"
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    {t("availableOnly")}
                  </Toggle>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {eligibleResults.length} {t("eligible")} • {ineligibleResults.length}{" "}
                    {t("ineligible")}
                    {(showLeadQualifiedOnly || showAvailableOnly) && (
                      <span className="ml-2 text-xs">
                        ({results.length} {t("totalBeforeFilters")})
                      </span>
                    )}
                  </span>
                  <span>
                    {selectedIds.size} / {criteria.teamSize} {t("selected")}
                  </span>
                </div>

                <ScrollArea className="h-[600px]">
                  <div
                    role="listbox"
                    aria-label={t("resultsAriaLabel")}
                    aria-multiselectable="true"
                    className="space-y-3 pr-4"
                  >
                    {eligibleResults.map((result) => (
                      <div
                        key={result.reviewerProfileId}
                        role="option"
                        aria-selected={selectedIds.has(result.reviewerProfileId)}
                        aria-disabled={!result.isEligible}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleSelection(result.reviewerProfileId, !selectedIds.has(result.reviewerProfileId));
                          }
                        }}
                        className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
                      >
                        <MatchScoreCard
                          result={result}
                          isSelected={selectedIds.has(result.reviewerProfileId)}
                          onSelect={(selected) =>
                            toggleSelection(result.reviewerProfileId, selected)
                          }
                          showDetails={true}
                        />
                      </div>
                    ))}

                    {ineligibleResults.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <p className="text-sm font-medium text-muted-foreground mb-3">
                          {t("ineligibleReviewers")}
                        </p>
                        {ineligibleResults.map((result) => (
                          <div
                            key={result.reviewerProfileId}
                            role="option"
                            aria-selected={selectedIds.has(result.reviewerProfileId)}
                            aria-disabled={true}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggleSelection(result.reviewerProfileId, !selectedIds.has(result.reviewerProfileId));
                              }
                            }}
                            className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
                          >
                            <MatchScoreCard
                              result={result}
                              isSelected={selectedIds.has(result.reviewerProfileId)}
                              onSelect={(selected) =>
                                toggleSelection(result.reviewerProfileId, selected)
                              }
                              showDetails={false}
                              compact
                            />
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Team Tab */}
              <TabsContent value="team" className="space-y-4">
                {selectedIds.size === 0 ? (
                  <MatchingEmptyState type="no-selection" className="h-[400px]" />
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(320px,480px)] gap-4">
                    {/* Coverage Report */}
                    {teamResult && (
                      <TeamCoverageReport
                        coverage={teamResult.coverageReport}
                        teamMembers={teamResult.team}
                        requiredExpertise={criteria.requiredExpertise}
                        requiredLanguages={criteria.requiredLanguages}
                        className="min-w-0"
                      />
                    )}

                    {/* Selected Members */}
                    <Card className="h-fit flex flex-col overflow-hidden">
                      <CardHeader className="shrink-0 pb-3">
                        <CardTitle>{t("team.selected")}</CardTitle>
                        <CardDescription>
                          {selectedIds.size} / {criteria.teamSize} {t("reviewers")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 min-h-0">
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-2 pr-4">
                            {selectedMembers.map((member) => (
                              <MatchScoreCard
                                key={member.reviewerProfileId}
                                result={member}
                                isSelected={true}
                                onSelect={(selected) =>
                                  toggleSelection(member.reviewerProfileId, selected)
                                }
                                compact
                              />
                            ))}
                          </div>
                        </ScrollArea>

                        {/* Confirm Button */}
                        {onTeamSelected && selectedIds.size >= REVIEWER_CAPACITY.MIN_TEAM_SIZE && (
                          <div className="pt-4 border-t mt-4">
                            <Button
                              className="w-full bg-green-600 hover:bg-green-700 text-white shadow-md font-medium"
                              size="lg"
                              onClick={handleConfirmTeam}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {t("confirmTeam")}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReviewerMatcher;
