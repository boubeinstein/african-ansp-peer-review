"use client";

/**
 * JoinRequestDetail Component
 *
 * Displays full details of a join request with review forms
 * for coordinators and steering committee members.
 */

import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { UserRole, JoinRequestStatus } from "@prisma/client";
import {
  ArrowLeft,
  Building2,
  User,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc/client";
import { CoordinatorReviewForm } from "./coordinator-review-form";
import { SCDecisionForm } from "./sc-decision-form";

interface JoinRequestDetailProps {
  id: string;
  userRole: UserRole;
  userId: string;
  onBack: () => void;
}

export function JoinRequestDetail({
  id,
  userRole,
  onBack,
}: JoinRequestDetailProps) {
  const t = useTranslations("joinRequestAdmin");
  const tStatus = useTranslations("joinRequest.status");
  const tForm = useTranslations("joinRequest.form");
  const locale = useLocale();

  const {
    data: request,
    isLoading,
    refetch,
  } = trpc.joinRequest.getById.useQuery({ id });

  const coordinatorRoles: UserRole[] = [
    UserRole.SUPER_ADMIN,
    UserRole.SYSTEM_ADMIN,
    UserRole.PROGRAMME_COORDINATOR,
  ];
  const scRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.STEERING_COMMITTEE];

  const isCoordinator = coordinatorRoles.includes(userRole);
  const isSC = scRoles.includes(userRole);

  const canCoordinatorReview =
    isCoordinator &&
    (request?.status === JoinRequestStatus.PENDING ||
      request?.status === JoinRequestStatus.COORDINATOR_REVIEW);

  const canSCDecide = isSC && request?.status === JoinRequestStatus.SC_REVIEW;

  // Get organization name based on locale
  const getOrgName = (org: { nameEn: string; nameFr: string }) => {
    return locale === "fr" ? org.nameFr : org.nameEn;
  };

  // Get user full name
  const getUserName = (user: { firstName: string; lastName: string } | null) => {
    if (!user) return "Unknown";
    return `${user.firstName} ${user.lastName}`;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!request) {
    return <div className="text-center py-8">Request not found</div>;
  }

  const maturityLabels: Record<string, string> = {
    A: tForm("maturityA"),
    B: tForm("maturityB"),
    C: tForm("maturityC"),
    D: tForm("maturityD"),
    E: tForm("maturityE"),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {getOrgName(request.organization)}
          </h1>
          <p className="text-slate-600">
            {request.organization.icaoCode} • Submitted{" "}
            {format(new Date(request.createdAt), "MMMM d, yyyy")}
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            request.status === JoinRequestStatus.APPROVED
              ? "bg-green-50 text-green-700"
              : request.status === JoinRequestStatus.REJECTED
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700"
          }
        >
          {tStatus(request.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Organization Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {t("detail.organizationInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Organization</p>
                  <p className="font-medium">
                    {getOrgName(request.organization)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">ICAO Code</p>
                  <p className="font-medium">
                    {request.organization.icaoCode || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Country</p>
                  <p className="font-medium">{request.organization.country}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {t("detail.contactInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Name</p>
                  <p className="font-medium">{request.contactName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Job Title</p>
                  <p className="font-medium">{request.contactJobTitle}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-medium">{request.contactEmail}</p>
                </div>
                {request.contactPhone && (
                  <div>
                    <p className="text-sm text-slate-500">Phone</p>
                    <p className="font-medium">{request.contactPhone}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Application Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t("detail.applicationInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {request.currentSmsMaturity && (
                  <div>
                    <p className="text-sm text-slate-500">SMS Maturity</p>
                    <p className="font-medium">
                      {maturityLabels[request.currentSmsMaturity]}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-500">Proposed Reviewers</p>
                  <p className="font-medium">{request.proposedReviewerCount}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Preferred Language</p>
                  <p className="font-medium">
                    {request.preferredLanguage === "both"
                      ? "English & French"
                      : request.preferredLanguage === "fr"
                        ? "French"
                        : "English"}
                  </p>
                </div>
                {request.preferredTeam && (
                  <div>
                    <p className="text-sm text-slate-500">Preferred Team</p>
                    <p className="font-medium">Team {request.preferredTeam}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-sm text-slate-500 mb-2">
                  Motivation Statement
                </p>
                <p className="text-sm bg-slate-50 p-4 rounded-lg">
                  {request.motivationStatement}
                </p>
              </div>

              {request.additionalNotes && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Additional Notes</p>
                  <p className="text-sm bg-slate-50 p-4 rounded-lg">
                    {request.additionalNotes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Review Forms */}
        <div className="space-y-6">
          {/* Coordinator Review */}
          {canCoordinatorReview && (
            <CoordinatorReviewForm
              requestId={id}
              onSuccess={() => refetch()}
            />
          )}

          {/* Coordinator Review Summary (if already reviewed) */}
          {request.coordinatorReviewedAt && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("detail.coordinatorReview")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-slate-500">Reviewed by</p>
                  <p className="font-medium">
                    {getUserName(request.coordinatorReviewedBy)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Recommendation</p>
                  <Badge
                    variant="outline"
                    className={
                      request.coordinatorRecommendation === "APPROVE"
                        ? "bg-green-50 text-green-700"
                        : request.coordinatorRecommendation === "REJECT"
                          ? "bg-red-50 text-red-700"
                          : "bg-orange-50 text-orange-700"
                    }
                  >
                    {request.coordinatorRecommendation}
                  </Badge>
                </div>
                {request.coordinatorRecommendedTeam && (
                  <div>
                    <p className="text-slate-500">Recommended Team</p>
                    <p className="font-medium">
                      Team {request.coordinatorRecommendedTeam}
                    </p>
                  </div>
                )}
                {request.coordinatorNotes && (
                  <div>
                    <p className="text-slate-500">Notes</p>
                    <p className="bg-slate-50 p-2 rounded">
                      {request.coordinatorNotes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* SC Decision Form */}
          {canSCDecide && (
            <SCDecisionForm
              requestId={id}
              recommendedTeam={request.coordinatorRecommendedTeam}
              onSuccess={() => refetch()}
            />
          )}

          {/* SC Decision Summary (if already decided) */}
          {request.scDecisionAt && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("detail.scDecision")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-slate-500">Decided by</p>
                  <p className="font-medium">
                    {getUserName(request.scDecisionBy)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Decision</p>
                  <Badge
                    variant="outline"
                    className={
                      request.scDecision === "APPROVED"
                        ? "bg-green-50 text-green-700"
                        : request.scDecision === "REJECTED"
                          ? "bg-red-50 text-red-700"
                          : "bg-orange-50 text-orange-700"
                    }
                  >
                    {request.scDecision}
                  </Badge>
                </div>
                {request.scAssignedTeam && (
                  <div>
                    <p className="text-slate-500">Assigned Team</p>
                    <p className="font-medium">Team {request.scAssignedTeam}</p>
                  </div>
                )}
                {request.scDecisionNotes && (
                  <div>
                    <p className="text-slate-500">Notes</p>
                    <p className="bg-slate-50 p-2 rounded">
                      {request.scDecisionNotes}
                    </p>
                  </div>
                )}
                {request.rejectionReason && (
                  <div>
                    <p className="text-slate-500">Rejection Reason</p>
                    <p className="bg-red-50 p-2 rounded text-red-700">
                      {request.rejectionReason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
