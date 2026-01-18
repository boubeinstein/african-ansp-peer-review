"use client";

/**
 * Confirmation Step (Step 3)
 *
 * Final review before submitting the team assignment:
 * - Team member summary with roles
 * - Coverage analysis
 * - Any warnings or issues
 * - Final confirmation
 */

import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { TeamRole } from "@prisma/client";
import type { CoverageReport } from "@/lib/reviewer/matching";
import type { WizardCriteria, TeamMemberAssignment } from "../team-assignment-wizard";

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Icons
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Globe,
  Briefcase,
  Star,
  Users,
  XCircle,
} from "lucide-react";

// Labels
import {
  EXPERTISE_AREA_ABBREV,
  LANGUAGE_LABELS,
} from "@/lib/reviewer/labels";

// Components
import { TeamMemberRoleSelect } from "../team-member-role-select";

// =============================================================================
// TYPES
// =============================================================================

interface Review {
  id: string;
  referenceNumber: string;
  hostOrganization: {
    id: string;
    nameEn: string;
    nameFr?: string | null;
    icaoCode?: string | null;
    country?: string | null;
  };
  areasInScope?: string[] | null;
  languagePreference: string;
  plannedStartDate?: Date | string | null;
  plannedEndDate?: Date | string | null;
  requestedStartDate?: Date | string | null;
  requestedEndDate?: Date | string | null;
}

export interface ConfirmationStepProps {
  review: Review;
  selectedTeam: TeamMemberAssignment[];
  criteria: WizardCriteria;
  coverageReport: CoverageReport | null;
  onUpdateRole: (reviewerProfileId: string, role: TeamRole) => void;
  locale: string;
}

// =============================================================================
// HELPERS
// =============================================================================

const ROLE_LABELS: Record<TeamRole, { en: string; fr: string }> = {
  LEAD_REVIEWER: { en: "Lead Reviewer", fr: "Evaluateur Principal" },
  REVIEWER: { en: "Reviewer", fr: "Evaluateur" },
  TECHNICAL_EXPERT: { en: "Technical Expert", fr: "Expert Technique" },
  OBSERVER: { en: "Observer", fr: "Observateur" },
  TRAINEE: { en: "Trainee", fr: "Stagiaire" },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ConfirmationStep({
  review,
  selectedTeam,
  criteria,
  coverageReport,
  onUpdateRole,
  locale,
}: ConfirmationStepProps) {
  const t = useTranslations("review.teamWizard.confirmation");
  const loc = (locale as "en" | "fr") || "en";

  // Get organization name based on locale
  const orgName =
    loc === "fr" && review.hostOrganization.nameFr
      ? review.hostOrganization.nameFr
      : review.hostOrganization.nameEn;

  // Format dates for display
  const startDate = criteria.reviewStartDate
    ? format(new Date(criteria.reviewStartDate), "PPP")
    : t("notSet");
  const endDate = criteria.reviewEndDate
    ? format(new Date(criteria.reviewEndDate), "PPP")
    : t("notSet");

  // Check if team is valid
  const hasLeadReviewer = selectedTeam.some((m) => m.role === "LEAD_REVIEWER");
  const hasMinimumMembers = selectedTeam.length >= 2;
  const isTeamValid = hasLeadReviewer && hasMinimumMembers;

  // Sort team members by role (Lead first)
  const sortedTeam = [...selectedTeam].sort((a, b) => {
    if (a.role === "LEAD_REVIEWER") return -1;
    if (b.role === "LEAD_REVIEWER") return 1;
    return 0;
  });

  // Calculate coverage if not provided
  const coverage = coverageReport || {
    expertiseCovered: [] as string[],
    expertiseMissing: criteria.requiredExpertise,
    expertiseCoverage: 0,
    languagesCovered: [] as string[],
    languagesMissing: criteria.requiredLanguages,
    languageCoverage: 0,
    hasLeadQualified: selectedTeam.some((m) => m.isLeadQualified),
    teamBalance: "POOR" as const,
  };

  // Collect warnings
  const warnings: string[] = [];
  if (!hasLeadReviewer) {
    warnings.push(t("warnings.noLead"));
  }
  if (!hasMinimumMembers) {
    warnings.push(t("warnings.minMembers"));
  }
  if (coverage.expertiseMissing.length > 0) {
    warnings.push(t("warnings.missingExpertise", {
      areas: coverage.expertiseMissing
        .map((a) => EXPERTISE_AREA_ABBREV[a as keyof typeof EXPERTISE_AREA_ABBREV] || a)
        .join(", "),
    }));
  }
  if (coverage.languagesMissing.length > 0) {
    warnings.push(t("warnings.missingLanguages", {
      languages: coverage.languagesMissing
        .map((l) => LANGUAGE_LABELS[l as keyof typeof LANGUAGE_LABELS]?.[loc] || l)
        .join(", "),
    }));
  }

  return (
    <div className="space-y-6">
      {/* Review Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t("reviewSummary")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">{t("reference")}</p>
              <p className="font-medium">{review.referenceNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("hostOrganization")}</p>
              <p className="font-medium">{orgName}</p>
              {review.hostOrganization.icaoCode && (
                <Badge variant="outline" className="mt-1">
                  {review.hostOrganization.icaoCode}
                </Badge>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {t("period")}
              </p>
              <p className="font-medium text-sm">
                {startDate} - {endDate}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("teamMembers")}
          </CardTitle>
          <CardDescription>
            {t("teamMembersDescription", { count: selectedTeam.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>{t("table.name")}</TableHead>
                <TableHead>{t("table.organization")}</TableHead>
                <TableHead>{t("table.matchScore")}</TableHead>
                <TableHead>{t("table.role")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTeam.map((member, index) => (
                <TableRow key={member.reviewerProfileId}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {member.isLeadQualified && (
                        <Star className="h-4 w-4 text-yellow-500" />
                      )}
                      <span>{member.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.organization}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        member.matchScore >= 80
                          ? "default"
                          : member.matchScore >= 60
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {member.matchScore}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <TeamMemberRoleSelect
                      value={member.role}
                      onChange={(role) => onUpdateRole(member.reviewerProfileId, role)}
                      isLeadQualified={member.isLeadQualified}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Coverage Analysis */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Expertise Coverage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4" />
              {t("expertiseCoverage")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("coverage")}</span>
              <span
                className={cn(
                  "font-bold",
                  coverage.expertiseCoverage >= 1
                    ? "text-green-600"
                    : coverage.expertiseCoverage >= 0.8
                      ? "text-yellow-600"
                      : "text-red-600"
                )}
              >
                {Math.round(coverage.expertiseCoverage * 100)}%
              </span>
            </div>

            {coverage.expertiseCovered.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">{t("covered")}</p>
                <div className="flex flex-wrap gap-1">
                  {coverage.expertiseCovered.map((area) => (
                    <Badge
                      key={area}
                      variant="secondary"
                      className="text-xs bg-green-100 text-green-800"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {EXPERTISE_AREA_ABBREV[area as keyof typeof EXPERTISE_AREA_ABBREV] || area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {coverage.expertiseMissing.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">{t("missing")}</p>
                <div className="flex flex-wrap gap-1">
                  {coverage.expertiseMissing.map((area) => (
                    <Badge
                      key={area}
                      variant="outline"
                      className="text-xs text-red-600 border-red-300"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      {EXPERTISE_AREA_ABBREV[area as keyof typeof EXPERTISE_AREA_ABBREV] || area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Language Coverage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" />
              {t("languageCoverage")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("coverage")}</span>
              <span
                className={cn(
                  "font-bold",
                  coverage.languageCoverage >= 1
                    ? "text-green-600"
                    : coverage.languageCoverage >= 0.5
                      ? "text-yellow-600"
                      : "text-red-600"
                )}
              >
                {Math.round(coverage.languageCoverage * 100)}%
              </span>
            </div>

            {coverage.languagesCovered.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">{t("covered")}</p>
                <div className="flex flex-wrap gap-1">
                  {coverage.languagesCovered.map((lang) => (
                    <Badge
                      key={lang}
                      variant="secondary"
                      className="text-xs bg-green-100 text-green-800"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {LANGUAGE_LABELS[lang as keyof typeof LANGUAGE_LABELS]?.[loc] || lang}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {coverage.languagesMissing.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">{t("missing")}</p>
                <div className="flex flex-wrap gap-1">
                  {coverage.languagesMissing.map((lang) => (
                    <Badge
                      key={lang}
                      variant="outline"
                      className="text-xs text-red-600 border-red-300"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      {LANGUAGE_LABELS[lang as keyof typeof LANGUAGE_LABELS]?.[loc] || lang}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert variant={isTeamValid ? "default" : "destructive"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {isTeamValid ? t("warningsTitle") : t("errorsTitle")}
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {isTeamValid && warnings.length === 0 && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-700 dark:text-green-400">
            {t("readyTitle")}
          </AlertTitle>
          <AlertDescription className="text-green-600 dark:text-green-500">
            {t("readyDescription")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default ConfirmationStep;
