"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Award, MapPin, GraduationCap } from "lucide-react";
import { AdoptionButton } from "./adoption-button";
import { AdoptionList } from "./adoption-list";
import { RequestMentorship } from "./request-mentorship";

interface Organization {
  id: string;
  nameEn: string;
  nameFr: string;
  organizationCode: string | null;
  country: string | null;
}

interface Adoption {
  id: string;
  adoptedAt: Date;
  implementationStatus: string | null;
  organization: {
    id: string;
    nameEn: string;
    nameFr: string;
    organizationCode: string | null;
  };
}

interface Practice {
  id: string;
  titleEn: string;
  titleFr: string;
  organizationId: string;
  organization: Organization;
  adoptions: Adoption[];
  _count: {
    adoptions: number;
  };
}

interface BestPracticeSidebarProps {
  practice: Practice;
  locale: string;
  canAdopt: boolean;
  hasAdopted: boolean;
  userOrgId?: string | null;
  userRole?: string;
  isOwnOrg: boolean;
}

export function BestPracticeSidebar({
  practice,
  locale,
  canAdopt,
  hasAdopted,
  userOrgId,
  userRole,
  isOwnOrg,
}: BestPracticeSidebarProps) {
  const t = useTranslations("bestPractices.detail.sidebar");

  const orgName = locale === "fr"
    ? practice.organization.nameFr
    : practice.organization.nameEn;

  const practiceTitle = locale === "fr"
    ? practice.titleFr
    : practice.titleEn;

  return (
    <div className="space-y-6">
      {/* Adoption Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-primary" />
            {t("adoption")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdoptionButton
            practiceId={practice.id}
            practiceTitle={practiceTitle}
            canAdopt={canAdopt}
            hasAdopted={hasAdopted}
            isOwnOrg={isOwnOrg}
            userRole={userRole}
            adoptionCount={practice._count.adoptions}
          />

          {isOwnOrg && (
            <p className="text-sm text-muted-foreground">
              {t("ownOrgMessage")}
            </p>
          )}

          {!userOrgId && !isOwnOrg && (
            <p className="text-sm text-muted-foreground">
              {t("loginToAdopt")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Mentorship Request Card */}
      {userRole && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="h-5 w-5 text-primary" />
              {locale === "fr" ? "Accompagnement" : "Mentorship"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RequestMentorship
              bestPracticeId={practice.id}
              targetOrgName={orgName}
              isOwnOrg={isOwnOrg}
              userRole={userRole}
              userOrgId={userOrgId}
            />
          </CardContent>
        </Card>
      )}

      {/* Originating Organization Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            {t("originatingOrg")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="font-medium">{orgName}</p>
            {practice.organization.organizationCode && (
              <p className="text-sm text-muted-foreground">
                {t("code")}: {practice.organization.organizationCode}
              </p>
            )}
            {practice.organization.country && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{practice.organization.country}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Adopting Organizations Card */}
      {practice.adoptions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {t("adoptedBy", { count: practice._count.adoptions })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdoptionList
              adoptions={practice.adoptions}
              locale={locale}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
