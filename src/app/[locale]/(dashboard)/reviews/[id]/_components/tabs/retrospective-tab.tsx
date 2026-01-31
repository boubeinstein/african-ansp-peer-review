"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";
import { RetrospectiveForm } from "../retrospective/retrospective-form";

interface RetrospectiveTabProps {
  review: {
    id: string;
    status: string;
  };
}

export function RetrospectiveTab({ review }: RetrospectiveTabProps) {
  const tTab = useTranslations("reviews.detail.retrospectiveTab");

  const { data: retrospective, isLoading } = trpc.retrospective.getByReview.useQuery({
    reviewId: review.id,
  });

  // Only show retrospective tab for completed or post-review phase
  const canShowRetrospective = ["POST_REVIEW", "COMPLETED", "REPORT_REVIEW"].includes(
    review.status
  );

  if (!canShowRetrospective) {
    return (
      <div className="p-4 md:p-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{tTab("notAvailable.title")}</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {tTab("notAvailable.description")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-96 bg-muted rounded" />
          <Card>
            <CardContent className="py-8">
              <div className="h-64 bg-muted rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            {tTab("title")}
          </h2>
          <p className="text-muted-foreground mt-1">{tTab("description")}</p>
        </div>
        {retrospective && (
          <Badge
            variant={
              retrospective.status === "PUBLISHED"
                ? "default"
                : retrospective.status === "SUBMITTED"
                ? "secondary"
                : "outline"
            }
          >
            {retrospective.status === "PUBLISHED"
              ? tTab("status.published")
              : retrospective.status === "SUBMITTED"
              ? tTab("status.submitted")
              : tTab("status.draft")}
          </Badge>
        )}
      </div>

      {/* Empty State */}
      {!retrospective ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{tTab("emptyState.title")}</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {tTab("emptyState.description")}
            </p>
            <RetrospectiveForm reviewId={review.id} />
          </CardContent>
        </Card>
      ) : (
        /* Retrospective Form */
        <RetrospectiveForm
          reviewId={review.id}
          existingData={{
            id: retrospective.id,
            status: retrospective.status,
            processRating: retrospective.processRating,
            preparationEffective: retrospective.preparationEffective ?? undefined,
            onSiteEffective: retrospective.onSiteEffective ?? undefined,
            reportingEffective: retrospective.reportingEffective ?? undefined,
            whatWentWell: retrospective.whatWentWell,
            areasForImprovement: retrospective.areasForImprovement,
            keyLearnings: retrospective.keyLearnings,
            programmeSuggestions: retrospective.programmeSuggestions ?? undefined,
            reviewDurationDays: retrospective.reviewDurationDays ?? undefined,
            teamSizeAdequate: retrospective.teamSizeAdequate ?? undefined,
            resourcesAdequate: retrospective.resourcesAdequate ?? undefined,
            communicationEffective: retrospective.communicationEffective ?? undefined,
          }}
        />
      )}
    </div>
  );
}
