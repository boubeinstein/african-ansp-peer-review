"use client";

import { useCallback, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, X, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AutoTranslateButton } from "@/components/features/translation/auto-translate-button";
import {
  getAuditAreasArray,
  getStudyAreasArray,
} from "@/lib/questionnaire/constants";
import type {
  LessonCategory,
  ImpactLevel,
  LessonApplicability,
  ReviewPhase,
} from "@prisma/client";

// =============================================================================
// Constants
// =============================================================================

const CATEGORIES: Array<{ value: LessonCategory; labelEn: string; labelFr: string }> = [
  { value: "PROCESS_IMPROVEMENT", labelEn: "Process Improvement", labelFr: "Amélioration des processus" },
  { value: "TECHNICAL_FINDING", labelEn: "Technical/Regulatory", labelFr: "Technique/Réglementaire" },
  { value: "LOGISTICS_PLANNING", labelEn: "Logistics & Planning", labelFr: "Logistique et planification" },
  { value: "CULTURAL_COMMUNICATION", labelEn: "Cultural/Communication", labelFr: "Culture/Communication" },
  { value: "DOCUMENTATION_REVIEW", labelEn: "Documentation Review", labelFr: "Revue documentaire" },
  { value: "INTERVIEW_TECHNIQUE", labelEn: "Interview Technique", labelFr: "Technique d'entretien" },
  { value: "HOST_ENGAGEMENT", labelEn: "Host Engagement", labelFr: "Engagement de l'hôte" },
  { value: "TOOL_METHODOLOGY", labelEn: "Tools & Methodology", labelFr: "Outils et méthodologie" },
];

const IMPACT_LEVELS: Array<{ value: ImpactLevel; color: string }> = [
  { value: "LOW", color: "bg-green-100 text-green-700 border-green-300" },
  { value: "MODERATE", color: "bg-amber-100 text-amber-700 border-amber-300" },
  { value: "HIGH", color: "bg-orange-100 text-orange-700 border-orange-300" },
  { value: "CRITICAL", color: "bg-red-100 text-red-700 border-red-300" },
];

const APPLICABILITIES: Array<{ value: LessonApplicability }> = [
  { value: "SPECIFIC_ANSP" },
  { value: "REGIONAL" },
  { value: "GENERAL" },
  { value: "MATURITY_LEVEL" },
];

const REVIEW_PHASES: ReviewPhase[] = [
  "PLANNING",
  "PREPARATION",
  "ON_SITE",
  "REPORTING",
  "FOLLOW_UP",
];

// =============================================================================
// Props
// =============================================================================

interface LessonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  retrospectiveId: string;
  reviewId: string;
  initialContent?: string;
  existingLesson?: {
    id: string;
    titleEn: string;
    titleFr: string;
    contentEn: string;
    contentFr: string;
    category: LessonCategory;
    impactLevel: ImpactLevel;
    applicability: LessonApplicability;
    reviewPhase?: ReviewPhase | null;
    auditAreaCode?: string | null;
    soeAreaCode?: string | null;
    actionableAdvice?: string | null;
    estimatedTimeImpact?: string | null;
    isAnonymized: boolean;
    tags?: Array<{ tag: string }>;
  };
  onSaved?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function LessonFormDialog(props: LessonFormDialogProps) {
  const {
    open,
    onOpenChange,
    retrospectiveId,
    initialContent,
    existingLesson,
    onSaved,
  } = props;
  const t = useTranslations("reviews.retrospective.lessonForm");
  const locale = useLocale();
  const isEditing = !!existingLesson;

  // ---------------------------------------------------------------------------
  // Form state
  // ---------------------------------------------------------------------------

  const [titleEn, setTitleEn] = useState(existingLesson?.titleEn ?? "");
  const [titleFr, setTitleFr] = useState(existingLesson?.titleFr ?? "");
  const [contentEn, setContentEn] = useState(
    existingLesson?.contentEn ?? initialContent ?? ""
  );
  const [contentFr, setContentFr] = useState(existingLesson?.contentFr ?? "");
  const [category, setCategory] = useState<LessonCategory>(
    existingLesson?.category ?? "PROCESS_IMPROVEMENT"
  );
  const [impactLevel, setImpactLevel] = useState<ImpactLevel>(
    existingLesson?.impactLevel ?? "MODERATE"
  );
  const [applicability, setApplicability] = useState<LessonApplicability>(
    existingLesson?.applicability ?? "GENERAL"
  );
  const [reviewPhase, setReviewPhase] = useState<ReviewPhase | "">(
    existingLesson?.reviewPhase ?? ""
  );
  const [auditAreaCode, setAuditAreaCode] = useState(
    existingLesson?.auditAreaCode ?? ""
  );
  const [soeAreaCode, setSoeAreaCode] = useState(
    existingLesson?.soeAreaCode ?? ""
  );
  const [actionableAdvice, setActionableAdvice] = useState(
    existingLesson?.actionableAdvice ?? ""
  );
  const [estimatedTimeImpact, setEstimatedTimeImpact] = useState(
    existingLesson?.estimatedTimeImpact ?? ""
  );
  const [isAnonymized, setIsAnonymized] = useState(
    existingLesson?.isAnonymized ?? false
  );
  const [tags, setTags] = useState<string[]>(
    existingLesson?.tags?.map((t) => t.tag) ?? []
  );
  const [tagInput, setTagInput] = useState("");
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // ---------------------------------------------------------------------------
  // Dirty check
  // ---------------------------------------------------------------------------

  const isDirty =
    titleEn !== (existingLesson?.titleEn ?? "") ||
    titleFr !== (existingLesson?.titleFr ?? "") ||
    contentEn !== (existingLesson?.contentEn ?? initialContent ?? "") ||
    contentFr !== (existingLesson?.contentFr ?? "");

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const createMutation = trpc.lessons.create.useMutation({
    onSuccess: () => {
      toast.success(t("savedSuccessfully"));
      onSaved?.();
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.lessons.update.useMutation({
    onSuccess: () => {
      toast.success(t("savedSuccessfully"));
      onSaved?.();
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  const isValid =
    titleEn.length >= 5 &&
    titleFr.length >= 5 &&
    contentEn.length >= 20 &&
    contentFr.length >= 20;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSave = useCallback(() => {
    const payload = {
      titleEn,
      titleFr,
      contentEn,
      contentFr,
      category,
      impactLevel,
      applicability,
      reviewPhase: reviewPhase || undefined,
      auditAreaCode: auditAreaCode || undefined,
      soeAreaCode: soeAreaCode || undefined,
      actionableAdvice: actionableAdvice || undefined,
      estimatedTimeImpact: estimatedTimeImpact || undefined,
      isAnonymized,
      tags: tags.length > 0 ? tags : undefined,
    };

    if (isEditing && existingLesson) {
      updateMutation.mutate({ id: existingLesson.id, ...payload });
    } else {
      createMutation.mutate({ retrospectiveId, ...payload });
    }
  }, [
    titleEn, titleFr, contentEn, contentFr, category, impactLevel,
    applicability, reviewPhase, auditAreaCode, soeAreaCode,
    actionableAdvice, estimatedTimeImpact, isAnonymized, tags,
    isEditing, existingLesson, retrospectiveId, createMutation, updateMutation,
  ]);

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags((prev) => [...prev, trimmed]);
      setTagInput("");
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag]
  );

  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      onOpenChange(false);
    }
  }, [isDirty, onOpenChange]);

  // ---------------------------------------------------------------------------
  // Data for selects
  // ---------------------------------------------------------------------------

  const auditAreas = getAuditAreasArray();
  const studyAreas = getStudyAreasArray();
  const isFr = locale === "fr";

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t("editTitle") : t("title")}
            </DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* ----------------------------------------------------------- */}
            {/* Title (bilingual) */}
            {/* ----------------------------------------------------------- */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>
                    {t("titleEn")} <span className="text-red-500">*</span>
                  </Label>
                  {titleEn && (
                    <AutoTranslateButton
                      sourceText={titleEn}
                      targetValue={titleFr}
                      targetLanguage="fr"
                      onTranslate={setTitleFr}
                      size="sm"
                    />
                  )}
                </div>
                <Input
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder={t("titleEnPlaceholder")}
                  maxLength={200}
                />
                <span className="text-[11px] text-muted-foreground">
                  {titleEn.length}/200
                </span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>
                    {t("titleFr")} <span className="text-red-500">*</span>
                  </Label>
                  {titleFr && (
                    <AutoTranslateButton
                      sourceText={titleFr}
                      targetValue={titleEn}
                      targetLanguage="en"
                      onTranslate={setTitleEn}
                      size="sm"
                    />
                  )}
                </div>
                <Input
                  value={titleFr}
                  onChange={(e) => setTitleFr(e.target.value)}
                  placeholder={t("titleFrPlaceholder")}
                  maxLength={200}
                />
              </div>
            </div>

            {/* ----------------------------------------------------------- */}
            {/* Content (bilingual) */}
            {/* ----------------------------------------------------------- */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>
                    {t("contentEn")} <span className="text-red-500">*</span>
                  </Label>
                  {contentEn && (
                    <AutoTranslateButton
                      sourceText={contentEn}
                      targetValue={contentFr}
                      targetLanguage="fr"
                      onTranslate={setContentFr}
                      size="sm"
                    />
                  )}
                </div>
                <Textarea
                  value={contentEn}
                  onChange={(e) => setContentEn(e.target.value)}
                  placeholder={t("contentEnPlaceholder")}
                  rows={5}
                  className="min-h-[120px]"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>
                    {t("contentFr")} <span className="text-red-500">*</span>
                  </Label>
                  {contentFr && (
                    <AutoTranslateButton
                      sourceText={contentFr}
                      targetValue={contentEn}
                      targetLanguage="en"
                      onTranslate={setContentEn}
                      size="sm"
                    />
                  )}
                </div>
                <Textarea
                  value={contentFr}
                  onChange={(e) => setContentFr(e.target.value)}
                  placeholder={t("contentFrPlaceholder")}
                  rows={5}
                  className="min-h-[120px]"
                />
              </div>
            </div>

            {/* ----------------------------------------------------------- */}
            {/* Classification row */}
            {/* ----------------------------------------------------------- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <Label className="mb-1 block">{t("category")}</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as LessonCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {isFr ? c.labelFr : c.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Impact Level */}
              <div>
                <Label className="mb-2 block">{t("impactLevel")}</Label>
                <div className="flex gap-2 flex-wrap">
                  {IMPACT_LEVELS.map((il) => (
                    <button
                      key={il.value}
                      type="button"
                      onClick={() => setImpactLevel(il.value)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md border transition-colors",
                        impactLevel === il.value
                          ? il.color
                          : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                      )}
                    >
                      {t(`impact.${il.value}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ----------------------------------------------------------- */}
            {/* Applicability */}
            {/* ----------------------------------------------------------- */}
            <div>
              <Label className="mb-2 block">{t("applicability")}</Label>
              <div className="flex gap-2 flex-wrap">
                {APPLICABILITIES.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setApplicability(a.value)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md border transition-colors",
                      applicability === a.value
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                    )}
                  >
                    {t(`applicabilityValues.${a.value}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* ----------------------------------------------------------- */}
            {/* Context selects row */}
            {/* ----------------------------------------------------------- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Review Phase */}
              <div>
                <Label className="mb-1 block">{t("reviewPhase")}</Label>
                <Select
                  value={reviewPhase}
                  onValueChange={(v) => setReviewPhase(v as ReviewPhase | "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("optional")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("none")}</SelectItem>
                    {REVIEW_PHASES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {t(`phases.${p}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Audit Area */}
              <div>
                <Label className="mb-1 block">{t("auditArea")}</Label>
                <Select
                  value={auditAreaCode}
                  onValueChange={setAuditAreaCode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("optional")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("none")}</SelectItem>
                    {auditAreas.map((area) => (
                      <SelectItem key={area.code} value={area.code}>
                        {area.code} — {isFr ? area.name.fr : area.name.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* SoE Area */}
              <div>
                <Label className="mb-1 block">{t("soeArea")}</Label>
                <Select
                  value={soeAreaCode}
                  onValueChange={setSoeAreaCode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("optional")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("none")}</SelectItem>
                    {studyAreas.map((area) => (
                      <SelectItem key={area.code} value={area.code}>
                        {area.code.replace(/_/g, ".")} — {isFr ? area.name.fr : area.name.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ----------------------------------------------------------- */}
            {/* Actionable advice + time impact */}
            {/* ----------------------------------------------------------- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block">{t("actionableAdvice")}</Label>
                <Input
                  value={actionableAdvice}
                  onChange={(e) => setActionableAdvice(e.target.value)}
                  placeholder={t("actionableAdvicePlaceholder")}
                />
              </div>
              <div>
                <Label className="mb-1 block">{t("estimatedTimeImpact")}</Label>
                <Input
                  value={estimatedTimeImpact}
                  onChange={(e) => setEstimatedTimeImpact(e.target.value)}
                  placeholder={t("estimatedTimeImpactPlaceholder")}
                />
              </div>
            </div>

            {/* ----------------------------------------------------------- */}
            {/* Tags */}
            {/* ----------------------------------------------------------- */}
            <div>
              <Label className="mb-1 block">
                {t("tags")} ({tags.length}/10)
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={t("tagsPlaceholder")}
                  className="flex-1"
                  maxLength={50}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || tags.length >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* ----------------------------------------------------------- */}
            {/* Anonymize */}
            {/* ----------------------------------------------------------- */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="anonymize"
                checked={isAnonymized}
                onCheckedChange={(v) => setIsAnonymized(v === true)}
              />
              <Label htmlFor="anonymize" className="text-sm">
                {t("anonymize")}
              </Label>
            </div>
          </div>

          {/* ============================================================= */}
          {/* Actions */}
          {/* ============================================================= */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isSaving}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!isValid || isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {t("saveDraft")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discard confirmation */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("discardTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("discardDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("keepEditing")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDiscardDialog(false);
                onOpenChange(false);
              }}
            >
              {t("discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
