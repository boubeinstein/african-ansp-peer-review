"use client";

/**
 * Fieldwork Checklist Component
 *
 * Structured checklist for Lead Reviewers to track fieldwork activities
 * through pre-visit, on-site, and post-visit phases.
 */

import { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Building2,
  Loader2,
  CheckCheck,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

type ChecklistField =
  | "documentRequestSent"
  | "documentsReceived"
  | "preVisitMeetingHeld"
  | "reviewPlanApproved"
  | "openingMeetingHeld"
  | "interviewsCompleted"
  | "facilitiesInspected"
  | "documentReviewComplete"
  | "findingsDiscussed"
  | "closingMeetingHeld"
  | "findingsEntered"
  | "evidenceUploaded"
  | "draftReportPrepared"
  | "hostFeedbackReceived";

interface ChecklistItem {
  key: ChecklistField;
  labelKey: string;
}

interface ChecklistSection {
  id: string;
  titleKey: string;
  icon: React.ElementType;
  items: ChecklistItem[];
}

interface FieldworkChecklistProps {
  reviewId: string;
  isLeadReviewer: boolean;
  isAdmin: boolean;
  isTeamMember: boolean;
}

// =============================================================================
// CHECKLIST CONFIGURATION
// =============================================================================

const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    id: "preVisit",
    titleKey: "preVisit.title",
    icon: FileText,
    items: [
      { key: "documentRequestSent", labelKey: "preVisit.documentRequestSent" },
      { key: "documentsReceived", labelKey: "preVisit.documentsReceived" },
      { key: "preVisitMeetingHeld", labelKey: "preVisit.preVisitMeetingHeld" },
      { key: "reviewPlanApproved", labelKey: "preVisit.reviewPlanApproved" },
    ],
  },
  {
    id: "onSite",
    titleKey: "onSite.title",
    icon: Building2,
    items: [
      { key: "openingMeetingHeld", labelKey: "onSite.openingMeetingHeld" },
      { key: "interviewsCompleted", labelKey: "onSite.interviewsCompleted" },
      { key: "facilitiesInspected", labelKey: "onSite.facilitiesInspected" },
      { key: "documentReviewComplete", labelKey: "onSite.documentReviewComplete" },
      { key: "findingsDiscussed", labelKey: "onSite.findingsDiscussed" },
      { key: "closingMeetingHeld", labelKey: "onSite.closingMeetingHeld" },
    ],
  },
  {
    id: "postVisit",
    titleKey: "postVisit.title",
    icon: ClipboardCheck,
    items: [
      { key: "findingsEntered", labelKey: "postVisit.findingsEntered" },
      { key: "evidenceUploaded", labelKey: "postVisit.evidenceUploaded" },
      { key: "draftReportPrepared", labelKey: "postVisit.draftReportPrepared" },
      { key: "hostFeedbackReceived", labelKey: "postVisit.hostFeedbackReceived" },
    ],
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function FieldworkChecklist({
  reviewId,
  isLeadReviewer,
  isAdmin,
  isTeamMember,
}: FieldworkChecklistProps) {
  const t = useTranslations("reviews.fieldworkChecklist");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;
  const utils = trpc.useUtils();

  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [updatingField, setUpdatingField] = useState<ChecklistField | null>(null);

  // Can user edit checklist?
  const canEdit = isTeamMember || isAdmin;
  const canComplete = isLeadReviewer || isAdmin;

  // Fetch checklist data
  const {
    data: checklist,
    isLoading,
    error,
  } = trpc.review.getFieldworkChecklist.useQuery({ reviewId });

  // Initialize checklist mutation
  const initializeChecklist = trpc.review.initializeFieldworkChecklist.useMutation({
    onSuccess: () => {
      utils.review.getFieldworkChecklist.invalidate({ reviewId });
    },
    onError: (error) => {
      toast.error(t("error.initialize"), { description: error.message });
    },
  });

  // Update item mutation
  const updateItem = trpc.review.updateFieldworkChecklistItem.useMutation({
    onSuccess: () => {
      utils.review.getFieldworkChecklist.invalidate({ reviewId });
      setUpdatingField(null);
    },
    onError: (error) => {
      toast.error(t("error.update"), { description: error.message });
      setUpdatingField(null);
    },
  });

  // Complete fieldwork mutation
  const completeFieldwork = trpc.review.completeFieldwork.useMutation({
    onSuccess: () => {
      toast.success(t("success.completed"));
      utils.review.getFieldworkChecklist.invalidate({ reviewId });
      utils.review.getById.invalidate({ id: reviewId });
      setShowCompleteDialog(false);
    },
    onError: (error) => {
      toast.error(t("error.complete"), { description: error.message });
    },
  });

  // Calculate progress
  const progress = useMemo(() => {
    if (!checklist) return { total: 0, completed: 0, percentage: 0, sections: {} };

    const allFields: ChecklistField[] = CHECKLIST_SECTIONS.flatMap((s) =>
      s.items.map((i) => i.key)
    );

    const completed = allFields.filter(
      (field) => checklist[field as keyof typeof checklist] === true
    ).length;

    const sectionProgress: Record<string, { completed: number; total: number }> = {};
    CHECKLIST_SECTIONS.forEach((section) => {
      const sectionCompleted = section.items.filter(
        (item) => checklist[item.key as keyof typeof checklist] === true
      ).length;
      sectionProgress[section.id] = {
        completed: sectionCompleted,
        total: section.items.length,
      };
    });

    return {
      total: allFields.length,
      completed,
      percentage: Math.round((completed / allFields.length) * 100),
      sections: sectionProgress,
    };
  }, [checklist]);

  // All items checked?
  const allChecked = progress.completed === progress.total && progress.total > 0;

  // Is fieldwork already completed?
  const isCompleted = !!checklist?.completedAt;

  // Handle checkbox change
  const handleCheckChange = (field: ChecklistField, checked: boolean) => {
    if (!canEdit || isCompleted) return;

    setUpdatingField(field);
    updateItem.mutate({
      reviewId,
      field,
      value: checked,
    });
  };

  // Initialize checklist if needed
  useEffect(() => {
    if (!isLoading && !checklist && canEdit) {
      initializeChecklist.mutate({ reviewId });
    }
  }, [isLoading, checklist, canEdit, reviewId, initializeChecklist]);

  // Loading state
  if (isLoading) {
    return <ChecklistSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500 opacity-50" />
          <p className="text-muted-foreground">{t("error.load")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              {t("title")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          {isCompleted && (
            <Badge className="bg-green-100 text-green-700 border-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {t("completed")}
            </Badge>
          )}
        </div>

        {/* Overall Progress */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t("overallProgress")}</span>
            <span className="text-muted-foreground">
              {progress.completed}/{progress.total} ({progress.percentage}%)
            </span>
          </div>
          <Progress
            value={progress.percentage}
            className={cn(
              "h-2",
              isCompleted && "bg-green-100 [&>div]:bg-green-500"
            )}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {CHECKLIST_SECTIONS.map((section) => {
          const sectionData = progress.sections[section.id];
          const SectionIcon = section.icon;
          const isSectionComplete =
            sectionData?.completed === sectionData?.total;

          return (
            <div key={section.id} className="space-y-3">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "p-1.5 rounded-md",
                      isSectionComplete
                        ? "bg-green-100 text-green-600"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <SectionIcon className="h-4 w-4" />
                  </div>
                  <h4 className="font-medium">{t(section.titleKey)}</h4>
                </div>
                <Badge
                  variant={isSectionComplete ? "default" : "secondary"}
                  className={cn(
                    "text-xs",
                    isSectionComplete && "bg-green-600"
                  )}
                >
                  {sectionData?.completed ?? 0}/{sectionData?.total ?? 0}
                </Badge>
              </div>

              {/* Section Items */}
              <div className="ml-8 space-y-2">
                {section.items.map((item) => {
                  const isChecked =
                    checklist?.[item.key as keyof typeof checklist] === true;
                  const isUpdating = updatingField === item.key;

                  return (
                    <div
                      key={item.key}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md transition-colors",
                        canEdit && !isCompleted && "hover:bg-muted/50"
                      )}
                    >
                      <div className="relative">
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <Checkbox
                            id={item.key}
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              handleCheckChange(item.key, checked === true)
                            }
                            disabled={!canEdit || isCompleted || isUpdating}
                          />
                        )}
                      </div>
                      <Label
                        htmlFor={item.key}
                        className={cn(
                          "text-sm cursor-pointer flex-1",
                          isChecked && "text-muted-foreground line-through",
                          (!canEdit || isCompleted) && "cursor-default"
                        )}
                      >
                        {t(item.labelKey)}
                      </Label>
                      {isChecked && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  );
                })}
              </div>

              {section.id !== "postVisit" && <Separator className="mt-4" />}
            </div>
          );
        })}
      </CardContent>

      {/* Footer with Complete button */}
      {canComplete && !isCompleted && (
        <CardFooter className="border-t pt-4">
          <div className="w-full space-y-3">
            {!allChecked && (
              <p className="text-sm text-amber-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {t("allItemsRequired")}
              </p>
            )}
            <Button
              className="w-full"
              disabled={!allChecked || completeFieldwork.isPending}
              onClick={() => setShowCompleteDialog(true)}
            >
              {completeFieldwork.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("completing")}
                </>
              ) : (
                <>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  {t("completeFieldwork")}
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      )}

      {/* Completion Info */}
      {isCompleted && checklist && (
        <CardFooter className="border-t pt-4">
          <div className="w-full text-sm text-muted-foreground">
            <p>
              {t("completedBy")}:{" "}
              <span className="font-medium">
                {checklist.completedBy?.firstName} {checklist.completedBy?.lastName}
              </span>
            </p>
            <p>
              {t("completedOn")}:{" "}
              <span className="font-medium">
                {format(new Date(checklist.completedAt!), "PPP", {
                  locale: dateLocale,
                })}
              </span>
            </p>
          </div>
        </CardFooter>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmComplete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmComplete.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => completeFieldwork.mutate({ reviewId })}
              disabled={completeFieldwork.isPending}
            >
              {completeFieldwork.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("completing")}
                </>
              ) : (
                t("confirm")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

function ChecklistSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-4 w-64 mt-2" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-2 w-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {[1, 2, 3].map((section) => (
          <div key={section} className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="ml-8 space-y-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
