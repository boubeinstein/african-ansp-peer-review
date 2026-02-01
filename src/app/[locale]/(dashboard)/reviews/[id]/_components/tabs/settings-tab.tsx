"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  Building2,
  Calendar,
  Users,
  FileText,
  Edit,
  Trash2,
  Mail,
  Phone,
  Link2,
  ExternalLink,
  AlertTriangle,
  Loader2,
  ClipboardList,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useRouter } from "next/navigation";
import type { ReviewData } from "../../_lib/fetch-review-data";

interface SettingsTabProps {
  review: ReviewData;
  canEdit?: boolean;
}

export function SettingsTab({ review, canEdit = true }: SettingsTabProps) {
  const t = useTranslations("reviews.detail.settings");
  const tStatus = useTranslations("reviews.status");
  const tType = useTranslations("reviews.type");
  const tPhase = useTranslations("reviews.phase");
  const locale = useLocale();
  const router = useRouter();
  const dateLocale = locale === "fr" ? fr : enUS;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();

  const formatDateRange = (
    start: Date | null | undefined,
    end: Date | null | undefined
  ) => {
    if (!start && !end) return t("notScheduled");
    if (start && !end)
      return format(new Date(start), "PPP", { locale: dateLocale });
    if (!start && end)
      return format(new Date(end), "PPP", { locale: dateLocale });
    return `${format(new Date(start!), "PPP", { locale: dateLocale })} - ${format(new Date(end!), "PPP", { locale: dateLocale })}`;
  };

  const orgName =
    locale === "fr"
      ? review.hostOrganization.nameFr
      : review.hostOrganization.nameEn;

  // Find lead reviewer from team members
  type TeamMemberType = { id: string; role: string; user: { firstName: string; lastName: string; email: string } };
  const leadReviewer = review.teamMembers.find(
    (m: TeamMemberType) => m.role === "LEAD_REVIEWER"
  );

  // Get non-lead team members
  const teamMembers: TeamMemberType[] = review.teamMembers.filter(
    (m: TeamMemberType) => m.role !== "LEAD_REVIEWER"
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    // Note: Delete mutation would go here if the endpoint exists
    // For now, just show a message
    setIsDeleting(false);
    setShowDeleteDialog(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {canEdit && (
          <Button
            variant="outline"
            onClick={() => router.push(`/${locale}/reviews/${review.id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            {t("editReview")}
          </Button>
        )}
      </div>

      {/* Review Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("reviewDetails")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("reviewNumber")}
              </p>
              <p className="font-medium font-mono">{review.referenceNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("reviewType")}</p>
              <p className="font-medium">{tType(review.reviewType)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("status")}</p>
              <Badge variant="outline">{tStatus(review.status)}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("phase")}</p>
              <Badge variant="secondary">{tPhase(review.phase)}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("created")}</p>
              <p className="text-sm">
                {format(new Date(review.createdAt), "PPP", {
                  locale: dateLocale,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("updated")}</p>
              <p className="text-sm">
                {format(new Date(review.updatedAt), "PPP", {
                  locale: dateLocale,
                })}
              </p>
            </div>
          </div>

          {review.objectives && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t("objectives")}
              </p>
              <p className="text-sm">{review.objectives}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Host Organization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {t("hostOrganization")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{orgName}</p>
              <p className="text-sm text-muted-foreground">
                {review.hostOrganization.code}
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a
                href={`/${locale}/organizations/${review.hostOrganization.id}`}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                {t("viewOrganization")}
              </a>
            </Button>
          </div>

          {(review.primaryContactName || review.primaryContactEmail) && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {t("primaryContact")}
                </p>
                <div className="space-y-1">
                  {review.primaryContactName && (
                    <p className="font-medium">{review.primaryContactName}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    {review.primaryContactEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        {review.primaryContactEmail}
                      </span>
                    )}
                    {review.primaryContactPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {review.primaryContactPhone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Schedule & Logistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t("scheduleLogistics")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("plannedPeriod")}
              </p>
              <p className="font-medium">
                {formatDateRange(
                  review.plannedStartDate,
                  review.plannedEndDate
                )}
              </p>
            </div>
            {(review.actualStartDate || review.actualEndDate) && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("actualPeriod")}
                </p>
                <p className="font-medium">
                  {formatDateRange(
                    review.actualStartDate,
                    review.actualEndDate
                  )}
                </p>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-muted-foreground">
              {t("locationType")}
            </p>
            <p className="font-medium">{t(`location.${review.locationType}`)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Review Team */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t("reviewTeam")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lead Reviewer */}
          {leadReviewer && (
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {getInitials(
                      leadReviewer.user.firstName,
                      leadReviewer.user.lastName
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {leadReviewer.user.firstName} {leadReviewer.user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {leadReviewer.user.email}
                  </p>
                </div>
              </div>
              <Badge>{t("leadReviewer")}</Badge>
            </div>
          )}

          {/* Team Members */}
          {teamMembers.length > 0 ? (
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-sm">
                        {getInitials(
                          member.user.firstName,
                          member.user.lastName
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {member.user.firstName} {member.user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{t(`roles.${member.role}`)}</Badge>
                </div>
              ))}
            </div>
          ) : (
            !leadReviewer && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("noTeamMembers")}
              </p>
            )
          )}
        </CardContent>
      </Card>

      {/* Linked Assessments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            {t("linkedAssessments")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {review.assessments && review.assessments.length > 0 ? (
            <div className="space-y-2">
              {review.assessments.map((assessment: { id: string; title: string; status: string }) => (
                <div
                  key={assessment.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{assessment.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{assessment.status}</Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/${locale}/assessments/${assessment.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("noLinkedAssessments")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {canEdit && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {t("dangerZone")}
            </CardTitle>
            <CardDescription>{t("dangerZoneDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("deleteReview")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
