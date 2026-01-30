"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { TaskForm } from "./task-form";
import { trpc } from "@/lib/trpc/client";
import { Loader2 } from "lucide-react";

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
}

export function NewTaskDialog({ open, onOpenChange, reviewId }: NewTaskDialogProps) {
  const t = useTranslations("reviews.detail.workspace.tasksList.new");

  // Fetch team members for assignee selection
  const { data: teamMembers, isLoading } = trpc.reviewDiscussion.getTeamMembers.useQuery(
    { reviewId },
    { enabled: open }
  );

  // Transform team members data for the form
  const formattedTeamMembers = teamMembers?.map((member) => ({
    id: member.id,
    name: `${member.firstName} ${member.lastName}`,
    image: null,
  })) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <TaskForm
            reviewId={reviewId}
            teamMembers={formattedTeamMembers}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
