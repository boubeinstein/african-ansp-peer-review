"use client";

/**
 * Reviewer Table Component
 *
 * Table display for reviewer directory list view.
 * Supports sorting by column.
 */

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Edit2,
  Eye,
  Star,
} from "lucide-react";
import {
  EXPERTISE_AREA_ABBREV,
  SELECTION_STATUS_LABELS,
  SELECTION_STATUS_COLOR,
} from "@/lib/reviewer/labels";
import type { ReviewerListItem, ReviewerSortField } from "@/types/reviewer";

// =============================================================================
// TYPES
// =============================================================================

interface ReviewerTableProps {
  reviewers: ReviewerListItem[];
  onView: (id: string) => void;
  onEdit?: (id: string) => void;
  canEdit?: (reviewer: ReviewerListItem) => boolean;
  sortBy: ReviewerSortField;
  sortOrder: "asc" | "desc";
  onSort: (field: ReviewerSortField) => void;
  // Selection props
  selectAll?: boolean;
  onSelectAll?: (checked: boolean) => void;
  isSelected?: (id: string) => boolean;
  onSelectOne?: (id: string, checked: boolean) => void;
  className?: string;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function SortableHeader({
  field,
  currentSort,
  currentOrder,
  onSort,
  children,
}: {
  field: ReviewerSortField;
  currentSort: ReviewerSortField;
  currentOrder: "asc" | "desc";
  onSort: (field: ReviewerSortField) => void;
  children: React.ReactNode;
}) {
  const isActive = currentSort === field;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => onSort(field)}
    >
      {children}
      {isActive ? (
        currentOrder === "asc" ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : (
          <ArrowDown className="ml-2 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewerTable({
  reviewers,
  onView,
  onEdit,
  canEdit,
  sortBy,
  sortOrder,
  onSort,
  selectAll,
  onSelectAll,
  isSelected,
  onSelectOne,
  className,
}: ReviewerTableProps) {
  const t = useTranslations("reviewers");
  const locale = useLocale() as "en" | "fr";

  const hasSelection = Boolean(onSelectAll && onSelectOne && isSelected);

  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {hasSelection && (
              <TableHead className="w-12">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={(checked) => onSelectAll?.(checked as boolean)}
                  aria-label={t("selection.selectAll")}
                />
              </TableHead>
            )}
            <TableHead className="w-[280px]">
              <SortableHeader
                field="fullName"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              >
                {t("table.name")}
              </SortableHeader>
            </TableHead>
            <TableHead className="w-[200px]">
              <SortableHeader
                field="organization"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              >
                {t("table.organization")}
              </SortableHeader>
            </TableHead>
            <TableHead>{t("table.expertise")}</TableHead>
            <TableHead>{t("table.languages")}</TableHead>
            <TableHead>
              <SortableHeader
                field="selectionStatus"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              >
                {t("table.status")}
              </SortableHeader>
            </TableHead>
            <TableHead className="text-center">
              <SortableHeader
                field="reviewsCompleted"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              >
                {t("table.reviews")}
              </SortableHeader>
            </TableHead>
            <TableHead className="w-[100px] text-right">
              {t("table.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviewers.map((reviewer) => {
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

            return (
              <TableRow key={reviewer.id}>
                {/* Selection Checkbox */}
                {hasSelection && (
                  <TableCell>
                    <Checkbox
                      checked={isSelected?.(reviewer.id)}
                      onCheckedChange={(checked) =>
                        onSelectOne?.(reviewer.id, checked as boolean)
                      }
                      aria-label={`Select ${reviewer.fullName}`}
                    />
                  </TableCell>
                )}
                {/* Name */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">
                          {reviewer.title && `${reviewer.title} `}
                          {reviewer.fullName}
                        </span>
                        {reviewer.isLeadQualified && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t("card.leadQualified")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {reviewer.currentPosition}
                      </span>
                    </div>
                  </div>
                </TableCell>

                {/* Organization */}
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm truncate max-w-[180px]">
                      {orgName}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {reviewer.homeOrganization.icaoCode && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          {reviewer.homeOrganization.icaoCode}
                        </Badge>
                      )}
                      <span>{reviewer.homeOrganization.country}</span>
                    </div>
                  </div>
                </TableCell>

                {/* Expertise */}
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {reviewer.primaryExpertise.slice(0, 3).map((area) => (
                      <Badge
                        key={area}
                        variant="secondary"
                        className="text-[10px] font-mono px-1.5"
                      >
                        {EXPERTISE_AREA_ABBREV[area]}
                      </Badge>
                    ))}
                    {reviewer.primaryExpertise.length > 3 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5">
                        +{reviewer.primaryExpertise.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Languages */}
                <TableCell>
                  <div className="flex gap-1">
                    {reviewer.languages.map((lang) => (
                      <Badge
                        key={lang}
                        variant="outline"
                        className="text-[10px] px-1.5"
                      >
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge
                      className={cn(
                        "text-[10px] w-fit",
                        SELECTION_STATUS_COLOR[reviewer.selectionStatus]
                      )}
                    >
                      {SELECTION_STATUS_LABELS[reviewer.selectionStatus][locale]}
                    </Badge>
                    {reviewer.isAvailable && (
                      <Badge
                        variant="outline"
                        className="text-[10px] w-fit text-green-600 border-green-300"
                      >
                        {t("card.available")}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Reviews */}
                <TableCell className="text-center">
                  <span className="font-medium">{reviewer.reviewsCompleted}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({reviewer.yearsExperience}y)
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onView(reviewer.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t("actions.view")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {onEdit && (!canEdit || canEdit(reviewer)) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onEdit(reviewer.id)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("actions.edit")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default ReviewerTable;
