"use client";

/**
 * Reviewer Profile View Component
 *
 * Displays a reviewer's full profile with expertise, languages,
 * certifications, and statistics.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  Award,
  Languages,
  Briefcase,
  Star,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit2,
} from "lucide-react";
import type { ReviewerProfileFull } from "@/types/reviewer";
import {
  EXPERTISE_AREA_LABELS,
  EXPERTISE_AREA_ABBREV,
  LANGUAGE_LABELS,
  LANGUAGE_PROFICIENCY_LABELS,
  PROFICIENCY_LEVEL_LABELS,
  REVIEWER_TYPE_LABELS,
  REVIEWER_TYPE_COLOR,
  SELECTION_STATUS_LABELS,
  SELECTION_STATUS_COLOR,
  CERTIFICATION_TYPE_LABELS,
} from "@/lib/reviewer/labels";

// =============================================================================
// TYPES
// =============================================================================

interface ReviewerProfileViewProps {
  profile: ReviewerProfileFull;
  isOwnProfile?: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
  editHref?: string;
  className?: string;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function StatusBadge({
  status,
  locale,
}: {
  status: ReviewerProfileFull["selectionStatus"];
  locale: "en" | "fr";
}) {
  return (
    <Badge className={cn(SELECTION_STATUS_COLOR[status], "font-medium")}>
      {SELECTION_STATUS_LABELS[status][locale]}
    </Badge>
  );
}

function TypeBadge({
  type,
  locale,
}: {
  type: ReviewerProfileFull["reviewerType"];
  locale: "en" | "fr";
}) {
  return (
    <Badge variant="outline" className={cn(REVIEWER_TYPE_COLOR[type])}>
      {REVIEWER_TYPE_LABELS[type][locale]}
    </Badge>
  );
}

function getCertificationStatus(expiryDate: Date | null): {
  status: "valid" | "expired" | "expiringSoon";
  color: string;
} {
  if (!expiryDate) {
    return { status: "valid", color: "text-green-600" };
  }

  const now = new Date();
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  if (expiryDate < now) {
    return { status: "expired", color: "text-red-600" };
  } else if (expiryDate < threeMonthsFromNow) {
    return { status: "expiringSoon", color: "text-yellow-600" };
  }
  return { status: "valid", color: "text-green-600" };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ReviewerProfileView({
  profile,
  isOwnProfile = false,
  canEdit = false,
  onEdit,
  editHref,
  className,
}: ReviewerProfileViewProps) {
  const t = useTranslations("reviewer");
  const locale = useLocale() as "en" | "fr";

  const fullName = `${profile.user.firstName} ${profile.user.lastName}`;
  const initials = `${profile.user.firstName?.[0] || ""}${profile.user.lastName?.[0] || ""}`;
  const orgName = locale === "fr" ? profile.homeOrganization.nameFr : profile.homeOrganization.nameEn;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar and Basic Info */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold">{fullName}</h2>
                  <StatusBadge status={profile.selectionStatus} locale={locale} />
                  <TypeBadge type={profile.reviewerType} locale={locale} />
                </div>

                <p className="text-muted-foreground">{profile.currentPosition}</p>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{orgName}</span>
                  {profile.homeOrganization.organizationCode && (
                    <Badge variant="secondary" className="text-xs">
                      {profile.homeOrganization.organizationCode}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {profile.user.email}
                  </span>
                  {profile.alternativePhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {profile.alternativePhone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions and Stats */}
            <div className="md:ml-auto flex flex-col items-end gap-4">
              {(canEdit || isOwnProfile || onEdit) && (
                editHref ? (
                  <Button variant="outline" asChild>
                    <Link href={editHref}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      {t("profile.edit")}
                    </Link>
                  </Button>
                ) : onEdit ? (
                  <Button variant="outline" onClick={onEdit}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    {t("profile.edit")}
                  </Button>
                ) : null
              )}

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{profile.reviewsCompleted}</p>
                  <p className="text-xs text-muted-foreground">{t("stats.reviewsCompleted")}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile.yearsExperience}</p>
                  <p className="text-xs text-muted-foreground">{t("stats.yearsExperience")}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {profile.isLeadQualified ? (
                      <Star className="h-6 w-6 text-yellow-500 inline" />
                    ) : (
                      "-"
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("stats.leadQualified")}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expertise Areas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              {t("expertise.title")}
            </CardTitle>
            <CardDescription>
              {t("expertise.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile.expertiseRecords.length > 0 ? (
              <div className="space-y-3">
                {profile.expertiseRecords.map((expertise) => (
                  <div
                    key={expertise.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="font-mono">
                        {EXPERTISE_AREA_ABBREV[expertise.area]}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">
                          {EXPERTISE_AREA_LABELS[expertise.area][locale]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {expertise.yearsExperience > 0 &&
                            `${expertise.yearsExperience} ${t("expertise.years")}`}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        expertise.proficiencyLevel === "EXPERT" && "border-purple-500 text-purple-600",
                        expertise.proficiencyLevel === "PROFICIENT" && "border-blue-500 text-blue-600",
                        expertise.proficiencyLevel === "COMPETENT" && "border-green-500 text-green-600",
                        expertise.proficiencyLevel === "BASIC" && "border-gray-500 text-gray-600"
                      )}
                    >
                      {PROFICIENCY_LEVEL_LABELS[expertise.proficiencyLevel][locale]}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t("expertise.noData")}</p>
            )}
          </CardContent>
        </Card>

        {/* Language Proficiencies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              {t("language.title")}
            </CardTitle>
            <CardDescription>
              {t("language.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile.languages.length > 0 ? (
              <div className="space-y-3">
                {profile.languages.map((lang) => (
                  <div
                    key={lang.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {LANGUAGE_LABELS[lang.language][locale]}
                      </span>
                      {lang.isNative && (
                        <Badge variant="secondary" className="text-xs">
                          {t("language.native")}
                        </Badge>
                      )}
                      {lang.canConductInterviews && (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                          {t("language.canConduct")}
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline">
                      {LANGUAGE_PROFICIENCY_LABELS[lang.proficiency][locale]}
                    </Badge>
                  </div>
                ))}

                {/* Required languages warning */}
                {(!profile.languages.some((l) => l.language === "EN") ||
                  !profile.languages.some((l) => l.language === "FR")) && (
                  <div className="flex items-center gap-2 text-yellow-600 text-sm mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{t("language.requiredMissing")}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t("language.noData")}</p>
            )}
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              {t("certification.title")}
            </CardTitle>
            <CardDescription>
              {t("certification.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile.certifications.length > 0 ? (
              <div className="space-y-3">
                {profile.certifications.map((cert) => {
                  const { status, color } = getCertificationStatus(cert.expiryDate);
                  return (
                    <div
                      key={cert.id}
                      className="p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {locale === "fr" && cert.certificationNameFr
                              ? cert.certificationNameFr
                              : cert.certificationName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {CERTIFICATION_TYPE_LABELS[cert.certificationType][locale]}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {cert.issuingAuthority}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {status === "valid" && (
                            <CheckCircle2 className={cn("h-4 w-4", color)} />
                          )}
                          {status === "expiringSoon" && (
                            <Clock className={cn("h-4 w-4", color)} />
                          )}
                          {status === "expired" && (
                            <AlertCircle className={cn("h-4 w-4", color)} />
                          )}
                          <span className={cn("text-xs", color)}>
                            {t(`certification.status.${status}`)}
                          </span>
                        </div>
                      </div>
                      {cert.expiryDate && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {t("certification.expires")}: {new Date(cert.expiryDate).toLocaleDateString(locale)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t("certification.noData")}</p>
            )}
          </CardContent>
        </Card>

        {/* Biography */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("profile.biography")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(profile.biography || profile.biographyFr) ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {locale === "fr" && profile.biographyFr ? profile.biographyFr : profile.biography}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">{t("profile.noBiography")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conflicts of Interest (if any) */}
      {profile.conflictsOfInterest.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="h-5 w-5" />
              {t("coi.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profile.conflictsOfInterest.map((coi) => (
                <div
                  key={coi.id}
                  className="flex items-center justify-between p-2 rounded bg-orange-50"
                >
                  <span className="text-sm">
                    {locale === "fr" ? coi.organization.nameFr : coi.organization.nameEn}
                  </span>
                  <Badge variant="outline" className="text-orange-700">
                    {coi.coiType}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ReviewerProfileView;
