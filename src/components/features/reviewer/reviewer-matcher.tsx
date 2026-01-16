"use client";

/**
 * Reviewer Matcher Component
 *
 * Main interface for finding and selecting reviewers for a peer review.
 * Includes criteria input, results display, and team building.
 */

import { useState, useMemo, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Loader2,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { MatchScoreCard } from "./match-score-card";
import { TeamCoverageReport } from "./team-coverage-report";
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

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selected.map((area) => (
              <Badge
                key={area}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-destructive/20"
                onClick={() => toggleArea(area)}
              >
                {EXPERTISE_AREA_ABBREV[area]}
                <X className="h-3 w-3" />
              </Badge>
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
                    <Button
                      key={area.value}
                      variant={selected.includes(area.value) ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      disabled={disabled.includes(area.value)}
                      onClick={() => toggleArea(area.value)}
                    >
                      {area.abbrev}
                    </Button>
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

  const toggleLanguage = (lang: Language) => {
    if (selected.includes(lang)) {
      onChange(selected.filter((l) => l !== lang));
    } else {
      onChange([...selected, lang]);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {ALL_LANGUAGES.map((lang) => (
          <Button
            key={lang}
            variant={selected.includes(lang) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleLanguage(lang)}
          >
            {LANGUAGE_LABELS[lang][locale]}
          </Button>
        ))}
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

  // Computed values
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
    }, 500);
  }, [criteria, targetOrganizationId, availableReviewers]);

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

  // Filter results
  const eligibleResults = results.filter((r) => r.isEligible);
  const ineligibleResults = results.filter((r) => !r.isEligible);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground">
            {t("targetOrganization")}: <span className="font-medium">{targetOrganizationName}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Criteria Panel */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t("criteria")}
            </CardTitle>
            <CardDescription>{t("criteriaDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
            <Button className="w-full" size="lg" onClick={handleSearch} disabled={isSearching}>
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
        <div className="lg:col-span-2 space-y-4">
          {!hasSearched ? (
            <Card className="h-[400px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">{t("noSearchYet")}</p>
                <p className="text-sm">{t("noSearchYetDescription")}</p>
              </div>
            </Card>
          ) : isSearching ? (
            <Card className="h-[400px] flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-lg font-medium">{t("searching")}</p>
              </div>
            </Card>
          ) : results.length === 0 ? (
            <Card className="h-[400px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">{t("noResults")}</p>
                <p className="text-sm">{t("noResultsDescription")}</p>
              </div>
            </Card>
          ) : (
            <Tabs defaultValue="results" className="space-y-4">
              <div className="flex items-center justify-between">
                <TabsList>
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
                </div>
              </div>

              {/* Results Tab */}
              <TabsContent value="results" className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {eligibleResults.length} {t("eligible")} • {ineligibleResults.length}{" "}
                    {t("ineligible")}
                  </span>
                  <span>
                    {selectedIds.size} / {criteria.teamSize} {t("selected")}
                  </span>
                </div>

                <ScrollArea className="h-[600px]">
                  <div className="space-y-3 pr-4">
                    {eligibleResults.map((result) => (
                      <MatchScoreCard
                        key={result.reviewerProfileId}
                        result={result}
                        isSelected={selectedIds.has(result.reviewerProfileId)}
                        onSelect={(selected) =>
                          toggleSelection(result.reviewerProfileId, selected)
                        }
                        showDetails={true}
                      />
                    ))}

                    {ineligibleResults.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <p className="text-sm font-medium text-muted-foreground mb-3">
                          {t("ineligibleReviewers")}
                        </p>
                        {ineligibleResults.map((result) => (
                          <MatchScoreCard
                            key={result.reviewerProfileId}
                            result={result}
                            isSelected={selectedIds.has(result.reviewerProfileId)}
                            onSelect={(selected) =>
                              toggleSelection(result.reviewerProfileId, selected)
                            }
                            showDetails={false}
                            compact
                          />
                        ))}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Team Tab */}
              <TabsContent value="team" className="space-y-4">
                {selectedIds.size === 0 ? (
                  <Card className="h-[400px] flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">{t("team.noSelection")}</p>
                      <p className="text-sm">{t("team.noSelectionDescription")}</p>
                    </div>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {/* Coverage Report */}
                    {teamResult && (
                      <TeamCoverageReport
                        coverage={teamResult.coverageReport}
                        teamMembers={teamResult.team}
                        requiredExpertise={criteria.requiredExpertise}
                        requiredLanguages={criteria.requiredLanguages}
                      />
                    )}

                    {/* Selected Members */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle>{t("team.selected")}</CardTitle>
                        <CardDescription>
                          {selectedIds.size} / {criteria.teamSize} {t("reviewers")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
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
                            <Button className="w-full" onClick={handleConfirmTeam}>
                              <Users className="h-4 w-4 mr-2" />
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
