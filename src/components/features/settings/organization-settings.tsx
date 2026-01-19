"use client";

/**
 * Organization Settings Component
 *
 * Displays organization information and settings for ANSP admins.
 * Read-only view of organization details with member statistics.
 */

import { useTranslations, useLocale } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  MapPin,
  Globe,
  Users,
  ClipboardList,
  Calendar,
  Plane,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";

interface OrganizationSettingsProps {
  organizationId?: string | null;
}

function OrganizationSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function OrganizationSettings({}: OrganizationSettingsProps) {
  const t = useTranslations("settings.organization");
  const locale = useLocale();

  const { data: organization, isLoading } =
    trpc.settings.getOrganizationSettings.useQuery();

  if (isLoading) {
    return <OrganizationSkeleton />;
  }

  if (!organization) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t("noOrganization")}
        </CardContent>
      </Card>
    );
  }

  const name = locale === "fr" ? organization.nameFr : organization.nameEn;

  const regionLabels: Record<string, string> = {
    WACAF: t("regions.wacaf"),
    ESAF: t("regions.esaf"),
    NORTHERN: t("regions.northern"),
  };

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    SUSPENDED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    INACTIVE: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };

  return (
    <div className="space-y-6">
      {/* Organization Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t("title")}
              </CardTitle>
              <CardDescription>{t("description")}</CardDescription>
            </div>
            <Badge className={statusColors[organization.membershipStatus]}>
              {t(`status.${organization.membershipStatus.toLowerCase()}`)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Organization Name & Code */}
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-primary/10 rounded-lg">
              <Plane className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">{name}</h3>
              {organization.icaoCode && (
                <Badge variant="outline" className="mt-1 font-mono">
                  {organization.icaoCode}
                </Badge>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Organization Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("country")}</p>
                  <p className="font-medium">{organization.country}</p>
                </div>
              </div>

              {organization.city && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("city")}</p>
                    <p className="font-medium">{organization.city}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("region")}</p>
                  <p className="font-medium">
                    {regionLabels[organization.region] || organization.region}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("members")}</p>
                  <p className="font-medium">{organization._count.users}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("reviewsHosted")}</p>
                  <p className="font-medium">{organization._count.reviewsAsHost}</p>
                </div>
              </div>

              {organization.joinedAt && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("memberSince")}</p>
                    <p className="font-medium">
                      {format(new Date(organization.joinedAt), "MMMM yyyy")}
                    </p>
                  </div>
                </div>
              )}

              {organization.peerReviewTeam && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("peerReviewTeam")}</p>
                    <p className="font-medium">
                      {t("team")} {organization.peerReviewTeam}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information Note */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            {t("contactNote")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default OrganizationSettings;
