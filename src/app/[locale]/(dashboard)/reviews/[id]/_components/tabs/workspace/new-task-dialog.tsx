"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
}

export function NewTaskDialog({ open, onOpenChange, reviewId: _reviewId }: NewTaskDialogProps) {
  const t = useTranslations("reviews.detail.workspace.tasksList");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("new.title")}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">
          Task form to be integrated from existing task components.
        </p>
      </DialogContent>
    </Dialog>
  );
}
