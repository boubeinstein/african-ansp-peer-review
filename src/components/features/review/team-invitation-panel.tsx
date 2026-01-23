"use client";

/**
 * Team Invitation Panel Component
 *
 * Two views:
 * 1. Reviewer View: Shows pending invitations with accept/decline actions
 * 2. Coordinator View: Shows team invitation status with management actions
 */

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import type { InvitationStatus, TeamRole } from "@prisma/client";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

// Icons
import {
  Mail,
  MailCheck,
  MailX,
  Check,
  X,
  Clock,
  CheckCircle2,
  Send,
  RefreshCw,
  UserMinus,
  UserPlus,
  Building2,
  Calendar,
  MapPin,
  Star,
  Loader2,
  Bell,
  Info,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface ReviewerInvitationsPanelProps {
  className?: string;
}

interface CoordinatorInvitationsPanelProps {
  reviewId: string;
  className?: string;
  onReplaceDeclined?: (membershipId: string, role: TeamRole) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_COLORS: Record<InvitationStatus, string> = {
  PENDING: "bg-gray-100 text-gray-700 border-gray-300",
  INVITED: "bg-blue-100 text-blue-700 border-blue-300",
  CONFIRMED: "bg-green-100 text-green-700 border-green-300",
  DECLINED: "bg-red-100 text-red-700 border-red-300",
  WITHDRAWN: "bg-orange-100 text-orange-700 border-orange-300",
};

const STATUS_ICONS: Record<InvitationStatus, typeof Mail> = {
  PENDING: Clock,
  INVITED: Mail,
  CONFIRMED: MailCheck,
  DECLINED: MailX,
  WITHDRAWN: X,
};

const ROLE_LABELS: Record<TeamRole, { en: string; fr: string }> = {
  LEAD_REVIEWER: { en: "Lead Reviewer", fr: "Responsable d'équipe" },
  REVIEWER: { en: "Reviewer", fr: "Évaluateur" },
  TECHNICAL_EXPERT: { en: "Technical Expert", fr: "Expert technique" },
  OBSERVER: { en: "Observer", fr: "Observateur" },
  TRAINEE: { en: "Trainee", fr: "Stagiaire" },
};

// =============================================================================
// REVIEWER VIEW - PENDING INVITATIONS
// =============================================================================

export function ReviewerInvitationsPanel({ className }: ReviewerInvitationsPanelProps) {
  const t = useTranslations("review.invitations");
  const locale = useLocale() as "en" | "fr";
  const dateLocale = locale === "fr" ? fr : enUS;

  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const utils = trpc.useUtils();

  // Fetch pending invitations
  const { data: invitations, isLoading } = trpc.review.getMyInvitations.useQuery();

  // Accept/decline mutation
  const respond = trpc.review.respondToInvitation.useMutation({
    onSuccess: (data) => {
      if (data.status === "CONFIRMED") {
        toast.success(t("acceptSuccess", { reference: data.reviewReference }));
      } else {
        toast.success(t("declineSuccess"));
      }
      utils.review.getMyInvitations.invalidate();
      setDeclineDialogOpen(false);
      setSelectedInvitation(null);
      setDeclineReason("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAccept = (membershipId: string) => {
    respond.mutate({ membershipId, accept: true });
  };

  const handleDeclineClick = (membershipId: string) => {
    setSelectedInvitation(membershipId);
    setDeclineDialogOpen(true);
  };

  const handleDeclineConfirm = () => {
    if (!selectedInvitation) return;
    respond.mutate({
      membershipId: selectedInvitation,
      accept: false,
      declineReason,
    });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <CardDescription>{t("noInvitations")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("title")}
            <Badge variant="secondary">{invitations.length}</Badge>
          </CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invitations.map((invitation) => (
            <Card key={invitation.id} className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">
                        {invitation.review.referenceNumber}
                      </h4>
                      <Badge
                        variant="outline"
                        className={cn(
                          "mt-1",
                          invitation.role === "LEAD_REVIEWER"
                            ? "border-yellow-500 text-yellow-700"
                            : ""
                        )}
                      >
                        {invitation.role === "LEAD_REVIEWER" && (
                          <Star className="h-3 w-3 mr-1" />
                        )}
                        {ROLE_LABELS[invitation.role][locale]}
                      </Badge>
                    </div>
                    {invitation.invitedAt && (
                      <span className="text-xs text-muted-foreground">
                        {t("invitedOn", {
                          date: format(new Date(invitation.invitedAt), "PPP", {
                            locale: dateLocale,
                          }),
                        })}
                      </span>
                    )}
                  </div>

                  {/* Review Details */}
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>
                        {locale === "fr" && invitation.review.hostOrganization.nameFr
                          ? invitation.review.hostOrganization.nameFr
                          : invitation.review.hostOrganization.nameEn}
                        {invitation.review.hostOrganization.icaoCode && (
                          <span className="ml-1 text-xs">
                            ({invitation.review.hostOrganization.icaoCode})
                          </span>
                        )}
                      </span>
                    </div>

                    {invitation.review.hostOrganization.country && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{invitation.review.hostOrganization.country}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {invitation.review.plannedStartDate
                          ? format(
                              new Date(invitation.review.plannedStartDate),
                              "PPP",
                              { locale: dateLocale }
                            )
                          : t("tbd")}{" "}
                        —{" "}
                        {invitation.review.plannedEndDate
                          ? format(
                              new Date(invitation.review.plannedEndDate),
                              "PPP",
                              { locale: dateLocale }
                            )
                          : t("tbd")}
                      </span>
                    </div>

                    {invitation.review.areasInScope &&
                      invitation.review.areasInScope.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {invitation.review.areasInScope.slice(0, 5).map((area) => (
                            <Badge key={area} variant="secondary" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                          {invitation.review.areasInScope.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{invitation.review.areasInScope.length - 5}
                            </Badge>
                          )}
                        </div>
                      )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      onClick={() => handleAccept(invitation.id)}
                      disabled={respond.isPending}
                      className="flex-1"
                    >
                      {respond.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      {t("accept")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDeclineClick(invitation.id)}
                      disabled={respond.isPending}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t("decline")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Decline Dialog */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("declineDialog.title")}</DialogTitle>
            <DialogDescription>{t("declineDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="decline-reason">{t("declineDialog.reasonLabel")}</Label>
              <Textarea
                id="decline-reason"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder={t("declineDialog.reasonPlaceholder")}
                className="min-h-[100px]"
              />
              {declineReason.length > 0 && declineReason.length < 10 && (
                <p className="text-xs text-destructive">
                  {t("declineDialog.minChars")}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeclineConfirm}
              disabled={respond.isPending || declineReason.length < 10}
            >
              {respond.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              {t("confirmDecline")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// =============================================================================
// COORDINATOR VIEW - TEAM INVITATION STATUS
// =============================================================================

export function CoordinatorInvitationsPanel({
  reviewId,
  className,
  onReplaceDeclined,
}: CoordinatorInvitationsPanelProps) {
  const t = useTranslations("review.invitations.coordinator");
  const locale = useLocale() as "en" | "fr";

  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Fetch team with invitation status
  const { data, isLoading } = trpc.review.getTeamWithInvitations.useQuery({
    reviewId,
  });

  // Mutations
  const sendInvitations = trpc.review.sendInvitations.useMutation({
    onSuccess: (result) => {
      toast.success(t("invitationsSent", { count: result.invitedCount }));
      utils.review.getTeamWithInvitations.invalidate({ reviewId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resendInvitation = trpc.review.resendInvitation.useMutation({
    onSuccess: () => {
      toast.success(t("invitationResent"));
      utils.review.getTeamWithInvitations.invalidate({ reviewId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const withdrawInvitation = trpc.review.withdrawInvitation.useMutation({
    onSuccess: () => {
      toast.success(t("invitationWithdrawn"));
      utils.review.getTeamWithInvitations.invalidate({ reviewId });
      setWithdrawDialogOpen(false);
      setSelectedMemberId(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSendAllInvitations = () => {
    sendInvitations.mutate({ reviewId });
  };

  const handleResend = (membershipId: string) => {
    resendInvitation.mutate({ membershipId });
  };

  const handleWithdrawClick = (membershipId: string) => {
    setSelectedMemberId(membershipId);
    setWithdrawDialogOpen(true);
  };

  const handleWithdrawConfirm = () => {
    if (!selectedMemberId) return;
    withdrawInvitation.mutate({ membershipId: selectedMemberId });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { members, stats, isTeamReady, hasConfirmedLead } = data;
  const confirmationProgress =
    stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0;

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {t("title")}
              </CardTitle>
              <CardDescription>{t("description")}</CardDescription>
            </div>
            {stats.pending > 0 && (
              <Button
                onClick={handleSendAllInvitations}
                disabled={sendInvitations.isPending}
              >
                {sendInvitations.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {t("sendAll", { count: stats.pending })}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("teamConfirmation")}</span>
              <span className="font-medium">
                {stats.confirmed} / {stats.total} {t("confirmed")}
              </span>
            </div>
            <Progress value={confirmationProgress} className="h-2" />
            <div className="flex flex-wrap gap-2">
              {stats.pending > 0 && (
                <Badge variant="outline" className={STATUS_COLORS.PENDING}>
                  <Clock className="h-3 w-3 mr-1" />
                  {stats.pending} {t("statuses.pending")}
                </Badge>
              )}
              {stats.invited > 0 && (
                <Badge variant="outline" className={STATUS_COLORS.INVITED}>
                  <Mail className="h-3 w-3 mr-1" />
                  {stats.invited} {t("statuses.invited")}
                </Badge>
              )}
              {stats.confirmed > 0 && (
                <Badge variant="outline" className={STATUS_COLORS.CONFIRMED}>
                  <Check className="h-3 w-3 mr-1" />
                  {stats.confirmed} {t("statuses.confirmed")}
                </Badge>
              )}
              {stats.declined > 0 && (
                <Badge variant="outline" className={STATUS_COLORS.DECLINED}>
                  <X className="h-3 w-3 mr-1" />
                  {stats.declined} {t("statuses.declined")}
                </Badge>
              )}
            </div>
          </div>

          {/* Team Readiness Alert */}
          {isTeamReady ? (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-700">{t("teamReady.title")}</AlertTitle>
              <AlertDescription className="text-green-600">
                {t("teamReady.description")}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>{t("teamNotReady.title")}</AlertTitle>
              <AlertDescription>
                {!hasConfirmedLead && t("teamNotReady.needsLead")}
                {hasConfirmedLead && stats.invited > 0 && t("teamNotReady.awaitingResponses")}
                {hasConfirmedLead && stats.pending > 0 && t("teamNotReady.needsToSend")}
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Team Members List */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">{t("teamMembers")}</h4>
            {members.map((member) => {
              const StatusIcon = STATUS_ICONS[member.invitationStatus];
              return (
                <div
                  key={member.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    member.invitationStatus === "DECLINED" &&
                      "border-red-200 bg-red-50/50 dark:bg-red-950/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium",
                        member.invitationStatus === "CONFIRMED"
                          ? "bg-green-100 text-green-700"
                          : member.invitationStatus === "DECLINED"
                          ? "bg-red-100 text-red-700"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {member.user.firstName[0]}
                      {member.user.lastName[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {member.user.firstName} {member.user.lastName}
                        </span>
                        {member.role === "LEAD_REVIEWER" && (
                          <Star className="h-3.5 w-3.5 text-yellow-500" />
                        )}
                        <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[member.invitationStatus])}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {t(`statuses.${member.invitationStatus.toLowerCase()}`)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{ROLE_LABELS[member.role][locale]}</span>
                        {member.reviewerProfile?.homeOrganization && (
                          <>
                            <span>•</span>
                            <span>
                              {locale === "fr" && member.reviewerProfile.homeOrganization.nameFr
                                ? member.reviewerProfile.homeOrganization.nameFr
                                : member.reviewerProfile.homeOrganization.nameEn}
                            </span>
                          </>
                        )}
                      </div>
                      {member.invitationStatus === "DECLINED" && member.declineReason && (
                        <p className="text-xs text-red-600 mt-1">
                          {t("declineReason")}: {member.declineReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {member.invitationStatus === "PENDING" && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() =>
                                sendInvitations.mutate({
                                  reviewId,
                                  memberIds: [member.id],
                                })
                              }
                              disabled={sendInvitations.isPending}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("actions.send")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {member.invitationStatus === "INVITED" && (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleResend(member.id)}
                                disabled={resendInvitation.isPending}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("actions.resend")}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleWithdrawClick(member.id)}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("actions.withdraw")}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    )}

                    {member.invitationStatus === "DECLINED" && onReplaceDeclined && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onReplaceDeclined(member.id, member.role)}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              {t("actions.replace")}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("actions.replaceTooltip")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {member.invitationStatus === "CONFIRMED" && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Withdraw Confirmation Dialog */}
      <AlertDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("withdrawDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("withdrawDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWithdrawConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {withdrawInvitation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserMinus className="h-4 w-4 mr-2" />
              )}
              {t("withdrawDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
