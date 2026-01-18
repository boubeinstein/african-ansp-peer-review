"use client";

/**
 * Finding Edit Client Component
 *
 * Client-side component for editing existing findings.
 * Fetches current data and submits updates to the API.
 */

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { FindingForm } from "@/components/features/finding/finding-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle } from "lucide-react";

interface FindingEditClientProps {
  findingId: string;
}

export function FindingEditClient({ findingId }: FindingEditClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("findings");

  // Fetch finding details
  const findingQuery = trpc.finding.getById.useQuery({ id: findingId });

  // Update mutation
  const updateFinding = trpc.finding.update.useMutation({
    onSuccess: () => {
      toast.success("Finding updated successfully");
      router.push(`/${locale}/findings/${findingId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update finding");
    },
  });

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
    updateFinding.mutate({
      id: findingId,
      findingType: data.findingType,
      severity: data.severity,
      titleEn: data.titleEn,
      titleFr: data.titleFr,
      descriptionEn: data.descriptionEn,
      descriptionFr: data.descriptionFr,
      evidenceEn: data.evidenceEn || null,
      evidenceFr: data.evidenceFr || null,
      icaoReference: data.icaoReference || null,
      criticalElement: data.criticalElement || null,
      capRequired: data.capRequired,
      targetCloseDate: data.targetCloseDate || null,
    });
  };

  if (findingQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (findingQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load finding. {findingQuery.error.message}
        </AlertDescription>
      </Alert>
    );
  }

  const finding = findingQuery.data!;

  // Get localized org name
  const orgName = locale === "fr"
    ? finding.organization.nameFr
    : finding.organization.nameEn;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/${locale}/findings/${findingId}`}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("detail.backToList")}
      </Link>

      {/* Finding context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Finding Context</span>
            <Badge variant="outline">{finding.referenceNumber}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">{t("detail.review")}</span>
            <p className="font-medium">{finding.review.referenceNumber}</p>
          </div>
          <div>
            <span className="text-muted-foreground">{t("detail.organization")}</span>
            <p className="font-medium">{orgName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Current Status</span>
            <p className="font-medium">{t(`status.${finding.status}`)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Cannot edit closed/verification findings warning */}
      {(finding.status === "CLOSED" || finding.status === "VERIFICATION") && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Read Only</AlertTitle>
          <AlertDescription>
            This finding is in {finding.status} status and cannot be edited.
            Only administrators can modify closed or verification findings.
          </AlertDescription>
        </Alert>
      )}

      {/* Edit form */}
      <FindingForm
        reviewId={finding.reviewId}
        organizationId={finding.organizationId}
        initialData={{
          findingType: finding.findingType,
          severity: finding.severity,
          titleEn: finding.titleEn,
          titleFr: finding.titleFr,
          descriptionEn: finding.descriptionEn,
          descriptionFr: finding.descriptionFr,
          evidenceEn: finding.evidenceEn || "",
          evidenceFr: finding.evidenceFr || "",
          icaoReference: finding.icaoReference || "",
          criticalElement: finding.criticalElement,
          questionId: finding.questionId,
          capRequired: finding.capRequired,
          targetCloseDate: finding.targetCloseDate
            ? new Date(finding.targetCloseDate)
            : null,
          question: finding.question
            ? {
                id: finding.question.id,
                pqNumber: finding.question.pqNumber,
                questionTextEn: finding.question.questionTextEn,
                questionTextFr: finding.question.questionTextFr,
                category: finding.question.category || undefined,
              }
            : null,
        }}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/${locale}/findings/${findingId}`)}
        isLoading={updateFinding.isPending}
        isCreate={false}
      />
    </div>
  );
}
