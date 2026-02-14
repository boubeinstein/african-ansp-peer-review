"use client";

/**
 * Reviewer Selector Component
 *
 * Two-panel interface for selecting reviewers for a peer review:
 * - Left panel: Available reviewers with search, filters, and match scores
 * - Right panel: Selected team members with role assignment
 *
 * Features:
 * - Team-based eligibility filtering (Rule 1: Same team as host)
 * - COI filtering (Rule 2: No self-review)
 * - Cross-team assignment support (Rule 3: Requires justification)
 * - Match scoring based on expertise, languages, certifications
 * - Lead qualification indicators
 * - Inline role assignment
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { TeamRole, ExpertiseArea, Language } from "@/types/prisma-enums";
import { expertiseToReviewArea } from "@/lib/review-areas";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icons
import {
  Search,
  Star,
  Users,
  Building2,
  Languages,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  X,
  Loader2,
  Briefcase,
  Globe,
} from "lucide-react";

// Feature Components
import { TeamMemberRoleSelect } from "./team-member-role-select";
import { AvailabilityIndicator } from "./reviewer-availability-calendar";

// Labels
import {
  EXPERTISE_AREA_ABBREV,
  LANGUAGE_LABELS,
} from "@/lib/reviewer/labels";

// =============================================================================
// TYPES
// =============================================================================

export interface SelectedTeamMember {
  reviewerProfileId: string;
  userId: string;
  fullName: string;
  role: TeamRole;
  isLeadQualified: boolean;
  organization?: string;
  matchScore: number;
  isCrossTeam?: boolean;
  crossTeamJustification?: string;
}

export interface ReviewerSelectorProps {
  reviewId: string;
  selectedTeam: SelectedTeamMember[];
  onTeamChange: (team: SelectedTeamMember[]) => void;
  expertiseFilter?: ExpertiseArea[];
  languageFilter?: Language[];
  locale?: string;
  maxTeamSize?: number;
  minTeamSize?: number;
  /** Whether current user can approve cross-team assignments (passed from parent) */
  canApproveCrossTeam?: boolean;
}

// Team eligibility reviewer type from getTeamEligibleReviewers
interface TeamEligibilityInfo {
  id: string;
  isSameTeam: boolean;
  isSameOrg: boolean;
  isEligible: boolean;
  ineligibilityReason?: string;
}

// Legacy eligible reviewer type for backward compatibility
interface EligibleReviewer {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  organization: {
    id: string;
    nameEn: string;
    nameFr: string | null;
    organizationCode: string | null;
    country: string | null;
  } | null;
  expertiseAreas: ExpertiseArea[];
  isLeadQualified: boolean;
  reviewsCompleted: number;
  reviewsAsLead: number;
  isAvailable: boolean;
  matchScore: number;
  matchReasons: string[];
  canBeLead: boolean;
}


// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewerSelector({
  reviewId,
  selectedTeam,
  onTeamChange,
  expertiseFilter,
  languageFilter,
  locale = "en",
  maxTeamSize = 5,
  minTeamSize = 2,
  canApproveCrossTeam = false,
}: ReviewerSelectorProps) {
  const t = useTranslations("review.reviewerSelector");
  const loc = (locale as "en" | "fr") || "en";

  // Search and filter state
  const [search, setSearch] = useState("");
  const [availableOnly, setAvailableOnly] = useState(true);

  // Cross-team state
  const [includeCrossTeam, setIncludeCrossTeam] = useState(false);
  const [crossTeamJustifications, setCrossTeamJustifications] = useState<
    Record<string, string>
  >({});

  // Fetch team-eligible reviewers (new endpoint)
  const { data: teamData } = trpc.reviewer.getTeamEligibleReviewers.useQuery(
    {
      reviewId,
      includeCrossTeam: canApproveCrossTeam ? includeCrossTeam : false,
    },
    {
      enabled: !!reviewId,
    }
  );

  // Fetch legacy eligible reviewers for match scoring
  const { data, isLoading, error } = trpc.reviewer.getEligibleForReview.useQuery(
    {
      reviewId,
      search: search || undefined,
      expertiseAreas: expertiseFilter,
      languages: languageFilter,
      availableOnly,
    },
    {
      enabled: !!reviewId,
    }
  );

  // Combine team eligibility with legacy data
  const teamReviewers = teamData?.reviewers ?? [];
  const hostTeam = teamData?.hostTeam;
  const totalEligible = teamData?.totalEligible ?? 0;

  const allReviewers = (data?.reviewers ?? []) as EligibleReviewer[];
  const excludedOrg = data?.review?.hostOrganization;
  const reviewStartDate = data?.review?.plannedStartDate;
  const reviewEndDate = data?.review?.plannedEndDate;

  // Filter reviewers based on team eligibility
  // Only show reviewers who are in the team eligibility list and are eligible
  const reviewers = allReviewers.filter((reviewer) => {
    const teamInfo = teamReviewers.find((tr) => tr.id === reviewer.id);
    if (!teamInfo) {
      // If team data not loaded yet or reviewer not in team data,
      // fall back to legacy behavior (don't filter)
      return teamReviewers.length === 0;
    }
    // Show if eligible (same team and not same org)
    if (teamInfo.isEligible) return true;
    // Also show cross-team reviewers if toggle is on and user has permission
    if (includeCrossTeam && canApproveCrossTeam && !teamInfo.isSameOrg) return true;
    return false;
  });

  // Get team eligibility info for a reviewer
  const getTeamEligibility = (reviewerId: string): TeamEligibilityInfo | undefined => {
    const reviewer = teamReviewers.find((r) => r.id === reviewerId);
    if (!reviewer) return undefined;
    return {
      id: reviewer.id,
      isSameTeam: reviewer.isSameTeam,
      isSameOrg: reviewer.isSameOrg,
      isEligible: reviewer.isEligible,
      ineligibilityReason: reviewer.ineligibilityReason,
    };
  };

  // Check if a reviewer is selected
  const isSelected = (reviewerId: string) =>
    selectedTeam.some((m) => m.reviewerProfileId === reviewerId);

  // Check if team has a lead reviewer
  const hasLeadReviewer = selectedTeam.some((m) => m.role === "LEAD_REVIEWER");

  // Add reviewer to team
  const addToTeam = (reviewer: EligibleReviewer) => {
    if (selectedTeam.length >= maxTeamSize) return;
    if (isSelected(reviewer.id)) return;

    // Get team eligibility info
    const teamEligibility = getTeamEligibility(reviewer.id);
    const isCrossTeam = teamEligibility ? !teamEligibility.isSameTeam : false;

    // Check if cross-team assignment is allowed
    if (isCrossTeam && !canApproveCrossTeam) {
      return; // Cannot add cross-team reviewer without approval rights
    }

    // Determine initial role
    let initialRole: TeamRole = "REVIEWER";
    if (!hasLeadReviewer && reviewer.canBeLead) {
      initialRole = "LEAD_REVIEWER";
    }

    const newMember: SelectedTeamMember = {
      reviewerProfileId: reviewer.id,
      userId: reviewer.userId,
      fullName: reviewer.fullName,
      role: initialRole,
      isLeadQualified: reviewer.isLeadQualified,
      organization: reviewer.organization?.nameEn,
      matchScore: reviewer.matchScore,
      isCrossTeam,
      crossTeamJustification: isCrossTeam
        ? crossTeamJustifications[reviewer.id]
        : undefined,
    };

    onTeamChange([...selectedTeam, newMember]);
  };

  // Update cross-team justification for a reviewer
  const updateCrossTeamJustification = (
    reviewerId: string,
    justification: string
  ) => {
    setCrossTeamJustifications((prev) => ({
      ...prev,
      [reviewerId]: justification,
    }));

    // Also update in selected team if already selected
    const updatedTeam = selectedTeam.map((m) => {
      if (m.reviewerProfileId === reviewerId && m.isCrossTeam) {
        return { ...m, crossTeamJustification: justification };
      }
      return m;
    });
    if (
      updatedTeam.some(
        (m) =>
          m.reviewerProfileId === reviewerId &&
          m.crossTeamJustification !== justification
      )
    ) {
      onTeamChange(updatedTeam);
    }
  };

  // Remove reviewer from team
  const removeFromTeam = (reviewerId: string) => {
    onTeamChange(selectedTeam.filter((m) => m.reviewerProfileId !== reviewerId));
  };

  // Update team member role
  const updateRole = (reviewerId: string, role: TeamRole) => {
    // If setting as lead, remove lead role from others
    const updatedTeam = selectedTeam.map((m) => {
      if (m.reviewerProfileId === reviewerId) {
        return { ...m, role };
      }
      if (role === "LEAD_REVIEWER" && m.role === "LEAD_REVIEWER") {
        return { ...m, role: "REVIEWER" as TeamRole };
      }
      return m;
    });

    onTeamChange(updatedTeam);
  };

  // Team validation
  const isTeamValid = selectedTeam.length >= minTeamSize && hasLeadReviewer;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Panel: Available Reviewers */}
      <div className="lg:col-span-2 space-y-4">
        {/* Team Context Header */}
        {hostTeam && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <p className="text-sm text-muted-foreground">
                {loc === "fr" ? "Affichage des évaluateurs de" : "Showing reviewers from"}{" "}
                <span className="font-medium text-foreground">{hostTeam.nameEn}</span>
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              {totalEligible} {loc === "fr" ? "évaluateurs éligibles disponibles" : "eligible reviewers available"}
            </p>
          </div>
        )}

        {/* Cross-Team Toggle (Programme Coordinator only) */}
        {canApproveCrossTeam && (
          <div className="flex items-center gap-2 p-3 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <Switch
              id="cross-team-toggle"
              checked={includeCrossTeam}
              onCheckedChange={setIncludeCrossTeam}
            />
            <Label
              htmlFor="cross-team-toggle"
              className="text-sm cursor-pointer"
            >
              {loc === "fr"
                ? "Inclure les évaluateurs d'autres équipes"
                : "Include reviewers from other teams"}
            </Label>
            {includeCrossTeam && (
              <Badge variant="outline" className="ml-auto text-amber-600 border-amber-300">
                {loc === "fr" ? "Approbation requise" : "Approval required"}
              </Badge>
            )}
          </div>
        )}

        {/* COI Notice */}
        {excludedOrg && (
          <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <Shield className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700 dark:text-orange-400">
              {t("coiNotice", {
                organization: loc === "fr" && excludedOrg.nameFr
                  ? excludedOrg.nameFr
                  : excludedOrg.nameEn,
              })}
            </AlertDescription>
          </Alert>
        )}

        {/* Search and Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4" />
              {t("searchTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="available-only"
                  checked={availableOnly}
                  onCheckedChange={(checked) => setAvailableOnly(!!checked)}
                />
                <Label htmlFor="available-only" className="text-sm cursor-pointer">
                  {t("availableOnly")}
                </Label>
              </div>
            </div>

            {/* Active Filters Display */}
            {(expertiseFilter?.length || languageFilter?.length) && (
              <div className="flex flex-wrap gap-2">
                {expertiseFilter?.map((area) => (
                  <Badge key={area} variant="secondary" className="text-xs">
                    <Briefcase className="h-3 w-3 mr-1" />
                    {EXPERTISE_AREA_ABBREV[area]}
                  </Badge>
                ))}
                {languageFilter?.map((lang) => (
                  <Badge key={lang} variant="secondary" className="text-xs">
                    <Languages className="h-3 w-3 mr-1" />
                    {LANGUAGE_LABELS[lang]?.[loc] ?? lang}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                {t("availableReviewers")}
              </span>
              <Badge variant="outline">
                {isLoading ? "..." : reviewers.length} {t("found")}
              </Badge>
            </CardTitle>
            <CardDescription>{t("availableDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{t("loadError")}</AlertDescription>
              </Alert>
            ) : reviewers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t("noReviewers")}</p>
              </div>
            ) : (
              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-3">
                  {reviewers.map((reviewer) => {
                    const selected = isSelected(reviewer.id);
                    const teamEligibility = getTeamEligibility(reviewer.id);
                    const isCrossTeam = teamEligibility
                      ? !teamEligibility.isSameTeam
                      : false;
                    const canAdd =
                      !selected &&
                      (!isCrossTeam || canApproveCrossTeam) &&
                      teamEligibility?.isEligible !== false;

                    return (
                      <div
                        key={reviewer.id}
                        onClick={() => canAdd && addToTeam(reviewer)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (
                            (e.key === "Enter" || e.key === " ") &&
                            canAdd
                          ) {
                            e.preventDefault();
                            addToTeam(reviewer);
                          }
                        }}
                        className={cn(
                          "p-3 rounded-lg border transition-colors",
                          selected
                            ? "bg-primary/5 border-primary cursor-default"
                            : canAdd
                            ? "hover:bg-muted/50 cursor-pointer hover:border-primary"
                            : "opacity-60 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Reviewer Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">
                                {reviewer.fullName}
                              </span>
                              {reviewer.isLeadQualified && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Star className="h-4 w-4 text-yellow-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {t("leadQualified")}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}

                              {/* Eligibility Badges */}
                              {teamEligibility?.isSameOrg && (
                                <Badge variant="destructive" className="text-xs">
                                  {loc === "fr"
                                    ? "Même organisation"
                                    : "Same Organization"}
                                </Badge>
                              )}
                              {!teamEligibility?.isEligible &&
                                !teamEligibility?.isSameOrg && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs text-orange-600 border-orange-300"
                                  >
                                    {teamEligibility?.ineligibilityReason ??
                                      (loc === "fr"
                                        ? "Non éligible"
                                        : "Not eligible")}
                                  </Badge>
                                )}
                              {isCrossTeam &&
                                teamEligibility?.isEligible && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs text-amber-600 border-amber-300"
                                  >
                                    {loc === "fr"
                                      ? "Inter-équipe"
                                      : "Cross-Team"}
                                  </Badge>
                                )}
                            </div>

                            {reviewer.organization && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                <Building2 className="h-3 w-3" />
                                <span className="truncate">
                                  {loc === "fr" && reviewer.organization.nameFr
                                    ? reviewer.organization.nameFr
                                    : reviewer.organization.nameEn}
                                </span>
                                {reviewer.organization.organizationCode && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs ml-1"
                                  >
                                    {reviewer.organization.organizationCode}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Review Area Coverage */}
                            {reviewer.expertiseAreas.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {Array.from(
                                  new Set(
                                    reviewer.expertiseAreas
                                      .map((e) => expertiseToReviewArea(e))
                                      .filter(Boolean)
                                  )
                                ).map((area) => (
                                  <Badge
                                    key={area}
                                    variant="outline"
                                    className="text-xs font-mono"
                                  >
                                    {area}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Match Reasons */}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {reviewer.matchReasons.slice(0, 3).map((reason, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {reason}
                                </Badge>
                              ))}
                              {reviewer.matchReasons.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{reviewer.matchReasons.length - 3}
                                </Badge>
                              )}
                              {/* Availability Indicator */}
                              {reviewStartDate && reviewEndDate && (
                                <AvailabilityIndicator
                                  reviewerProfileId={reviewer.id}
                                  reviewStartDate={reviewStartDate}
                                  reviewEndDate={reviewEndDate}
                                />
                              )}
                            </div>
                          </div>

                          {/* Score and Action */}
                          <div className="flex items-center gap-3">
                            {/* Match Score */}
                            <div className="text-center">
                              <div
                                className={cn(
                                  "text-lg font-bold",
                                  reviewer.matchScore >= 60
                                    ? "text-green-600"
                                    : reviewer.matchScore >= 40
                                    ? "text-yellow-600"
                                    : "text-gray-500"
                                )}
                              >
                                {reviewer.matchScore}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t("score")}
                              </div>
                            </div>

                            {/* Add/Selected Button */}
                            {selected ? (
                              <Badge variant="secondary" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {t("selected")}
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToTeam(reviewer);
                                }}
                                disabled={selectedTeam.length >= maxTeamSize}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                {t("add")}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel: Selected Team */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              {t("selectedTeam")}
            </CardTitle>
            <CardDescription>
              {t("selectedCount", {
                selected: selectedTeam.length,
                min: minTeamSize,
                max: maxTeamSize,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTeam.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("noSelections")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedTeam.map((member) => (
                  <div
                    key={member.reviewerProfileId}
                    className={cn(
                      "p-3 rounded-lg border",
                      member.isCrossTeam
                        ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                        : "bg-muted/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">
                            {member.fullName}
                          </span>
                          {member.isLeadQualified && (
                            <Star className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                          )}
                          {member.isCrossTeam && (
                            <Badge
                              variant="outline"
                              className="text-xs text-amber-600 border-amber-300"
                            >
                              {loc === "fr" ? "Inter-équipe" : "Cross-Team"}
                            </Badge>
                          )}
                        </div>
                        {member.organization && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {member.organization}
                          </p>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        onClick={() => removeFromTeam(member.reviewerProfileId)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Role Selector */}
                    <div className="mt-2">
                      <TeamMemberRoleSelect
                        value={member.role}
                        onChange={(role) =>
                          updateRole(member.reviewerProfileId, role)
                        }
                        isLeadQualified={member.isLeadQualified}
                        compact
                        className="w-full"
                      />
                    </div>

                    {/* Cross-Team Justification */}
                    {member.isCrossTeam && (
                      <div className="mt-3 p-3 border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 rounded-md">
                        <Label className="text-xs text-amber-800 dark:text-amber-400 font-medium">
                          {loc === "fr"
                            ? "Justification inter-équipe (requis)"
                            : "Cross-Team Justification (Required)"}
                        </Label>
                        <Textarea
                          value={
                            crossTeamJustifications[member.reviewerProfileId] ??
                            member.crossTeamJustification ??
                            ""
                          }
                          onChange={(e) =>
                            updateCrossTeamJustification(
                              member.reviewerProfileId,
                              e.target.value
                            )
                          }
                          placeholder={
                            loc === "fr"
                              ? "Expliquez pourquoi cette affectation inter-équipe est nécessaire..."
                              : "Explain why this cross-team assignment is necessary..."
                          }
                          className="mt-1 text-sm min-h-[60px]"
                        />
                        {(crossTeamJustifications[member.reviewerProfileId] ??
                          member.crossTeamJustification ??
                          "").length < 10 && (
                          <p className="text-xs text-amber-600 mt-1">
                            {loc === "fr"
                              ? "Minimum 10 caractères requis"
                              : "Minimum 10 characters required"}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Validation Status */}
            <div className="space-y-2 pt-2 border-t">
              {selectedTeam.length < minTeamSize && (
                <div className="flex items-center gap-2 text-xs text-orange-600">
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("minTeamWarning", { min: minTeamSize })}</span>
                </div>
              )}
              {!hasLeadReviewer && selectedTeam.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-orange-600">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("noLeadWarning")}</span>
                </div>
              )}
              {isTeamValid && (
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("teamValid")}</span>
                </div>
              )}
            </div>

            {/* Team Summary */}
            {selectedTeam.length > 0 && (
              <div className="pt-2 border-t text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>{t("leadQualifiedCount")}</span>
                  <span className="font-medium">
                    {selectedTeam.filter((m) => m.isLeadQualified).length}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>{t("avgScore")}</span>
                  <span className="font-medium">
                    {Math.round(
                      selectedTeam.reduce((sum, m) => sum + m.matchScore, 0) /
                        selectedTeam.length
                    )}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ReviewerSelector;
