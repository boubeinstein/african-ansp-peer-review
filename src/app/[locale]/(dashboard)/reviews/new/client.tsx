"use client";

/**
 * New Review Client Component
 *
 * Form for coordinators and admins to schedule a new peer review.
 * Allows selecting host organization, assessments, and review configuration.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Icons
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarIcon,
  FileText,
  Globe,
  Info,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";

// Permissions
import { isOversightRole } from "@/lib/permissions";
import { UserRole } from "@/types/prisma-enums";
import type { ANSReviewArea } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

interface NewReviewClientProps {
  userId: string;
  locale: string;
  userRole: string;
  userOrgId: string | null | undefined;
}

// Form schema - hostOrganizationId is optional (auto-set for ANSP roles)
const newReviewSchema = z.object({
  hostOrganizationId: z.string().optional(),
  assessmentIds: z
    .array(z.string())
    .min(1, "Please select at least one assessment"),
  reviewType: z.enum(["FULL", "FOCUSED", "FOLLOW_UP", "SURVEILLANCE"]),
  focusAreas: z.array(z.string()).optional(),
  requestedStartDate: z.date().optional(),
  requestedEndDate: z.date().optional(),
  locationType: z.enum(["ON_SITE", "REMOTE", "HYBRID"]),
  languagePreference: z.enum(["EN", "FR", "BOTH"]),
  accommodationProvided: z.boolean().default(false),
  transportationProvided: z.boolean().default(false),
  primaryContactName: z.string().min(1, "Primary contact name is required"),
  primaryContactEmail: z
    .string()
    .email("Please enter a valid email address")
    .min(1, "Primary contact email is required"),
  primaryContactPhone: z.string().optional(),
  specialRequirements: z.string().optional(),
});

type NewReviewFormValues = z.infer<typeof newReviewSchema>;

// Focus area constants
const ANS_FOCUS_AREAS = ["ATS", "AIM", "MET", "CNS", "SAR"] as const;

// =============================================================================
// COMPONENT
// =============================================================================

export function NewReviewClient({
  locale,
  userRole,
  userOrgId,
}: NewReviewClientProps) {
  const t = useTranslations("review.new");
  const tCommon = useTranslations("common");
  const router = useRouter();

  // Determine if user is oversight role or ANSP role
  const isOversight = isOversightRole(userRole as UserRole);

  // For ANSP roles, use their own org; for oversight, they must select
  const [selectedOrgId, setSelectedOrgId] = useState<string>(
    isOversight ? "" : (userOrgId ?? "")
  );

  // Fetch organizations (only needed for oversight roles)
  const { data: organizations, isLoading: orgsLoading } =
    trpc.organization.getAll.useQuery(
      { activeOnly: true },
      { enabled: isOversight }
    );

  // Fetch user's organization (for ANSP roles display)
  const { data: userOrganization } = trpc.organization.getById.useQuery(
    { id: userOrgId! },
    { enabled: !isOversight && !!userOrgId }
  );

  // Filter out user's own org from dropdown for oversight roles
  const eligibleOrganizations = organizations?.filter((org: { id: string }) => {
    if (isOversight && org.id === userOrgId) {
      return false; // Exclude PC's own org
    }
    return true;
  });

  // Fetch assessments for selected organization
  const { data: assessments, isLoading: assessmentsLoading } =
    trpc.assessment.listByOrganization.useQuery(
      { organizationId: selectedOrgId, status: "SUBMITTED" },
      { enabled: !!selectedOrgId }
    );

  // Create mutation
  const createReview = trpc.review.create.useMutation({
    onSuccess: (data) => {
      toast.success(t("success"));
      router.push(`/${locale}/reviews/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || t("error"));
    },
  });

  // Form setup
  const form = useForm<NewReviewFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(newReviewSchema) as any,
    defaultValues: {
      // For ANSP roles, pre-fill with their org; for oversight, leave empty
      hostOrganizationId: isOversight ? "" : (userOrgId ?? ""),
      assessmentIds: [],
      reviewType: "FULL",
      focusAreas: [],
      locationType: "ON_SITE",
      languagePreference: "BOTH",
      accommodationProvided: false,
      transportationProvided: false,
      primaryContactName: "",
      primaryContactEmail: "",
      primaryContactPhone: "",
      specialRequirements: "",
    },
  });

  // Handle organization change
  const handleOrganizationChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    form.setValue("hostOrganizationId", orgId);
    form.setValue("assessmentIds", []); // Reset assessments when org changes

    // Try to set contact info from organization
    const org = organizations?.find((o: { id: string }) => o.id === orgId);
    if (org) {
      // We'd need to fetch org contact info - for now just leave blank
    }
  };

  // Submit handler
  const onSubmit = (values: NewReviewFormValues) => {
    createReview.mutate({
      ...values,
      focusAreas: values.focusAreas as ANSReviewArea[] | undefined,
      requestedStartDate: values.requestedStartDate,
      requestedEndDate: values.requestedEndDate,
    });
  };

  // Loading state (only for oversight roles who need org list)
  if (isOversight && orgsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${locale}/reviews`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tCommon("back")}
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Host Organization Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t("sections.organization")}
              </CardTitle>
              <CardDescription>
                {isOversight
                  ? t("sections.organizationDescOversight")
                  : t("sections.organizationDescAnsp")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isOversight ? (
                /* Programme Coordinator view - select target ANSP */
                <FormField
                  control={form.control}
                  name="hostOrganizationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.selectTargetAnsp")} *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={handleOrganizationChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("fields.selectOrganization")}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {eligibleOrganizations?.map((org: { id: string; nameEn: string; nameFr: string; organizationCode: string | null }) => (
                            <SelectItem key={org.id} value={org.id}>
                              {locale === "fr" && org.nameFr
                                ? org.nameFr
                                : org.nameEn}
                              {org.organizationCode && (
                                <span className="text-muted-foreground ml-2">
                                  ({org.organizationCode})
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {t("fields.selectTargetAnspHelp")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                /* ANSP Admin view - show own org info and request message */
                <>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {t("fields.requestingForYourOrg")}
                    </AlertDescription>
                  </Alert>
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground mb-1">
                      {t("fields.organization")}
                    </p>
                    <p className="font-medium">
                      {userOrganization
                        ? locale === "fr" && userOrganization.nameFr
                          ? userOrganization.nameFr
                          : userOrganization.nameEn
                        : t("fields.loadingOrg")}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("fields.requestWillBeReviewed")}
                  </p>
                </>
              )}

              {/* Assessments Selection */}
              {selectedOrgId && (
                <FormField
                  control={form.control}
                  name="assessmentIds"
                  render={() => (
                    <FormItem>
                      <FormLabel>{t("fields.assessments")}</FormLabel>
                      <FormDescription>
                        {t("fields.assessmentsDesc")}
                      </FormDescription>
                      {assessmentsLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                        </div>
                      ) : assessments && assessments.length > 0 ? (
                        <div className="space-y-2 mt-2">
                          {assessments.map((assessment: { id: string; questionnaire?: { titleFr: string | null; titleEn: string | null } | null; submittedAt?: Date | string | null; eiScore?: number | null }) => (
                            <FormField
                              key={assessment.id}
                              control={form.control}
                              name="assessmentIds"
                              render={({ field }) => (
                                <FormItem
                                  key={assessment.id}
                                  className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(
                                        assessment.id
                                      )}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        if (checked) {
                                          field.onChange([
                                            ...current,
                                            assessment.id,
                                          ]);
                                        } else {
                                          field.onChange(
                                            current.filter(
                                              (id) => id !== assessment.id
                                            )
                                          );
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <span className="font-medium">
                                      {locale === "fr"
                                        ? assessment.questionnaire?.titleFr
                                        : assessment.questionnaire?.titleEn}
                                    </span>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <FileText className="h-3 w-3" />
                                      <span>
                                        {t("fields.submittedOn")}{" "}
                                        {assessment.submittedAt
                                          ? format(
                                              new Date(assessment.submittedAt),
                                              "PP"
                                            )
                                          : "-"}
                                      </span>
                                      {assessment.eiScore != null && (
                                        <Badge variant="secondary">
                                          EI: {assessment.eiScore.toFixed(1)}%
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      ) : (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {t("fields.noAssessments")}
                          </AlertDescription>
                        </Alert>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Review Type Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t("sections.reviewType")}
              </CardTitle>
              <CardDescription>{t("sections.reviewTypeDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="reviewType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.type")}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="grid grid-cols-2 gap-4"
                      >
                        {(
                          ["FULL", "FOCUSED", "FOLLOW_UP", "SURVEILLANCE"] as const
                        ).map((type) => (
                          <div
                            key={type}
                            className={cn(
                              "flex items-center space-x-2 rounded-md border p-4 cursor-pointer hover:bg-muted/50",
                              field.value === type && "border-primary bg-muted/50"
                            )}
                            onClick={() => field.onChange(type)}
                          >
                            <RadioGroupItem value={type} id={type} />
                            <label
                              htmlFor={type}
                              className="flex-1 cursor-pointer"
                            >
                              <span className="font-medium">
                                {t(`reviewTypes.${type}`)}
                              </span>
                              <p className="text-sm text-muted-foreground">
                                {t(`reviewTypes.${type}Desc`)}
                              </p>
                            </label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Focus Areas (for FOCUSED reviews) */}
              {/* eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form watch() is not memoizable */}
              {form.watch("reviewType") === "FOCUSED" && (
                <FormField
                  control={form.control}
                  name="focusAreas"
                  render={() => (
                    <FormItem>
                      <FormLabel>{t("fields.focusAreas")}</FormLabel>
                      <FormDescription>
                        {t("fields.focusAreasDesc")}
                      </FormDescription>
                      <div className="grid grid-cols-5 gap-2 mt-2">
                        {ANS_FOCUS_AREAS.map((area) => (
                          <FormField
                            key={area}
                            control={form.control}
                            name="focusAreas"
                            render={({ field }) => (
                              <FormItem
                                key={area}
                                className="flex flex-row items-center space-x-2 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(area)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, area]);
                                      } else {
                                        field.onChange(
                                          current.filter((a) => a !== area)
                                        );
                                      }
                                    }}
                                  />
                                </FormControl>
                                <label className="text-sm font-medium">
                                  {area}
                                </label>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Schedule Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {t("sections.schedule")}
              </CardTitle>
              <CardDescription>{t("sections.scheduleDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="requestedStartDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t("fields.startDate")}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{t("fields.selectDate")}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requestedEndDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t("fields.endDate")}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{t("fields.selectDate")}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => {
                              const startDate = form.getValues("requestedStartDate");
                              return date < (startDate || new Date());
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Logistics Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t("sections.logistics")}
              </CardTitle>
              <CardDescription>{t("sections.logisticsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="locationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.locationType")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ON_SITE">
                            {t("locationTypes.ON_SITE")}
                          </SelectItem>
                          <SelectItem value="REMOTE">
                            {t("locationTypes.REMOTE")}
                          </SelectItem>
                          <SelectItem value="HYBRID">
                            {t("locationTypes.HYBRID")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="languagePreference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.languagePreference")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EN">{t("languages.EN")}</SelectItem>
                          <SelectItem value="FR">{t("languages.FR")}</SelectItem>
                          <SelectItem value="BOTH">
                            {t("languages.BOTH")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="accommodationProvided"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t("fields.accommodationProvided")}</FormLabel>
                        <FormDescription>
                          {t("fields.accommodationDesc")}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transportationProvided"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t("fields.transportationProvided")}</FormLabel>
                        <FormDescription>
                          {t("fields.transportationDesc")}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t("sections.contact")}
              </CardTitle>
              <CardDescription>{t("sections.contactDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="primaryContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.contactName")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          className="pl-9"
                          placeholder={t("fields.contactNamePlaceholder")}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="primaryContactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.contactEmail")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="email"
                            className="pl-9"
                            placeholder={t("fields.contactEmailPlaceholder")}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primaryContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("fields.contactPhone")}{" "}
                        <span className="text-muted-foreground">
                          ({tCommon("optional")})
                        </span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            className="pl-9"
                            placeholder={t("fields.contactPhonePlaceholder")}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="specialRequirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("fields.specialRequirements")}{" "}
                      <span className="text-muted-foreground">
                        ({tCommon("optional")})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t("fields.specialRequirementsPlaceholder")}
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("fields.specialRequirementsDesc")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${locale}/reviews`)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createReview.isPending || (isOversight && !selectedOrgId)}
            >
              {createReview.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t("submit")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default NewReviewClient;
