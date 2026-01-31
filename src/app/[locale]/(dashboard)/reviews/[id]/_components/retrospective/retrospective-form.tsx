"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Save,
  Send,
  Info,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

const formSchema = z.object({
  processRating: z.number().min(1).max(5),
  preparationEffective: z.boolean().optional(),
  onSiteEffective: z.boolean().optional(),
  reportingEffective: z.boolean().optional(),
  whatWentWell: z.string().min(10, "Please provide at least 10 characters"),
  areasForImprovement: z.string().min(10, "Please provide at least 10 characters"),
  keyLearnings: z.string().min(10, "Please provide at least 10 characters"),
  programmeSuggestions: z.string().optional(),
  reviewDurationDays: z.number().optional(),
  teamSizeAdequate: z.boolean().optional(),
  resourcesAdequate: z.boolean().optional(),
  communicationEffective: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ExistingRetrospective extends FormData {
  id: string;
  status: string;
}

interface RetrospectiveFormProps {
  reviewId: string;
  existingData?: ExistingRetrospective | null;
}

export function RetrospectiveForm({ reviewId, existingData }: RetrospectiveFormProps) {
  const t = useTranslations("reviews.retrospective");
  const [isSaving, setIsSaving] = useState(false);
  const utils = trpc.useUtils();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: existingData || {
      processRating: 3,
      whatWentWell: "",
      areasForImprovement: "",
      keyLearnings: "",
      programmeSuggestions: "",
    },
  });

  const upsertMutation = trpc.retrospective.upsert.useMutation({
    onSuccess: () => {
      toast.success(t("savedSuccessfully"));
      setIsSaving(false);
      utils.retrospective.getByReview.invalidate({ reviewId });
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSaving(false);
    },
  });

  const submitMutation = trpc.retrospective.submit.useMutation({
    onSuccess: () => {
      toast.success(t("submittedSuccessfully"));
      utils.retrospective.getByReview.invalidate({ reviewId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSave = (data: FormData) => {
    setIsSaving(true);
    upsertMutation.mutate({ reviewId, ...data });
  };

  const onSubmit = () => {
    if (existingData?.id) {
      submitMutation.mutate({ retrospectiveId: existingData.id });
    }
  };

  const isReadOnly =
    existingData?.status === "SUBMITTED" || existingData?.status === "PUBLISHED";

  return (
    <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
      {/* ICAO/CANSO Alignment Notice */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>{t("alignmentNotice")}</AlertDescription>
      </Alert>

      {/* Section 1: Overall Process Rating */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {t("processRating.title")}
          </CardTitle>
          <CardDescription>{t("processRating.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t("processRating.overallRating")}</Label>
            <RadioGroup
              value={String(form.watch("processRating"))}
              onValueChange={(v) => form.setValue("processRating", parseInt(v))}
              className="flex gap-4 mt-2"
              disabled={isReadOnly}
            >
              {[1, 2, 3, 4, 5].map((rating) => (
                <div key={rating} className="flex items-center gap-2">
                  <RadioGroupItem value={String(rating)} id={`rating-${rating}`} />
                  <Label htmlFor={`rating-${rating}`}>{rating}</Label>
                </div>
              ))}
            </RadioGroup>
            <p className="text-sm text-muted-foreground mt-1">
              1 = {t("processRating.scale.1")}, 5 = {t("processRating.scale.5")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label>{t("processRating.preparationEffective")}</Label>
              <Switch
                checked={form.watch("preparationEffective") || false}
                onCheckedChange={(v) => form.setValue("preparationEffective", v)}
                disabled={isReadOnly}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("processRating.onSiteEffective")}</Label>
              <Switch
                checked={form.watch("onSiteEffective") || false}
                onCheckedChange={(v) => form.setValue("onSiteEffective", v)}
                disabled={isReadOnly}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("processRating.reportingEffective")}</Label>
              <Switch
                checked={form.watch("reportingEffective") || false}
                onCheckedChange={(v) => form.setValue("reportingEffective", v)}
                disabled={isReadOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: What Went Well */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            {t("whatWentWell.title")}
          </CardTitle>
          <CardDescription>{t("whatWentWell.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            {...form.register("whatWentWell")}
            placeholder={t("whatWentWell.placeholder")}
            className="min-h-[120px]"
            disabled={isReadOnly}
          />
          {form.formState.errors.whatWentWell && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.whatWentWell.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Areas for Improvement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <TrendingUp className="h-5 w-5" />
            {t("areasForImprovement.title")}
          </CardTitle>
          <CardDescription>{t("areasForImprovement.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            {...form.register("areasForImprovement")}
            placeholder={t("areasForImprovement.placeholder")}
            className="min-h-[120px]"
            disabled={isReadOnly}
          />
          {form.formState.errors.areasForImprovement && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.areasForImprovement.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Key Learnings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-600">
            <Lightbulb className="h-5 w-5" />
            {t("keyLearnings.title")}
          </CardTitle>
          <CardDescription>{t("keyLearnings.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            {...form.register("keyLearnings")}
            placeholder={t("keyLearnings.placeholder")}
            className="min-h-[120px]"
            disabled={isReadOnly}
          />
          {form.formState.errors.keyLearnings && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.keyLearnings.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Programme Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t("programmeSuggestions.title")}
          </CardTitle>
          <CardDescription>{t("programmeSuggestions.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            {...form.register("programmeSuggestions")}
            placeholder={t("programmeSuggestions.placeholder")}
            className="min-h-[100px]"
            disabled={isReadOnly}
          />
        </CardContent>
      </Card>

      {/* Section 6: Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>{t("metrics.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t("metrics.reviewDuration")}</Label>
              <Input
                type="number"
                {...form.register("reviewDurationDays", { valueAsNumber: true })}
                placeholder="e.g., 5"
                disabled={isReadOnly}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label>{t("metrics.teamSizeAdequate")}</Label>
              <Switch
                checked={form.watch("teamSizeAdequate") || false}
                onCheckedChange={(v) => form.setValue("teamSizeAdequate", v)}
                disabled={isReadOnly}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("metrics.resourcesAdequate")}</Label>
              <Switch
                checked={form.watch("resourcesAdequate") || false}
                onCheckedChange={(v) => form.setValue("resourcesAdequate", v)}
                disabled={isReadOnly}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("metrics.communicationEffective")}</Label>
              <Switch
                checked={form.watch("communicationEffective") || false}
                onCheckedChange={(v) => form.setValue("communicationEffective", v)}
                disabled={isReadOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            variant="outline"
            disabled={isSaving || upsertMutation.isPending}
          >
            {(isSaving || upsertMutation.isPending) && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            <Save className="h-4 w-4 mr-2" />
            {t("saveDraft")}
          </Button>
          {existingData?.id && existingData.status === "DRAFT" && (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Send className="h-4 w-4 mr-2" />
              {t("submit")}
            </Button>
          )}
        </div>
      )}

      {/* Read-only status notice */}
      {isReadOnly && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {existingData?.status === "SUBMITTED"
              ? t("statusSubmitted")
              : t("statusPublished")}
          </AlertDescription>
        </Alert>
      )}
    </form>
  );
}
