"use client";

/**
 * Organization Table Component
 *
 * Table display for organization directory list view.
 * Supports sorting by column with responsive design.
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Edit2,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import type { OrganizationListItem } from "@/types/organization";

// =============================================================================
// TYPES
// =============================================================================

export type OrganizationSortField =
  | "nameEn"
  | "nameFr"
  | "icaoCode"
  | "country"
  | "region"
  | "membershipStatus"
  | "createdAt";

interface OrganizationTableProps {
  organizations: OrganizationListItem[];
  onRowClick: (id: string) => void;
  onEdit?: (id: string) => void;
  sortBy: OrganizationSortField;
  sortOrder: "asc" | "desc";
  onSort: (field: OrganizationSortField) => void;
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
// HELPER COMPONENTS
// =============================================================================

function SortableHeader({
  field,
  currentSort,
  currentOrder,
  onSort,
  children,
  className,
}: {
  field: OrganizationSortField;
  currentSort: OrganizationSortField;
  currentOrder: "asc" | "desc";
  onSort: (field: OrganizationSortField) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const isActive = currentSort === field;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-3 h-8 data-[state=open]:bg-accent", className)}
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

export function OrganizationTable({
  organizations,
  onRowClick,
  onEdit,
  sortBy,
  sortOrder,
  onSort,
  className,
}: OrganizationTableProps) {
  const t = useTranslations("organizations");
  const locale = useLocale() as "en" | "fr";

  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {/* Logo + Name */}
            <TableHead className="w-[300px]">
              <SortableHeader
                field="nameEn"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              >
                {t("table.name")}
              </SortableHeader>
            </TableHead>

            {/* ICAO Code */}
            <TableHead className="w-[100px]">
              <SortableHeader
                field="icaoCode"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              >
                {t("table.icaoCode")}
              </SortableHeader>
            </TableHead>

            {/* Country */}
            <TableHead className="w-[150px]">
              <SortableHeader
                field="country"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              >
                {t("table.country")}
              </SortableHeader>
            </TableHead>

            {/* City - hidden on mobile */}
            <TableHead className="hidden md:table-cell">
              {t("table.city")}
            </TableHead>

            {/* Region */}
            <TableHead className="w-[100px]">
              {t("table.region")}
            </TableHead>

            {/* Status */}
            <TableHead className="w-[120px]">
              <SortableHeader
                field="membershipStatus"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              >
                {t("table.status")}
              </SortableHeader>
            </TableHead>

            {/* Joined Date - hidden on mobile */}
            <TableHead className="hidden lg:table-cell w-[120px]">
              <SortableHeader
                field="createdAt"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              >
                {t("table.joined")}
              </SortableHeader>
            </TableHead>

            {/* Actions */}
            <TableHead className="w-[80px] text-right">
              {t("table.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {organizations.map((organization) => {
            // Generate initials from ICAO code or name
            const initials = organization.icaoCode
              ? organization.icaoCode.slice(0, 2)
              : organization.nameEn
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

            const orgName =
              locale === "fr" ? organization.nameFr : organization.nameEn;

            const regionLabel =
              REGION_LABELS[organization.region]?.[locale] || organization.region;
            const statusLabel =
              STATUS_LABELS[organization.membershipStatus]?.[locale] ||
              organization.membershipStatus;

            const joinedDate = organization.joinedAt
              ? new Date(organization.joinedAt).toLocaleDateString(
                  locale === "fr" ? "fr-FR" : "en-US",
                  { year: "numeric", month: "short", day: "numeric" }
                )
              : "-";

            return (
              <TableRow
                key={organization.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick(organization.id)}
              >
                {/* Logo + Name */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate max-w-[200px]">
                        {orgName}
                      </span>
                      {organization._count && (
                        <span className="text-xs text-muted-foreground">
                          {organization._count.users} {t("table.usersCount")} •{" "}
                          {organization._count.assessments} {t("table.assessmentsCount")}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* ICAO Code */}
                <TableCell>
                  {organization.icaoCode ? (
                    <Badge
                      variant="secondary"
                      className="font-mono text-xs px-2"
                    >
                      {organization.icaoCode}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>

                {/* Country */}
                <TableCell>
                  <span className="text-sm">{organization.country}</span>
                </TableCell>

                {/* City - hidden on mobile */}
                <TableCell className="hidden md:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {organization.city || "-"}
                  </span>
                </TableCell>

                {/* Region */}
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", REGION_COLORS[organization.region])}
                  >
                    {regionLabel}
                  </Badge>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      STATUS_COLORS[organization.membershipStatus]
                    )}
                  >
                    {statusLabel}
                  </Badge>
                </TableCell>

                {/* Joined Date - hidden on mobile */}
                <TableCell className="hidden lg:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {joinedDate}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">{t("table.openMenu")}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowClick(organization.id);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t("actions.view")}
                      </DropdownMenuItem>
                      {onEdit && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(organization.id);
                          }}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          {t("actions.edit")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}

          {/* Empty state */}
          {organizations.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                <p className="text-muted-foreground">{t("table.noResults")}</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default OrganizationTable;
