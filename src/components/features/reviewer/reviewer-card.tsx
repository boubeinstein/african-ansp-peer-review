"use client";

/**
 * Reviewer Card Component
 *
 * Card display for reviewer in directory grid view.
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2,
  Edit2,
  Eye,
  Globe,
  Star,
  User,
} from "lucide-react";
import {
  EXPERTISE_AREA_ABBREV,
  LANGUAGE_LABELS,
  SELECTION_STATUS_LABELS,
  SELECTION_STATUS_COLOR,
  REVIEWER_TYPE_LABELS,
  REVIEWER_TYPE_COLOR,
} from "@/lib/reviewer/labels";
import type { ReviewerListItem } from "@/types/reviewer";
import { COIStatusIndicator } from "./coi-badge";

// =============================================================================
// TYPES
// =============================================================================

interface ReviewerCardProps {
  reviewer: ReviewerListItem;
  onView: (id: string) => void;
  onEdit?: (id: string) => void;
  showCOICheck?: string; // organizationId to check against
  hasCOI?: boolean;
  // Selection props
  isSelected?: boolean;
  onSelect?: (checked: boolean) => void;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewerCard({
  reviewer,
  onView,
  onEdit,
  showCOICheck,
  hasCOI,
  isSelected,
  onSelect,
  className,
}: ReviewerCardProps) {
  const t = useTranslations("reviewers");
  const locale = useLocale() as "en" | "fr";

  const initials = reviewer.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const orgName =
    locale === "fr"
      ? reviewer.homeOrganization.nameFr
      : reviewer.homeOrganization.nameEn;

  const hasSelection = Boolean(onSelect);

  return (
    <Card
      className={cn(
        "flex flex-col group relative",
        isSelected && "ring-2 ring-primary",
        className
      )}
    >
      {/* Selection Checkbox */}
      {hasSelection && (
        <div
          className={cn(
            "absolute top-3 left-3 z-10 transition-opacity",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect?.(checked as boolean)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${reviewer.fullName}`}
            className="bg-background"
          />
        </div>
      )}
      <CardHeader className={cn("pb-3", hasSelection && "pl-10")}>
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Name and Title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">
                {reviewer.title && `${reviewer.title} `}
                {reviewer.fullName}
              </h3>
              {reviewer.isLeadQualified && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("card.leadQualified")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {reviewer.currentPosition}
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <Badge
            className={cn(
              "text-xs",
              SELECTION_STATUS_COLOR[reviewer.selectionStatus]
            )}
          >
            {SELECTION_STATUS_LABELS[reviewer.selectionStatus][locale]}
          </Badge>
          <Badge
            variant="outline"
            className={cn("text-xs", REVIEWER_TYPE_COLOR[reviewer.reviewerType])}
          >
            {REVIEWER_TYPE_LABELS[reviewer.reviewerType][locale]}
          </Badge>
          {reviewer.isAvailable && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-300">
              {t("card.available")}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* Organization */}
        <div className="flex items-start gap-2 text-sm">
          <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="truncate">{orgName}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {reviewer.homeOrganization.organizationCode && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {reviewer.homeOrganization.organizationCode}
                </Badge>
              )}
              <span>{reviewer.homeOrganization.country}</span>
            </div>
          </div>
        </div>

        {/* Expertise */}
        <div className="flex items-start gap-2">
          <User className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="flex flex-wrap gap-1">
            {reviewer.primaryExpertise.slice(0, 3).map((area) => (
              <TooltipProvider key={area}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {EXPERTISE_AREA_ABBREV[area]}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{area}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            {reviewer.primaryExpertise.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{reviewer.primaryExpertise.length - 3}
              </Badge>
            )}
          </div>
        </div>

        {/* Languages */}
        <div className="flex items-start gap-2">
          <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="flex flex-wrap gap-1">
            {reviewer.languages.map((lang) => (
              <Badge key={lang} variant="outline" className="text-xs">
                {LANGUAGE_LABELS[lang][locale]}
              </Badge>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>
            {t("card.reviews", { count: reviewer.reviewsCompleted })}
          </span>
          <span>
            {t("card.experience", { years: reviewer.yearsExperience })}
          </span>
        </div>

        {/* COI Check */}
        {showCOICheck && hasCOI !== undefined && (
          <div className="pt-2 border-t">
            <COIStatusIndicator
              hasConflict={hasCOI}
              severity={hasCOI ? "SOFT" : null}
              size="sm"
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onView(reviewer.id)}
        >
          <Eye className="h-4 w-4 mr-1" />
          {t("actions.view")}
        </Button>
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(reviewer.id)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default ReviewerCard;
