"use client";

/**
 * Organization Form Component
 *
 * Form for creating and editing organizations with
 * validation using react-hook-form and Zod.
 */

import { useMemo, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2,
  Check,
  Loader2,
  MapPin,
} from "lucide-react";
import { getSortedCountries } from "@/lib/constants/african-countries";
import type { OrganizationWithCounts } from "@/types/organization";

// =============================================================================
// FORM SCHEMA
// =============================================================================

const organizationFormSchema = z.object({
  // Names
  nameEn: z
    .string()
    .min(2, "English name must be at least 2 characters")
    .max(200, "English name must be less than 200 characters"),
  nameFr: z
    .string()
    .min(2, "French name must be at least 2 characters")
    .max(200, "French name must be less than 200 characters"),

  // ICAO Code
  organizationCode: z
    .string()
    .length(4, "ICAO code must be exactly 4 characters")
    .regex(/^[A-Z]{4}$/, "ICAO code must be 4 uppercase letters"),

  // Location
  country: z.string().min(1, "Please select a country"),
  city: z.string().min(2, "City is required").max(100, "City must be less than 100 characters"),
  region: z.enum(["WACAF", "ESAF", "NORTHERN"]),

  // Status
  membershipStatus: z.enum(["ACTIVE", "PENDING", "SUSPENDED", "INACTIVE"]),
});

export type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

// =============================================================================
// TYPES
// =============================================================================

interface OrganizationFormProps {
  organization?: OrganizationWithCounts;
  onSubmit: (data: OrganizationFormValues) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const REGION_OPTIONS = [
  { value: "WACAF", labelEn: "Western & Central Africa (WACAF)", labelFr: "Afrique occidentale et centrale (WACAF)" },
  { value: "ESAF", labelEn: "Eastern & Southern Africa (ESAF)", labelFr: "Afrique orientale et australe (ESAF)" },
  { value: "NORTHERN", labelEn: "Northern Africa", labelFr: "Afrique du Nord" },
] as const;

const STATUS_OPTIONS = [
  { value: "ACTIVE", labelEn: "Active", labelFr: "Actif" },
  { value: "PENDING", labelEn: "Pending", labelFr: "En attente" },
  { value: "SUSPENDED", labelEn: "Suspended", labelFr: "Suspendu" },
  { value: "INACTIVE", labelEn: "Inactive", labelFr: "Inactif" },
] as const;

// =============================================================================
// COMPONENT
// =============================================================================

export function OrganizationForm({
  organization,
  onSubmit,
  onCancel,
  isLoading = false,
  className,
}: OrganizationFormProps) {
  const t = useTranslations("organizations");
  const tCommon = useTranslations("common");
  const locale = useLocale() as "en" | "fr";

  const isEdit = !!organization;
  const sortedCountries = getSortedCountries(locale);

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      nameEn: organization?.nameEn || "",
      nameFr: organization?.nameFr || "",
      organizationCode: organization?.organizationCode || "",
      country: organization?.country || "",
      city: organization?.city || "",
      region: organization?.region || "WACAF",
      membershipStatus: organization?.membershipStatus || "PENDING",
    },
  });

  const organizationCodeValue = useWatch({ control: form.control, name: "organizationCode" });

  // Check ICAO code availability
  const { data: icaoCheck, isFetching: icaoChecking } = trpc.organization.checkIcaoCode.useQuery(
    {
      organizationCode: organizationCodeValue?.toUpperCase() || "",
      excludeId: organization?.id,
    },
    {
      enabled: organizationCodeValue?.length === 4 && /^[A-Za-z]{4}$/.test(organizationCodeValue),
    }
  );

  // Derive ICAO code error from query result
  const organizationCodeError = useMemo(() => {
    if (icaoCheck && !icaoCheck.available) {
      return t("form.organizationCodeTaken", { name: icaoCheck.existingOrganization?.name || "" });
    }
    return null;
  }, [icaoCheck, t]);

  // Handle ICAO code input - auto uppercase
  const handleIcaoCodeChange = useCallback((value: string) => {
    const upperValue = value.toUpperCase().slice(0, 4);
    form.setValue("organizationCode", upperValue, { shouldValidate: true });
  }, [form]);

  async function handleSubmit(data: OrganizationFormValues) {
    // Check if ICAO code is taken
    if (organizationCodeError) {
      return;
    }

    const cleanedData = {
      ...data,
      organizationCode: data.organizationCode.toUpperCase(),
    };

    await onSubmit(cleanedData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={cn("space-y-6", className)}>
        {/* Names Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              {t("form.sections.basicInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.nameEn")} *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("form.nameEnPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nameFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.nameFr")} *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("form.nameFrPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="organizationCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.organizationCode")} *</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        placeholder={t("form.organizationCodePlaceholder")}
                        className="uppercase font-mono"
                        maxLength={4}
                        {...field}
                        onChange={(e) => handleIcaoCodeChange(e.target.value)}
                      />
                    </FormControl>
                    {icaoChecking && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {!icaoChecking && organizationCodeValue?.length === 4 && icaoCheck?.available && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Check className="h-4 w-4 text-green-500" />
                      </div>
                    )}
                  </div>
                  <FormDescription>{t("form.organizationCodeDescription")}</FormDescription>
                  {organizationCodeError && (
                    <p className="text-sm font-medium text-destructive">{organizationCodeError}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Location Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5" />
              {t("form.sections.location")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.country")} *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.selectCountry")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <ScrollArea className="h-[300px]">
                          {sortedCountries.map((country) => (
                            <SelectItem key={country.code} value={country.nameEn}>
                              {locale === "fr" ? country.nameFr : country.nameEn}
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.city")} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t("form.cityPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.region")} *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("form.selectRegion")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REGION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {locale === "fr" ? option.labelFr : option.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Status Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("form.sections.status")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="membershipStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.membershipStatus")} *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("form.selectStatus")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {locale === "fr" ? option.labelFr : option.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t("form.membershipStatusDescription")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            {tCommon("actions.cancel")}
          </Button>
          <Button type="submit" disabled={isLoading || !!organizationCodeError}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? tCommon("actions.save") : t("form.createOrganization")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default OrganizationForm;
