"use client";

/**
 * Review Detail View Component
 *
 * Displays comprehensive details of a peer review request including:
 * - Status and basic information
 * - Host organization details
 * - Schedule information
 * - Logistics and contact details
 * - Linked assessments
 * - Review team members
 * - Real-time collaboration features
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// Feature Components
import { ReviewTeamWizard } from "./review-team-wizard";
import { ReportActions } from "./report-actions";
import { ReviewActionButton } from "./review-action-button";
import { ReviewNextActions } from "./review-next-actions";
import { ReviewTimeline } from "./review-timeline";
import { FieldworkChecklistEnhanced } from "./fieldwork-checklist-enhanced";
import { ReviewDocumentsEnhanced } from "./review-documents-enhanced";
import { ReviewWorkspace } from "./review-workspace";

// Collaboration Components
import {
  SessionBanner,
  SessionPanel,
  ActivityFeedButton,
  CollaborativeContainer,
  PresenceAvatars,
} from "@/components/collaboration";
import { useLiveSync } from "@/hooks/use-live-sync";

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Icons
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Edit,
  FileText,
  Globe,
  History,
  Mail,
  MapPin,
  Phone,
  User,
  UserPlus,
  Users,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export interface ReviewDetailViewProps {
  reviewId: string;
  locale: string;
  userId?: string;
  userRole?: string;
  userOrganizationId?: string;
}

// Programme Management roles that can assign review teams
const MANAGEMENT_ROLES = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "STEERING_COMMITTEE",
  "PROGRAMME_COORDINATOR",
];

// Roles that can approve cross-team reviewer assignments
const CROSS_TEAM_APPROVER_ROLES = [
  "PROGRAMME_COORDINATOR",
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
];

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_CONFIG: Record<
  string,
  { color: string; bgColor: string; icon: typeof CheckCircle2 }
> = {
  REQUESTED: {
    color: "text-yellow-700",
    bgColor: "bg-yellow-100 border-yellow-300",
    icon: Clock,
  },
  APPROVED: {
    color: "text-blue-700",
    bgColor: "bg-blue-100 border-blue-300",
    icon: CheckCircle2,
  },
  SCHEDULED: {
    color: "text-indigo-700",
    bgColor: "bg-indigo-100 border-indigo-300",
    icon: Calendar,
  },
  IN_PROGRESS: {
    color: "text-purple-700",
    bgColor: "bg-purple-100 border-purple-300",
    icon: Users,
  },
  COMPLETED: {
    color: "text-green-700",
    bgColor: "bg-green-100 border-green-300",
    icon: CheckCircle2,
  },
  CANCELLED: {
    color: "text-red-700",
    bgColor: "bg-red-100 border-red-300",
    icon: AlertCircle,
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewDetailView({
  reviewId,
  locale,
  userId,
  userRole,
  userOrganizationId,
}: ReviewDetailViewProps) {
  const t = useTranslations("review.detail");
  const utils = trpc.useUtils();

  // Team assignment wizard state
  const [teamWizardOpen, setTeamWizardOpen] = useState(false);
  // Timeline collapsible state
  const [timelineOpen, setTimelineOpen] = useState(false);

  // Permission checks
  const canManageTeams = userRole ? MANAGEMENT_ROLES.includes(userRole) : false;
  const canApproveCrossTeam = userRole
    ? CROSS_TEAM_APPROVER_ROLES.includes(userRole)
    : false;

  // Fetch review data
  const {
    data: review,
    isLoading,
    error,
    refetch: refetchReview,
  } = trpc.review.getById.useQuery({ id: reviewId });

  // Fetch active collaboration session (only if authenticated)
  const { data: activeSession } = trpc.collaboration.getActiveSession.useQuery(
    { reviewId },
    {
      enabled: !!userId,
      refetchInterval: 30000,
    }
  );

  // Live sync hook - handles presence and live updates
  const {
    members,
    isConnected,
    updateFocus,
    recentUpdates,
  } = useLiveSync({
    reviewId,
    showToasts: true,
    onFindingsChange: () => {
      // Refetch review when remote changes occur
      refetchReview();
    },
  });

  // Check if current user is session host
  const isHost = activeSession?.startedById === userId;
  const isInSession = activeSession?.participants.some(
    (p: { userId: string }) => p.userId === userId
  );

  // Count of recent updates for activity feed badge
  // The useLiveSync hook already manages which updates are "recent"
  const unreadActivityCount = recentUpdates.length;

  // Loading state
  if (isLoading) {
    return <ReviewDetailSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href={`/${locale}/reviews`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToReviews")}
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error.title")}</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Not found state
  if (!review) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href={`/${locale}/reviews`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToReviews")}
          </Link>
        </Button>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error.notFound")}</AlertTitle>
          <AlertDescription>{t("error.notFoundDescription")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[review.status] || STATUS_CONFIG.REQUESTED;
  const StatusIcon = statusConfig.icon;

  // Check if review can be edited (only in REQUESTED status)
  const canEdit = review.status === "REQUESTED";

  // Check if team assignment is possible based on review status
  const isAssignableStatus = ["REQUESTED", "APPROVED", "PLANNING", "SCHEDULED"].includes(review.status);

  // Check for COI - user cannot assign team to their own org's review (except SUPER_ADMIN)
  const hasTeamCOI = userRole !== "SUPER_ADMIN" && userOrganizationId === review.hostOrganization.id;

  // Final check: user must have management permission, review in right status, and no COI
  const canAssignTeam = canManageTeams && isAssignableStatus && !hasTeamCOI;

  // Get organization name based on locale
  const orgName =
    locale === "fr" && review.hostOrganization.nameFr
      ? review.hostOrganization.nameFr
      : review.hostOrganization.nameEn;

  return (
    <CollaborativeContainer reviewId={reviewId} showCursors={!!isInSession}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" size="sm" className="mb-4" asChild>
            <Link href={`/${locale}/reviews`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("backToReviews")}
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{review.referenceNumber}</h1>
            <Badge className={cn("border", statusConfig.bgColor, statusConfig.color)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {t(`status.${review.status.toLowerCase()}`)}
            </Badge>
          </div>

          <p className="text-muted-foreground mt-1">
            {t("createdOn", {
              date: format(new Date(review.createdAt), "PPP"),
            })}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Online members */}
          {members.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Online:</span>
              <PresenceAvatars members={members} maxVisible={4} size="sm" />
            </div>
          )}

          {/* Activity feed button */}
          <ActivityFeedButton
            activities={recentUpdates.map((u) => ({
              id: u.id,
              type: u.type as "member_joined" | "member_left" | "finding_created" | "finding_updated" | "finding_deleted" | "comment_added" | "document_uploaded" | "task_completed" | "focus_change",
              user: {
                id: "",
                name: u.user,
                color: "#6366f1",
                avatar: u.user.slice(0, 2).toUpperCase(),
              },
              message: u.message.replace(u.user, "").trim(),
              timestamp: u.timestamp,
            }))}
            unreadCount={unreadActivityCount}
          />

          {/* Session panel (if in session) */}
          {activeSession && isInSession && (
            <SessionPanel
              reviewId={reviewId}
              sessionId={activeSession.id}
              isHost={!!isHost}
            />
          )}

          {/* Smart Action Button */}
          <ReviewActionButton
            reviewId={reviewId}
            onAssignTeam={() => setTeamWizardOpen(true)}
            onSetDates={() => {
              // Could open a date picker dialog here
              // For now, redirect to edit page
              window.location.href = `/${locale}/reviews/${reviewId}/edit`;
            }}
            onSuccess={() => {
              utils.review.getById.invalidate({ id: reviewId });
            }}
          />

          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/reviews/${reviewId}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                {t("edit")}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Session banner */}
      <SessionBanner
        reviewId={reviewId}
        reviewReference={review.referenceNumber}
      />

      {/* Connection status indicator */}
      {activeSession && !isConnected && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
          Reconnecting to collaboration session...
        </div>
      )}

      {/* Workflow Progress Panel - Always visible for management */}
      {canManageTeams && (
        <ReviewNextActions
          reviewId={reviewId}
          onAssignTeam={() => setTeamWizardOpen(true)}
          onSetDates={() => {
            window.location.href = `/${locale}/reviews/${reviewId}/edit`;
          }}
          onSuccess={() => {
            utils.review.getById.invalidate({ id: reviewId });
          }}
        />
      )}

      {/* Review Timeline - Collapsible panel */}
      <Collapsible open={timelineOpen} onOpenChange={setTimelineOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  {t("timeline.title")}
                </CardTitle>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform duration-200",
                    timelineOpen && "rotate-180"
                  )}
                />
              </div>
              <CardDescription>{t("timeline.description")}</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <ReviewTimeline
                review={{
                  id: review.id,
                  status: review.status,
                  requestedDate: review.requestedDate,
                  requestedStartDate: review.requestedStartDate,
                  requestedEndDate: review.requestedEndDate,
                  plannedStartDate: review.plannedStartDate,
                  plannedEndDate: review.plannedEndDate,
                  actualStartDate: review.actualStartDate,
                  actualEndDate: review.actualEndDate,
                  createdAt: review.createdAt,
                  updatedAt: review.updatedAt,
                  teamMembers: review.teamMembers,
                  approvals: review.approvals,
                  report: review.report,
                  findings: review.findings,
                }}
                showDurations={true}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Host Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t("hostOrganization")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-semibold text-lg">{orgName}</p>
              <div className="flex items-center gap-2 text-muted-foreground">
                {review.hostOrganization.organizationCode && (
                  <>
                    <Badge variant="outline">
                      {review.hostOrganization.organizationCode}
                    </Badge>
                    <span>•</span>
                  </>
                )}
                <span>{review.hostOrganization.country}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("reviewType")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">
              {t(`types.${review.reviewType.toLowerCase()}`)}
            </p>
            {review.areasInScope && review.areasInScope.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {review.areasInScope.map((area) => (
                  <Badge key={area} variant="secondary" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t("schedule")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {review.requestedStartDate && review.requestedEndDate && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("requestedDates")}
                </p>
                <p className="font-medium">
                  {format(new Date(review.requestedStartDate), "PPP")} -{" "}
                  {format(new Date(review.requestedEndDate), "PPP")}
                </p>
              </div>
            )}
            {review.plannedStartDate && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("plannedDates")}
                </p>
                <p className="font-medium">
                  {format(new Date(review.plannedStartDate), "PPP")} -
                  {review.plannedEndDate
                    ? format(new Date(review.plannedEndDate), "PPP")
                    : t("tbd")}
                </p>
              </div>
            )}
            {review.actualStartDate && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("actualDates")}
                </p>
                <p className="font-medium">
                  {format(new Date(review.actualStartDate), "PPP")} -
                  {review.actualEndDate
                    ? format(new Date(review.actualEndDate), "PPP")
                    : t("ongoing")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t("logistics")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{t(`location.${review.locationType.toLowerCase()}`)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span>
                {t(`language.${review.languagePreference.toLowerCase()}`)}
              </span>
            </div>
            <div className="flex gap-2 mt-2">
              {review.accommodationProvided && (
                <Badge variant="secondary">{t("accommodationProvided")}</Badge>
              )}
              {review.transportationProvided && (
                <Badge variant="secondary">{t("transportationProvided")}</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Primary Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("primaryContact")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {review.primaryContactName && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{review.primaryContactName}</span>
              </div>
            )}
            {review.primaryContactEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${review.primaryContactEmail}`}
                  className="text-primary hover:underline"
                >
                  {review.primaryContactEmail}
                </a>
              </div>
            )}
            {review.primaryContactPhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{review.primaryContactPhone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked Assessments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("linkedAssessments")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {review.assessments && review.assessments.length > 0 ? (
              <div className="space-y-2">
                {review.assessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                  >
                    <span className="font-medium">{assessment.title}</span>
                    <Badge
                      variant={
                        assessment.status === "SUBMITTED"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {assessment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">{t("noAssessments")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Team */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t("reviewTeam")}
              </CardTitle>
              <CardDescription>{t("reviewTeamDescription")}</CardDescription>
            </div>
            {/* Only show "Assign Team" button if no team assigned yet */}
            {canAssignTeam && review.teamMembers.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTeamWizardOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {t("assignTeam")}
              </Button>
            )}
            {/* Show "Modify Team" button if team exists and user can manage */}
            {canAssignTeam && review.teamMembers.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTeamWizardOpen(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                {t("modifyTeam")}
              </Button>
            )}
          </div>

          {/* COI Warning for management users */}
          {canManageTeams && hasTeamCOI && isAssignableStatus && (
            <Alert className="mt-4 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                {t("coiCannotAssign")}
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          {review.teamMembers && review.teamMembers.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {review.teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {member.user.firstName} {member.user.lastName}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {t(`teamRole.${member.role.toLowerCase()}`)}
                      </Badge>
                      {member.reviewerProfile?.isLeadQualified && (
                        <Badge variant="secondary" className="text-xs">
                          {t("leadQualified")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>{t("noTeamMembers")}</p>
              {canAssignTeam && (
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setTeamWizardOpen(true)}
                >
                  {t("assignTeamNow")}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fieldwork Checklist - shown for team members on active reviews */}
      {review.teamMembers.length > 0 &&
        ["APPROVED", "PLANNING", "SCHEDULED", "IN_PROGRESS", "REPORT_DRAFTING"].includes(review.status) && (
        <div data-focus-id="checklist:fieldwork" onClick={() => updateFocus("checklist:fieldwork")}>
          <FieldworkChecklistEnhanced
            reviewId={reviewId}
            locale={locale}
            canEdit={
              review.teamMembers.some((m) => m.user.id === userId) ||
              canManageTeams
            }
            canOverride={["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(userRole || "")}
          />
        </div>
      )}

      {/* Team Workspace - shown for team members on active reviews */}
      {review.teamMembers.length > 0 &&
        ["APPROVED", "PLANNING", "SCHEDULED", "IN_PROGRESS", "REPORT_DRAFTING"].includes(review.status) && (
        <div data-focus-id="workspace:main" onClick={() => updateFocus("workspace:main")}>
          <ReviewWorkspace
            reviewId={reviewId}
            locale={locale}
            userId={userId || ""}
          />
        </div>
      )}

      {/* Document Manager */}
      <ReviewDocumentsEnhanced
        reviewId={reviewId}
        locale={locale}
        canUpload={
          canManageTeams ||
          review.teamMembers.some((m) => m.user.id === userId) ||
          userOrganizationId === review.hostOrganization.id
        }
        canReview={
          canManageTeams ||
          review.teamMembers.some(
            (m) => m.user.id === userId && m.role === "LEAD_REVIEWER"
          ) ||
          review.teamMembers.some((m) => m.user.id === userId)
        }
        canApprove={
          canManageTeams ||
          review.teamMembers.some(
            (m) => m.user.id === userId && m.role === "LEAD_REVIEWER"
          )
        }
        canDelete={
          ["SUPER_ADMIN", "SYSTEM_ADMIN"].includes(userRole || "") ||
          review.teamMembers.some(
            (m) => m.user.id === userId && m.role === "LEAD_REVIEWER"
          )
        }
      />

      {/* Report Actions */}
      <ReportActions
        reviewId={reviewId}
        reviewStatus={review.status}
        locale={locale}
        report={review.report}
        canGenerateReport={canManageTeams}
        canPublishReport={userRole === "SUPER_ADMIN" || userRole === "SYSTEM_ADMIN" || userRole === "STEERING_COMMITTEE"}
      />

      {/* Special Requirements */}
      {review.specialRequirements && (
        <Card>
          <CardHeader>
            <CardTitle>{t("specialRequirements")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{review.specialRequirements}</p>
          </CardContent>
        </Card>
      )}

      {/* Findings Summary (if any) */}
      {review.findings && review.findings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {t("findings")}
            </CardTitle>
            <CardDescription>
              {t("findingsCount", { count: review.findings.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {review.findings.slice(0, 5).map((finding) => (
                <div
                  key={finding.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {locale === "fr" ? finding.titleFr || finding.titleEn : finding.titleEn}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {finding.referenceNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        finding.severity === "CRITICAL"
                          ? "destructive"
                          : finding.severity === "MAJOR"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {finding.severity}
                    </Badge>
                    <Badge variant="outline">{finding.status}</Badge>
                  </div>
                </div>
              ))}
              {review.findings.length > 5 && (
                <Button variant="link" className="w-full" asChild>
                  <Link href={`/${locale}/reviews/${reviewId}/findings`}>
                    {t("viewAllFindings", {
                      count: review.findings.length - 5,
                    })}
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Team Assignment Wizard */}
      <ReviewTeamWizard
        open={teamWizardOpen}
        onOpenChange={setTeamWizardOpen}
        reviewId={reviewId}
        onSuccess={() => {
          utils.review.getById.invalidate({ id: reviewId });
        }}
        canApproveCrossTeam={canApproveCrossTeam}
      />
    </div>
    </CollaborativeContainer>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

function ReviewDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
