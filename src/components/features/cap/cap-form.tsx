"use client";

/**
 * CAP (Corrective Action Plan) Form Component
 *
 * A comprehensive form for creating and editing Corrective Action Plans.
 * Supports bilingual content (EN/FR), assignment, and due date management.
 */

import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CalendarIcon,
  Info,
  Loader2,
  Save,
  Send,
  AlertTriangle,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { AutoTranslateButton } from "@/components/features/translation/auto-translate-button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Form Schema
const capFormSchema = z.object({
  rootCauseEn: z.string().min(10, "Root cause analysis must be at least 10 characters"),
  rootCauseFr: z.string().min(10, "L'analyse des causes doit comporter au moins 10 caractères"),
  correctiveActionEn: z.string().min(10, "Corrective action must be at least 10 characters"),
  correctiveActionFr: z.string().min(10, "L'action corrective doit comporter au moins 10 caractères"),
  preventiveActionEn: z.string().optional(),
  preventiveActionFr: z.string().optional(),
  dueDate: z.date({ message: "Due date is required" }),
});

type CAPFormValues = z.infer<typeof capFormSchema>;

interface Finding {
  id: string;
  referenceNumber: string;
  titleEn: string;
  titleFr: string;
  severity: string;
  findingType: string;
  organizationId: string;
  organization?: {
    id: string;
    nameEn: string;
    nameFr: string;
  };
}

interface CAP {
  id: string;
  rootCauseEn: string;
  rootCauseFr: string;
  correctiveActionEn: string;
  correctiveActionFr: string;
  preventiveActionEn?: string | null;
  preventiveActionFr?: string | null;
  assignedToId?: string | null;
  dueDate: Date | string;
  status: string;
}

interface CAPFormProps {
  findingId: string;
  finding?: Finding;
  cap?: CAP;
  onSuccess?: (cap: CAP) => void;
  onCancel?: () => void;
}

export function CAPForm({
  findingId,
  finding,
  cap,
  onSuccess,
  onCancel,
}: CAPFormProps) {
  const t = useTranslations("cap");
  const tCommon = useTranslations("common");
  const tFinding = useTranslations("findings");
  const locale = useLocale();
  const router = useRouter();

  const isEditMode = !!cap;

  // Default due date: 30 days from now for critical, 60 for major, 90 for minor
  const getDefaultDueDate = () => {
    if (cap?.dueDate) return new Date(cap.dueDate);
    const days = finding?.severity === "CRITICAL" ? 30 : finding?.severity === "MAJOR" ? 60 : 90;
    return addDays(new Date(), days);
  };

  // Form setup
  const form = useForm<CAPFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(capFormSchema) as any,
    defaultValues: {
      rootCauseEn: cap?.rootCauseEn || "",
      rootCauseFr: cap?.rootCauseFr || "",
      correctiveActionEn: cap?.correctiveActionEn || "",
      correctiveActionFr: cap?.correctiveActionFr || "",
      preventiveActionEn: cap?.preventiveActionEn || "",
      preventiveActionFr: cap?.preventiveActionFr || "",
      dueDate: getDefaultDueDate(),
    },
  });

  // Get finding details if not provided
  const { data: findingData } = trpc.finding.getById.useQuery(
    { id: findingId },
    { enabled: !finding && !!findingId }
  );

  const currentFinding = finding || findingData;

  // Create mutation
  const createMutation = trpc.cap.create.useMutation({
    onSuccess: (data) => {
      toast.success(t("success.created"));
      if (onSuccess) {
        onSuccess(data as unknown as CAP);
      } else {
        router.push(`/${locale}/findings/${findingId}`);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Update mutation
  const updateMutation = trpc.cap.update.useMutation({
    onSuccess: (data) => {
      toast.success(t("success.updated"));
      if (onSuccess) {
        onSuccess(data as unknown as CAP);
      } else {
        router.push(`/${locale}/findings/${findingId}`);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Form submission
  const onSubmit = (data: CAPFormValues) => {
    const cleanedData = {
      ...data,
      preventiveActionEn: data.preventiveActionEn || undefined,
      preventiveActionFr: data.preventiveActionFr || undefined,
    };

    if (isEditMode && cap) {
      updateMutation.mutate({
        id: cap.id,
        ...cleanedData,
      });
    } else {
      createMutation.mutate({
        findingId,
        ...cleanedData,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const findingTitle = locale === "fr" ? currentFinding?.titleFr : currentFinding?.titleEn;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Finding Context */}
        {currentFinding && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p>
                  <span className="font-medium">{t("detail.finding")}:</span>{" "}
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {currentFinding.referenceNumber}
                  </code>
                </p>
                <p className="text-sm">{findingTitle}</p>
                <div className="flex gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      currentFinding.severity === "CRITICAL" && "bg-red-100 text-red-800 border-red-200",
                      currentFinding.severity === "MAJOR" && "bg-orange-100 text-orange-800 border-orange-200",
                      currentFinding.severity === "MINOR" && "bg-yellow-100 text-yellow-800 border-yellow-200"
                    )}
                  >
                    {tFinding(`severity.${currentFinding.severity}`)}
                  </Badge>
                  <Badge variant="outline">
                    {tFinding(`type.${currentFinding.findingType}`)}
                  </Badge>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Root Cause Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>{t("form.rootCause")}</CardTitle>
            <CardDescription>{t("form.rootCauseDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="rootCauseEn"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>
                        {t("form.rootCauseEn")} *
                        <Badge variant="outline" className="ml-2">EN</Badge>
                      </FormLabel>
                      {/* eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form watch() is not memoizable */}
                      {form.watch("rootCauseFr") && (
                        <AutoTranslateButton
                          sourceText={form.watch("rootCauseFr")}
                          targetValue={field.value}
                          targetLanguage="en"
                          onTranslate={(text) => form.setValue("rootCauseEn", text)}
                          fieldName={t("form.rootCauseEn")}
                          size="sm"
                        />
                      )}
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder={t("form.rootCausePlaceholder")}
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rootCauseFr"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>
                        {t("form.rootCauseFr")} *
                        <Badge variant="outline" className="ml-2">FR</Badge>
                      </FormLabel>
                      {form.watch("rootCauseEn") && (
                        <AutoTranslateButton
                          sourceText={form.watch("rootCauseEn")}
                          targetValue={field.value}
                          targetLanguage="fr"
                          onTranslate={(text) => form.setValue("rootCauseFr", text)}
                          fieldName={t("form.rootCauseFr")}
                          size="sm"
                        />
                      )}
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder={t("form.rootCausePlaceholder")}
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Corrective Action */}
        <Card>
          <CardHeader>
            <CardTitle>{t("form.correctiveAction")}</CardTitle>
            <CardDescription>{t("form.correctiveActionDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="correctiveActionEn"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>
                        {t("form.correctiveActionEn")} *
                        <Badge variant="outline" className="ml-2">EN</Badge>
                      </FormLabel>
                      {form.watch("correctiveActionFr") && (
                        <AutoTranslateButton
                          sourceText={form.watch("correctiveActionFr")}
                          targetValue={field.value}
                          targetLanguage="en"
                          onTranslate={(text) => form.setValue("correctiveActionEn", text)}
                          fieldName={t("form.correctiveActionEn")}
                          size="sm"
                        />
                      )}
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder={t("form.correctiveActionPlaceholder")}
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="correctiveActionFr"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>
                        {t("form.correctiveActionFr")} *
                        <Badge variant="outline" className="ml-2">FR</Badge>
                      </FormLabel>
                      {form.watch("correctiveActionEn") && (
                        <AutoTranslateButton
                          sourceText={form.watch("correctiveActionEn")}
                          targetValue={field.value}
                          targetLanguage="fr"
                          onTranslate={(text) => form.setValue("correctiveActionFr", text)}
                          fieldName={t("form.correctiveActionFr")}
                          size="sm"
                        />
                      )}
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder={t("form.correctiveActionPlaceholder")}
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preventive Action (Optional) */}
        <Card>
          <CardHeader>
            <CardTitle>{t("form.preventiveAction")}</CardTitle>
            <CardDescription>{t("form.preventiveActionDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="preventiveActionEn"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>
                        {t("form.preventiveActionEn")}
                        <Badge variant="outline" className="ml-2">EN</Badge>
                      </FormLabel>
                      {form.watch("preventiveActionFr") && (
                        <AutoTranslateButton
                          sourceText={form.watch("preventiveActionFr") || ""}
                          targetValue={field.value}
                          targetLanguage="en"
                          onTranslate={(text) => form.setValue("preventiveActionEn", text)}
                          fieldName={t("form.preventiveActionEn")}
                          size="sm"
                        />
                      )}
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder={t("form.preventiveActionPlaceholder")}
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t("form.optional")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preventiveActionFr"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>
                        {t("form.preventiveActionFr")}
                        <Badge variant="outline" className="ml-2">FR</Badge>
                      </FormLabel>
                      {form.watch("preventiveActionEn") && (
                        <AutoTranslateButton
                          sourceText={form.watch("preventiveActionEn") || ""}
                          targetValue={field.value}
                          targetLanguage="fr"
                          onTranslate={(text) => form.setValue("preventiveActionFr", text)}
                          fieldName={t("form.preventiveActionFr")}
                          size="sm"
                        />
                      )}
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder={t("form.preventiveActionPlaceholder")}
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t("form.optional")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Due Date */}
        <Card>
          <CardHeader>
            <CardTitle>{t("form.schedule")}</CardTitle>
            <CardDescription>{t("form.scheduleDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-sm">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("detail.dueDate")} *</FormLabel>
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
                              <span>{t("form.selectDueDate")}</span>
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
                    <FormDescription>
                      {t("form.dueDateSuggestion")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Due date warning for critical findings */}
            {currentFinding?.severity === "CRITICAL" && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t("form.criticalDueDateWarning")}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel || (() => router.back())}
          >
            {tCommon("cancel")}
          </Button>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditMode ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t("actions.save")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t("create")}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
