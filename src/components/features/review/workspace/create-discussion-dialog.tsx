"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Send, AtSign, X } from "lucide-react";

// Form schema
const createDiscussionSchema = z.object({
  subject: z.string().max(200).optional(),
  content: z.string().min(1, "Content is required").max(10000),
});

type FormValues = z.infer<typeof createDiscussionSchema>;

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface CreateDiscussionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  locale: string;
  onSuccess: () => void;
  parentId?: string;
}

export function CreateDiscussionDialog({
  open,
  onOpenChange,
  reviewId,
  locale: _locale,
  onSuccess,
  parentId,
}: CreateDiscussionDialogProps) {
  const t = useTranslations("reviews.workspace.discussions.form");

  const [mentions, setMentions] = useState<string[]>([]);
  const [showMentionPopover, setShowMentionPopover] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isReply = !!parentId;

  // Fetch team members for mentions
  const { data: teamMembers } = trpc.reviewDiscussion.getTeamMembers.useQuery(
    { reviewId },
    { enabled: open }
  );

  // Create mutation
  const createMutation = trpc.reviewDiscussion.create.useMutation({
    onSuccess: () => {
      toast.success(isReply ? t("replySuccess") : t("createSuccess"));
      form.reset();
      setMentions([]);
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(createDiscussionSchema),
    defaultValues: {
      subject: "",
      content: "",
    },
  });

  // Handle dialog open/close with reset
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setMentions([]);
      setMentionFilter("");
    }
    onOpenChange(newOpen);
  };

  const onSubmit = (values: FormValues) => {
    createMutation.mutate({
      reviewId,
      parentId,
      subject: isReply ? undefined : values.subject || undefined,
      content: values.content,
      mentions,
    });
  };

  // Filter team members based on search
  const filteredMembers = teamMembers?.filter((member) => {
    if (!mentionFilter) return true;
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    const email = member.email.toLowerCase();
    const filter = mentionFilter.toLowerCase();
    return fullName.includes(filter) || email.includes(filter);
  }) || [];

  // Add mention
  const handleAddMention = (member: TeamMember) => {
    if (!mentions.includes(member.id)) {
      setMentions([...mentions, member.id]);

      // Insert @name into textarea
      const textarea = textareaRef.current;
      if (textarea) {
        const cursorPos = textarea.selectionStart;
        const textBefore = form.getValues("content").substring(0, cursorPos);
        const textAfter = form.getValues("content").substring(cursorPos);
        const mention = `@${member.firstName} ${member.lastName} `;
        form.setValue("content", textBefore + mention + textAfter);

        // Move cursor after mention
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(
            cursorPos + mention.length,
            cursorPos + mention.length
          );
        }, 0);
      }
    }
    setShowMentionPopover(false);
    setMentionFilter("");
  };

  // Remove mention
  const handleRemoveMention = (memberId: string) => {
    setMentions(mentions.filter((id) => id !== memberId));
  };

  // Get member name by ID
  const getMemberName = (memberId: string) => {
    const member = teamMembers?.find((m) => m.id === memberId);
    return member ? `${member.firstName} ${member.lastName}` : memberId;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isReply ? t("replyTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isReply ? t("replyDescription") : t("createDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Subject (only for new discussions, not replies) */}
            {!isReply && (
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("subject")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("subjectPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field: { ref, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>{t("content")}</FormLabel>
                  <FormControl>
                    <Textarea
                      ref={(el) => {
                        ref(el);
                        (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
                      }}
                      placeholder={t("contentPlaceholder")}
                      rows={5}
                      className="resize-none"
                      {...fieldProps}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mentions section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("mentions")}</span>
                <Popover open={showMentionPopover} onOpenChange={setShowMentionPopover}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <AtSign className="mr-1 h-4 w-4" />
                      {t("addMention")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="end">
                    <Input
                      placeholder={t("searchMembers")}
                      value={mentionFilter}
                      onChange={(e) => setMentionFilter(e.target.value)}
                      className="mb-2"
                    />
                    <div className="max-h-48 overflow-y-auto">
                      {filteredMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          {t("noMembers")}
                        </p>
                      ) : (
                        filteredMembers.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => handleAddMention(member)}
                            disabled={mentions.includes(member.id)}
                            className="w-full text-left px-2 py-1.5 rounded hover:bg-accent text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="font-medium">
                              {member.firstName} {member.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {member.email}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Selected mentions */}
              {mentions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mentions.map((memberId) => (
                    <Badge key={memberId} variant="secondary" className="gap-1">
                      @{getMemberName(memberId)}
                      <button
                        type="button"
                        onClick={() => handleRemoveMention(memberId)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {t("mentionsHelp")}
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isReply ? t("submitReply") : t("submitCreate")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
