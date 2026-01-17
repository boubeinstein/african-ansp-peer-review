"use client";

/**
 * Delete Assessment Dialog
 *
 * Confirmation dialog for deleting assessments with safety confirmation.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

interface DeleteAssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentId: string;
  assessmentTitle: string;
  assessmentType: string;
  onSuccess?: () => void;
}

export function DeleteAssessmentDialog({
  open,
  onOpenChange,
  assessmentId,
  assessmentTitle,
  assessmentType,
  onSuccess,
}: DeleteAssessmentDialogProps) {
  const t = useTranslations("assessment");
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");

  const utils = trpc.useUtils();

  const deleteMutation = trpc.assessment.delete.useMutation({
    onSuccess: () => {
      toast.success(t("delete.success"));
      utils.assessment.list.invalidate();
      utils.assessment.getMyAssessments.invalidate();
      onOpenChange(false);
      setConfirmText("");
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/assessments");
      }
    },
    onError: (error) => {
      toast.error(t("delete.error"), {
        description: error.message,
      });
    },
  });

  const handleDelete = () => {
    if (confirmText !== assessmentTitle) return;
    deleteMutation.mutate({ id: assessmentId });
  };

  const isConfirmed = confirmText === assessmentTitle;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {assessmentType}
              </p>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogDescription className="space-y-4">
          <p>{t("delete.description")}</p>

          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-medium text-red-800">
              {t("delete.warning")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-delete" className="text-foreground">
              {t("delete.confirmLabel")}
            </Label>
            <p className="text-sm text-muted-foreground font-medium">
              {assessmentTitle}
            </p>
            <Input
              id="confirm-delete"
              placeholder={t("delete.confirmPlaceholder")}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-1"
            />
          </div>
        </AlertDialogDescription>

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              setConfirmText("");
            }}
          >
            {t("delete.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmed || deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("delete.deleting")}
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                {t("delete.button")}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
