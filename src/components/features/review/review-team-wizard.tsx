"use client";

/**
 * Review Team Wizard Dialog
 *
 * A 3-step dialog wizard for assigning a team to a peer review:
 * 1. Review Details - Shows review information and existing team warning
 * 2. Select Team - Uses ReviewerSelector to pick team members
 * 3. Confirm - Final review before submitting
 *
 * Enterprise-grade UX with fixed header/footer and scrollable content.
 */

import { useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

// Icons
import {
  Building2,
  Calendar,
  Users,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Star,
  Globe,
  MapPin,
  FileText,
} from "lucide-react";

// Feature Components
import {
  ReviewerSelector,
  type SelectedTeamMember,
} from "./reviewer-selector";

// =============================================================================
// TYPES
// =============================================================================

interface ReviewTeamWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  onSuccess?: () => void;
  /** Whether current user can approve cross-team assignments (passed from parent) */
  canApproveCrossTeam?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewTeamWizard({
  open,
  onOpenChange,
  reviewId,
  onSuccess,
  canApproveCrossTeam = false,
}: ReviewTeamWizardProps) {
  const t = useTranslations("review.teamWizardDialog");
  const locale = useLocale();

  const [step, setStep] = useState(1);
  const [selectedTeam, setSelectedTeam] = useState<SelectedTeamMember[]>([]);

  // Handle dialog open/close with state reset
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (newOpen) {
      setStep(1);
      setSelectedTeam([]);
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  // Get review details
  const { data: review, isLoading: reviewLoading } = trpc.review.getById.useQuery(
    { id: reviewId },
    { enabled: open && !!reviewId }
  );

  // Get existing team
  const { data: existingTeam } = trpc.review.getTeam.useQuery(
    { reviewId },
    { enabled: open && !!reviewId }
  );

  // Assign team mutation
  const assignTeam = trpc.review.assignTeam.useMutation({
    onSuccess: () => {
      toast.success(t("success"));
      handleOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || t("error"));
    },
  });

  // Handle team assignment
  const handleAssign = () => {
    assignTeam.mutate({
      reviewId,
      members: selectedTeam.map((member) => ({
        userId: member.userId,
        reviewerProfileId: member.reviewerProfileId,
        role: member.role,
        assignedAreas: [],
      })),
    });
  };

  // Validation
  const hasLead = selectedTeam.some((m) => m.role === "LEAD_REVIEWER");
  const hasMinMembers = selectedTeam.length >= 2;
  const isTeamValid = hasLead && hasMinMembers;
  const isAssigning = assignTeam.isPending;

  // Format date for display
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return t("tbd");
    return format(new Date(date), "MMM d, yyyy");
  };

  // Get organization name based on locale
  const getOrgName = (org: { nameEn: string; nameFr?: string | null } | null | undefined) => {
    if (!org) return "—";
    return locale === "fr" && org.nameFr ? org.nameFr : org.nameEn;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] max-h-[800px] p-0 flex flex-col">
        {/* Fixed Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("title")}
            </DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                    step === s
                      ? "bg-primary text-primary-foreground"
                      : step > s
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {s === 1 && <FileText className="h-4 w-4" />}
                  {s === 2 && <Users className="h-4 w-4" />}
                  {s === 3 && <CheckCircle className="h-4 w-4" />}
                  <span className="hidden sm:inline">
                    {s === 1 && t("steps.review")}
                    {s === 2 && t("steps.select")}
                    {s === 3 && t("steps.confirm")}
                  </span>
                </div>
                {s < 3 && (
                  <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Step 1: Review Details */}
          {step === 1 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {reviewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : review ? (
                <>
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Review Info */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">{t("reviewInfo")}</h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                          <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t("hostOrganization")}</p>
                            <p className="font-medium">{getOrgName(review.hostOrganization)}</p>
                            {review.hostOrganization?.organizationCode && (
                              <Badge variant="outline" className="mt-1">
                                {review.hostOrganization.organizationCode}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t("location")}</p>
                            <p className="font-medium">
                              {review.hostOrganization?.country || "—"}
                              {review.hostOrganization?.region && ` • ${review.hostOrganization.region}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                          <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t("scheduledDates")}</p>
                            <p className="font-medium">
                              {formatDate(review.plannedStartDate)} — {formatDate(review.plannedEndDate)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Review Scope */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">{t("reviewScope")}</h3>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge>{t(`types.${review.reviewType}`)}</Badge>
                          <Badge variant="outline">{review.referenceNumber}</Badge>
                          <Badge variant="secondary">{t(`status.${review.status}`)}</Badge>
                        </div>

                        {review.areasInScope && review.areasInScope.length > 0 && (
                          <div className="p-3 rounded-lg border bg-muted/30">
                            <p className="text-sm text-muted-foreground mb-2">{t("areasInScope")}</p>
                            <div className="flex flex-wrap gap-1">
                              {review.areasInScope.map((area) => (
                                <Badge key={area} variant="outline" className="text-xs">
                                  {area}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {review.languagePreference && (
                          <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{t(`language.${review.languagePreference}`)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Existing Team Warning */}
                  {existingTeam && existingTeam.length > 0 && (
                    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-700 dark:text-amber-400">
                        <span className="font-medium">{t("existingTeamWarning.title")}: </span>
                        {t("existingTeamWarning.description", { count: existingTeam.length })}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {existingTeam.map((member) => (
                            <Badge key={member.id} variant="outline" className="text-xs">
                              {member.user.firstName} {member.user.lastName}
                              {member.role === "LEAD_REVIEWER" && (
                                <Star className="h-3 w-3 ml-1 text-yellow-500" />
                              )}
                            </Badge>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {t("reviewNotFound")}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Team - Full Width */}
          {step === 2 && (
            <ReviewerSelector
              reviewId={reviewId}
              selectedTeam={selectedTeam}
              onTeamChange={setSelectedTeam}
              locale={locale}
              maxTeamSize={5}
              minTeamSize={2}
              canApproveCrossTeam={canApproveCrossTeam ?? false}
            />
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Team Ready Alert */}
              {isTeamValid && (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    {t("validation.readyDescription", { count: selectedTeam.length })}
                  </AlertDescription>
                </Alert>
              )}

              {/* Validation Warnings */}
              {!hasLead && (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700 dark:text-red-400">
                    <span className="font-medium">{t("validation.noLead")}: </span>
                    {t("validation.noLeadDescription")}
                  </AlertDescription>
                </Alert>
              )}

              {!hasMinMembers && (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700 dark:text-red-400">
                    {t("validation.minMembers")}
                  </AlertDescription>
                </Alert>
              )}

              {/* Team Summary */}
              <div className="space-y-3">
                <h4 className="font-semibold text-lg">{t("teamSummary")}</h4>
                {selectedTeam
                  .sort((a, b) => {
                    if (a.role === "LEAD_REVIEWER") return -1;
                    if (b.role === "LEAD_REVIEWER") return 1;
                    return 0;
                  })
                  .map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary">
                          {member.fullName
                            .split(" ")
                            .map((n) => n.charAt(0))
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{member.fullName}</p>
                            {member.isLeadQualified && (
                              <Star className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          {member.organization && (
                            <p className="text-sm text-muted-foreground">
                              {member.organization}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">{t("matchScore")}</p>
                          <p className="font-medium">{member.matchScore}</p>
                        </div>
                        <Badge
                          className={cn(
                            member.role === "LEAD_REVIEWER"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          )}
                        >
                          {t(`roles.${member.role}`)}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t bg-background">
          <div className="flex items-center justify-between">
            <div>
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  {t("back")}
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                  {t("cancel")}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Team Status Indicator (Step 2 only) */}
              {step === 2 && (
                <div className="hidden sm:flex items-center gap-2 text-sm">
                  {isTeamValid ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      {t("teamValid")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {!hasLead && t("needsLead")}
                      {hasLead && !hasMinMembers && t("needsMoreMembers", { min: 2 })}
                    </span>
                  )}
                </div>
              )}

              {step < 3 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={step === 2 && !isTeamValid}
                >
                  {t("next")}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleAssign}
                  disabled={isAssigning || !isTeamValid}
                  className="min-w-[140px]"
                >
                  {isAssigning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("assigning")}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t("assignTeam")}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ReviewTeamWizard;
