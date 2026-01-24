"use client";

/**
 * Review Approval Panel
 *
 * Panel for Steering Committee and Programme Coordinators to
 * approve, reject, or defer review requests.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  FileText,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApprovalStatus } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

interface ReviewApprovalPanelProps {
  reviewId: string;
  referenceNumber: string;
  hostOrganization: {
    nameEn: string;
    nameFr?: string | null;
    organizationCode?: string | null;
    country?: string | null;
  };
  requestedDate: Date;
  requestedStartDate?: Date | null;
  requestedEndDate?: Date | null;
  reviewType: string;
  objectives?: string | null;
  onDecisionMade?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewApprovalPanel({
  reviewId,
  referenceNumber,
  hostOrganization,
  requestedDate,
  requestedStartDate,
  requestedEndDate,
  reviewType,
  objectives,
  onDecisionMade,
}: ReviewApprovalPanelProps) {
  const t = useTranslations("reviews.approval");
  const [selectedDecision, setSelectedDecision] = useState<ApprovalStatus | null>(null);
  const [commentsEn, setCommentsEn] = useState("");
  const [commentsFr, setCommentsFr] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const utils = trpc.useUtils();

  // Get approval history
  const { data: approvalHistory } = trpc.review.getApprovalHistory.useQuery({
    reviewId,
  });

  // Submit decision mutation
  const submitDecision = trpc.review.submitApprovalDecision.useMutation({
    onSuccess: () => {
      const decisionKey = selectedDecision?.toLowerCase() ?? "unknown";
      toast.success(t(`decision.${decisionKey}.success`));
      utils.review.getPendingApprovals.invalidate();
      utils.review.getApprovalStats.invalidate();
      utils.review.getById.invalidate({ id: reviewId });
      utils.review.getApprovalHistory.invalidate({ reviewId });
      setShowConfirmDialog(false);
      setSelectedDecision(null);
      setCommentsEn("");
      setCommentsFr("");
      onDecisionMade?.();
    },
    onError: (error) => {
      toast.error(t("decision.error"), {
        description: error.message,
      });
    },
  });

  const handleDecisionClick = (decision: ApprovalStatus) => {
    setSelectedDecision(decision);
    if (decision === "APPROVED") {
      // Direct approval without comments required
      setShowConfirmDialog(true);
    }
    // For REJECTED and DEFERRED, show the comment dialog first
  };

  const handleSubmit = () => {
    if (!selectedDecision) return;

    submitDecision.mutate({
      reviewId,
      decision: selectedDecision,
      commentsEn: commentsEn || undefined,
      commentsFr: commentsFr || undefined,
    });
  };

  const requiresComments =
    selectedDecision === "REJECTED" || selectedDecision === "DEFERRED";

  const canSubmit =
    selectedDecision &&
    (!requiresComments || (commentsEn.trim() || commentsFr.trim()));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Review Summary */}
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-sm text-muted-foreground">
                {referenceNumber}
              </p>
              <h3 className="font-semibold text-lg mt-1">
                {hostOrganization.nameEn}
              </h3>
              {hostOrganization.organizationCode && (
                <p className="text-sm text-muted-foreground">
                  {hostOrganization.organizationCode}
                  {hostOrganization.country && ` • ${hostOrganization.country}`}
                </p>
              )}
            </div>
            <Badge variant="outline">{reviewType}</Badge>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{t("requestedDate")}</p>
                <p className="text-muted-foreground">
                  {format(new Date(requestedDate), "PP")}
                </p>
              </div>
            </div>
            {requestedStartDate && requestedEndDate && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t("requestedPeriod")}</p>
                  <p className="text-muted-foreground">
                    {format(new Date(requestedStartDate), "PP")} -{" "}
                    {format(new Date(requestedEndDate), "PP")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {objectives && (
            <>
              <Separator />
              <div>
                <p className="font-medium text-sm mb-1">{t("objectives")}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {objectives}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Approval History */}
        {approvalHistory && approvalHistory.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">{t("history")}</h4>
            <div className="space-y-2">
              {approvalHistory.map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-center gap-3 text-sm p-2 rounded bg-muted/50"
                >
                  {approval.status === "APPROVED" && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {approval.status === "REJECTED" && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  {approval.status === "DEFERRED" && (
                    <Clock className="h-4 w-4 text-amber-500" />
                  )}
                  {approval.status === "PENDING" && (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <span className="font-medium">
                      {t(`status.${approval.status.toLowerCase()}`)}
                    </span>
                    {approval.approvedBy && (
                      <span className="text-muted-foreground">
                        {" "}
                        {t("by")}{" "}
                        {approval.approvedBy.firstName}{" "}
                        {approval.approvedBy.lastName}
                      </span>
                    )}
                  </div>
                  {approval.approvedAt && (
                    <span className="text-muted-foreground">
                      {format(new Date(approval.approvedAt), "PP")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decision Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => handleDecisionClick("APPROVED")}
            className="bg-green-600 hover:bg-green-700"
            disabled={submitDecision.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {t("action.approve")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelectedDecision("DEFERRED")}
            disabled={submitDecision.isPending}
          >
            <Clock className="h-4 w-4 mr-2" />
            {t("action.defer")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setSelectedDecision("REJECTED")}
            disabled={submitDecision.isPending}
          >
            <XCircle className="h-4 w-4 mr-2" />
            {t("action.reject")}
          </Button>
        </div>

        {/* Comments Dialog for Reject/Defer */}
        <Dialog
          open={selectedDecision === "REJECTED" || selectedDecision === "DEFERRED"}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedDecision(null);
              setCommentsEn("");
              setCommentsFr("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedDecision === "REJECTED"
                  ? t("decision.rejected.title")
                  : t("decision.deferred.title")}
              </DialogTitle>
              <DialogDescription>
                {selectedDecision === "REJECTED"
                  ? t("decision.rejected.description")
                  : t("decision.deferred.description")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="commentsEn">
                  {t("comments.en")} <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="commentsEn"
                  value={commentsEn}
                  onChange={(e) => setCommentsEn(e.target.value)}
                  placeholder={t("comments.placeholder")}
                  rows={3}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="commentsFr">{t("comments.fr")}</Label>
                <Textarea
                  id="commentsFr"
                  value={commentsFr}
                  onChange={(e) => setCommentsFr(e.target.value)}
                  placeholder={t("comments.placeholderFr")}
                  rows={3}
                  className="mt-1.5"
                />
              </div>

              {!commentsEn.trim() && !commentsFr.trim() && (
                <p className="text-sm text-amber-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {t("comments.required")}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedDecision(null);
                  setCommentsEn("");
                  setCommentsFr("");
                }}
              >
                {t("action.cancel")}
              </Button>
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={!canSubmit}
                variant={selectedDecision === "REJECTED" ? "destructive" : "default"}
              >
                {t("action.continue")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("confirm.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t(`confirm.${selectedDecision?.toLowerCase()}`)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>
                {t("action.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSubmit}
                disabled={submitDecision.isPending}
                className={cn(
                  selectedDecision === "APPROVED" && "bg-green-600 hover:bg-green-700",
                  selectedDecision === "REJECTED" && "bg-red-600 hover:bg-red-700"
                )}
              >
                {submitDecision.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("action.processing")}
                  </>
                ) : (
                  t("action.confirm")
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
