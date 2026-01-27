"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Award, MapPin } from "lucide-react";
import { AdoptionButton } from "./adoption-button";
import { AdoptionList } from "./adoption-list";

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
  isOwnOrg: boolean;
}

export function BestPracticeSidebar({
  practice,
  locale,
  canAdopt,
  hasAdopted,
  userOrgId,
  isOwnOrg,
}: BestPracticeSidebarProps) {
  const t = useTranslations("bestPractices.detail.sidebar");

  const orgName = locale === "fr"
    ? practice.organization.nameFr
    : practice.organization.nameEn;

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
            canAdopt={canAdopt}
            hasAdopted={hasAdopted}
            isOwnOrg={isOwnOrg}
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
