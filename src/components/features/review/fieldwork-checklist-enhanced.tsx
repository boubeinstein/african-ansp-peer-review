"use client";

/**
 * Enhanced Fieldwork Checklist Component
 *
 * Advanced checklist with validation status indicators, override workflow,
 * and document upload integration. Supports pre-visit, on-site, and post-visit phases.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  FileText,
  Upload,
  ShieldAlert,
  Loader2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { FieldworkPhase } from "@prisma/client";

interface FieldworkChecklistEnhancedProps {
  reviewId: string;
  locale: string;
  canEdit: boolean;
  canOverride: boolean;
  onDocumentUploadClick?: (category: string) => void;
}

interface ValidationResult {
  isValid: boolean;
  canComplete: boolean;
  reason?: string;
  reasonFr?: string;
  details?: {
    required: number;
    current: number;
    missing?: string[];
  };
}

interface ChecklistItem {
  id: string;
  phase: FieldworkPhase;
  itemCode: string;
  sortOrder: number;
  labelEn: string;
  labelFr: string;
  isCompleted: boolean;
  completedAt: Date | null;
  completedBy: { id: string; firstName: string; lastName: string } | null;
  isOverridden: boolean;
  overrideReason: string | null;
  overriddenBy: { id: string; firstName: string; lastName: string } | null;
  overriddenAt: Date | null;
  validationRules: Record<string, unknown> | null;
  validation: ValidationResult;
}

const PHASE_CONFIG: Record<
  FieldworkPhase,
  { labelEn: string; labelFr: string; color: string; icon: string }
> = {
  PRE_VISIT: {
    labelEn: "Pre-Visit Preparation",
    labelFr: "Preparation pre-visite",
    color: "bg-blue-500",
    icon: "📋",
  },
  ON_SITE: {
    labelEn: "On-Site Activities",
    labelFr: "Activites sur site",
    color: "bg-amber-500",
    icon: "🏢",
  },
  POST_VISIT: {
    labelEn: "Post-Visit Activities",
    labelFr: "Activites post-visite",
    color: "bg-green-500",
    icon: "📝",
  },
};

export function FieldworkChecklistEnhanced({
  reviewId,
  locale,
  canEdit,
  canOverride,
  onDocumentUploadClick,
}: FieldworkChecklistEnhancedProps) {
  const utils = trpc.useUtils();
  const isEnglish = locale === "en";

  // State
  const [expandedPhases, setExpandedPhases] = useState<Set<FieldworkPhase>>(
    new Set(["PRE_VISIT", "ON_SITE", "POST_VISIT"])
  );
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  // Queries
  const {
    data: checklistItems,
    isLoading,
    error,
  } = trpc.checklist.getByReviewId.useQuery(
    { reviewId },
    { enabled: !!reviewId }
  );

  const { data: completionStatus } = trpc.checklist.getCompletionStatus.useQuery(
    { reviewId },
    { enabled: !!reviewId }
  );

  // Mutations
  const toggleItem = trpc.checklist.toggleItem.useMutation({
    onSuccess: () => {
      utils.checklist.getByReviewId.invalidate({ reviewId });
      utils.checklist.getCompletionStatus.invalidate({ reviewId });
      toast.success(isEnglish ? "Item updated" : "Element mis a jour");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const overrideItemMutation = trpc.checklist.overrideItem.useMutation({
    onSuccess: () => {
      utils.checklist.getByReviewId.invalidate({ reviewId });
      utils.checklist.getCompletionStatus.invalidate({ reviewId });
      setOverrideDialogOpen(false);
      setOverrideReason("");
      setSelectedItem(null);
      toast.success(isEnglish ? "Item overridden" : "Element remplace");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeOverride = trpc.checklist.removeOverride.useMutation({
    onSuccess: () => {
      utils.checklist.getByReviewId.invalidate({ reviewId });
      utils.checklist.getCompletionStatus.invalidate({ reviewId });
      toast.success(isEnglish ? "Override removed" : "Remplacement supprime");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const completeFieldwork = trpc.checklist.completeFieldwork.useMutation({
    onSuccess: () => {
      toast.success(
        isEnglish
          ? "Fieldwork completed! Moving to reporting phase."
          : "Travail de terrain termine ! Passage a la phase de rapport."
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Handlers
  const togglePhase = (phase: FieldworkPhase) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) {
        next.delete(phase);
      } else {
        next.add(phase);
      }
      return next;
    });
  };

  const handleToggleItem = (item: ChecklistItem) => {
    if (!canEdit) return;

    if (!item.isCompleted && !item.validation.canComplete) {
      toast.error(
        isEnglish
          ? item.validation.reason || "Cannot complete this item yet"
          : item.validation.reasonFr || "Impossible de completer cet element"
      );
      return;
    }

    toggleItem.mutate({
      reviewId,
      itemCode: item.itemCode,
      isCompleted: !item.isCompleted,
    });
  };

  const handleOverrideClick = (item: ChecklistItem) => {
    setSelectedItem(item);
    setOverrideDialogOpen(true);
  };

  const handleOverrideSubmit = () => {
    if (!selectedItem || overrideReason.length < 10) return;

    overrideItemMutation.mutate({
      reviewId,
      itemCode: selectedItem.itemCode,
      reason: overrideReason,
    });
  };

  const handleRemoveOverride = (item: ChecklistItem) => {
    removeOverride.mutate({
      reviewId,
      itemCode: item.itemCode,
    });
  };

  const getDocumentCategory = (itemCode: string): string | null => {
    const categoryMap: Record<string, string> = {
      PRE_DOC_REQUEST_SENT: "PRE_VISIT_REQUEST",
      PRE_DOCS_RECEIVED: "HOST_SUBMISSION",
      SITE_INTERVIEWS: "INTERVIEW_NOTES",
      SITE_FACILITIES: "EVIDENCE",
      POST_DRAFT_REPORT: "DRAFT_REPORT",
      POST_HOST_FEEDBACK: "CORRESPONDENCE",
    };
    return categoryMap[itemCode] || null;
  };

  // Group items by phase
  const itemsByPhase: Record<FieldworkPhase, ChecklistItem[]> =
    checklistItems?.reduce(
      (acc, item) => {
        if (!acc[item.phase]) {
          acc[item.phase] = [];
        }
        acc[item.phase].push(item as ChecklistItem);
        return acc;
      },
      {} as Record<FieldworkPhase, ChecklistItem[]>
    ) || ({} as Record<FieldworkPhase, ChecklistItem[]>);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{isEnglish ? "Error" : "Erreur"}</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isEnglish
                ? "Fieldwork Checklist"
                : "Liste de controle du travail de terrain"}
            </CardTitle>
            {completionStatus && (
              <Badge
                variant={
                  completionStatus.progress === 100 ? "default" : "secondary"
                }
              >
                {completionStatus.completedItems} / {completionStatus.totalItems}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isEnglish
              ? "Track progress through pre-visit, on-site, and post-visit activities"
              : "Suivez la progression des activites pre-visite, sur site et post-visite"}
          </p>
        </CardHeader>
        <CardContent>
          {completionStatus && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {isEnglish ? "Overall Progress" : "Progression globale"}
                </span>
                <span className="font-medium">{completionStatus.progress}%</span>
              </div>
              <Progress value={completionStatus.progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist Phases */}
      <div className="space-y-4">
        {(["PRE_VISIT", "ON_SITE", "POST_VISIT"] as FieldworkPhase[]).map(
          (phase) => {
            const config = PHASE_CONFIG[phase];
            const items = itemsByPhase[phase] || [];
            const completedCount = items.filter(
              (i) => i.isCompleted || i.isOverridden
            ).length;
            const phaseProgress =
              items.length > 0
                ? Math.round((completedCount / items.length) * 100)
                : 0;
            const isExpanded = expandedPhases.has(phase);

            return (
              <Collapsible
                key={phase}
                open={isExpanded}
                onOpenChange={() => togglePhase(phase)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                          <span className="text-xl">{config.icon}</span>
                          <div>
                            <CardTitle className="text-base">
                              {isEnglish ? config.labelEn : config.labelFr}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {completedCount} / {items.length}{" "}
                              {isEnglish ? "completed" : "termine(s)"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress
                            value={phaseProgress}
                            className="w-24 h-2"
                          />
                          <Badge
                            variant={
                              phaseProgress === 100 ? "default" : "outline"
                            }
                            className={cn(
                              phaseProgress === 100 && config.color,
                              "text-white"
                            )}
                          >
                            {phaseProgress}%
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {items.map((item) => (
                          <ChecklistItemRow
                            key={item.id}
                            item={item}
                            locale={locale}
                            canEdit={canEdit}
                            canOverride={canOverride}
                            isToggling={toggleItem.isPending}
                            onToggle={() => handleToggleItem(item)}
                            onOverride={() => handleOverrideClick(item)}
                            onRemoveOverride={() => handleRemoveOverride(item)}
                            onUploadClick={
                              onDocumentUploadClick
                                ? () => {
                                    const category = getDocumentCategory(
                                      item.itemCode
                                    );
                                    if (category) onDocumentUploadClick(category);
                                  }
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          }
        )}
      </div>

      {/* Complete Fieldwork Button */}
      {completionStatus && (
        <Card>
          <CardContent className="pt-6">
            {!completionStatus.canCompleteFieldwork &&
              completionStatus.incompleteItems &&
              completionStatus.incompleteItems.length > 0 && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {isEnglish
                      ? "All checklist items must be completed before marking fieldwork as complete"
                      : "Tous les elements de la liste doivent etre completes avant de marquer le travail de terrain comme termine"}
                  </AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 list-disc pl-4 text-sm">
                      {completionStatus.incompleteItems
                        .slice(0, 5)
                        .map((item) => (
                          <li key={item.itemCode}>{item.labelEn}</li>
                        ))}
                      {completionStatus.incompleteItems.length > 5 && (
                        <li>
                          {isEnglish
                            ? `...and ${completionStatus.incompleteItems.length - 5} more`
                            : `...et ${completionStatus.incompleteItems.length - 5} autres`}
                        </li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

            <Button
              onClick={() => completeFieldwork.mutate({ reviewId })}
              disabled={
                !completionStatus.canCompleteFieldwork ||
                completeFieldwork.isPending
              }
              className="w-full"
              size="lg"
            >
              {completeFieldwork.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <CheckCircle2 className="mr-2 h-5 w-5" />
              {isEnglish
                ? "Complete Fieldwork"
                : "Terminer le travail de terrain"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Override Dialog */}
      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              {isEnglish
                ? "Override Checklist Item"
                : "Remplacer l'element de la liste"}
            </DialogTitle>
            <DialogDescription>
              {isEnglish
                ? "Provide a reason for overriding this validation requirement. This action will be logged for audit purposes."
                : "Fournissez une raison pour remplacer cette exigence de validation. Cette action sera enregistree a des fins d'audit."}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3">
                <p className="font-medium">
                  {isEnglish ? selectedItem.labelEn : selectedItem.labelFr}
                </p>
                {selectedItem.validation.reason && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isEnglish
                      ? selectedItem.validation.reason
                      : selectedItem.validation.reasonFr}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="override-reason">
                  {isEnglish ? "Override Reason" : "Raison du remplacement"} *
                </Label>
                <Textarea
                  id="override-reason"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder={
                    isEnglish
                      ? "Explain why this requirement is being overridden..."
                      : "Expliquez pourquoi cette exigence est remplacee..."
                  }
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {isEnglish
                    ? `Minimum 10 characters (${overrideReason.length}/10)`
                    : `Minimum 10 caracteres (${overrideReason.length}/10)`}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOverrideDialogOpen(false)}
            >
              {isEnglish ? "Cancel" : "Annuler"}
            </Button>
            <Button
              onClick={handleOverrideSubmit}
              disabled={
                overrideReason.length < 10 || overrideItemMutation.isPending
              }
              variant="destructive"
            >
              {overrideItemMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEnglish ? "Override Item" : "Remplacer l'element"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// CHECKLIST ITEM ROW COMPONENT
// ─────────────────────────────────────────────────────────────────

interface ChecklistItemRowProps {
  item: ChecklistItem;
  locale: string;
  canEdit: boolean;
  canOverride: boolean;
  isToggling: boolean;
  onToggle: () => void;
  onOverride: () => void;
  onRemoveOverride: () => void;
  onUploadClick?: () => void;
}

function ChecklistItemRow({
  item,
  locale,
  canEdit,
  canOverride,
  isToggling,
  onToggle,
  onOverride,
  onRemoveOverride,
  onUploadClick,
}: ChecklistItemRowProps) {
  const isEnglish = locale === "en";
  const isCompleted = item.isCompleted || item.isOverridden;
  const canComplete = item.validation.canComplete;
  const hasValidationIssue = !canComplete && !isCompleted;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
        isCompleted &&
          "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900",
        hasValidationIssue &&
          "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900",
        !isCompleted && canComplete && "hover:bg-muted/50"
      )}
    >
      {/* Checkbox */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggle}
              disabled={
                !canEdit || isToggling || (hasValidationIssue && !item.isOverridden)
              }
              className={cn(
                "mt-0.5 flex-shrink-0 transition-colors",
                canEdit && canComplete && "cursor-pointer",
                (!canEdit || hasValidationIssue) && "cursor-not-allowed opacity-60"
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : hasValidationIssue ? (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {isCompleted
              ? isEnglish
                ? "Completed"
                : "Termine"
              : hasValidationIssue
                ? isEnglish
                  ? item.validation.reason
                  : item.validation.reasonFr
                : isEnglish
                  ? "Click to complete"
                  : "Cliquez pour terminer"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            isCompleted && "text-green-700 dark:text-green-400"
          )}
        >
          {isEnglish ? item.labelEn : item.labelFr}
        </p>

        {/* Validation Status */}
        {hasValidationIssue && (
          <div className="mt-1 flex items-center gap-2">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {isEnglish ? item.validation.reason : item.validation.reasonFr}
            </p>
            {item.validation.details && (
              <Badge variant="outline" className="text-xs">
                {item.validation.details.current} /{" "}
                {item.validation.details.required}
              </Badge>
            )}
          </div>
        )}

        {/* Override Info */}
        {item.isOverridden && (
          <div className="mt-1 flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs bg-amber-100 text-amber-700 border-amber-300"
            >
              <ShieldAlert className="mr-1 h-3 w-3" />
              {isEnglish ? "Overridden" : "Remplace"}
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">
                    {isEnglish ? "Override Reason:" : "Raison:"}
                  </p>
                  <p className="text-sm">{item.overrideReason}</p>
                  {item.overriddenBy && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {isEnglish ? "By:" : "Par:"} {item.overriddenBy.firstName}{" "}
                      {item.overriddenBy.lastName}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Completed Info */}
        {isCompleted && !item.isOverridden && item.completedBy && (
          <p className="mt-1 text-xs text-muted-foreground">
            {isEnglish ? "Completed by" : "Termine par"}{" "}
            {item.completedBy.firstName} {item.completedBy.lastName}
            {item.completedAt && (
              <> - {new Date(item.completedAt).toLocaleDateString(locale)}</>
            )}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Upload Document Button */}
        {hasValidationIssue && onUploadClick && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onUploadClick}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isEnglish
                  ? "Upload required document"
                  : "Telecharger le document requis"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Override Button */}
        {canOverride && hasValidationIssue && !item.isOverridden && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onOverride}
                >
                  <Unlock className="h-4 w-4 text-amber-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isEnglish ? "Override requirement" : "Remplacer l'exigence"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Remove Override Button */}
        {canOverride && item.isOverridden && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onRemoveOverride}
                >
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isEnglish ? "Remove override" : "Supprimer le remplacement"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
