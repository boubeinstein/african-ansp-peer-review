"use client";

/**
 * Team Coverage Report Component
 *
 * Shows what expertise and languages the selected team covers,
 * with indicators for missing areas.
 */

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Briefcase,
  Star,
  XCircle,
  Users,
} from "lucide-react";
import type { CoverageReport, MatchResult } from "@/lib/reviewer/matching";
import { EXPERTISE_AREA_ABBREV, LANGUAGE_LABELS } from "@/lib/reviewer/labels";

// =============================================================================
// TYPES
// =============================================================================

export interface TeamCoverageReportProps {
  coverage: CoverageReport;
  teamMembers: MatchResult[];
  requiredExpertise: string[];
  requiredLanguages: string[];
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function getCoverageColor(coverage: number): string {
  if (coverage >= 1) return "text-green-600";
  if (coverage >= 0.8) return "text-yellow-600";
  if (coverage >= 0.5) return "text-orange-600";
  return "text-red-600";
}

function getBalanceBadge(balance: "GOOD" | "FAIR" | "POOR") {
  const variants = {
    GOOD: { variant: "default" as const, className: "bg-green-500", icon: CheckCircle2 },
    FAIR: { variant: "secondary" as const, className: "bg-yellow-500 text-yellow-900", icon: AlertTriangle },
    POOR: { variant: "destructive" as const, className: "", icon: XCircle },
  };
  return variants[balance];
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TeamCoverageReport({
  coverage,
  teamMembers,
  requiredExpertise,
  requiredLanguages,
  className,
}: TeamCoverageReportProps) {
  const t = useTranslations("reviewer.matching.team");
  const locale = useLocale() as "en" | "fr";

  const balanceBadge = getBalanceBadge(coverage.teamBalance);
  const BalanceIcon = balanceBadge.icon;

  const expertisePercentage = Math.round(coverage.expertiseCoverage * 100);
  const languagePercentage = Math.round(coverage.languageCoverage * 100);

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("coverage")}
            </CardTitle>
            <CardDescription>
              {teamMembers.length} {t("membersSelected")}
            </CardDescription>
          </div>
          <Badge variant={balanceBadge.variant} className={cn("gap-1", balanceBadge.className)}>
            <BalanceIcon className="h-3.5 w-3.5" />
            {t(`balance.${coverage.teamBalance}`)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Team Summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{teamMembers.length}</p>
            <p className="text-xs text-muted-foreground">{t("members")}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className={cn("text-2xl font-bold", getCoverageColor(coverage.expertiseCoverage))}>
              {expertisePercentage}%
            </p>
            <p className="text-xs text-muted-foreground">{t("expertiseCoverage")}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className={cn("text-2xl font-bold", getCoverageColor(coverage.languageCoverage))}>
              {languagePercentage}%
            </p>
            <p className="text-xs text-muted-foreground">{t("languageCoverage")}</p>
          </div>
        </div>

        {/* Lead Qualified Status */}
        <div
          className={cn(
            "flex items-center gap-2 p-3 rounded-lg",
            coverage.hasLeadQualified ? "bg-green-50 dark:bg-green-950" : "bg-orange-50 dark:bg-orange-950"
          )}
        >
          {coverage.hasLeadQualified ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">{t("hasLead")}</p>
                <p className="text-xs text-green-600 dark:text-green-500">{t("hasLeadDescription")}</p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-700 dark:text-orange-400">{t("noLead")}</p>
                <p className="text-xs text-orange-600 dark:text-orange-500">{t("noLeadDescription")}</p>
              </div>
            </>
          )}
        </div>

        {/* Expertise Coverage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              {t("expertiseTitle")}
            </h4>
            <span className={cn("text-sm font-medium", getCoverageColor(coverage.expertiseCoverage))}>
              {coverage.expertiseCovered.length}/{requiredExpertise.length}
            </span>
          </div>
          <Progress value={expertisePercentage} className="h-2" />

          <div className="space-y-2">
            {/* Covered expertise */}
            {coverage.expertiseCovered.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {coverage.expertiseCovered.map((area) => (
                  <Badge key={area} className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                    <CheckCircle2 className="h-3 w-3" />
                    {EXPERTISE_AREA_ABBREV[area as keyof typeof EXPERTISE_AREA_ABBREV] ?? area}
                  </Badge>
                ))}
              </div>
            )}

            {/* Missing expertise */}
            {coverage.expertiseMissing.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">{t("missing")}:</p>
                <div className="flex flex-wrap gap-1.5">
                  {coverage.expertiseMissing.map((area) => (
                    <Badge key={area} variant="outline" className="gap-1 text-red-600 border-red-300">
                      <XCircle className="h-3 w-3" />
                      {EXPERTISE_AREA_ABBREV[area as keyof typeof EXPERTISE_AREA_ABBREV] ?? area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Language Coverage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {t("languageTitle")}
            </h4>
            <span className={cn("text-sm font-medium", getCoverageColor(coverage.languageCoverage))}>
              {coverage.languagesCovered.length}/{requiredLanguages.length}
            </span>
          </div>
          <Progress value={languagePercentage} className="h-2" />

          <div className="space-y-2">
            {/* Covered languages */}
            {coverage.languagesCovered.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {coverage.languagesCovered.map((lang) => (
                  <Badge key={lang} className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                    <CheckCircle2 className="h-3 w-3" />
                    {LANGUAGE_LABELS[lang as keyof typeof LANGUAGE_LABELS]?.[locale] ?? lang}
                  </Badge>
                ))}
              </div>
            )}

            {/* Missing languages */}
            {coverage.languagesMissing.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">{t("missing")}:</p>
                <div className="flex flex-wrap gap-1.5">
                  {coverage.languagesMissing.map((lang) => (
                    <Badge key={lang} variant="outline" className="gap-1 text-red-600 border-red-300">
                      <XCircle className="h-3 w-3" />
                      {LANGUAGE_LABELS[lang as keyof typeof LANGUAGE_LABELS]?.[locale] ?? lang}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Team Members Summary */}
        <div className="space-y-2">
          <h4 className="font-medium">{t("selected")}</h4>
          <div className="space-y-1.5">
            {teamMembers.map((member) => (
              <div
                key={member.reviewerProfileId}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{member.fullName}</span>
                  {member.isLeadQualified && <Star className="h-3.5 w-3.5 text-yellow-500" />}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {member.percentage}%
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Suggestions */}
        {(coverage.expertiseMissing.length > 0 ||
          coverage.languagesMissing.length > 0 ||
          !coverage.hasLeadQualified) && (
          <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-400 mb-2">
              {t("suggestions")}
            </h4>
            <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-500">
              {coverage.expertiseMissing.length > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  <span>
                    {t("suggestExpertise", {
                      areas: coverage.expertiseMissing
                        .map((a) => EXPERTISE_AREA_ABBREV[a as keyof typeof EXPERTISE_AREA_ABBREV] ?? a)
                        .join(", "),
                    })}
                  </span>
                </li>
              )}
              {coverage.languagesMissing.length > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  <span>
                    {t("suggestLanguage", {
                      languages: coverage.languagesMissing
                        .map((l) => LANGUAGE_LABELS[l as keyof typeof LANGUAGE_LABELS]?.[locale] ?? l)
                        .join(", "),
                    })}
                  </span>
                </li>
              )}
              {!coverage.hasLeadQualified && (
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  <span>{t("suggestLead")}</span>
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TeamCoverageReport;
