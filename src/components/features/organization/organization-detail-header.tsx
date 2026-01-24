"use client";

/**
 * Organization Detail Header Component
 *
 * Header section for organization detail page showing
 * key information and actions.
 */

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Edit2,
  MapPin,
} from "lucide-react";
import type { OrganizationWithCounts } from "@/types/organization";

// =============================================================================
// TYPES
// =============================================================================

interface OrganizationDetailHeaderProps {
  organization: OrganizationWithCounts;
  onBack: () => void;
  onEdit?: () => void;
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Region colors for badges
 */
const REGION_COLORS: Record<string, string> = {
  WACAF: "bg-blue-100 text-blue-800 border-blue-200",
  ESAF: "bg-purple-100 text-purple-800 border-purple-200",
  NORTHERN: "bg-orange-100 text-orange-800 border-orange-200",
};

/**
 * Region labels
 */
const REGION_LABELS: Record<string, { en: string; fr: string }> = {
  WACAF: { en: "Western & Central Africa", fr: "Afrique occidentale et centrale" },
  ESAF: { en: "Eastern & Southern Africa", fr: "Afrique orientale et australe" },
  NORTHERN: { en: "Northern Africa", fr: "Afrique du Nord" },
};

/**
 * Membership status colors
 */
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  SUSPENDED: "bg-red-100 text-red-800 border-red-200",
  INACTIVE: "bg-gray-100 text-gray-800 border-gray-200",
};

/**
 * Membership status labels
 */
const STATUS_LABELS: Record<string, { en: string; fr: string }> = {
  ACTIVE: { en: "Active Member", fr: "Membre actif" },
  PENDING: { en: "Pending Approval", fr: "En attente d'approbation" },
  SUSPENDED: { en: "Membership Suspended", fr: "Adhésion suspendue" },
  INACTIVE: { en: "Inactive", fr: "Inactif" },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function OrganizationDetailHeader({
  organization,
  onBack,
  onEdit,
  className,
}: OrganizationDetailHeaderProps) {
  const t = useTranslations("organizations");
  const locale = useLocale() as "en" | "fr";

  // Generate initials from ICAO code or name
  const initials = organization.organizationCode
    ? organization.organizationCode.slice(0, 2)
    : organization.nameEn
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

  const orgName = locale === "fr" ? organization.nameFr : organization.nameEn;
  const regionLabel = REGION_LABELS[organization.region]?.[locale] || organization.region;
  const statusLabel = STATUS_LABELS[organization.membershipStatus]?.[locale] || organization.membershipStatus;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("detail.backToList")}
      </Button>

      {/* Header Card */}
      <div className="flex flex-col md:flex-row md:items-start gap-6 p-6 bg-card rounded-lg border">
        {/* Logo/Initials */}
        <Avatar className="h-24 w-24 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Name and ICAO Code */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">{orgName}</h1>
            {organization.organizationCode && (
              <Badge variant="secondary" className="text-sm font-mono">
                {organization.organizationCode}
              </Badge>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>
              {organization.city
                ? `${organization.city}, ${organization.country}`
                : organization.country}
            </span>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={cn("text-sm", STATUS_COLORS[organization.membershipStatus])}
            >
              {statusLabel}
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-sm", REGION_COLORS[organization.region])}
            >
              {regionLabel}
            </Badge>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">
                    <strong className="text-foreground">{organization._count.users}</strong>{" "}
                    {t("detail.users")}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("detail.usersTooltip")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">
                    <strong className="text-foreground">{organization._count.assessments}</strong>{" "}
                    {t("detail.assessments")}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("detail.assessmentsTooltip")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">
                    <strong className="text-foreground">{organization._count.reviewsAsHost}</strong>{" "}
                    {t("detail.reviews")}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("detail.reviewsTooltip")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-row md:flex-col gap-2 shrink-0">
          {onEdit && (
            <Button onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              {t("actions.edit")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrganizationDetailHeader;
