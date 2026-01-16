"use client";

/**
 * Reviewer Profile View Page
 *
 * Displays a reviewer's full profile with expertise, languages,
 * certifications, and availability information.
 */

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { ReviewerProfileView } from "@/components/features/reviewer/reviewer-profile-view";
import { use } from "react";

interface ReviewerProfilePageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default function ReviewerProfilePage({ params }: ReviewerProfilePageProps) {
  const { id } = use(params);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("reviewer");

  // Fetch reviewer profile
  const { data: reviewer, isLoading, error } = trpc.reviewer.getById.useQuery(
    { id },
    { retry: false }
  );

  // Handle edit navigation
  const handleEdit = () => {
    router.push(`/${locale}/reviewers/${id}/edit`);
  };

  // Handle back navigation
  const handleBack = () => {
    router.push(`/${locale}/reviewers`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-destructive/10 p-6 mb-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <h3 className="text-lg font-medium">{t("error.loadFailed")}</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              {error.message}
            </p>
            <Button variant="outline" className="mt-4" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("actions.backToDirectory")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not found state
  if (!reviewer) {
    return (
      <div className="container mx-auto py-6">
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">{t("error.notFound")}</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              {t("error.notFoundDescription")}
            </p>
            <Button variant="outline" className="mt-4" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("actions.backToDirectory")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={handleBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("actions.backToDirectory")}
      </Button>

      {/* Profile View */}
      <ReviewerProfileView
        profile={reviewer}
        onEdit={handleEdit}
      />
    </div>
  );
}
