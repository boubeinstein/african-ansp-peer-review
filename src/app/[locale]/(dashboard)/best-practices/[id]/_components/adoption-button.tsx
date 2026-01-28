"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, Info, Loader2, Plus, Trash2 } from "lucide-react";
import { isOversightRole } from "@/lib/permissions";
import { UserRole } from "@prisma/client";

interface AdoptionButtonProps {
  practiceId: string;
  canAdopt: boolean;
  hasAdopted: boolean;
  isOwnOrg: boolean;
  userRole?: string;
}

export function AdoptionButton({
  practiceId,
  canAdopt,
  hasAdopted,
  isOwnOrg,
  userRole,
}: AdoptionButtonProps) {
  const t = useTranslations("bestPractices.detail.adoption");
  const utils = trpc.useUtils();

  const [showAdoptDialog, setShowAdoptDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [notes, setNotes] = useState("");

  // Adopt mutation
  const adoptMutation = trpc.bestPractice.adopt.useMutation({
    onSuccess: () => {
      toast.success(t("adoptSuccess"));
      setShowAdoptDialog(false);
      setNotes("");
      utils.bestPractice.getById.invalidate({ id: practiceId });
      utils.bestPractice.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Remove adoption mutation
  const removeMutation = trpc.bestPractice.removeAdoption.useMutation({
    onSuccess: () => {
      toast.success(t("removeSuccess"));
      setShowRemoveDialog(false);
      utils.bestPractice.getById.invalidate({ id: practiceId });
      utils.bestPractice.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAdopt = () => {
    adoptMutation.mutate({
      bestPracticeId: practiceId,
      implementationNotes: notes.trim() || undefined,
    });
  };

  const handleRemove = () => {
    removeMutation.mutate({ bestPracticeId: practiceId });
  };

  // Oversight role - show informational message
  if (userRole && isOversightRole(userRole as UserRole)) {
    return (
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
        <Info className="h-4 w-4 inline mr-2" />
        {t("oversightRoleMessage")}
      </div>
    );
  }

  // Own organization - show badge
  if (isOwnOrg) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-primary/10 text-primary">
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-sm font-medium">{t("yourPractice")}</span>
      </div>
    );
  }

  // Already adopted - show status and remove option
  if (hasAdopted) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">{t("alreadyAdopted")}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRemoveDialog(true)}
          className="w-full text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t("removeAdoption")}
        </Button>

        {/* Remove Confirmation Dialog */}
        <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("removeDialog.title")}</DialogTitle>
              <DialogDescription>
                {t("removeDialog.description")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowRemoveDialog(false)}
                disabled={removeMutation.isPending}
              >
                {t("removeDialog.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemove}
                disabled={removeMutation.isPending}
              >
                {removeMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("removeDialog.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Can adopt - show adopt button
  if (canAdopt) {
    return (
      <>
        <Button onClick={() => setShowAdoptDialog(true)} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          {t("adoptButton")}
        </Button>

        {/* Adopt Dialog */}
        <Dialog open={showAdoptDialog} onOpenChange={setShowAdoptDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("adoptDialog.title")}</DialogTitle>
              <DialogDescription>
                {t("adoptDialog.description")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="implementation-notes">
                  {t("adoptDialog.notesLabel")}
                </Label>
                <Textarea
                  id="implementation-notes"
                  placeholder={t("adoptDialog.notesPlaceholder")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {t("adoptDialog.notesHelp")}
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowAdoptDialog(false)}
                disabled={adoptMutation.isPending}
              >
                {t("adoptDialog.cancel")}
              </Button>
              <Button
                onClick={handleAdopt}
                disabled={adoptMutation.isPending}
              >
                {adoptMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("adoptDialog.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Cannot adopt (no org, etc.) - return nothing, message shown in sidebar
  return null;
}
