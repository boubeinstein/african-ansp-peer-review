"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { MentionTextarea } from "@/components/collaboration/mention-textarea";
import type { MentionUser } from "@/components/collaboration/mention-textarea";
import { extractMentionedUserIds, hasMentionAll } from "@/lib/mentions";

const discussionSchema = z.object({
  subject: z.string().min(3, "Subject must be at least 3 characters").max(200),
  content: z.string().min(10, "Content must be at least 10 characters").max(5000),
});

type DiscussionFormData = z.infer<typeof discussionSchema>;

interface DiscussionFormProps {
  reviewId: string;
  userId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DiscussionForm({ reviewId, userId, onSuccess, onCancel }: DiscussionFormProps) {
  const t = useTranslations("reviews.detail.workspace.discussionsList.form");
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<DiscussionFormData>({
    resolver: zodResolver(discussionSchema),
    defaultValues: {
      subject: "",
      content: "",
    },
  });

  const contentValue = watch("content");

  // Fetch team members for @mention autocomplete
  const { data: rawTeamMembers = [] } =
    trpc.reviewDiscussion.getTeamMembers.useQuery(
      { reviewId },
      { staleTime: 5 * 60 * 1000 }
    );

  const mentionMembers: MentionUser[] = rawTeamMembers.map(
    (m: { id: string; firstName: string; lastName: string }) => ({
      id: m.id,
      name: `${m.firstName} ${m.lastName}`,
      initials: `${m.firstName?.[0] || ""}${m.lastName?.[0] || ""}`.toUpperCase(),
    })
  );

  const createMutation = trpc.reviewDiscussion.create.useMutation({
    onSuccess: () => {
      toast.success(t("success"));
      reset();
      utils.reviewDiscussion.list.invalidate({ reviewId });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || t("error"));
    },
  });

  const onSubmit = (data: DiscussionFormData) => {
    const mentionedIds = extractMentionedUserIds(data.content);
    const allMentioned = hasMentionAll(data.content);
    const mentions = allMentioned
      ? ["__all__", ...mentionedIds]
      : mentionedIds;

    createMutation.mutate({
      reviewId,
      subject: data.subject,
      content: data.content,
      mentions,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="subject">{t("title")}</Label>
        <Input
          id="subject"
          placeholder={t("titlePlaceholder")}
          {...register("subject")}
          disabled={isSubmitting}
        />
        {errors.subject && (
          <p className="text-sm text-destructive">{errors.subject.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">{t("content")}</Label>
        <MentionTextarea
          value={contentValue}
          onChange={(val) => setValue("content", val, { shouldValidate: true })}
          placeholder={t("contentPlaceholder")}
          teamMembers={mentionMembers}
          currentUserId={userId}
          disabled={isSubmitting}
          rows={5}
        />
        {errors.content && (
          <p className="text-sm text-destructive">{errors.content.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {t("cancel")}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
          {(isSubmitting || createMutation.isPending) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
