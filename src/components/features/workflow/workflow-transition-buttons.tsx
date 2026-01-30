"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import type { WorkflowEntityType } from "@prisma/client";

interface WorkflowTransitionButtonsProps {
  entityType: WorkflowEntityType;
  entityId: string;
  onTransitionComplete?: (newState: string) => void;
  size?: "sm" | "default" | "lg";
  className?: string;
}

interface TransitionData {
  code: string;
  labelEn: string;
  labelFr: string;
  buttonVariant: string | null;
  confirmRequired: boolean;
  confirmMessageEn: string | null;
  confirmMessageFr: string | null;
}

export function WorkflowTransitionButtons({
  entityType,
  entityId,
  onTransitionComplete,
  size = "default",
  className,
}: WorkflowTransitionButtonsProps) {
  const t = useTranslations("workflow.transitions");
  const locale = useLocale();
  const utils = trpc.useUtils();

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    transition: TransitionData | null;
    comment: string;
  }>({
    open: false,
    transition: null,
    comment: "",
  });
  const [executing, setExecuting] = useState<string | null>(null);

  const { data: transitions, isLoading } =
    trpc.workflow.getAvailableTransitions.useQuery({
      entityType,
      entityId,
    });

  const executeMutation = trpc.workflow.executeTransition.useMutation({
    onSuccess: (result) => {
      toast.success(t("success"));
      utils.workflow.getAvailableTransitions.invalidate({ entityType, entityId });
      utils.workflow.getHistory.invalidate({ entityType, entityId });
      onTransitionComplete?.(result.newState);
      setConfirmDialog({ open: false, transition: null, comment: "" });
    },
    onError: (error) => {
      toast.error(error.message || t("error"));
    },
    onSettled: () => {
      setExecuting(null);
    },
  });

  const handleClick = (transition: TransitionData) => {
    if (transition.confirmRequired) {
      setConfirmDialog({ open: true, transition, comment: "" });
    } else {
      executeTransition(transition.code);
    }
  };

  const executeTransition = (code: string, comment?: string) => {
    setExecuting(code);
    executeMutation.mutate({
      entityType,
      entityId,
      transitionCode: code,
      comment,
    });
  };

  const getButtonVariant = (
    variant: string | null
  ): "default" | "destructive" | "outline" | "secondary" | "ghost" => {
    switch (variant) {
      case "destructive":
        return "destructive";
      case "outline":
        return "outline";
      case "secondary":
        return "secondary";
      case "ghost":
        return "ghost";
      default:
        return "default";
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!transitions || transitions.length === 0) {
    return null;
  }

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {transitions.map((transition) => (
          <Button
            key={transition.code}
            variant={getButtonVariant(transition.buttonVariant)}
            size={size}
            disabled={executing !== null}
            onClick={() => handleClick(transition)}
          >
            {executing === transition.code && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {locale === "fr" ? transition.labelFr : transition.labelEn}
          </Button>
        ))}
      </div>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open && setConfirmDialog({ open: false, transition: null, comment: "" })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {locale === "fr"
                ? confirmDialog.transition?.confirmMessageFr
                : confirmDialog.transition?.confirmMessageEn}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="comment">{t("commentOptional")}</Label>
            <Textarea
              id="comment"
              value={confirmDialog.comment}
              onChange={(e) =>
                setConfirmDialog((prev) => ({ ...prev, comment: e.target.value }))
              }
              placeholder={t("commentPlaceholder")}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                executeTransition(
                  confirmDialog.transition?.code || "",
                  confirmDialog.comment || undefined
                )
              }
              disabled={executing !== null}
            >
              {executing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
