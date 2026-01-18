"use client";

/**
 * Team Assignment Wizard Component
 *
 * 3-step wizard for assigning review teams to peer reviews:
 * 1. Criteria & Search - Define matching criteria and search for reviewers
 * 2. Selection & Roles - Select team members and assign roles
 * 3. Confirmation - Review and submit the team
 */

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { TeamRole, ExpertiseArea, Language } from "@prisma/client";
import type { MatchResult, CoverageReport } from "@/lib/reviewer/matching";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

// Icons
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Search,
  Users,
  Wand2,
} from "lucide-react";

// Step Components
import { CriteriaSearchStep } from "./team-wizard-steps/criteria-search-step";
import { SelectionRoleStep } from "./team-wizard-steps/selection-role-step";
import { ConfirmationStep } from "./team-wizard-steps/confirmation-step";

// =============================================================================
// TYPES
// =============================================================================

export interface TeamAssignmentWizardProps {
  reviewId: string;
  locale: string;
}

export interface WizardCriteria {
  requiredExpertise: ExpertiseArea[];
  requiredLanguages: Language[];
  teamSize: number;
  reviewStartDate: Date | null;
  reviewEndDate: Date | null;
}

export interface TeamMemberAssignment {
  reviewerProfileId: string;
  userId: string;
  fullName: string;
  organization: string;
  role: TeamRole;
  isLeadQualified: boolean;
  matchScore: number;
  assignedAreas: string[];
}

type WizardStep = "criteria" | "selection" | "confirmation";

const STEPS: WizardStep[] = ["criteria", "selection", "confirmation"];

// =============================================================================
// COMPONENT
// =============================================================================

export function TeamAssignmentWizard({ reviewId, locale }: TeamAssignmentWizardProps) {
  const t = useTranslations("review.teamWizard");
  const router = useRouter();

  // Current step
  const [currentStep, setCurrentStep] = useState<WizardStep>("criteria");

  // Criteria state
  const [criteria, setCriteria] = useState<WizardCriteria>({
    requiredExpertise: [],
    requiredLanguages: [],
    teamSize: 3,
    reviewStartDate: null,
    reviewEndDate: null,
  });

  // Search results
  const [searchResults, setSearchResults] = useState<MatchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Team selection state
  const [selectedTeam, setSelectedTeam] = useState<TeamMemberAssignment[]>([]);

  // Coverage report (computed from selected team)
  const [coverageReport, setCoverageReport] = useState<CoverageReport | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch review data
  const { data: review, isLoading: isLoadingReview } = trpc.review.getById.useQuery(
    { id: reviewId },
    { refetchOnWindowFocus: false }
  );

  // Search state for lazy query
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [searchParams, setSearchParams] = useState<{
    targetOrganizationId: string;
    requiredExpertise: string[];
    requiredLanguages: string[];
    startDate: Date;
    endDate: Date;
    teamSize: number;
    maxResults: number;
    minScore: number;
  } | null>(null);

  // Fetch matching reviewers using query (enabled when search is triggered)
  const {
    data: searchResultsData,
    isFetching: isSearching,
    refetch: refetchSearch,
  } = trpc.reviewer.findMatchingReviewers.useQuery(
    searchParams!,
    {
      enabled: searchEnabled && searchParams !== null,
      refetchOnWindowFocus: false,
    }
  );

  // Build optimal team mutation
  const buildOptimalTeamMutation = trpc.reviewer.buildOptimalTeam.useMutation();

  // Assign team bulk mutation
  const assignTeamBulkMutation = trpc.review.assignTeamBulk.useMutation();

  // Initialize criteria from review data
  const initializeCriteria = useCallback(() => {
    if (review) {
      setCriteria((prev) => ({
        ...prev,
        requiredExpertise: (review.areasInScope ?? []) as ExpertiseArea[],
        requiredLanguages:
          review.languagePreference === "EN"
            ? ["EN" as Language]
            : review.languagePreference === "FR"
              ? ["FR" as Language]
              : (["EN", "FR"] as Language[]),
        reviewStartDate: review.plannedStartDate
          ? new Date(review.plannedStartDate)
          : review.requestedStartDate
            ? new Date(review.requestedStartDate)
            : null,
        reviewEndDate: review.plannedEndDate
          ? new Date(review.plannedEndDate)
          : review.requestedEndDate
            ? new Date(review.requestedEndDate)
            : null,
      }));
    }
  }, [review]);

  // Update search results when data comes in
  useMemo(() => {
    if (searchResultsData) {
      setSearchResults(searchResultsData.results);
      setHasSearched(true);
      if (currentStep === "criteria") {
        setCurrentStep("selection");
      }
    }
  }, [searchResultsData, currentStep]);

  // Search for matching reviewers
  const handleSearch = useCallback(async () => {
    if (!review) return;

    const params = {
      targetOrganizationId: review.hostOrganizationId,
      requiredExpertise: criteria.requiredExpertise as string[],
      requiredLanguages: criteria.requiredLanguages as string[],
      startDate: criteria.reviewStartDate ?? new Date(),
      endDate: criteria.reviewEndDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      teamSize: criteria.teamSize,
      maxResults: 50,
      minScore: 20,
    };

    setSearchParams(params);
    setSearchEnabled(true);

    // If query was already run with same params, refetch
    if (searchEnabled) {
      refetchSearch();
    }
  }, [review, criteria, searchEnabled, refetchSearch]);

  // Use recommended team
  const handleUseRecommendedTeam = useCallback(async () => {
    if (!review) return;

    try {
      const result = await buildOptimalTeamMutation.mutateAsync({
        targetOrganizationId: review.hostOrganizationId,
        requiredExpertise: criteria.requiredExpertise as string[],
        requiredLanguages: criteria.requiredLanguages as string[],
        startDate: criteria.reviewStartDate ?? new Date(),
        endDate: criteria.reviewEndDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teamSize: criteria.teamSize,
      });

      if (!result.success || result.team.length === 0) {
        console.error("Build optimal team failed:", result.message);
        return;
      }

      // Convert to team assignments - access nested reviewer object
      const assignments: TeamMemberAssignment[] = result.team.map((member, index) => {
        const reviewer = member.reviewer;
        const fullName = `${reviewer.user.firstName} ${reviewer.user.lastName}`;
        const organization = reviewer.homeOrganization.icaoCode
          ? `${reviewer.homeOrganization.nameEn} (${reviewer.homeOrganization.icaoCode})`
          : reviewer.homeOrganization.nameEn;

        return {
          reviewerProfileId: reviewer.id,
          userId: reviewer.user.id,
          fullName,
          organization,
          role: member.role === "LEAD" ? "LEAD_REVIEWER" : "REVIEWER",
          isLeadQualified: reviewer.isLeadQualified,
          matchScore: 80, // Approximate score since buildOptimalTeam doesn't return exact match %
          assignedAreas: member.expertiseContribution,
        };
      });

      // Ensure we have a lead reviewer
      const hasLead = assignments.some((a) => a.role === "LEAD_REVIEWER");
      if (!hasLead && assignments.length > 0) {
        const leadQualified = assignments.find((a) => a.isLeadQualified);
        if (leadQualified) {
          leadQualified.role = "LEAD_REVIEWER";
        } else {
          assignments[0].role = "LEAD_REVIEWER";
        }
      }

      setSelectedTeam(assignments);

      // Convert coverage analysis to coverage report format
      if (result.coverageAnalysis) {
        const ca = result.coverageAnalysis;
        setCoverageReport({
          expertiseCovered: ca.coveredExpertise as ExpertiseArea[],
          expertiseMissing: ca.uncoveredExpertise as ExpertiseArea[],
          expertiseCoverage: ca.expertiseCoveragePercent / 100,
          languagesCovered: ca.coveredLanguages as Language[],
          languagesMissing: ca.uncoveredLanguages as Language[],
          languageCoverage: ca.languageCoveragePercent / 100,
          hasLeadQualified: assignments.some((a) => a.isLeadQualified),
          teamBalance: ca.expertiseCoveragePercent >= 80 && ca.languageCoveragePercent >= 100 ? "GOOD" : ca.expertiseCoveragePercent >= 50 ? "FAIR" : "POOR",
        });
      }
    } catch (error) {
      console.error("Build optimal team failed:", error);
    }
  }, [review, criteria, buildOptimalTeamMutation]);

  // Toggle reviewer selection
  const handleToggleReviewer = useCallback(
    (result: MatchResult, selected: boolean) => {
      if (selected) {
        // Add to team
        const isFirstMember = selectedTeam.length === 0;
        const assignment: TeamMemberAssignment = {
          reviewerProfileId: result.reviewerProfileId,
          userId: result.reviewerId,
          fullName: result.fullName,
          organization: result.organization,
          role:
            isFirstMember && result.isLeadQualified
              ? "LEAD_REVIEWER"
              : "REVIEWER",
          isLeadQualified: result.isLeadQualified,
          matchScore: result.percentage,
          assignedAreas: [],
        };
        setSelectedTeam((prev) => [...prev, assignment]);
      } else {
        // Remove from team
        setSelectedTeam((prev) =>
          prev.filter((m) => m.reviewerProfileId !== result.reviewerProfileId)
        );
      }
    },
    [selectedTeam]
  );

  // Update member role
  const handleUpdateRole = useCallback(
    (reviewerProfileId: string, newRole: TeamRole) => {
      setSelectedTeam((prev) =>
        prev.map((member) => {
          if (member.reviewerProfileId === reviewerProfileId) {
            return { ...member, role: newRole };
          }
          // If setting someone as LEAD_REVIEWER, demote the current lead
          if (newRole === "LEAD_REVIEWER" && member.role === "LEAD_REVIEWER") {
            return { ...member, role: "REVIEWER" };
          }
          return member;
        })
      );
    },
    []
  );

  // Submit team
  const handleSubmit = useCallback(async () => {
    if (selectedTeam.length === 0) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await assignTeamBulkMutation.mutateAsync({
        reviewId,
        assignments: selectedTeam.map((member) => ({
          userId: member.userId,
          reviewerProfileId: member.reviewerProfileId,
          role: member.role,
          assignedAreas: member.assignedAreas,
        })),
        replaceExisting: true,
      });

      // Navigate back to review detail
      router.push(`/${locale}/reviews/${reviewId}`);
    } catch (error) {
      console.error("Submit failed:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to assign team"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [reviewId, locale, selectedTeam, assignTeamBulkMutation, router]);

  // Navigation helpers
  const currentStepIndex = STEPS.indexOf(currentStep);

  const canGoBack = currentStepIndex > 0;
  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case "criteria":
        return (
          criteria.requiredExpertise.length > 0 &&
          criteria.requiredLanguages.length > 0 &&
          criteria.teamSize >= 2
        );
      case "selection":
        return (
          selectedTeam.length >= 2 &&
          selectedTeam.some((m) => m.role === "LEAD_REVIEWER")
        );
      case "confirmation":
        return true;
      default:
        return false;
    }
  }, [currentStep, criteria, selectedTeam]);

  const handleBack = () => {
    if (canGoBack) {
      setCurrentStep(STEPS[currentStepIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentStep === "criteria") {
      handleSearch();
    } else if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1]);
    }
  };

  // Loading state
  if (isLoadingReview) {
    return <WizardSkeleton />;
  }

  // Error state
  if (!review) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("error.title")}</AlertTitle>
        <AlertDescription>{t("error.reviewNotFound")}</AlertDescription>
      </Alert>
    );
  }

  // Get organization name based on locale
  const orgName =
    locale === "fr" && review.hostOrganization.nameFr
      ? review.hostOrganization.nameFr
      : review.hostOrganization.nameEn;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2"
            onClick={() => router.push(`/${locale}/reviews/${reviewId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToReview")}
          </Button>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("subtitle", { reference: review.referenceNumber, organization: orgName })}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((step, index) => {
          const isActive = step === currentStep;
          const isCompleted = index < currentStepIndex;

          return (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                  isActive && "border-primary bg-primary text-primary-foreground",
                  isCompleted && "border-primary bg-primary text-primary-foreground",
                  !isActive && !isCompleted && "border-muted-foreground/50 text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "ml-2 text-sm font-medium hidden sm:inline",
                  isActive && "text-primary",
                  !isActive && "text-muted-foreground"
                )}
              >
                {t(`steps.${step}`)}
              </span>
              {index < STEPS.length - 1 && (
                <div className="w-8 sm:w-16 h-px bg-muted-foreground/30 mx-2" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === "criteria" && (
          <CriteriaSearchStep
            review={review}
            criteria={criteria}
            setCriteria={setCriteria}
            onInitialize={initializeCriteria}
            isSearching={isSearching}
            locale={locale}
          />
        )}

        {currentStep === "selection" && (
          <SelectionRoleStep
            searchResults={searchResults}
            selectedTeam={selectedTeam}
            criteria={criteria}
            coverageReport={coverageReport}
            onToggleReviewer={handleToggleReviewer}
            onUpdateRole={handleUpdateRole}
            onUseRecommended={handleUseRecommendedTeam}
            isLoadingRecommended={buildOptimalTeamMutation.isPending}
            locale={locale}
          />
        )}

        {currentStep === "confirmation" && (
          <ConfirmationStep
            review={review}
            selectedTeam={selectedTeam}
            criteria={criteria}
            coverageReport={coverageReport}
            onUpdateRole={handleUpdateRole}
            locale={locale}
          />
        )}
      </div>

      {/* Error Display */}
      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error.submitTitle")}</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={!canGoBack || isSubmitting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("navigation.back")}
        </Button>

        <div className="flex items-center gap-2">
          {currentStep === "criteria" && (
            <Button onClick={handleNext} disabled={!canGoNext || isSearching}>
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("navigation.searching")}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  {t("navigation.searchReviewers")}
                </>
              )}
            </Button>
          )}

          {currentStep === "selection" && (
            <Button onClick={handleNext} disabled={!canGoNext}>
              {t("navigation.reviewTeam")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {currentStep === "confirmation" && (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("navigation.assigning")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t("navigation.assignTeam")}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

function WizardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-16 h-4 ml-2" />
            {i < 3 && <Skeleton className="w-16 h-px mx-2" />}
          </div>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default TeamAssignmentWizard;
