"use client";

/**
 * Archive Assessment Dialog
 *
 * Confirmation dialog for archiving submitted/completed assessments.
 */

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
import { Archive, Loader2 } from "lucide-react";

interface ArchiveAssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentId: string;
  assessmentTitle: string;
  onSuccess?: () => void;
}

export function ArchiveAssessmentDialog({
  open,
  onOpenChange,
  assessmentId,
  assessmentTitle,
  onSuccess,
}: ArchiveAssessmentDialogProps) {
  const t = useTranslations("assessment");
  const router = useRouter();

  const utils = trpc.useUtils();

  const archiveMutation = trpc.assessment.archive.useMutation({
    onSuccess: () => {
      toast.success(t("archive.success"));
      utils.assessment.list.invalidate();
      utils.assessment.getMyAssessments.invalidate();
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/assessments");
      }
    },
    onError: (error) => {
      toast.error(t("archive.error"), {
        description: error.message,
      });
    },
  });

  const handleArchive = () => {
    archiveMutation.mutate({ id: assessmentId });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Archive className="h-6 w-6 text-amber-600" />
            </div>
            <AlertDialogTitle>{t("archive.title")}</AlertDialogTitle>
          </div>
        </AlertDialogHeader>

        <AlertDialogDescription className="space-y-3">
          <p>{t("archive.description")}</p>
          <p className="font-medium text-foreground">
            &quot;{assessmentTitle}&quot;
          </p>
        </AlertDialogDescription>

        <AlertDialogFooter>
          <AlertDialogCancel>{t("archive.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleArchive}
            disabled={archiveMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-600"
          >
            {archiveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("archive.archiving")}
              </>
            ) : (
              <>
                <Archive className="mr-2 h-4 w-4" />
                {t("archive.button")}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
