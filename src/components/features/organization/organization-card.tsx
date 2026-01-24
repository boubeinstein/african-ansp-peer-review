"use client";

/**
 * Organization Card Component
 *
 * Card display for organization in directory grid view.
 * Shows key information with quick actions.
 */

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, Edit2, Eye, MapPin } from "lucide-react";
import type { OrganizationListItem } from "@/types/organization";

// =============================================================================
// TYPES
// =============================================================================

interface OrganizationCardProps {
  organization: OrganizationListItem;
  onClick: (id: string) => void;
  onEdit?: (id: string) => void;
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
  WACAF: { en: "WACAF", fr: "WACAF" },
  ESAF: { en: "ESAF", fr: "ESAF" },
  NORTHERN: { en: "North", fr: "Nord" },
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
  ACTIVE: { en: "Active", fr: "Actif" },
  PENDING: { en: "Pending", fr: "En attente" },
  SUSPENDED: { en: "Suspended", fr: "Suspendu" },
  INACTIVE: { en: "Inactive", fr: "Inactif" },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function OrganizationCard({
  organization,
  onClick,
  onEdit,
  className,
}: OrganizationCardProps) {
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

  const orgName =
    locale === "fr" ? organization.nameFr : organization.nameEn;

  const regionLabel = REGION_LABELS[organization.region]?.[locale] || organization.region;
  const statusLabel = STATUS_LABELS[organization.membershipStatus]?.[locale] || organization.membershipStatus;

  return (
    <Card
      className={cn(
        "flex flex-col group cursor-pointer transition-all hover:shadow-lg",
        className
      )}
      onClick={() => onClick(organization.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Logo/Initials Avatar */}
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Name and ICAO Code */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
              {orgName}
            </h3>
            {organization.organizationCode && (
              <Badge
                variant="secondary"
                className="text-xs font-mono mt-1 px-2"
              >
                {organization.organizationCode}
              </Badge>
            )}
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <Badge
            variant="outline"
            className={cn("text-xs", STATUS_COLORS[organization.membershipStatus])}
          >
            {statusLabel}
          </Badge>
          <Badge
            variant="outline"
            className={cn("text-xs", REGION_COLORS[organization.region])}
          >
            {regionLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* Location */}
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="truncate">
              {organization.city
                ? `${organization.city}, ${organization.country}`
                : organization.country}
            </p>
          </div>
        </div>

        {/* Stats */}
        {organization._count && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span
              className="flex items-center gap-1"
              title={t("card.usersTooltip", { count: organization._count.users })}
            >
              <Building2 className="h-3 w-3" />
              {organization._count.users} {t("card.users")}
            </span>
            <span>
              {organization._count.assessments} {t("card.assessments")}
            </span>
          </div>
        )}

        {/* Joined Date */}
        {organization.joinedAt && (
          <div className="text-xs text-muted-foreground">
            {t("card.joined", {
              date: new Date(organization.joinedAt).toLocaleDateString(
                locale === "fr" ? "fr-FR" : "en-US",
                { year: "numeric", month: "short" }
              ),
            })}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onClick(organization.id);
          }}
        >
          <Eye className="h-4 w-4 mr-1" />
          {t("actions.view")}
        </Button>
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(organization.id);
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default OrganizationCard;
