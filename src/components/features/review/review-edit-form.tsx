"use client";

/**
 * Review Edit Form Component
 *
 * Allows editing key fields of a peer review request:
 * - Schedule (requested dates)
 * - Logistics (location type, accommodation, transportation, language)
 * - Contact information
 * - Special requirements
 */

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc/client";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

// Icons
import {
  AlertCircle,
  ArrowLeft,
  Calendar as CalendarIcon,
  Loader2,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface ReviewEditFormProps {
  reviewId: string;
  locale: string;
}

// =============================================================================
// SCHEMA
// =============================================================================

const editFormSchema = z.object({
  requestedStartDate: z.date().optional(),
  requestedEndDate: z.date().optional(),
  locationType: z.enum(["ON_SITE", "HYBRID", "REMOTE"]),
  accommodationProvided: z.boolean(),
  transportationProvided: z.boolean(),
  languagePreference: z.enum(["EN", "FR", "BOTH"]),
  primaryContactName: z.string().min(1, "Contact name is required"),
  primaryContactEmail: z.string().email("Invalid email address"),
  primaryContactPhone: z.string().optional(),
  specialRequirements: z.string().optional(),
});

type EditFormValues = z.infer<typeof editFormSchema>;

// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewEditForm({ reviewId, locale }: ReviewEditFormProps) {
  const t = useTranslations("review.edit");
  const router = useRouter();

  // Fetch review data
  const {
    data: review,
    isLoading,
    error,
  } = trpc.review.getById.useQuery({ id: reviewId });

  // Update mutation
  const updateMutation = trpc.review.update.useMutation({
    onSuccess: () => {
      toast.success(t("success.title"), {
        description: t("success.description"),
      });
      router.push(`/${locale}/reviews/${reviewId}`);
    },
    onError: (error) => {
      toast.error(t("error.title"), {
        description: error.message,
      });
    },
  });

  // Form setup
  const form = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      requestedStartDate: undefined,
      requestedEndDate: undefined,
      locationType: "ON_SITE",
      accommodationProvided: false,
      transportationProvided: false,
      languagePreference: "BOTH",
      primaryContactName: "",
      primaryContactEmail: "",
      primaryContactPhone: "",
      specialRequirements: "",
    },
    values: review
      ? {
          requestedStartDate: review.requestedStartDate
            ? new Date(review.requestedStartDate)
            : undefined,
          requestedEndDate: review.requestedEndDate
            ? new Date(review.requestedEndDate)
            : undefined,
          locationType: review.locationType as "ON_SITE" | "HYBRID" | "REMOTE",
          accommodationProvided: review.accommodationProvided,
          transportationProvided: review.transportationProvided,
          languagePreference: review.languagePreference as "EN" | "FR" | "BOTH",
          primaryContactName: review.primaryContactName || "",
          primaryContactEmail: review.primaryContactEmail || "",
          primaryContactPhone: review.primaryContactPhone || "",
          specialRequirements: review.specialRequirements || "",
        }
      : undefined,
  });

  // Submit handler
  const onSubmit = (values: EditFormValues) => {
    updateMutation.mutate({
      id: reviewId,
      ...values,
    });
  };

  // Loading state
  if (isLoading) {
    return <EditFormSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href={`/${locale}/reviews/${reviewId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToDetail")}
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error.loadTitle")}</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Not found or not editable
  if (!review) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href={`/${locale}/reviews`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToReviews")}
          </Link>
        </Button>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error.notFound")}</AlertTitle>
          <AlertDescription>{t("error.notFoundDescription")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if review can be edited
  if (review.status !== "REQUESTED") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href={`/${locale}/reviews/${reviewId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToDetail")}
          </Link>
        </Button>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error.notEditable")}</AlertTitle>
          <AlertDescription>{t("error.notEditableDescription")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" className="mb-4" asChild>
          <Link href={`/${locale}/reviews/${reviewId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToDetail")}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("subtitle", { reference: review.referenceNumber })}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>{t("schedule.title")}</CardTitle>
              <CardDescription>{t("schedule.description")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="requestedStartDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("schedule.startDate")}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>{t("schedule.selectDate")}</span>
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
                    <FormLabel>{t("schedule.endDate")}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>{t("schedule.selectDate")}</span>
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
                            return startDate ? date < startDate : date < new Date();
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Logistics */}
          <Card>
            <CardHeader>
              <CardTitle>{t("logistics.title")}</CardTitle>
              <CardDescription>{t("logistics.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="locationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("logistics.locationType")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ON_SITE">{t("logistics.onSite")}</SelectItem>
                        <SelectItem value="HYBRID">{t("logistics.hybrid")}</SelectItem>
                        <SelectItem value="REMOTE">{t("logistics.remote")}</SelectItem>
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
                    <FormLabel>{t("logistics.language")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EN">{t("logistics.english")}</SelectItem>
                        <SelectItem value="FR">{t("logistics.french")}</SelectItem>
                        <SelectItem value="BOTH">{t("logistics.both")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-4 sm:flex-row">
                <FormField
                  control={form.control}
                  name="accommodationProvided"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t("logistics.accommodation")}</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transportationProvided"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t("logistics.transportation")}</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t("contact.title")}</CardTitle>
              <CardDescription>{t("contact.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="primaryContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contact.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <FormLabel>{t("contact.email")}</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
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
                      <FormLabel>{t("contact.phone")}</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Special Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>{t("requirements.title")}</CardTitle>
              <CardDescription>{t("requirements.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="specialRequirements"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder={t("requirements.placeholder")}
                      />
                    </FormControl>
                    <FormDescription>{t("requirements.help")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href={`/${locale}/reviews/${reviewId}`}>
                {t("actions.cancel")}
              </Link>
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("actions.saving")}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("actions.save")}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

function EditFormSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
