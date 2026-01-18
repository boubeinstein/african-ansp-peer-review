"use client";

/**
 * Reviewer Selector Component
 *
 * Two-panel interface for selecting reviewers for a peer review:
 * - Left panel: Available reviewers with search, filters, and match scores
 * - Right panel: Selected team members with role assignment
 *
 * Features:
 * - COI filtering (excludes host organization reviewers)
 * - Match scoring based on expertise, languages, certifications
 * - Lead qualification indicators
 * - Inline role assignment
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { TeamRole, ExpertiseArea, Language } from "@prisma/client";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";

// Feature Components
import { TeamMemberRoleSelect } from "./team-member-role-select";

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
}

// Eligible reviewer type based on API response structure
interface EligibleReviewer {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  organization: {
    id: string;
    nameEn: string;
    nameFr: string | null;
    icaoCode: string | null;
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
}: ReviewerSelectorProps) {
  const t = useTranslations("review.reviewerSelector");
  const loc = (locale as "en" | "fr") || "en";

  // Search and filter state
  const [search, setSearch] = useState("");
  const [availableOnly, setAvailableOnly] = useState(true);

  // Fetch eligible reviewers
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

  const reviewers = (data?.reviewers ?? []) as EligibleReviewer[];
  const excludedOrg = data?.review?.hostOrganization;

  // Check if a reviewer is selected
  const isSelected = (reviewerId: string) =>
    selectedTeam.some((m) => m.reviewerProfileId === reviewerId);

  // Check if team has a lead reviewer
  const hasLeadReviewer = selectedTeam.some((m) => m.role === "LEAD_REVIEWER");

  // Add reviewer to team
  const addToTeam = (reviewer: EligibleReviewer) => {
    if (selectedTeam.length >= maxTeamSize) return;
    if (isSelected(reviewer.id)) return;

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
    };

    onTeamChange([...selectedTeam, newMember]);
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

                    return (
                      <div
                        key={reviewer.id}
                        onClick={() => !selected && addToTeam(reviewer)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if ((e.key === 'Enter' || e.key === ' ') && !selected) {
                            e.preventDefault();
                            addToTeam(reviewer);
                          }
                        }}
                        className={cn(
                          "p-3 rounded-lg border transition-colors",
                          selected
                            ? "bg-primary/5 border-primary cursor-default"
                            : "hover:bg-muted/50 cursor-pointer hover:border-primary"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Reviewer Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
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
                            </div>

                            {reviewer.organization && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                <Building2 className="h-3 w-3" />
                                <span className="truncate">
                                  {loc === "fr" && reviewer.organization.nameFr
                                    ? reviewer.organization.nameFr
                                    : reviewer.organization.nameEn}
                                </span>
                                {reviewer.organization.icaoCode && (
                                  <Badge variant="outline" className="text-xs ml-1">
                                    {reviewer.organization.icaoCode}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Match Reasons */}
                            <div className="flex flex-wrap gap-1 mt-2">
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
                    className="p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {member.fullName}
                          </span>
                          {member.isLeadQualified && (
                            <Star className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
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
                        onChange={(role) => updateRole(member.reviewerProfileId, role)}
                        isLeadQualified={member.isLeadQualified}
                        compact
                        className="w-full"
                      />
                    </div>
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
