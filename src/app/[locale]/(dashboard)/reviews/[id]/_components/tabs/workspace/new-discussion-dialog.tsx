"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

interface NewDiscussionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
}

export function NewDiscussionDialog({ open, onOpenChange, reviewId: _reviewId }: NewDiscussionDialogProps) {
  const t = useTranslations("reviews.detail.workspace.discussionsList");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("new.title")}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">
          Discussion form to be integrated from existing discussion components.
        </p>
      </DialogContent>
    </Dialog>
  );
}
