"use client";

/**
 * Reviewer Profile Form Component
 *
 * Form for creating and editing reviewer profiles with
 * validation using react-hook-form and Zod.
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Briefcase } from "lucide-react";
import {
  CONTACT_METHOD_LABELS,
  getSelectOptions,
} from "@/lib/reviewer/labels";

// =============================================================================
// FORM SCHEMA
// =============================================================================

const reviewerProfileFormSchema = z.object({
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

  // Contact
  preferredContactMethod: z.enum(["EMAIL", "PHONE", "WHATSAPP", "TEAMS"]),
  alternateEmail: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  alternatePhone: z.string().max(20, "Phone too long").optional().nullable().or(z.literal("")),
});

type ReviewerProfileFormValues = z.infer<typeof reviewerProfileFormSchema>;

// =============================================================================
// TYPES
// =============================================================================

interface ReviewerProfileFormProps {
  initialData?: Partial<ReviewerProfileFormValues>;
  onSubmit: (data: ReviewerProfileFormValues) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isCreate?: boolean;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewerProfileForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  isCreate = false,
  className,
}: ReviewerProfileFormProps) {
  const t = useTranslations("reviewer");
  const tCommon = useTranslations("common");
  const locale = useLocale() as "en" | "fr";

  const form = useForm<ReviewerProfileFormValues>({
    resolver: zodResolver(reviewerProfileFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      currentPosition: initialData?.currentPosition || "",
      yearsOfExperience: initialData?.yearsOfExperience || 0,
      biography: initialData?.biography || "",
      biographyFr: initialData?.biographyFr || "",
      preferredContactMethod: initialData?.preferredContactMethod || "EMAIL",
      alternateEmail: initialData?.alternateEmail || "",
      alternatePhone: initialData?.alternatePhone || "",
    },
  });

  const contactMethodOptions = getSelectOptions(CONTACT_METHOD_LABELS, locale);

  async function handleSubmit(data: ReviewerProfileFormValues) {
    // Clean up empty strings to null
    const cleanedData = {
      ...data,
      title: data.title || null,
      biography: data.biography || null,
      biographyFr: data.biographyFr || null,
      alternateEmail: data.alternateEmail || null,
      alternatePhone: data.alternatePhone || null,
    };
    await onSubmit(cleanedData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={cn("space-y-6", className)}>
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              {t("profile.personalInfo")}
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

            <FormField
              control={form.control}
              name="preferredContactMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.preferredContact")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("form.selectContactMethod")} />
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
              name="currentPosition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.position")} *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("form.positionPlaceholder")}
                      {...field}
                    />
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
                  <FormDescription>
                    {t("form.biographyDescription")}
                  </FormDescription>
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
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            {tCommon("actions.cancel")}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isCreate ? t("profile.create") : tCommon("actions.save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default ReviewerProfileForm;
