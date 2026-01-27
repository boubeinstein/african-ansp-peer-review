"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreateDiscussionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  locale: string;
  onSuccess: () => void;
  parentId?: string; // For replies
}

export function CreateDiscussionDialog({
  open,
  onOpenChange,
  reviewId,
  locale,
  onSuccess,
  parentId,
}: CreateDiscussionDialogProps) {
  const t = useTranslations("reviews.workspace.discussions");

  // Placeholder - will be completed in Prompt 9c
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {parentId ? t("dialog.replyTitle") : t("dialog.createTitle")}
          </DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">Form coming in Prompt 9c...</p>
      </DialogContent>
    </Dialog>
  );
}
