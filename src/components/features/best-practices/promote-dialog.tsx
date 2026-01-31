"use client";

import { useState } from "react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Send, Megaphone, Star, Users, Building2 } from "lucide-react";

const promoteSchema = z.object({
  targetType: z.enum(["ALL_ANSPS", "BY_TEAM", "BY_ORGANIZATION"]),
  messageEn: z.string().max(500).optional(),
  messageFr: z.string().max(500).optional(),
  isFeatured: z.boolean(),
});

type PromoteFormValues = z.infer<typeof promoteSchema>;

interface PromoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bestPracticeId: string;
  bestPracticeTitle: string;
}

export function PromoteDialog({
  open,
  onOpenChange,
  bestPracticeId,
  bestPracticeTitle,
}: PromoteDialogProps) {
  const t = useTranslations("bestPractices.promote");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PromoteFormValues>({
    resolver: zodResolver(promoteSchema),
    defaultValues: {
      targetType: "ALL_ANSPS",
      messageEn: "",
      messageFr: "",
      isFeatured: false,
    },
  });

  const promoteMutation = trpc.bestPracticePromotion.create.useMutation({
    onSuccess: () => {
      toast.success(t("success"), {
        description: t("successDescription"),
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: { message: string }) => {
      toast.error(t("error"), {
        description: error.message,
      });
    },
  });

  const onSubmit = async (values: PromoteFormValues) => {
    setIsSubmitting(true);
    try {
      await promoteMutation.mutateAsync({
        bestPracticeId,
        targetType: values.targetType,
        messageEn: values.messageEn || undefined,
        messageFr: values.messageFr || undefined,
        isFeatured: values.isFeatured,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetType = form.watch("targetType");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {/* Best Practice being promoted */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-sm font-medium">{bestPracticeTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("willNotify")}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Target Audience */}
            <FormField
              control={form.control}
              name="targetType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("targetAudience")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ALL_ANSPS">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {t("allANSPs")}
                        </div>
                      </SelectItem>
                      <SelectItem value="BY_TEAM">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {t("byTeam")}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {targetType === "ALL_ANSPS" && t("allANSPsDescription")}
                    {targetType === "BY_TEAM" && t("byTeamDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Message (English) */}
            <FormField
              control={form.control}
              name="messageEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("messageEn")}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t("messagePlaceholder")}
                      rows={2}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormDescription>{t("messageHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Message (French) */}
            <FormField
              control={form.control}
              name="messageFr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("messageFr")}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t("messagePlaceholderFr")}
                      rows={2}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Featured Toggle */}
            <FormField
              control={form.control}
              name="isFeatured"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      {t("markFeatured")}
                    </FormLabel>
                    <FormDescription>{t("featuredDescription")}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {t("sendPromotion")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
