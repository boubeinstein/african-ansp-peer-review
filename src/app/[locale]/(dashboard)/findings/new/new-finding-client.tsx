"use client";

/**
 * New Finding Client Component
 *
 * Client-side component for creating new findings.
 * Handles review selection if not provided, and submits to the API.
 */

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { FindingForm } from "@/components/features/finding/finding-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, ClipboardList } from "lucide-react";
import Link from "next/link";

interface NewFindingClientProps {
  reviewId?: string;
}

export function NewFindingClient({ reviewId: initialReviewId }: NewFindingClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("findings");
  const tCommon = useTranslations("common");

  const [selectedReviewId, setSelectedReviewId] = useState(initialReviewId || "");

  // Fetch available reviews (for selecting if no reviewId provided)
  const reviewsQuery = trpc.review.list.useQuery(
    { pageSize: 100 },
    { enabled: !initialReviewId }
  );

  // Fetch selected review details
  const reviewQuery = trpc.review.getById.useQuery(
    { id: selectedReviewId },
    { enabled: !!selectedReviewId }
  );

  // Create finding mutation
  const createFinding = trpc.finding.create.useMutation({
    onSuccess: (data) => {
      toast.success("Finding created successfully");
      router.push(`/${locale}/findings/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create finding");
    },
  });

  // Get the questionnaire ID from the review's assessments
  const questionnaireId = reviewQuery.data?.assessments?.[0]?.id
    ? undefined // Would need to get questionnaire from assessment
    : undefined;

  // Handle form submission
  const handleSubmit = async (data: {
    findingType: "NON_CONFORMITY" | "OBSERVATION" | "RECOMMENDATION" | "GOOD_PRACTICE" | "CONCERN";
    severity: "CRITICAL" | "MAJOR" | "MINOR" | "OBSERVATION";
    titleEn: string;
    titleFr: string;
    descriptionEn: string;
    descriptionFr: string;
    evidenceEn?: string;
    evidenceFr?: string;
    icaoReference?: string;
    criticalElement?: "CE_1" | "CE_2" | "CE_3" | "CE_4" | "CE_5" | "CE_6" | "CE_7" | "CE_8" | null;
    questionId?: string | null;
    capRequired: boolean;
    targetCloseDate?: Date | null;
  }) => {
    if (!selectedReviewId || !reviewQuery.data?.hostOrganization.id) {
      toast.error("Please select a review first");
      return;
    }

    createFinding.mutate({
      reviewId: selectedReviewId,
      organizationId: reviewQuery.data.hostOrganization.id,
      findingType: data.findingType,
      severity: data.severity,
      titleEn: data.titleEn,
      titleFr: data.titleFr,
      descriptionEn: data.descriptionEn,
      descriptionFr: data.descriptionFr,
      evidenceEn: data.evidenceEn,
      evidenceFr: data.evidenceFr,
      icaoReference: data.icaoReference,
      criticalElement: data.criticalElement || undefined,
      capRequired: data.capRequired,
      targetCloseDate: data.targetCloseDate || undefined,
    });
  };

  // If no reviewId provided and reviews haven't loaded yet
  if (!initialReviewId && reviewsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // If review selected but loading
  if (selectedReviewId && reviewQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Error loading review
  if (selectedReviewId && reviewQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load review details. {reviewQuery.error.message}
        </AlertDescription>
      </Alert>
    );
  }

  // No reviews available
  if (!initialReviewId && reviewsQuery.data?.items.length === 0) {
    return (
      <Alert>
        <ClipboardList className="h-4 w-4" />
        <AlertTitle>No Active Reviews</AlertTitle>
        <AlertDescription>
          There are no active reviews to add findings to. Findings must be
          associated with a peer review.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/${locale}/findings`}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("detail.backToList")}
      </Link>

      {/* Review Selection (if not provided) */}
      {!initialReviewId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("detail.review")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedReviewId} onValueChange={setSelectedReviewId}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select a peer review" />
              </SelectTrigger>
              <SelectContent>
                {reviewsQuery.data?.items.map((review) => (
                  <SelectItem key={review.id} value={review.id}>
                    {review.referenceNumber} - {locale === "fr"
                      ? review.hostOrganization.nameFr
                      : review.hostOrganization.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Review Summary (if selected) */}
      {reviewQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>{t("detail.review")}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {reviewQuery.data.referenceNumber}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t("detail.organization")}</span>
              <p className="font-medium">
                {locale === "fr"
                  ? reviewQuery.data.hostOrganization.nameFr
                  : reviewQuery.data.hostOrganization.nameEn}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <p className="font-medium">{reviewQuery.data.status}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Review Type</span>
              <p className="font-medium">{reviewQuery.data.reviewType}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Finding Form */}
      {selectedReviewId && reviewQuery.data && (
        <FindingForm
          reviewId={selectedReviewId}
          organizationId={reviewQuery.data.hostOrganization.id}
          questionnaireId={questionnaireId}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/${locale}/findings`)}
          isLoading={createFinding.isPending}
          isCreate
        />
      )}

      {/* Message if no review selected */}
      {!selectedReviewId && !initialReviewId && (
        <Alert>
          <ClipboardList className="h-4 w-4" />
          <AlertTitle>Select a Review</AlertTitle>
          <AlertDescription>
            Please select a peer review to add a finding to. Findings must be
            associated with an active peer review.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
