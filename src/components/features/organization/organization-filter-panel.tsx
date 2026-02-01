"use client";

/**
 * Organization Filter Panel Component
 *
 * Collapsible filter panel for organization directory.
 * Supports search, multi-select filters for region, country, and status.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  X,
} from "lucide-react";
import type { OrganizationFilters, CountryOption } from "@/types/organization";
import type { AfricanRegion, MembershipStatus } from "@/types/prisma-enums";

// =============================================================================
// TYPES
// =============================================================================

interface OrganizationFilterPanelProps {
  filters: Partial<OrganizationFilters>;
  onChange: (filters: Partial<OrganizationFilters>) => void;
  onReset: () => void;
  countries: CountryOption[];
  isLoading?: boolean;
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const REGIONS: { value: AfricanRegion; label: { en: string; fr: string } }[] = [
  { value: "WACAF", label: { en: "WACAF - Western & Central Africa", fr: "WACAF - Afrique occidentale et centrale" } },
  { value: "ESAF", label: { en: "ESAF - Eastern & Southern Africa", fr: "ESAF - Afrique orientale et australe" } },
  { value: "NORTHERN", label: { en: "Northern Africa", fr: "Afrique du Nord" } },
];

const MEMBERSHIP_STATUSES: { value: MembershipStatus; label: { en: string; fr: string }; color: string }[] = [
  { value: "ACTIVE", label: { en: "Active", fr: "Actif" }, color: "bg-green-100 text-green-800" },
  { value: "PENDING", label: { en: "Pending", fr: "En attente" }, color: "bg-yellow-100 text-yellow-800" },
  { value: "SUSPENDED", label: { en: "Suspended", fr: "Suspendu" }, color: "bg-red-100 text-red-800" },
  { value: "INACTIVE", label: { en: "Inactive", fr: "Inactif" }, color: "bg-gray-100 text-gray-800" },
];

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Custom hook for debounced value
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function OrganizationFilterPanel({
  filters,
  onChange,
  onReset,
  countries,
  isLoading,
  className,
}: OrganizationFilterPanelProps) {
  const t = useTranslations("organizations");
  const locale = useLocale() as "en" | "fr";

  const [isOpen, setIsOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(true);
  const [countryOpen, setCountryOpen] = useState(true);
  const [statusOpen, setStatusOpen] = useState(true);
  const [searchInput, setSearchInput] = useState(filters.search || "");

  // Debounce search input
  const debouncedSearch = useDebounce(searchInput, 300);

  // Track if this is the initial mount to avoid calling onChange on first render
  const isInitialMount = useRef(true);
  const prevSearchRef = useRef(filters.search);

  // Update parent filters when debounced search changes
  // Only call onChange when the search value actually changes (not on parent re-renders)
  useEffect(() => {
    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Only call onChange if the debounced value actually differs from what parent has
    if (debouncedSearch !== prevSearchRef.current) {
      prevSearchRef.current = debouncedSearch;
      onChange({
        ...filters,
        search: debouncedSearch || undefined,
      });
    }
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate active filter count
  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.region?.length || 0) +
    (filters.country?.length || 0) +
    (filters.membershipStatus?.length || 0);

  const toggleRegion = useCallback(
    (region: AfricanRegion) => {
      const current = filters.region || [];
      const updated = current.includes(region)
        ? current.filter((r) => r !== region)
        : [...current, region];
      onChange({
        ...filters,
        region: updated.length > 0 ? updated : undefined,
      });
    },
    [filters, onChange]
  );

  const toggleCountry = useCallback(
    (country: string) => {
      const current = filters.country || [];
      const updated = current.includes(country)
        ? current.filter((c) => c !== country)
        : [...current, country];
      onChange({
        ...filters,
        country: updated.length > 0 ? updated : undefined,
      });
    },
    [filters, onChange]
  );

  const toggleStatus = useCallback(
    (status: MembershipStatus) => {
      const current = filters.membershipStatus || [];
      const updated = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status];
      onChange({
        ...filters,
        membershipStatus: updated.length > 0 ? updated : undefined,
      });
    },
    [filters, onChange]
  );

  const handleReset = useCallback(() => {
    setSearchInput("");
    onReset();
  }, [onReset]);

  const filterContent = (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("filters.search")}</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("filters.search")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            disabled={isLoading}
          />
          {searchInput && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
              onClick={() => setSearchInput("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Region Filter */}
      <Collapsible open={regionOpen} onOpenChange={setRegionOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <span className="font-medium">{t("filters.region")}</span>
            {regionOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-1.5">
          {REGIONS.map((region) => (
            <div key={region.value} className="flex items-center space-x-2">
              <Checkbox
                id={`region-${region.value}`}
                checked={filters.region?.includes(region.value)}
                onCheckedChange={() => toggleRegion(region.value)}
                disabled={isLoading}
              />
              <Label
                htmlFor={`region-${region.value}`}
                className="text-sm font-normal cursor-pointer flex-1"
              >
                {region.label[locale]}
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Country Filter */}
      <Collapsible open={countryOpen} onOpenChange={setCountryOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <span className="font-medium">{t("filters.country")}</span>
            {countryOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <ScrollArea className="h-[150px]">
            <div className="space-y-1.5 pr-4">
              {countries.length > 0 ? (
                countries.map((country) => (
                  <div key={country.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`country-${country.value}`}
                      checked={filters.country?.includes(country.value)}
                      onCheckedChange={() => toggleCountry(country.value)}
                      disabled={isLoading}
                    />
                    <Label
                      htmlFor={`country-${country.value}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {country.label}
                      <span className="text-muted-foreground ml-1">
                        ({country.count})
                      </span>
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  {t("filters.noCountries")}
                </p>
              )}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Membership Status Filter */}
      <Collapsible open={statusOpen} onOpenChange={setStatusOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <span className="font-medium">{t("filters.status")}</span>
            {statusOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-1.5">
          {MEMBERSHIP_STATUSES.map((status) => (
            <div key={status.value} className="flex items-center space-x-2">
              <Checkbox
                id={`status-${status.value}`}
                checked={filters.membershipStatus?.includes(status.value)}
                onCheckedChange={() => toggleStatus(status.value)}
                disabled={isLoading}
              />
              <Label
                htmlFor={`status-${status.value}`}
                className="text-sm font-normal cursor-pointer flex-1 flex items-center gap-2"
              >
                <Badge variant="outline" className={cn("text-xs", status.color)}>
                  {status.label[locale]}
                </Badge>
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className={cn("gap-2", className)}>
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">{t("filters.title")}</span>
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[320px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>{t("filters.title")}</SheetTitle>
          <SheetDescription>{t("filters.description")}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] mt-4 pr-4">
          {filterContent}
        </ScrollArea>

        <SheetFooter className="mt-4">
          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                handleReset();
                setIsOpen(false);
              }}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              {t("filters.reset")}
            </Button>
          )}
          <Button onClick={() => setIsOpen(false)} className="flex-1">
            {t("filters.apply")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default OrganizationFilterPanel;
