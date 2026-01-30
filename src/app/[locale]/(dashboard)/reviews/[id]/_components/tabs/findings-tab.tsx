"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Loader2, AlertTriangle } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { FindingList } from "./findings/finding-list";
import { FindingDetail } from "./findings/finding-detail";
import type { ReviewData } from "../../_lib/fetch-review-data";

interface FindingsTabProps {
  review: ReviewData;
}

export function FindingsTab({ review }: FindingsTabProps) {
  const t = useTranslations("reviews.detail.findings");
  const locale = useLocale();

  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    null
  );

  // Fetch full findings data via tRPC
  const { data: findingsData, isLoading } = trpc.finding.getByReview.useQuery(
    { reviewId: review.id },
    { enabled: !!review.id }
  );

  // Transform findings to match FindingList interface
  const findings =
    findingsData?.map((finding) => ({
      id: finding.id,
      reference: finding.referenceNumber,
      title: locale === "fr" ? finding.titleFr : finding.titleEn,
      description:
        locale === "fr" ? finding.descriptionFr : finding.descriptionEn,
      severity: finding.severity,
      status: finding.status,
      category: finding.criticalElement || undefined,
      assignee: finding.assignedTo
        ? {
            id: finding.assignedTo.id,
            name: `${finding.assignedTo.firstName} ${finding.assignedTo.lastName}`,
          }
        : null,
      cap: finding.correctiveActionPlan
        ? {
            id: finding.correctiveActionPlan.id,
            status: finding.correctiveActionPlan.status,
          }
        : null,
      createdAt: new Date(finding.createdAt),
      updatedAt: new Date(finding.updatedAt),
    })) || [];

  // Calculate summary stats
  const stats = {
    total: findings.length,
    critical: findings.filter((f) => f.severity === "CRITICAL").length,
    major: findings.filter((f) => f.severity === "MAJOR").length,
    open: findings.filter(
      (f) =>
        f.status === "OPEN" ||
        f.status === "CAP_REQUIRED" ||
        f.status === "CAP_SUBMITTED" ||
        f.status === "CAP_ACCEPTED" ||
        f.status === "IN_PROGRESS" ||
        f.status === "VERIFICATION"
    ).length,
  };

  // Show detail view if a finding is selected
  if (selectedFindingId) {
    return (
      <div className="p-4 md:p-6">
        <FindingDetail
          findingId={selectedFindingId}
          reviewId={review.id}
          onBack={() => setSelectedFindingId(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("summary", {
              total: stats.total,
              critical: stats.critical,
              major: stats.major,
              open: stats.open,
            })}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t("addFinding")}
        </Button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : findings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">{t("empty.title")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("empty.description")}
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("addFinding")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <FindingList
          findings={findings}
          reviewId={review.id}
          onSelect={(finding) => setSelectedFindingId(finding.id)}
        />
      )}
    </div>
  );
}
