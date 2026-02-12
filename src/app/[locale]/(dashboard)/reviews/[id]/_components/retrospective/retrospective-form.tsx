"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  BarChart3,
  Flag,
  Sparkles,
  Plus,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { StarRating } from "@/components/features/retrospective/star-rating";
import {
  SectionProgress,
  type SectionStatus,
} from "@/components/features/retrospective/section-progress";
import { LessonFormDialog } from "@/components/features/retrospective/lesson-form-dialog";
import { LessonCardMini } from "@/components/features/retrospective/lesson-card-mini";
import type { LessonType } from "@prisma/client";

// =============================================================================
// Schema
// =============================================================================

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

// =============================================================================
// Props
// =============================================================================

interface ExistingRetrospective extends FormData {
  id: string;
  status: string;
  taggedFindings?: Array<{
    id: string;
    findingId: string;
    lessonType: LessonType;
    notableReason: string | null;
    finding: {
      id: string;
      titleEn: string;
      titleFr: string;
      severity: string;
    };
  }>;
}

interface RetrospectiveFormProps {
  reviewId: string;
  existingData?: ExistingRetrospective | null;
  reviewFindings?: Array<{
    id: string;
    titleEn?: string | null;
    titleFr?: string | null;
    severity: string;
    status: string;
  }>;
}

// =============================================================================
// Lesson type options
// =============================================================================

const LESSON_TYPES: LessonType[] = [
  "BEST_PRACTICE_IDENTIFIED",
  "SYSTEMIC_ISSUE",
  "PROCESS_IMPROVEMENT",
  "TRAINING_GAP",
  "RESOURCE_CONSTRAINT",
];

// =============================================================================
// Component
// =============================================================================

export function RetrospectiveForm({
  reviewId,
  existingData,
  reviewFindings = [],
}: RetrospectiveFormProps) {
  const t = useTranslations("reviews.retrospective");
  const tTab = useTranslations("reviews.detail.retrospectiveTab");
  const utils = trpc.useUtils();

  // ---------------------------------------------------------------------------
  // Form setup
  // ---------------------------------------------------------------------------

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

  const processRating = useWatch({ control: form.control, name: "processRating" });
  const preparationEffective = useWatch({ control: form.control, name: "preparationEffective" });
  const onSiteEffective = useWatch({ control: form.control, name: "onSiteEffective" });
  const reportingEffective = useWatch({ control: form.control, name: "reportingEffective" });
  const whatWentWell = useWatch({ control: form.control, name: "whatWentWell" });
  const areasForImprovement = useWatch({ control: form.control, name: "areasForImprovement" });
  const keyLearnings = useWatch({ control: form.control, name: "keyLearnings" });
  const programmeSuggestions = useWatch({ control: form.control, name: "programmeSuggestions" });
  const teamSizeAdequate = useWatch({ control: form.control, name: "teamSizeAdequate" });
  const resourcesAdequate = useWatch({ control: form.control, name: "resourcesAdequate" });
  const communicationEffective = useWatch({ control: form.control, name: "communicationEffective" });
  const reviewDurationDays = useWatch({ control: form.control, name: "reviewDurationDays" });

  const isReadOnly =
    existingData?.status === "SUBMITTED" || existingData?.status === "PUBLISHED";

  // ---------------------------------------------------------------------------
  // Notable findings local state
  // ---------------------------------------------------------------------------

  const [taggedMap, setTaggedMap] = useState<
    Map<string, { tagId: string; lessonType: LessonType; notableReason: string }>
  >(() => {
    const m = new Map<string, { tagId: string; lessonType: LessonType; notableReason: string }>();
    if (existingData?.taggedFindings) {
      for (const tf of existingData.taggedFindings) {
        m.set(tf.findingId, {
          tagId: tf.id,
          lessonType: tf.lessonType,
          notableReason: tf.notableReason ?? "",
        });
      }
    }
    return m;
  });

  // ---------------------------------------------------------------------------
  // Submit confirmation dialog
  // ---------------------------------------------------------------------------

  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const upsertMutation = trpc.retrospective.upsert.useMutation({
    onSuccess: () => {
      toast.success(t("savedSuccessfully"));
      utils.retrospective.getByReview.invalidate({ reviewId });
    },
    onError: (error) => {
      toast.error(error.message);
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

  const tagFindingMutation = trpc.retrospective.tagFinding.useMutation({
    onSuccess: () => {
      utils.retrospective.getByReview.invalidate({ reviewId });
    },
  });

  const untagFindingMutation = trpc.retrospective.untagFinding.useMutation({
    onSuccess: () => {
      utils.retrospective.getByReview.invalidate({ reviewId });
    },
  });

  // ---------------------------------------------------------------------------
  // Extracted lessons query
  // ---------------------------------------------------------------------------

  const lessonsQuery = trpc.lessons.search.useQuery(
    { retrospectiveId: existingData?.id ?? "", pageSize: 50 },
    { enabled: !!existingData?.id }
  );

  const extractedLessons = lessonsQuery.data?.items ?? [];
  const [editingLesson, setEditingLesson] = useState<
    (typeof extractedLessons)[number] | null
  >(null);

  // ---------------------------------------------------------------------------
  // Auto-save (debounced 3 seconds)
  // ---------------------------------------------------------------------------

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");

  const triggerAutoSave = useCallback(() => {
    if (isReadOnly) return;

    const values = form.getValues();
    const serialized = JSON.stringify(values);

    // Don't save if nothing changed
    if (serialized === lastSavedRef.current) return;

    // Only auto-save if minimum fields are filled (processRating is always set)
    if (
      !values.whatWentWell ||
      values.whatWentWell.length < 10 ||
      !values.areasForImprovement ||
      values.areasForImprovement.length < 10 ||
      !values.keyLearnings ||
      values.keyLearnings.length < 10
    ) {
      return;
    }

    lastSavedRef.current = serialized;
    upsertMutation.mutate({ reviewId, ...values });
  }, [form, isReadOnly, reviewId, upsertMutation]);

  // Watch all form values for auto-save
  useEffect(() => {
    if (isReadOnly) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      triggerAutoSave();
    }, 3000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    processRating,
    preparationEffective,
    onSiteEffective,
    reportingEffective,
    whatWentWell,
    areasForImprovement,
    keyLearnings,
    programmeSuggestions,
    teamSizeAdequate,
    resourcesAdequate,
    communicationEffective,
    reviewDurationDays,
  ]);

  // ---------------------------------------------------------------------------
  // Section progress
  // ---------------------------------------------------------------------------

  const sections: SectionStatus[] = useMemo(
    () => [
      {
        id: "section-process",
        label: t("processRating.title"),
        completed: processRating >= 1,
      },
      {
        id: "section-well",
        label: t("whatWentWell.title"),
        completed: (whatWentWell?.length ?? 0) >= 10,
      },
      {
        id: "section-improve",
        label: t("areasForImprovement.title"),
        completed: (areasForImprovement?.length ?? 0) >= 10,
      },
      {
        id: "section-learnings",
        label: t("keyLearnings.title"),
        completed: (keyLearnings?.length ?? 0) >= 10,
      },
      {
        id: "section-extracted",
        label: t("extractedLessons.title"),
        completed: extractedLessons.length > 0,
      },
      {
        id: "section-suggestions",
        label: t("programmeSuggestions.title"),
        completed: (programmeSuggestions?.length ?? 0) > 0,
      },
      {
        id: "section-metrics",
        label: t("metrics.title"),
        completed: reviewDurationDays != null && reviewDurationDays > 0,
      },
      {
        id: "section-findings",
        label: t("notableFindings.title"),
        completed: taggedMap.size > 0,
      },
    ],
    [
      t,
      processRating,
      whatWentWell,
      areasForImprovement,
      keyLearnings,
      programmeSuggestions,
      reviewDurationDays,
      taggedMap.size,
      extractedLessons.length,
    ]
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const onSave = (data: FormData) => {
    upsertMutation.mutate({ reviewId, ...data });
  };

  const onSubmit = () => {
    if (existingData?.id) {
      submitMutation.mutate({ retrospectiveId: existingData.id });
      setShowSubmitDialog(false);
    }
  };

  const toggleFinding = (findingId: string) => {
    if (!existingData?.id || isReadOnly) return;

    const existing = taggedMap.get(findingId);
    if (existing) {
      // Untag
      untagFindingMutation.mutate({ id: existing.tagId });
      setTaggedMap((prev) => {
        const next = new Map(prev);
        next.delete(findingId);
        return next;
      });
    } else {
      // Tag with default type
      tagFindingMutation.mutate(
        {
          retrospectiveId: existingData.id,
          findingId,
          lessonType: "BEST_PRACTICE_IDENTIFIED",
        },
        {
          onSuccess: (result) => {
            setTaggedMap((prev) => {
              const next = new Map(prev);
              next.set(findingId, {
                tagId: result.id,
                lessonType: "BEST_PRACTICE_IDENTIFIED",
                notableReason: "",
              });
              return next;
            });
          },
        }
      );
    }
  };

  const updateFindingType = (findingId: string, lessonType: LessonType) => {
    const existing = taggedMap.get(findingId);
    if (!existing || !existingData?.id) return;

    // Untag and re-tag with new type
    untagFindingMutation.mutate({ id: existing.tagId });
    tagFindingMutation.mutate(
      {
        retrospectiveId: existingData.id,
        findingId,
        lessonType,
        notableReason: existing.notableReason || undefined,
      },
      {
        onSuccess: (result) => {
          setTaggedMap((prev) => {
            const next = new Map(prev);
            next.set(findingId, {
              ...existing,
              tagId: result.id,
              lessonType,
            });
            return next;
          });
        },
      }
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex gap-6">
      {/* Sidebar progress (desktop) */}
      <div className="w-44 shrink-0">
        <SectionProgress sections={sections} />
      </div>

      {/* Main form */}
      <form
        onSubmit={form.handleSubmit(onSave)}
        className="flex-1 min-w-0 space-y-6"
      >
        {/* Status badge bar */}
        {existingData && (
          <div className="flex items-center gap-3">
            <Badge
              variant={
                existingData.status === "PUBLISHED"
                  ? "default"
                  : existingData.status === "SUBMITTED"
                    ? "secondary"
                    : "outline"
              }
            >
              {existingData.status === "PUBLISHED"
                ? tTab("status.published")
                : existingData.status === "SUBMITTED"
                  ? tTab("status.submitted")
                  : tTab("status.draft")}
            </Badge>
            {upsertMutation.isPending && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("autoSaving")}
              </span>
            )}
            {!upsertMutation.isPending &&
              existingData.status === "DRAFT" &&
              lastSavedRef.current && (
                <span className="text-xs text-muted-foreground">
                  {t("autoSaved")}
                </span>
              )}
          </div>
        )}

        {/* ICAO/CANSO Alignment Notice */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>{t("alignmentNotice")}</AlertDescription>
        </Alert>

        {/* ================================================================= */}
        {/* Section 1: Process Effectiveness */}
        {/* ================================================================= */}
        <Card id="section-process">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {t("processRating.title")}
            </CardTitle>
            <CardDescription>{t("processRating.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="mb-2 block">{t("processRating.overallRating")}</Label>
              <StarRating
                value={processRating}
                onChange={(v) => form.setValue("processRating", v)}
                readOnly={isReadOnly}
                size="lg"
              />
              <p className="text-sm text-muted-foreground mt-2">
                1 = {t("processRating.scale.1")}, 5 = {t("processRating.scale.5")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm">{t("processRating.preparationEffective")}</Label>
                <Switch
                  checked={preparationEffective || false}
                  onCheckedChange={(v) => form.setValue("preparationEffective", v)}
                  disabled={isReadOnly}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm">{t("processRating.onSiteEffective")}</Label>
                <Switch
                  checked={onSiteEffective || false}
                  onCheckedChange={(v) => form.setValue("onSiteEffective", v)}
                  disabled={isReadOnly}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm">{t("processRating.reportingEffective")}</Label>
                <Switch
                  checked={reportingEffective || false}
                  onCheckedChange={(v) => form.setValue("reportingEffective", v)}
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ================================================================= */}
        {/* Section 2: What Went Well */}
        {/* ================================================================= */}
        <Card id="section-well">
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
              className="min-h-[120px] max-h-[480px]"
              rows={3}
              disabled={isReadOnly}
            />
            <div className="flex justify-between mt-1.5">
              {form.formState.errors.whatWentWell ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.whatWentWell.message}
                </p>
              ) : (
                <span />
              )}
              <CharCount value={whatWentWell} />
            </div>
          </CardContent>
        </Card>

        {/* ================================================================= */}
        {/* Section 3: Areas for Improvement */}
        {/* ================================================================= */}
        <Card id="section-improve">
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
              className="min-h-[120px] max-h-[480px]"
              rows={3}
              disabled={isReadOnly}
            />
            <div className="flex justify-between mt-1.5">
              {form.formState.errors.areasForImprovement ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.areasForImprovement.message}
                </p>
              ) : (
                <span />
              )}
              <CharCount value={areasForImprovement} />
            </div>
          </CardContent>
        </Card>

        {/* ================================================================= */}
        {/* Section 4: Key Learnings */}
        {/* ================================================================= */}
        <Card id="section-learnings">
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
              className="min-h-[120px] max-h-[480px]"
              rows={3}
              disabled={isReadOnly}
            />
            <div className="flex justify-between mt-1.5">
              {form.formState.errors.keyLearnings ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.keyLearnings.message}
                </p>
              ) : (
                <span />
              )}
              <CharCount value={keyLearnings} />
            </div>
          </CardContent>
        </Card>

        {/* ================================================================= */}
        {/* Section 4b: Extracted Lessons */}
        {/* ================================================================= */}
        <Card id="section-extracted">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-amber-600">
                  <Sparkles className="h-5 w-5" />
                  {t("extractedLessons.title")}
                  {extractedLessons.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {extractedLessons.length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>{t("extractedLessons.description")}</CardDescription>
              </div>
              {!isReadOnly && existingData?.id && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setEditingLesson(null);
                    setLessonDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  {t("extractedLessons.addNew")}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {extractedLessons.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("extractedLessons.empty")}
              </p>
            ) : (
              <div className="space-y-2">
                {extractedLessons.map((lesson) => (
                  <LessonCardMini
                    key={lesson.id}
                    lesson={lesson}
                    onEdit={() => {
                      setEditingLesson(lesson);
                      setLessonDialogOpen(true);
                    }}
                    onDelete={() => {
                      // Delete is handled by update to empty content — not in scope here
                      // The lesson can be edited and status managed via the form dialog
                    }}
                    readOnly={isReadOnly}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ================================================================= */}
        {/* Section 5: Programme Suggestions */}
        {/* ================================================================= */}
        <Card id="section-suggestions">
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
              className="min-h-[100px] max-h-[400px]"
              rows={3}
              disabled={isReadOnly}
            />
            <div className="flex justify-end mt-1.5">
              <CharCount value={programmeSuggestions} />
            </div>
          </CardContent>
        </Card>

        {/* ================================================================= */}
        {/* Section 6: Quantitative Metrics */}
        {/* ================================================================= */}
        <Card id="section-metrics">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t("metrics.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-xs">
              <Label>{t("metrics.reviewDuration")}</Label>
              <Input
                type="number"
                {...form.register("reviewDurationDays", { valueAsNumber: true })}
                placeholder="e.g., 5"
                disabled={isReadOnly}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm">{t("metrics.teamSizeAdequate")}</Label>
                <Switch
                  checked={teamSizeAdequate || false}
                  onCheckedChange={(v) => form.setValue("teamSizeAdequate", v)}
                  disabled={isReadOnly}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm">{t("metrics.resourcesAdequate")}</Label>
                <Switch
                  checked={resourcesAdequate || false}
                  onCheckedChange={(v) => form.setValue("resourcesAdequate", v)}
                  disabled={isReadOnly}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm">{t("metrics.communicationEffective")}</Label>
                <Switch
                  checked={communicationEffective || false}
                  onCheckedChange={(v) => form.setValue("communicationEffective", v)}
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ================================================================= */}
        {/* Section 7: Notable Findings */}
        {/* ================================================================= */}
        <Card id="section-findings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              {t("notableFindings.title")}
            </CardTitle>
            <CardDescription>{t("notableFindings.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {reviewFindings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                {t("notableFindings.noFindings")}
              </p>
            ) : (
              <div className="space-y-3">
                {reviewFindings.map((finding) => {
                  const tagged = taggedMap.get(finding.id);
                  const isTagged = !!tagged;

                  return (
                    <div
                      key={finding.id}
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isTagged}
                          onCheckedChange={() => toggleFinding(finding.id)}
                          disabled={isReadOnly || !existingData?.id}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {finding.titleEn || finding.id}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge
                              variant={
                                finding.severity === "CRITICAL"
                                  ? "destructive"
                                  : "outline"
                              }
                              className="text-[10px]"
                            >
                              {finding.severity}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {finding.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tagged finding details */}
                      {isTagged && tagged && (
                        <div className="pl-8 space-y-2">
                          <div>
                            <Label className="text-xs">
                              {t("notableFindings.lessonType")}
                            </Label>
                            <Select
                              value={tagged.lessonType}
                              onValueChange={(v) =>
                                updateFindingType(finding.id, v as LessonType)
                              }
                              disabled={isReadOnly}
                            >
                              <SelectTrigger className="h-8 text-xs mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LESSON_TYPES.map((lt) => (
                                  <SelectItem key={lt} value={lt} className="text-xs">
                                    {t(`notableFindings.types.${lt}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ================================================================= */}
        {/* Read-only status notice */}
        {/* ================================================================= */}
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

        {/* ================================================================= */}
        {/* Actions */}
        {/* ================================================================= */}
        {!isReadOnly && (
          <div className="flex justify-end gap-3 pb-4">
            <Button
              type="submit"
              variant="outline"
              disabled={upsertMutation.isPending}
            >
              {upsertMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Save className="h-4 w-4 mr-2" />
              {t("saveDraft")}
            </Button>
            {existingData?.id && existingData.status === "DRAFT" && (
              <Button
                type="button"
                onClick={() => setShowSubmitDialog(true)}
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

        {/* Submit confirmation dialog */}
        <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("submitConfirm.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("submitConfirm.description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("submitConfirm.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={onSubmit}>
                {t("submitConfirm.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Lesson form dialog */}
        {existingData?.id && (
          <LessonFormDialog
            open={lessonDialogOpen}
            onOpenChange={setLessonDialogOpen}
            retrospectiveId={existingData.id}
            reviewId={reviewId}
            initialContent={editingLesson ? undefined : keyLearnings}
            existingLesson={
              editingLesson
                ? {
                    id: editingLesson.id,
                    titleEn: editingLesson.titleEn,
                    titleFr: editingLesson.titleFr,
                    contentEn: editingLesson.contentEn,
                    contentFr: editingLesson.contentFr,
                    category: editingLesson.category,
                    impactLevel: editingLesson.impactLevel,
                    applicability: editingLesson.applicability,
                    reviewPhase: editingLesson.reviewPhase,
                    auditAreaCode: editingLesson.auditAreaCode,
                    soeAreaCode: editingLesson.soeAreaCode,
                    actionableAdvice: editingLesson.actionableAdvice,
                    estimatedTimeImpact: editingLesson.estimatedTimeImpact,
                    isAnonymized: editingLesson.isAnonymized,
                    tags: editingLesson.tags,
                  }
                : undefined
            }
            onSaved={() => {
              lessonsQuery.refetch();
              setEditingLesson(null);
            }}
          />
        )}
      </form>
    </div>
  );
}

// =============================================================================
// Character count helper
// =============================================================================

function CharCount({ value }: { value?: string }) {
  const len = value?.length ?? 0;
  return (
    <span className="text-[11px] text-muted-foreground tabular-nums">
      {len}
    </span>
  );
}
