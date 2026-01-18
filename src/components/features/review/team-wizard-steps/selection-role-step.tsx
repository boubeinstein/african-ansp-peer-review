"use client";

/**
 * Selection & Role Step (Step 2)
 *
 * Displays search results and allows:
 * - Selecting team members from ranked results
 * - One-click "Use Recommended Team" button
 * - Inline role assignment for selected members
 * - Real-time team coverage report
 */

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import type { TeamRole } from "@prisma/client";
import type { MatchResult, CoverageReport } from "@/lib/reviewer/matching";
import type { WizardCriteria, TeamMemberAssignment } from "../team-assignment-wizard";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Icons
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Star,
  Users,
  Wand2,
  XCircle,
} from "lucide-react";

// Feature Components
import { MatchScoreCard } from "@/components/features/reviewer/match-score-card";
import { TeamCoverageReport } from "@/components/features/reviewer/team-coverage-report";
import { TeamMemberRoleSelect } from "../team-member-role-select";

// =============================================================================
// TYPES
// =============================================================================

export interface SelectionRoleStepProps {
  searchResults: MatchResult[];
  selectedTeam: TeamMemberAssignment[];
  criteria: WizardCriteria;
  coverageReport: CoverageReport | null;
  onToggleReviewer: (result: MatchResult, selected: boolean) => void;
  onUpdateRole: (reviewerProfileId: string, role: TeamRole) => void;
  onUseRecommended: () => void;
  isLoadingRecommended: boolean;
  locale: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SelectionRoleStep({
  searchResults,
  selectedTeam,
  criteria,
  coverageReport,
  onToggleReviewer,
  onUpdateRole,
  onUseRecommended,
  isLoadingRecommended,
  locale,
}: SelectionRoleStepProps) {
  const t = useTranslations("review.teamWizard.selection");
  const loc = (locale as "en" | "fr") || "en";

  // Split results into eligible and ineligible
  const { eligibleResults, ineligibleResults } = useMemo(() => {
    const eligible = searchResults.filter((r) => r.isEligible);
    const ineligible = searchResults.filter((r) => !r.isEligible);
    return { eligibleResults: eligible, ineligibleResults: ineligible };
  }, [searchResults]);

  // Check if a reviewer is selected
  const isSelected = (reviewerProfileId: string) =>
    selectedTeam.some((m) => m.reviewerProfileId === reviewerProfileId);

  // Get the selected member assignment
  const getSelectedMember = (reviewerProfileId: string) =>
    selectedTeam.find((m) => m.reviewerProfileId === reviewerProfileId);

  // Check if team has a lead reviewer
  const hasLeadReviewer = selectedTeam.some((m) => m.role === "LEAD_REVIEWER");

  // Calculate live coverage report from selected team
  const liveCoverage = useMemo<CoverageReport>(() => {
    if (coverageReport) return coverageReport;

    const coveredExpertise = new Set<string>();
    const coveredLanguages = new Set<string>();
    let hasLead = false;

    // Get full match results for selected team members
    const selectedResults = selectedTeam
      .map((m) => searchResults.find((r) => r.reviewerProfileId === m.reviewerProfileId))
      .filter(Boolean) as MatchResult[];

    for (const member of selectedResults) {
      for (const exp of member.expertiseDetails.matchedRequired) {
        coveredExpertise.add(exp);
      }
      for (const lang of member.languageDetails.matchedLanguages) {
        coveredLanguages.add(lang);
      }
      if (member.isLeadQualified) hasLead = true;
    }

    const expertiseMissing = criteria.requiredExpertise.filter(
      (e) => !coveredExpertise.has(e)
    );
    const languagesMissing = criteria.requiredLanguages.filter(
      (l) => !coveredLanguages.has(l)
    );

    const expertiseCoverage =
      criteria.requiredExpertise.length > 0
        ? (criteria.requiredExpertise.length - expertiseMissing.length) /
          criteria.requiredExpertise.length
        : 1;

    const languageCoverage =
      criteria.requiredLanguages.length > 0
        ? (criteria.requiredLanguages.length - languagesMissing.length) /
          criteria.requiredLanguages.length
        : 1;

    let teamBalance: "GOOD" | "FAIR" | "POOR" = "GOOD";
    if (expertiseCoverage < 0.8 || languageCoverage < 1 || !hasLead) {
      teamBalance = "FAIR";
    }
    if (expertiseCoverage < 0.5 || languageCoverage < 0.5) {
      teamBalance = "POOR";
    }

    return {
      expertiseCovered: Array.from(coveredExpertise) as typeof criteria.requiredExpertise,
      expertiseMissing,
      expertiseCoverage: Math.round(expertiseCoverage * 100) / 100,
      languagesCovered: Array.from(coveredLanguages) as typeof criteria.requiredLanguages,
      languagesMissing,
      languageCoverage: Math.round(languageCoverage * 100) / 100,
      hasLeadQualified: hasLead,
      teamBalance,
    };
  }, [coverageReport, selectedTeam, searchResults, criteria]);

  // Convert selected team to MatchResult format for coverage report
  const selectedMatchResults = useMemo(() => {
    return selectedTeam
      .map((m) => searchResults.find((r) => r.reviewerProfileId === m.reviewerProfileId))
      .filter(Boolean) as MatchResult[];
  }, [selectedTeam, searchResults]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Results Area */}
      <div className="lg:col-span-2 space-y-4">
        {/* Actions Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{t("availableReviewers")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("foundReviewers", {
                eligible: eligibleResults.length,
                total: searchResults.length,
              })}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={onUseRecommended}
            disabled={isLoadingRecommended || eligibleResults.length === 0}
          >
            {isLoadingRecommended ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("buildingTeam")}
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                {t("useRecommended")}
              </>
            )}
          </Button>
        </div>

        {/* No Results */}
        {searchResults.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("noResultsTitle")}</AlertTitle>
            <AlertDescription>{t("noResultsDescription")}</AlertDescription>
          </Alert>
        )}

        {/* Eligible Reviewers */}
        {eligibleResults.length > 0 && (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {eligibleResults.map((result) => {
                const selected = isSelected(result.reviewerProfileId);
                const member = getSelectedMember(result.reviewerProfileId);

                return (
                  <div key={result.reviewerProfileId} className="relative">
                    <MatchScoreCard
                      result={result}
                      isSelected={selected}
                      onSelect={(sel) => onToggleReviewer(result, sel)}
                      compact
                      showDetails={false}
                      className={cn(selected && "ring-2 ring-primary")}
                    />

                    {/* Inline Role Selector */}
                    {selected && member && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <TeamMemberRoleSelect
                          value={member.role}
                          onChange={(role) => onUpdateRole(result.reviewerProfileId, role)}
                          isLeadQualified={result.isLeadQualified}
                          compact
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Ineligible Reviewers (Collapsed) */}
        {ineligibleResults.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              {t("showIneligible", { count: ineligibleResults.length })}
            </summary>
            <div className="mt-3 space-y-3 opacity-60">
              {ineligibleResults.map((result) => (
                <MatchScoreCard
                  key={result.reviewerProfileId}
                  result={result}
                  isSelected={false}
                  compact
                  showDetails={false}
                />
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Sidebar - Team Coverage */}
      <div className="space-y-4">
        {/* Selected Team Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              {t("selectedTeam")}
            </CardTitle>
            <CardDescription>
              {t("selectedCount", {
                selected: selectedTeam.length,
                target: criteria.teamSize,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedTeam.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("noSelections")}
              </p>
            ) : (
              <div className="space-y-2">
                {selectedTeam.map((member) => (
                  <div
                    key={member.reviewerProfileId}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {member.isLeadQualified && (
                        <Star className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">{member.fullName}</span>
                    </div>
                    <Badge
                      variant={member.role === "LEAD_REVIEWER" ? "default" : "secondary"}
                      className="text-xs shrink-0"
                    >
                      {t(`roles.${member.role}`)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Validation Warnings */}
            <div className="space-y-2 pt-2">
              {selectedTeam.length < 2 && (
                <div className="flex items-center gap-2 text-xs text-orange-600">
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("minTeamWarning")}</span>
                </div>
              )}
              {!hasLeadReviewer && selectedTeam.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-orange-600">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("noLeadWarning")}</span>
                </div>
              )}
              {selectedTeam.length >= 2 && hasLeadReviewer && (
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("teamValid")}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Coverage Report */}
        {selectedTeam.length > 0 && (
          <TeamCoverageReport
            coverage={liveCoverage}
            teamMembers={selectedMatchResults}
            requiredExpertise={criteria.requiredExpertise}
            requiredLanguages={criteria.requiredLanguages}
          />
        )}
      </div>
    </div>
  );
}

export default SelectionRoleStep;
