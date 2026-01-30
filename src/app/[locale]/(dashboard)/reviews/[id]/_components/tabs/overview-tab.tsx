"use client";

import type { ReviewData, ReviewCounts } from "../../_lib/fetch-review-data";
import { ProgressDashboard } from "./overview/progress-dashboard";
import { QuickActions } from "./overview/quick-actions";
import { RecentActivity } from "./overview/recent-activity";
import { AttentionNeeded } from "./overview/attention-needed";
import { StatsCard } from "./overview/stats-card";
import { TeamCard } from "./overview/team-card";
import { ScheduleCard } from "./overview/schedule-card";
import { HostCard } from "./overview/host-card";

interface OverviewTabProps {
  review: ReviewData;
  counts: ReviewCounts;
  fieldworkProgress?: {
    total: number;
    completed: number;
    percentage: number;
  };
  canEdit?: boolean;
}

export function OverviewTab({ review, counts, fieldworkProgress, canEdit = true }: OverviewTabProps) {
  // Determine current phase based on status
  const getCurrentPhase = (): "PLANNING" | "PREPARATION" | "ON_SITE" | "POST_REVIEW" => {
    switch (review.status) {
      case "REQUESTED":
      case "APPROVED":
      case "PLANNING":
        return "PLANNING";
      case "SCHEDULED":
        return "PREPARATION";
      case "IN_PROGRESS":
        return "ON_SITE";
      case "REPORT_DRAFTING":
      case "REPORT_REVIEW":
      case "COMPLETED":
      case "CANCELLED":
        return "POST_REVIEW";
      default:
        return "PLANNING";
    }
  };

  const defaultFieldworkProgress = fieldworkProgress || { total: 14, completed: 12, percentage: 86 };

  // Transform teamMembers to lead reviewer and reviewers
  const leadReviewer = review.teamMembers.find(tm => tm.role === "LEAD_REVIEWER");
  const reviewers = review.teamMembers.filter(tm => tm.role !== "LEAD_REVIEWER");

  // Transform team member data for TeamCard
  const transformedLeadReviewer = leadReviewer ? {
    id: leadReviewer.user.id,
    name: `${leadReviewer.user.firstName} ${leadReviewer.user.lastName}`,
    image: null,
    role: leadReviewer.role,
  } : null;

  const transformedReviewers = reviewers.map(tm => ({
    id: tm.user.id,
    name: `${tm.user.firstName} ${tm.user.lastName}`,
    image: null,
    role: tm.role,
  }));

  // Mock activities for demo (will be replaced with real data)
  const activities: Array<{
    id: string;
    type: "DISCUSSION" | "DOCUMENT" | "FINDING" | "TASK" | "STATUS_CHANGE";
    titleEn: string;
    titleFr: string;
    user: { name: string; image: string | null };
    createdAt: Date;
  }> = [];

  // Mock attention items (will be replaced with real data)
  const attentionItems: Array<{
    id: string;
    type: "CRITICAL_FINDING" | "OVERDUE_TASK" | "MISSING_DOCUMENT" | "PENDING_CAP";
    titleEn: string;
    titleFr: string;
    severity: "high" | "medium" | "low";
    href: string;
  }> = [];

  // Get location type display
  const getLocationDisplay = () => {
    switch (review.locationType) {
      case "ON_SITE":
        return "On-Site";
      case "REMOTE":
        return "Remote";
      case "HYBRID":
        return "Hybrid";
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        {/* Left Column - 3/5 width on large screens */}
        <div className="lg:col-span-3 space-y-4 md:space-y-6">
          {/* Progress Dashboard */}
          <ProgressDashboard
            currentPhase={getCurrentPhase()}
            fieldworkProgress={defaultFieldworkProgress}
            status={review.status}
          />

          {/* Quick Actions */}
          <QuickActions reviewId={review.id} canEdit={canEdit} />

          {/* Attention Needed */}
          <AttentionNeeded
            items={attentionItems}
            reviewId={review.id}
          />

          {/* Recent Activity */}
          <RecentActivity
            activities={activities}
            reviewId={review.id}
          />
        </div>

        {/* Right Column - 2/5 width on large screens */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Stats Card */}
          <StatsCard reviewId={review.id} counts={counts} />

          {/* Team Card */}
          <TeamCard
            leadReviewer={transformedLeadReviewer}
            reviewers={transformedReviewers}
            reviewId={review.id}
          />

          {/* Schedule Card */}
          <ScheduleCard
            scheduledStartDate={review.plannedStartDate}
            scheduledEndDate={review.plannedEndDate}
            onSiteStartDate={review.actualStartDate}
            onSiteEndDate={review.actualEndDate}
            location={getLocationDisplay()}
          />

          {/* Host Organization */}
          <HostCard
            organization={review.hostOrganization}
            primaryContact={review.primaryContactName ? {
              name: review.primaryContactName,
              email: review.primaryContactEmail || "",
              phone: review.primaryContactPhone || undefined,
            } : null}
          />
        </div>
      </div>
    </div>
  );
}
