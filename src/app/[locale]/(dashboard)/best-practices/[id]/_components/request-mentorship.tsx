"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CheckCircle2,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageSquare,
  Users,
  Clock,
} from "lucide-react";

interface RequestMentorshipProps {
  bestPracticeId: string;
  targetOrgName: string;
  isOwnOrg: boolean;
}

export function RequestMentorship({
  bestPracticeId,
  targetOrgName,
  isOwnOrg,
}: RequestMentorshipProps) {
  const t = useTranslations("bestPractices.detail.mentorship");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState("");

  // Check mentorship status
  const { data: status, isLoading: statusLoading } =
    trpc.bestPractice.getMentorshipStatus.useQuery({ bestPracticeId });

  // Request mentorship mutation
  const requestMentorship = trpc.bestPractice.requestMentorship.useMutation({
    onSuccess: () => {
      toast.success(t("requestSent"));
      setDialogOpen(false);
      setMessage("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = () => {
    if (!message.trim()) return;
    requestMentorship.mutate({
      bestPracticeId,
      message: message.trim(),
    });
  };

  // Own organization - show info message
  if (isOwnOrg) {
    return (
      <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
        <div className="flex items-start gap-3">
          <GraduationCap className="h-5 w-5 text-primary mt-0.5" />
          <p className="text-sm text-muted-foreground">{t("ownOrgMessage")}</p>
        </div>
      </div>
    );
  }

  // Already has pending request
  if (status?.hasPendingRequest) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {t("requestPending")}
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              {t("pendingMessage")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full"
          disabled={statusLoading}
        >
          <GraduationCap className="h-4 w-4 mr-2" />
          {t("requestButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description", { org: targetOrgName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Benefits */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-3">{t("whatYouGet")}</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm">
                <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{t("benefits.guidance")}</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <HelpCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{t("benefits.questions")}</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{t("benefits.lessons")}</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Users className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{t("benefits.support")}</span>
              </li>
            </ul>
          </div>

          {/* Message input */}
          <div className="space-y-2">
            <Label htmlFor="mentorship-message">{t("messageLabel")}</Label>
            <Textarea
              id="mentorship-message"
              placeholder={t("messagePlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">{t("messageHelp")}</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={requestMentorship.isPending}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!message.trim() || requestMentorship.isPending}
            >
              {requestMentorship.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <MessageSquare className="h-4 w-4 mr-2" />
              {t("send")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
