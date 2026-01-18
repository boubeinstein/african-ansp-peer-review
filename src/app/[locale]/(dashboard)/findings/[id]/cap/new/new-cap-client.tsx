"use client";

/**
 * New CAP Client Component
 *
 * Client-side component for creating a new CAP for a finding.
 * Validates that the finding exists and doesn't already have a CAP.
 */

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { CAPForm } from "@/components/features/cap/cap-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";

interface NewCAPClientProps {
  findingId: string;
}

export function NewCAPClient({ findingId }: NewCAPClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("cap");
  const tFinding = useTranslations("findings");

  // Fetch finding details
  const { data: finding, isLoading, error } = trpc.finding.getById.useQuery(
    { id: findingId },
    { enabled: !!findingId }
  );

  // Check if finding already has a CAP
  const hasExistingCAP = !!finding?.correctiveActionPlan;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Link
          href={`/${locale}/findings`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {tFinding("detail.backToList")}
        </Link>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("errors.findingNotFound")}</AlertTitle>
          <AlertDescription>
            {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Finding already has a CAP
  if (hasExistingCAP) {
    return (
      <div className="space-y-6">
        <Link
          href={`/${locale}/findings/${findingId}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("detail.backToFinding")}
        </Link>

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>{t("errors.alreadyExists")}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              {t("errors.alreadyExistsDescription")}
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`/${locale}/findings/${findingId}`)}
            >
              {t("view")}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Finding doesn't require CAP
  if (finding && !finding.capRequired) {
    return (
      <div className="space-y-6">
        <Link
          href={`/${locale}/findings/${findingId}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("detail.backToFinding")}
        </Link>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("errors.capNotRequired")}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              {t("errors.capNotRequiredDescription")}
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`/${locale}/findings/${findingId}`)}
            >
              {t("detail.backToFinding")}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/${locale}/findings/${findingId}`}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("detail.backToFinding")}
      </Link>

      {/* CAP Form */}
      {finding && (
        <CAPForm
          findingId={findingId}
          finding={{
            id: finding.id,
            referenceNumber: finding.referenceNumber,
            titleEn: finding.titleEn,
            titleFr: finding.titleFr,
            severity: finding.severity,
            findingType: finding.findingType,
            organizationId: finding.organization?.id || "",
            organization: finding.organization,
          }}
          onCancel={() => router.push(`/${locale}/findings/${findingId}`)}
        />
      )}
    </div>
  );
}
