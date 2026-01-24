"use client";

/**
 * Reviewer Create Form Wrapper
 *
 * Client component that handles the reviewer creation logic
 * with tRPC mutation and navigation.
 */

import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader2, User, Building2, Briefcase } from "lucide-react";
import {
  CONTACT_METHOD_LABELS,
  REVIEWER_TYPE_LABELS,
  SELECTION_STATUS_LABELS,
  getSelectOptions,
} from "@/lib/reviewer/labels";

// =============================================================================
// FORM SCHEMA
// =============================================================================

const createReviewerFormSchema = z.object({
  // User selection
  userId: z.string().min(1, "Please select a user"),

  // Organization
  homeOrganizationId: z.string().min(1, "Please select an organization"),

  // Personal Information
  title: z.string().max(20, "Title too long").optional().nullable(),

  // Professional Information
  currentPosition: z
    .string()
    .min(2, "Position must be at least 2 characters")
    .max(100, "Position too long"),
  yearsOfExperience: z
    .number()
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .max(50, "Maximum 50 years"),

  // Biography
  biography: z.string().max(2000, "Biography too long").optional().nullable(),
  biographyFr: z.string().max(2000, "Biography too long").optional().nullable(),

  // Classification
  reviewerType: z.enum(["PEER_REVIEWER", "LEAD_REVIEWER", "SENIOR_REVIEWER", "OBSERVER"]),
  selectionStatus: z.enum(["NOMINATED", "UNDER_REVIEW", "SELECTED", "INACTIVE", "WITHDRAWN", "REJECTED"]),
  isLeadQualified: z.boolean(),

  // Contact
  preferredContactMethod: z.enum(["EMAIL", "PHONE", "WHATSAPP", "TEAMS"]),
  alternateEmail: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  alternatePhone: z.string().max(20, "Phone too long").optional().nullable().or(z.literal("")),
});

type CreateReviewerFormValues = z.infer<typeof createReviewerFormSchema>;

// =============================================================================
// TYPES
// =============================================================================

interface ReviewerCreateFormProps {
  locale: string;
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewerCreateForm({ locale }: ReviewerCreateFormProps) {
  const router = useRouter();
  const t = useTranslations("reviewer");
  const tCommon = useTranslations("common");
  const currentLocale = useLocale() as "en" | "fr";
  const utils = trpc.useUtils();

  // Fetch users without reviewer profiles
  const { data: availableUsers, isLoading: usersLoading } = trpc.reviewer.getUsersWithoutProfile.useQuery();

  // Fetch organizations for dropdown (dedicated endpoint, no pagination needed)
  const { data: organizations, isLoading: orgsLoading } = trpc.organization.listForDropdown.useQuery(
    undefined,
    { staleTime: 300000 }
  );

  const form = useForm<CreateReviewerFormValues>({
    resolver: zodResolver(createReviewerFormSchema),
    defaultValues: {
      userId: "",
      homeOrganizationId: "",
      title: "",
      currentPosition: "",
      yearsOfExperience: 0,
      biography: "",
      biographyFr: "",
      reviewerType: "PEER_REVIEWER",
      selectionStatus: "NOMINATED",
      isLeadQualified: false,
      preferredContactMethod: "EMAIL",
      alternateEmail: "",
      alternatePhone: "",
    },
  });

  const createMutation = trpc.reviewer.create.useMutation({
    onSuccess: (data) => {
      toast.success(t("messages.created"));
      // Invalidate reviewer list cache
      utils.reviewer.list.invalidate();
      utils.reviewer.getStats.invalidate();
      // Redirect to the new reviewer's detail page
      router.push(`/${locale}/reviewers/${data.id}`);
    },
    onError: (error) => {
      toast.error(t("messages.createError"), {
        description: error.message,
      });
    },
  });

  const contactMethodOptions = getSelectOptions(CONTACT_METHOD_LABELS, currentLocale);
  const reviewerTypeOptions = getSelectOptions(REVIEWER_TYPE_LABELS, currentLocale);
  const selectionStatusOptions = getSelectOptions(SELECTION_STATUS_LABELS, currentLocale);

  const handleSubmit = async (data: CreateReviewerFormValues) => {
    // Clean up empty strings to null
    const cleanedData = {
      userId: data.userId,
      homeOrganizationId: data.homeOrganizationId,
      title: data.title || null,
      currentPosition: data.currentPosition,
      yearsOfExperience: data.yearsOfExperience,
      biography: data.biography || null,
      biographyFr: data.biographyFr || null,
      reviewerType: data.reviewerType,
      selectionStatus: data.selectionStatus,
      isLeadQualified: data.isLeadQualified,
      preferredContactMethod: data.preferredContactMethod,
      alternateEmail: data.alternateEmail || null,
      alternatePhone: data.alternatePhone || null,
    };

    await createMutation.mutateAsync(cleanedData);
  };

  const handleCancel = () => {
    router.push(`/${locale}/reviewers`);
  };

  // Auto-select organization when user is selected
  const selectedUserId = useWatch({ control: form.control, name: "userId" });
  const selectedUser = availableUsers?.find((u) => u.id === selectedUserId);

  // When user changes, auto-fill organization if user has one
  const handleUserChange = (userId: string) => {
    form.setValue("userId", userId);
    const user = availableUsers?.find((u) => u.id === userId);
    if (user?.organizationId) {
      form.setValue("homeOrganizationId", user.organizationId);
    }
  };

  if (usersLoading || orgsLoading) {
    return <FormSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t("createTitle")}</h1>
          <p className="text-muted-foreground">{t("createDescription")}</p>
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* User Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                {t("form.userSelection")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.selectUser")} *</FormLabel>
                    <Select onValueChange={handleUserChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.selectUserPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <ScrollArea className="h-[200px]">
                          {availableUsers && availableUsers.length > 0 ? (
                            availableUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name || user.email}
                                {user.organization && ` (${user.organization.nameEn})`}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                              {t("form.noUsersAvailable")}
                            </div>
                          )}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                    <FormDescription>{t("form.selectUserDescription")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedUser && (
                <div className="rounded-lg bg-muted p-4 text-sm">
                  <p><strong>{t("form.selectedUserInfo")}:</strong></p>
                  <p>{t("form.email")}: {selectedUser.email}</p>
                  {selectedUser.organization && (
                    <p>{t("form.organization")}: {selectedUser.organization.nameEn}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Organization Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" />
                {t("form.organizationSection")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="homeOrganizationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.homeOrganization")} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.selectOrganization")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <ScrollArea className="h-[200px]">
                          {organizations?.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {currentLocale === "fr" ? org.nameFr : org.nameEn} ({org.organizationCode})
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                    <FormDescription>{t("form.homeOrganizationDescription")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="h-5 w-5" />
                {t("profile.professionalInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.title")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("form.titlePlaceholder")}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>{t("form.titleDescription")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentPosition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.position")} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t("form.positionPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="yearsOfExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.yearsExperience")} *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>{t("form.yearsExperienceDescription")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reviewerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.reviewerType")} *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {reviewerTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="selectionStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.selectionStatus")} *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectionStatusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("form.contactSection")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="preferredContactMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.preferredContact")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contactMethodOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="alternateEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.alternateEmail")}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t("form.alternateEmailPlaceholder")}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="alternatePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.alternatePhone")}</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder={t("form.alternatePhonePlaceholder")}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Biography */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("profile.biography")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="biography"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.biographyEn")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("form.biographyPlaceholder")}
                        className="min-h-[120px]"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>{t("form.biographyDescription")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="biographyFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.biographyFr")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("form.biographyPlaceholderFr")}
                        className="min-h-[120px]"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={createMutation.isPending}
            >
              {tCommon("actions.cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("profile.create")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
