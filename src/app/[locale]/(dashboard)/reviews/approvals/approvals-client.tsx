"use client";

/**
 * Approvals Page Client Component
 *
 * Dashboard for reviewing and processing peer review requests.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReviewApprovalPanel } from "@/components/features/review/review-approval-panel";

// =============================================================================
// TYPES
// =============================================================================

interface ApprovalsPageClientProps {
  userRole: string;
}

// =============================================================================
// STATS CARDS
// =============================================================================

function StatsCards() {
  const t = useTranslations("reviews.approval");
  const { data: stats, isLoading } = trpc.review.getApprovalStats.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      label: t("stats.pending"),
      value: stats?.pending ?? 0,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-100",
    },
    {
      label: t("stats.approved"),
      value: stats?.approved ?? 0,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-100",
    },
    {
      label: t("stats.rejected"),
      value: stats?.rejected ?? 0,
      icon: XCircle,
      color: "text-red-500",
      bgColor: "bg-red-100",
    },
    {
      label: t("stats.deferred"),
      value: stats?.deferred ?? 0,
      icon: AlertTriangle,
      color: "text-blue-500",
      bgColor: "bg-blue-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card key={item.label}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", item.bgColor)}>
                <item.icon className={cn("h-5 w-5", item.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// PENDING LIST
// =============================================================================

function PendingApprovalsList({
  onSelectReview,
  selectedReviewId,
}: {
  onSelectReview: (reviewId: string) => void;
  selectedReviewId: string | null;
}) {
  const t = useTranslations("reviews.approval");
  const { data: pendingReviews, isLoading } =
    trpc.review.getPendingApprovals.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!pendingReviews || pendingReviews.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
          <p className="text-lg font-medium">{t("noPending.title")}</p>
          <p className="text-muted-foreground">{t("noPending.description")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {pendingReviews.map((review) => (
        <Card
          key={review.id}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            selectedReviewId === review.id && "ring-2 ring-primary"
          )}
          onClick={() => onSelectReview(review.id)}
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">
                    {review.referenceNumber}
                  </span>
                  <Badge variant="outline">{review.reviewType}</Badge>
                </div>
                <p className="font-medium truncate">
                  {review.hostOrganization.nameEn}
                </p>
                <p className="text-sm text-muted-foreground">
                  {review.hostOrganization.icaoCode}
                  {review.hostOrganization.country &&
                    ` • ${review.hostOrganization.country}`}
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>{t("requestedOn")}</p>
                <p>{format(new Date(review.requestedDate), "PP")}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// RECENT DECISIONS
// =============================================================================

function RecentDecisions() {
  const t = useTranslations("reviews.approval");
  const { data: stats, isLoading } = trpc.review.getApprovalStats.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-48 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const decisions = stats?.recentDecisions ?? [];

  if (decisions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t("noRecentDecisions")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {decisions.map((decision) => (
        <div
          key={decision.id}
          className="flex items-center gap-3 p-3 border rounded-lg"
        >
          {decision.status === "APPROVED" ? (
            <div className="p-1.5 rounded-full bg-green-100">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          ) : (
            <div className="p-1.5 rounded-full bg-red-100">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {decision.review.hostOrganization.nameEn}
            </p>
            <p className="text-sm text-muted-foreground">
              {decision.review.referenceNumber}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="text-muted-foreground">
              {decision.approvedBy?.firstName} {decision.approvedBy?.lastName}
            </p>
            {decision.approvedAt && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(decision.approvedAt), "PP")}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ApprovalsPageClient({ userRole: _userRole }: ApprovalsPageClientProps) {
  const t = useTranslations("reviews.approval");
  const router = useRouter();
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  const { data: pendingReviews } = trpc.review.getPendingApprovals.useQuery();

  const selectedReview = pendingReviews?.find((r) => r.id === selectedReviewId);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("pageTitle")}</h1>
          <p className="text-muted-foreground">{t("pageDescription")}</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/reviews")}>
          {t("backToReviews")}
        </Button>
      </div>

      {/* Stats */}
      <StatsCards />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pending List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t("pendingRequests")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PendingApprovalsList
                onSelectReview={setSelectedReviewId}
                selectedReviewId={selectedReviewId}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Approval Panel or Recent Decisions */}
        <div className="lg:col-span-2">
          {selectedReview ? (
            <ReviewApprovalPanel
              reviewId={selectedReview.id}
              referenceNumber={selectedReview.referenceNumber}
              hostOrganization={selectedReview.hostOrganization}
              requestedDate={selectedReview.requestedDate}
              requestedStartDate={selectedReview.requestedStartDate}
              requestedEndDate={selectedReview.requestedEndDate}
              reviewType={selectedReview.reviewType}
              objectives={selectedReview.objectives}
              onDecisionMade={() => setSelectedReviewId(null)}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t("recentDecisions")}
                </CardTitle>
                <CardDescription>
                  {t("recentDecisionsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentDecisions />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
