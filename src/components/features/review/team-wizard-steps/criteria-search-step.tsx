"use client";

/**
 * Criteria & Search Step (Step 1)
 *
 * Allows configuration of search criteria for finding matching reviewers:
 * - Expertise areas (from review scope)
 * - Language requirements
 * - Team size
 * - Review dates
 */

import { useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ExpertiseArea, Language } from "@prisma/client";
import type { WizardCriteria } from "../team-assignment-wizard";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// Icons
import {
  Building2,
  Calendar,
  CheckCircle2,
  Globe,
  Briefcase,
  Users,
  Loader2,
  AlertCircle,
} from "lucide-react";

// Labels
import {
  EXPERTISE_AREA_LABELS,
  EXPERTISE_AREA_ABBREV,
  LANGUAGE_LABELS,
  getExpertiseAreasByCategory,
} from "@/lib/reviewer/labels";

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

export interface CriteriaSearchStepProps {
  review: Review;
  criteria: WizardCriteria;
  setCriteria: React.Dispatch<React.SetStateAction<WizardCriteria>>;
  onInitialize: () => void;
  isSearching: boolean;
  locale: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const AVAILABLE_LANGUAGES: Language[] = ["EN", "FR", "PT", "AR", "ES"];

// =============================================================================
// COMPONENT
// =============================================================================

export function CriteriaSearchStep({
  review,
  criteria,
  setCriteria,
  onInitialize,
  isSearching,
  locale,
}: CriteriaSearchStepProps) {
  const t = useTranslations("review.teamWizard.criteria");
  const loc = (locale as "en" | "fr") || "en";

  // Initialize criteria from review on mount
  useEffect(() => {
    if (criteria.requiredExpertise.length === 0) {
      onInitialize();
    }
  }, [onInitialize, criteria.requiredExpertise.length]);

  const expertiseCategories = getExpertiseAreasByCategory(loc);

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

  // Toggle expertise area
  const toggleExpertise = (area: ExpertiseArea) => {
    setCriteria((prev) => {
      const current = prev.requiredExpertise;
      const newExpertise = current.includes(area)
        ? current.filter((a) => a !== area)
        : [...current, area];
      return { ...prev, requiredExpertise: newExpertise };
    });
  };

  // Toggle language
  const toggleLanguage = (lang: Language) => {
    setCriteria((prev) => {
      const current = prev.requiredLanguages;
      const newLanguages = current.includes(lang)
        ? current.filter((l) => l !== lang)
        : [...current, lang];
      return { ...prev, requiredLanguages: newLanguages };
    });
  };

  // Update team size
  const handleTeamSizeChange = (size: number) => {
    setCriteria((prev) => ({ ...prev, teamSize: size }));
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Review Context Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t("reviewContext")}
          </CardTitle>
          <CardDescription>{t("reviewContextDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">{t("hostOrganization")}</p>
            <p className="font-medium">{orgName}</p>
            {review.hostOrganization.icaoCode && (
              <Badge variant="outline" className="mt-1">
                {review.hostOrganization.icaoCode}
              </Badge>
            )}
            {review.hostOrganization.country && (
              <p className="text-sm text-muted-foreground mt-1">
                {review.hostOrganization.country}
              </p>
            )}
          </div>

          <Separator />

          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t("reviewPeriod")}
            </p>
            <p className="font-medium">
              {startDate} - {endDate}
            </p>
          </div>

          {review.areasInScope && review.areasInScope.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">{t("areasInScope")}</p>
                <div className="flex flex-wrap gap-1">
                  {review.areasInScope.map((area) => (
                    <Badge key={area} variant="secondary" className="text-xs">
                      {EXPERTISE_AREA_ABBREV[area as ExpertiseArea] || area}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Team Size Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("teamSize")}
          </CardTitle>
          <CardDescription>{t("teamSizeDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t("numberOfReviewers")}</Label>
              <span className="text-2xl font-bold text-primary">{criteria.teamSize}</span>
            </div>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map((size) => (
                <Button
                  key={size}
                  type="button"
                  variant={criteria.teamSize === size ? "default" : "outline"}
                  size="lg"
                  className={cn(
                    "flex-1 h-12",
                    size === 3 && "ring-2 ring-primary/20"
                  )}
                  onClick={() => handleTeamSizeChange(size)}
                >
                  <span className="font-bold">{size}</span>
                  {size === 3 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {t("recommended")}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>2 ({t("minimum")})</span>
              <span className="text-center">3 ({t("recommended")})</span>
              <span>5 ({t("maximum")})</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="text-muted-foreground">
              {t("teamSizeNote")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Expertise Areas Card */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            {t("requiredExpertise")}
          </CardTitle>
          <CardDescription>{t("requiredExpertiseDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {expertiseCategories.map((category) => (
              <div key={category.category} className="space-y-3">
                <h4 className="font-medium text-sm">{category.category}</h4>
                <div className="space-y-2">
                  {category.areas.map((area) => {
                    const isSelected = criteria.requiredExpertise.includes(area.value);
                    const isInScope = review.areasInScope?.includes(area.value);

                    return (
                      <div
                        key={area.value}
                        className={cn(
                          "flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors",
                          isSelected && "bg-primary/10",
                          !isSelected && "hover:bg-muted"
                        )}
                        onClick={() => toggleExpertise(area.value)}
                      >
                        <Checkbox
                          id={`expertise-${area.value}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleExpertise(area.value)}
                        />
                        <Label
                          htmlFor={`expertise-${area.value}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          <span className="font-medium">{area.abbrev}</span>
                          <span className="text-muted-foreground ml-1">- {area.label}</span>
                        </Label>
                        {isInScope && (
                          <Badge variant="outline" className="text-xs">
                            {t("inScope")}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {criteria.requiredExpertise.length === 0 && (
            <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">{t("noExpertiseWarning")}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Language Requirements Card */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("requiredLanguages")}
          </CardTitle>
          <CardDescription>{t("requiredLanguagesDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {AVAILABLE_LANGUAGES.map((lang) => {
              const isSelected = criteria.requiredLanguages.includes(lang);
              const label = LANGUAGE_LABELS[lang];

              return (
                <div
                  key={lang}
                  className={cn(
                    "flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors",
                    isSelected && "border-primary bg-primary/10",
                    !isSelected && "hover:bg-muted"
                  )}
                  onClick={() => toggleLanguage(lang)}
                >
                  <Checkbox
                    id={`language-${lang}`}
                    checked={isSelected}
                    onCheckedChange={() => toggleLanguage(lang)}
                  />
                  <Label
                    htmlFor={`language-${lang}`}
                    className="cursor-pointer"
                  >
                    <span className="font-medium">{label[loc]}</span>
                    <span className="text-muted-foreground ml-1">({label.native})</span>
                  </Label>
                </div>
              );
            })}
          </div>

          {criteria.requiredLanguages.length === 0 && (
            <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">{t("noLanguageWarning")}</span>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
            <p className="text-muted-foreground">{t("languageNote")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="md:col-span-2 bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {t("teamSizeSummary", { count: criteria.teamSize })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {t("expertiseSummary", { count: criteria.requiredExpertise.length })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {t("languageSummary", { count: criteria.requiredLanguages.length })}
                </span>
              </div>
            </div>

            {(criteria.requiredExpertise.length > 0 && criteria.requiredLanguages.length > 0) && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">{t("readyToSearch")}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CriteriaSearchStep;
