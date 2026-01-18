"use client";

/**
 * CAP Action Buttons Component
 *
 * Role-based action buttons for CAP workflow transitions.
 * Shows appropriate actions based on current status and user role.
 *
 * Action Matrix:
 * | Status      | ANSP Roles        | Lead Reviewer | Peer Reviewer |
 * |-------------|-------------------|---------------|---------------|
 * | DRAFT       | Edit, Submit      | -             | -             |
 * | SUBMITTED   | -                 | Accept,Reject | -             |
 * | ACCEPTED    | Mark In Progress  | -             | -             |
 * | IN_PROGRESS | Mark Completed    | -             | -             |
 * | COMPLETED   | -                 | -             | Verify        |
 * | VERIFIED    | -                 | Close         | -             |
 * | REJECTED    | Edit, Resubmit    | -             | -             |
 */

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Send,
  CheckCircle,
  XCircle,
  Wrench,
  ClipboardCheck,
  ShieldCheck,
  Lock,
  Pencil,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CAPStatus, UserRole } from "@prisma/client";

// =============================================================================
// ROLE DEFINITIONS
// =============================================================================

const ANSP_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "ANSP_ADMIN",
  "SAFETY_MANAGER",
  "QUALITY_MANAGER",
];

const REVIEWER_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "STEERING_COMMITTEE",
  "LEAD_REVIEWER",
];

const VERIFY_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "STEERING_COMMITTEE",
  "LEAD_REVIEWER",
  "PEER_REVIEWER",
];

// =============================================================================
// FORM SCHEMAS
// =============================================================================

const rejectFormSchema = z.object({
  reason: z.string().min(10, "Rejection reason must be at least 10 characters"),
});

const verifyFormSchema = z.object({
  verificationMethod: z.string().min(5, "Verification method is required"),
  verificationNotes: z.string().optional(),
});

const completeFormSchema = z.object({
  implementationNotes: z.string().optional(),
});

type RejectFormValues = z.infer<typeof rejectFormSchema>;
type VerifyFormValues = z.infer<typeof verifyFormSchema>;
type CompleteFormValues = z.infer<typeof completeFormSchema>;

// =============================================================================
// COMPONENT PROPS
// =============================================================================

interface CAPActionButtonsProps {
  capId: string;
  findingId: string;
  currentStatus: CAPStatus;
  userRole: UserRole;
  onStatusChange?: () => void;
  className?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CAPActionButtons({
  capId,
  findingId,
  currentStatus,
  userRole,
  onStatusChange,
  className,
}: CAPActionButtonsProps) {
  const t = useTranslations("cap");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  // Dialog states
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showStartImplementation, setShowStartImplementation] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Role checks
  const isANSPRole = ANSP_ROLES.includes(userRole);
  const isReviewerRole = REVIEWER_ROLES.includes(userRole);
  const isVerifyRole = VERIFY_ROLES.includes(userRole);

  // tRPC utils for cache invalidation
  const utils = trpc.useUtils();

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  const submitMutation = trpc.cap.submit.useMutation({
    onSuccess: () => {
      toast.success(t("success.submitted"));
      utils.cap.getById.invalidate({ id: capId });
      utils.cap.getByFinding.invalidate({ findingId });
      onStatusChange?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const acceptMutation = trpc.cap.accept.useMutation({
    onSuccess: () => {
      toast.success(t("success.accepted"));
      utils.cap.getById.invalidate({ id: capId });
      utils.cap.getByFinding.invalidate({ findingId });
      onStatusChange?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rejectMutation = trpc.cap.reject.useMutation({
    onSuccess: () => {
      toast.success(t("success.rejected"));
      utils.cap.getById.invalidate({ id: capId });
      utils.cap.getByFinding.invalidate({ findingId });
      setShowRejectDialog(false);
      onStatusChange?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const startImplementationMutation = trpc.cap.startImplementation.useMutation({
    onSuccess: () => {
      toast.success(t("success.implementationStarted"));
      utils.cap.getById.invalidate({ id: capId });
      utils.cap.getByFinding.invalidate({ findingId });
      onStatusChange?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const markCompletedMutation = trpc.cap.markCompleted.useMutation({
    onSuccess: () => {
      toast.success(t("success.completed"));
      utils.cap.getById.invalidate({ id: capId });
      utils.cap.getByFinding.invalidate({ findingId });
      setShowCompleteDialog(false);
      onStatusChange?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const verifyMutation = trpc.cap.verify.useMutation({
    onSuccess: () => {
      toast.success(t("success.verified"));
      utils.cap.getById.invalidate({ id: capId });
      utils.cap.getByFinding.invalidate({ findingId });
      setShowVerifyDialog(false);
      onStatusChange?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const closeMutation = trpc.cap.close.useMutation({
    onSuccess: () => {
      toast.success(t("success.closed"));
      utils.cap.getById.invalidate({ id: capId });
      utils.cap.getByFinding.invalidate({ findingId });
      onStatusChange?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // ==========================================================================
  // FORMS
  // ==========================================================================

  const rejectForm = useForm<RejectFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(rejectFormSchema) as any,
    defaultValues: {
      reason: "",
    },
  });

  const verifyForm = useForm<VerifyFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(verifyFormSchema) as any,
    defaultValues: {
      verificationMethod: "",
      verificationNotes: "",
    },
  });

  const completeForm = useForm<CompleteFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(completeFormSchema) as any,
    defaultValues: {
      implementationNotes: "",
    },
  });

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSubmit = () => {
    submitMutation.mutate({ id: capId });
    setShowSubmitConfirm(false);
  };

  const handleAccept = () => {
    acceptMutation.mutate({ id: capId });
    setShowAcceptConfirm(false);
  };

  const handleReject = (data: RejectFormValues) => {
    rejectMutation.mutate({ id: capId, reason: data.reason });
  };

  const handleStartImplementation = () => {
    startImplementationMutation.mutate({ id: capId });
    setShowStartImplementation(false);
  };

  const handleComplete = (data: CompleteFormValues) => {
    markCompletedMutation.mutate({
      id: capId,
      implementationNotes: data.implementationNotes || undefined,
    });
  };

  const handleVerify = (data: VerifyFormValues) => {
    verifyMutation.mutate({
      id: capId,
      verificationMethod: data.verificationMethod,
      verificationNotes: data.verificationNotes || undefined,
    });
  };

  const handleClose = () => {
    closeMutation.mutate({ id: capId });
    setShowCloseConfirm(false);
  };

  const handleEdit = () => {
    router.push(`/${locale}/findings/${findingId}/cap/edit`);
  };

  // ==========================================================================
  // DETERMINE VISIBLE ACTIONS
  // ==========================================================================

  const actions: React.ReactNode[] = [];

  // DRAFT status - ANSP can Edit and Submit
  if (currentStatus === "DRAFT" && isANSPRole) {
    actions.push(
      <Button key="edit" variant="outline" onClick={handleEdit}>
        <Pencil className="h-4 w-4 mr-2" />
        {t("edit")}
      </Button>
    );
    actions.push(
      <Button
        key="submit"
        onClick={() => setShowSubmitConfirm(true)}
        disabled={submitMutation.isPending}
      >
        {submitMutation.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Send className="h-4 w-4 mr-2" />
        )}
        {t("actions.submit")}
      </Button>
    );
  }

  // SUBMITTED/UNDER_REVIEW status - Reviewers can Accept or Reject
  if ((currentStatus === "SUBMITTED" || currentStatus === "UNDER_REVIEW") && isReviewerRole) {
    actions.push(
      <Button
        key="accept"
        variant="default"
        onClick={() => setShowAcceptConfirm(true)}
        disabled={acceptMutation.isPending}
      >
        {acceptMutation.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <CheckCircle className="h-4 w-4 mr-2" />
        )}
        {t("actions.accept")}
      </Button>
    );
    actions.push(
      <Button
        key="reject"
        variant="destructive"
        onClick={() => setShowRejectDialog(true)}
        disabled={rejectMutation.isPending}
      >
        {rejectMutation.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <XCircle className="h-4 w-4 mr-2" />
        )}
        {t("actions.reject")}
      </Button>
    );
  }

  // ACCEPTED status - ANSP can start implementation
  if (currentStatus === "ACCEPTED" && isANSPRole) {
    actions.push(
      <Button
        key="start"
        onClick={() => setShowStartImplementation(true)}
        disabled={startImplementationMutation.isPending}
      >
        {startImplementationMutation.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Wrench className="h-4 w-4 mr-2" />
        )}
        {t("actions.startImplementation")}
      </Button>
    );
  }

  // IN_PROGRESS status - ANSP can mark completed
  if (currentStatus === "IN_PROGRESS" && isANSPRole) {
    actions.push(
      <Button
        key="complete"
        onClick={() => setShowCompleteDialog(true)}
        disabled={markCompletedMutation.isPending}
      >
        {markCompletedMutation.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <ClipboardCheck className="h-4 w-4 mr-2" />
        )}
        {t("actions.markCompleted")}
      </Button>
    );
  }

  // COMPLETED status - Verifiers can verify
  if (currentStatus === "COMPLETED" && isVerifyRole) {
    actions.push(
      <Button
        key="verify"
        onClick={() => setShowVerifyDialog(true)}
        disabled={verifyMutation.isPending}
      >
        {verifyMutation.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <ShieldCheck className="h-4 w-4 mr-2" />
        )}
        {t("actions.verify")}
      </Button>
    );
  }

  // VERIFIED status - Reviewers can close
  if (currentStatus === "VERIFIED" && isReviewerRole) {
    actions.push(
      <Button
        key="close"
        onClick={() => setShowCloseConfirm(true)}
        disabled={closeMutation.isPending}
      >
        {closeMutation.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Lock className="h-4 w-4 mr-2" />
        )}
        {t("actions.close")}
      </Button>
    );
  }

  // REJECTED status - ANSP can edit and resubmit
  if (currentStatus === "REJECTED" && isANSPRole) {
    actions.push(
      <Button key="edit-rejected" variant="outline" onClick={handleEdit}>
        <Pencil className="h-4 w-4 mr-2" />
        {t("edit")}
      </Button>
    );
    actions.push(
      <Button
        key="resubmit"
        onClick={() => setShowSubmitConfirm(true)}
        disabled={submitMutation.isPending}
      >
        {submitMutation.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <RotateCcw className="h-4 w-4 mr-2" />
        )}
        {t("actions.resubmit") || t("actions.submit")}
      </Button>
    );
  }

  // No actions available
  if (actions.length === 0) {
    return null;
  }

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {actions}
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.submit")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirm.submit")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              {t("actions.submit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Accept Confirmation Dialog */}
      <AlertDialog open={showAcceptConfirm} onOpenChange={setShowAcceptConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.accept")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirm.accept")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleAccept}>
              {t("actions.accept")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog with Reason Input */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("actions.reject")}</DialogTitle>
            <DialogDescription>
              {t("reject.description") || "Please provide a reason for rejecting this CAP. The organization will need to revise and resubmit."}
            </DialogDescription>
          </DialogHeader>
          <Form {...rejectForm}>
            <form onSubmit={rejectForm.handleSubmit(handleReject)} className="space-y-4">
              <FormField
                control={rejectForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("reject.reason") || "Rejection Reason"} *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("reject.reasonPlaceholder") || "Explain why this CAP is being rejected and what needs to be corrected..."}
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("reject.reasonHint") || "Minimum 10 characters required"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRejectDialog(false)}
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {t("actions.reject")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Start Implementation Confirmation */}
      <AlertDialog open={showStartImplementation} onOpenChange={setShowStartImplementation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.startImplementation")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirm.startImplementation") || "Are you ready to begin implementing this corrective action plan?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartImplementation}>
              {t("actions.startImplementation")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Dialog with Optional Notes */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("actions.markCompleted")}</DialogTitle>
            <DialogDescription>
              {t("complete.description") || "Mark this CAP as completed. You can optionally add implementation notes."}
            </DialogDescription>
          </DialogHeader>
          <Form {...completeForm}>
            <form onSubmit={completeForm.handleSubmit(handleComplete)} className="space-y-4">
              <FormField
                control={completeForm.control}
                name="implementationNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("complete.notes") || "Implementation Notes"}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("complete.notesPlaceholder") || "Describe what was done to implement this CAP..."}
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("form.optional")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCompleteDialog(false)}
                >
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" disabled={markCompletedMutation.isPending}>
                  {markCompletedMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {t("actions.markCompleted")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Verify Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("actions.verify")}</DialogTitle>
            <DialogDescription>
              {t("verify.description") || "Verify that this CAP has been successfully implemented."}
            </DialogDescription>
          </DialogHeader>
          <Form {...verifyForm}>
            <form onSubmit={verifyForm.handleSubmit(handleVerify)} className="space-y-4">
              <FormField
                control={verifyForm.control}
                name="verificationMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.verificationMethod")} *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("form.verificationMethodPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("verify.methodHint") || "How was the implementation verified?"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={verifyForm.control}
                name="verificationNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.verificationNotes")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("form.verificationNotesPlaceholder")}
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("form.optional")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowVerifyDialog(false)}
                >
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" disabled={verifyMutation.isPending}>
                  {verifyMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {t("actions.verify")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Close Confirmation Dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.close")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirm.close")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose}>
              {t("actions.close")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
