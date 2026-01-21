"use client";

/**
 * Reviews Page Client Component
 *
 * Displays peer reviews with stats cards, filters, and review cards.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList,
  Calendar,
  Clock,
  CheckCircle,
  Plus,
  Search,
  Filter,
  Users,
  FileText,
  AlertTriangle,
  ArrowRight,
  LayoutGrid,
  List,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import type { ReviewStatus, ReviewType } from "@prisma/client";

// Feature Components
import { ReviewTeamWizard } from "@/components/features/review/review-team-wizard";

// =============================================================================
// HELPERS
// =============================================================================

function getStatusColor(status: ReviewStatus): string {
  const colors: Record<ReviewStatus, string> = {
    REQUESTED: "bg-yellow-100 text-yellow-800 border-yellow-200",
    APPROVED: "bg-blue-100 text-blue-800 border-blue-200",
    PLANNING: "bg-indigo-100 text-indigo-800 border-indigo-200",
    SCHEDULED: "bg-purple-100 text-purple-800 border-purple-200",
    IN_PROGRESS: "bg-orange-100 text-orange-800 border-orange-200",
    REPORT_DRAFTING: "bg-amber-100 text-amber-800 border-amber-200",
    REPORT_REVIEW: "bg-cyan-100 text-cyan-800 border-cyan-200",
    COMPLETED: "bg-green-100 text-green-800 border-green-200",
    CANCELLED: "bg-red-100 text-red-800 border-red-200",
  };
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
}

// =============================================================================
// TYPES
// =============================================================================

interface ReviewsPageClientProps {
  userOrganizationId?: string;
  userRole?: string;
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
// MAIN COMPONENT
// =============================================================================

export function ReviewsPageClient({
  userOrganizationId,
  userRole,
}: ReviewsPageClientProps) {
  // Permission checks
  const canManageTeams = userRole ? MANAGEMENT_ROLES.includes(userRole) : false;
  const canApproveCrossTeam = userRole
    ? CROSS_TEAM_APPROVER_ROLES.includes(userRole)
    : false;
  const t = useTranslations("reviews");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const utils = trpc.useUtils();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);

  // Team assignment wizard state
  const [teamWizardOpen, setTeamWizardOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  const handleAssignTeam = (reviewId: string) => {
    setSelectedReviewId(reviewId);
    setTeamWizardOpen(true);
  };

  // Fetch reviews
  const { data: reviewsData, isLoading: loadingReviews } =
    trpc.review.list.useQuery({
      status: statusFilter !== "all" ? (statusFilter as ReviewStatus) : undefined,
      reviewType: typeFilter !== "all" ? (typeFilter as ReviewType) : undefined,
      page: currentPage,
      pageSize: 12,
    });

  // Fetch stats
  const { data: stats, isLoading: loadingStats } =
    trpc.review.getStats.useQuery();

  // Check prerequisites for requesting review
  const { data: prerequisites } = trpc.review.checkPrerequisites.useQuery(
    { organizationId: userOrganizationId || "" },
    { enabled: !!userOrganizationId }
  );

  const canRequestReview = prerequisites?.canRequestReview ?? false;

  // Filter reviews by search query
  const filteredReviews =
    reviewsData?.items.filter((review) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        review.referenceNumber.toLowerCase().includes(query) ||
        review.hostOrganization.nameEn.toLowerCase().includes(query) ||
        (review.hostOrganization.icaoCode?.toLowerCase().includes(query) ?? false)
      );
    }) || [];

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={() => router.push("/reviews/request")}
                    disabled={!canRequestReview}
                    className={cn(
                      "shadow-sm",
                      canRequestReview && "hover:shadow-md transition-shadow"
                    )}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("actions.requestReview")}
                  </Button>
                </span>
              </TooltipTrigger>
              {!canRequestReview && prerequisites && (
                <TooltipContent side="bottom" className="max-w-xs">
                  <ul className="text-sm space-y-1">
                    {prerequisites.reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("stats.total")}
          value={stats?.total ?? 0}
          icon={ClipboardList}
          loading={loadingStats}
        />
        <StatsCard
          title={t("stats.scheduled")}
          value={stats?.scheduled ?? 0}
          icon={Calendar}
          loading={loadingStats}
          variant="purple"
        />
        <StatsCard
          title={t("stats.inProgress")}
          value={stats?.inProgress ?? 0}
          icon={Clock}
          loading={loadingStats}
          variant="yellow"
        />
        <StatsCard
          title={t("stats.completed")}
          value={stats?.completed ?? 0}
          icon={CheckCircle}
          loading={loadingStats}
          variant="green"
        />
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={t("filterByStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allStatuses")}</SelectItem>
                  <SelectItem value="REQUESTED">{t("status.REQUESTED")}</SelectItem>
                  <SelectItem value="APPROVED">{t("status.APPROVED")}</SelectItem>
                  <SelectItem value="SCHEDULED">{t("status.SCHEDULED")}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t("status.IN_PROGRESS")}</SelectItem>
                  <SelectItem value="COMPLETED">{t("status.COMPLETED")}</SelectItem>
                  <SelectItem value="CANCELLED">{t("status.CANCELLED")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t("filterByType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allTypes")}</SelectItem>
                  <SelectItem value="FULL">{t("type.FULL")}</SelectItem>
                  <SelectItem value="FOCUSED">{t("type.FOCUSED")}</SelectItem>
                  <SelectItem value="FOLLOW_UP">{t("type.FOLLOW_UP")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews Content */}
      {loadingReviews ? (
        <div
          className={cn(
            "grid gap-4",
            viewMode === "grid" ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
          )}
        >
          {[...Array(6)].map((_, i) => (
            <ReviewCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <EmptyState
          canRequest={canRequestReview}
          onRequestClick={() => router.push("/reviews/request")}
        />
      ) : (
        <div
          className={cn(
            "grid gap-4",
            viewMode === "grid" ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
          )}
        >
          {filteredReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              viewMode={viewMode}
              onClick={() => router.push(`/reviews/${review.id}`)}
              onAssignTeam={handleAssignTeam}
              canManageTeams={canManageTeams}
              userRole={userRole}
              userOrganizationId={userOrganizationId}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {reviewsData && reviewsData.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            {tCommon("previous")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("pagination", {
              current: currentPage,
              total: reviewsData.totalPages,
            })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === reviewsData.totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            {tCommon("next")}
          </Button>
        </div>
      )}

      {/* Review Team Assignment Wizard */}
      {selectedReviewId && (
        <ReviewTeamWizard
          open={teamWizardOpen}
          onOpenChange={(open) => {
            setTeamWizardOpen(open);
            if (!open) setSelectedReviewId(null);
          }}
          reviewId={selectedReviewId}
          onSuccess={() => {
            utils.review.list.invalidate();
          }}
          canApproveCrossTeam={canApproveCrossTeam}
        />
      )}
    </div>
  );
}

// =============================================================================
// STATS CARD COMPONENT
// =============================================================================

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  variant?: "default" | "purple" | "yellow" | "green";
}

function StatsCard({
  title,
  value,
  icon: Icon,
  loading,
  variant = "default",
}: StatsCardProps) {
  const iconColors = {
    default: "text-muted-foreground",
    purple: "text-purple-600",
    yellow: "text-yellow-600",
    green: "text-green-600",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-3xl font-bold">{value}</p>
            )}
          </div>
          <Icon className={cn("h-8 w-8", iconColors[variant])} />
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// REVIEW CARD COMPONENT
// =============================================================================

interface ReviewCardProps {
  review: {
    id: string;
    referenceNumber: string;
    reviewType: ReviewType;
    status: ReviewStatus;
    hostOrganization: {
      id: string;
      nameEn: string;
      nameFr: string;
      icaoCode: string | null;
      country: string | null;
    };
    plannedStartDate: Date | null;
    plannedEndDate: Date | null;
    actualStartDate: Date | null;
    actualEndDate: Date | null;
    teamMemberCount: number;
    findingCount: number;
  };
  viewMode: "grid" | "list";
  onClick: () => void;
  onAssignTeam: (reviewId: string) => void;
  canManageTeams: boolean;
  userRole?: string;
  userOrganizationId?: string;
}

// Statuses that allow team assignment
const ASSIGNABLE_STATUSES: ReviewStatus[] = [
  "REQUESTED",
  "APPROVED",
  "PLANNING",
  "SCHEDULED",
];

function ReviewCard({
  review,
  viewMode,
  onClick,
  onAssignTeam,
  canManageTeams,
  userRole,
  userOrganizationId,
}: ReviewCardProps) {
  const t = useTranslations("reviews");

  const startDate = review.actualStartDate || review.plannedStartDate;
  const endDate = review.actualEndDate || review.plannedEndDate;

  // Check if assignment is possible based on review status
  const isAssignableStatus = ASSIGNABLE_STATUSES.includes(review.status);

  // Check for COI - user cannot assign team to their own org's review (except SUPER_ADMIN)
  const hasTeamCOI = userRole !== "SUPER_ADMIN" && userOrganizationId === review.hostOrganization.id;

  // Final check: user must have management permission, review in right status, and no COI
  const canAssignTeam = canManageTeams && isAssignableStatus && !hasTeamCOI;

  const needsTeam = review.teamMemberCount === 0 && isAssignableStatus;

  if (viewMode === "list") {
    return (
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={onClick}
      >
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm text-muted-foreground">
                  {review.referenceNumber}
                </span>
                <Badge className={getStatusColor(review.status)}>
                  {t(`status.${review.status}`)}
                </Badge>
                <Badge variant="outline">{t(`type.${review.reviewType}`)}</Badge>
                {needsTeam && (
                  <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
                    {t("needsTeam")}
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold truncate mt-1">
                {review.hostOrganization.nameEn}
              </h3>
              <p className="text-sm text-muted-foreground">
                {review.hostOrganization.icaoCode} •{" "}
                {review.hostOrganization.country}
              </p>
            </div>

            <div className="text-right text-sm shrink-0">
              {startDate && endDate && (
                <p className="text-muted-foreground">
                  {format(new Date(startDate), "MMM d")} -{" "}
                  {format(new Date(endDate), "MMM d, yyyy")}
                </p>
              )}
              <div className="flex items-center justify-end gap-4 mt-1 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {review.teamMemberCount}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {review.findingCount}
                </span>
              </div>
            </div>

            {/* Assign Team Button */}
            {canAssignTeam && (
              <Button
                variant={needsTeam ? "default" : "outline"}
                size="sm"
                className={cn(needsTeam && "animate-pulse")}
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignTeam(review.id);
                }}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                {t("actions.assignTeam")}
              </Button>
            )}

            <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-sm text-muted-foreground">
              {review.referenceNumber}
            </p>
            <CardTitle className="text-lg mt-1 group-hover:text-primary transition-colors">
              {review.hostOrganization.nameEn}
            </CardTitle>
            <CardDescription>
              {review.hostOrganization.icaoCode} •{" "}
              {review.hostOrganization.country}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(review.status)}>
            {t(`status.${review.status}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{t(`type.${review.reviewType}`)}</Badge>
          {needsTeam && (
            <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
              {t("needsTeam")}
            </Badge>
          )}
        </div>

        {startDate && endDate && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            {format(new Date(startDate), "MMM d")} -{" "}
            {format(new Date(endDate), "MMM d, yyyy")}
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            {t("teamMembers", { count: review.teamMemberCount })}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <FileText className="h-4 w-4" />
            {t("findings", { count: review.findingCount })}
          </span>
        </div>

        {/* Assign Team Button */}
        {canAssignTeam && (
          <Button
            variant={needsTeam ? "default" : "outline"}
            size="sm"
            className={cn("w-full", needsTeam && "animate-pulse")}
            onClick={(e) => {
              e.stopPropagation();
              onAssignTeam(review.id);
            }}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {t("actions.assignTeam")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SKELETON COMPONENT
// =============================================================================

function ReviewCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-48 mt-2" />
        <Skeleton className="h-4 w-32 mt-1" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-4 w-40" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

interface EmptyStateProps {
  canRequest: boolean;
  onRequestClick: () => void;
}

function EmptyState({ canRequest, onRequestClick }: EmptyStateProps) {
  const t = useTranslations("reviews");

  return (
    <Card>
      <CardContent className="py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">{t("empty.title")}</h3>
          <p className="text-muted-foreground max-w-md mt-1 mb-4">
            {t("empty.description")}
          </p>
          {canRequest && (
            <Button onClick={onRequestClick}>
              <Plus className="h-4 w-4 mr-2" />
              {t("actions.requestReview")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
