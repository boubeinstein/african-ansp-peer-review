"use client";

/**
 * Matching Page Client Component
 *
 * Provides the full reviewer matching interface with organization selection,
 * criteria input, and team building.
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  Building2,
  AlertCircle,
  Users,
  CheckCircle2,
} from "lucide-react";
import { ReviewerMatcher } from "@/components/features/reviewer/reviewer-matcher";
import type { MatchResult } from "@/lib/reviewer/matching";
import type { ReviewerProfileFull } from "@/types/reviewer";

// =============================================================================
// TYPES
// =============================================================================

interface MatchingPageClientProps {
  locale: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MatchingPageClient({ locale }: MatchingPageClientProps) {
  const t = useTranslations("reviewer.matching");

  // State
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [teamConfirmed, setTeamConfirmed] = useState(false);
  const [confirmedTeam, setConfirmedTeam] = useState<MatchResult[]>([]);

  // Fetch organizations for dropdown
  const { data: organizations, isLoading: orgsLoading } =
    trpc.organization.listForDropdown.useQuery();

  // Fetch reviewers when organization is selected
  const { data: reviewersData, isLoading: reviewersLoading } =
    trpc.reviewer.list.useQuery(
      {
        selectionStatus: "SELECTED",
        pageSize: 100,
      },
      {
        enabled: !!selectedOrgId,
      }
    );

  // Get selected organization details
  const selectedOrg = organizations?.find((org) => org.id === selectedOrgId);

  // Transform reviewers to match expected type
  const availableReviewers: ReviewerProfileFull[] =
    (reviewersData?.items as ReviewerProfileFull[]) ?? [];

  // Handlers
  const handleOrgChange = useCallback((orgId: string) => {
    setSelectedOrgId(orgId);
    setTeamConfirmed(false);
    setConfirmedTeam([]);
  }, []);

  const handleTeamSelected = useCallback((team: MatchResult[]) => {
    setConfirmedTeam(team);
    setTeamConfirmed(true);
  }, []);

  const handleExport = useCallback((team: MatchResult[]) => {
    // Generate CSV export
    const headers = [
      "Name",
      "Organization",
      "Score",
      "Expertise Score",
      "Language Score",
      "Availability Score",
      "Experience Score",
      "Eligible",
      "Lead Qualified",
    ];

    const rows = team.map((member) => [
      member.fullName,
      member.organization,
      member.score.toString(),
      member.breakdown.expertiseScore.toString(),
      member.breakdown.languageScore.toString(),
      member.breakdown.availabilityScore.toString(),
      member.breakdown.experienceScore.toString(),
      member.isEligible ? "Yes" : "No",
      member.isLeadQualified ? "Yes" : "No",
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    // Add UTF-8 BOM for Excel compatibility with French characters
    const BOM = "\uFEFF";

    // Download
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `review-team-${selectedOrg?.icaoCode ?? "export"}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [selectedOrg]);

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/${locale}/reviewers`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground">{t("criteriaDescription")}</p>
          </div>
        </div>
      </div>

      {/* Organization Selection */}
      {!selectedOrgId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t("targetOrganization")}
            </CardTitle>
            <CardDescription>
              Select the organization to be reviewed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {orgsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <div className="max-w-md">
                <Label htmlFor="organization">{t("targetOrganization")}</Label>
                <Select onValueChange={handleOrgChange}>
                  <SelectTrigger id="organization" className="mt-2">
                    <SelectValue placeholder="Select organization..." />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations?.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.nameEn}
                        {org.icaoCode && ` (${org.icaoCode})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {selectedOrgId && reviewersLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                <p className="text-muted-foreground">Loading reviewers...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Confirmed Success */}
      {teamConfirmed && confirmedTeam.length > 0 && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200">
            Team Selected Successfully
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            You have selected {confirmedTeam.length} reviewers for the peer review of{" "}
            {selectedOrg?.nameEn}. The team selection has been confirmed.
          </AlertDescription>
        </Alert>
      )}

      {/* Matching Interface */}
      {selectedOrgId && !reviewersLoading && selectedOrg && (
        <>
          {/* Change Organization Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Reviewing:</span>
              <span className="font-medium text-foreground">
                {selectedOrg.nameEn}
                {selectedOrg.icaoCode && ` (${selectedOrg.icaoCode})`}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedOrgId(null);
                setTeamConfirmed(false);
                setConfirmedTeam([]);
              }}
            >
              Change Organization
            </Button>
          </div>

          {/* No Reviewers Warning */}
          {availableReviewers.length === 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>No Reviewers Available</AlertTitle>
              <AlertDescription>
                There are no selected reviewers available in the system. Please ensure
                reviewers have been nominated and selected before attempting to build a
                review team.
              </AlertDescription>
            </Alert>
          ) : (
            <ReviewerMatcher
              targetOrganizationId={selectedOrgId}
              targetOrganizationName={
                selectedOrg.nameEn +
                (selectedOrg.icaoCode ? ` (${selectedOrg.icaoCode})` : "")
              }
              availableReviewers={availableReviewers}
              onTeamSelected={handleTeamSelected}
              onExport={handleExport}
            />
          )}
        </>
      )}

      {/* Quick Stats */}
      {selectedOrgId && !reviewersLoading && availableReviewers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Reviewer Pool Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Available</p>
                <p className="text-2xl font-bold">{availableReviewers.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Lead Qualified</p>
                <p className="text-2xl font-bold">
                  {availableReviewers.filter((r) => r.isLeadQualified).length}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Currently Available</p>
                <p className="text-2xl font-bold">
                  {availableReviewers.filter((r) => r.isAvailable).length}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg. Experience</p>
                <p className="text-2xl font-bold">
                  {Math.round(
                    availableReviewers.reduce((sum, r) => sum + r.yearsExperience, 0) /
                      availableReviewers.length
                  )}{" "}
                  <span className="text-sm font-normal text-muted-foreground">years</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
