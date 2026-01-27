"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  locale: string;
  teamMembers: TeamMember[];
  onSuccess: () => void;
  editTask?: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    dueDate: string | Date | null;
    assignedToId: string | null;
    checklist: unknown;
  };
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  reviewId,
  locale,
  teamMembers,
  onSuccess,
  editTask,
}: CreateTaskDialogProps) {
  const t = useTranslations("reviews.workspace.tasks.form");

  // Placeholder - will be implemented in Prompt 10c
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editTask ? t("editTitle") : t("createTitle")}
          </DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">
          Form coming in Prompt 10c...
        </p>
      </DialogContent>
    </Dialog>
  );
}
