"use client";

/**
 * CAP Detail Client Component
 *
 * Client component that fetches CAP data and renders the detail view.
 * Handles loading states, errors, and not found scenarios.
 */

import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useSession } from "next-auth/react";
import { CAPDetailView } from "@/components/features/cap/cap-detail-view";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, FileX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CAPDetailClientProps {
  capId: string;
}

export function CAPDetailClient({ capId }: CAPDetailClientProps) {
  const t = useTranslations("cap");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { data: session } = useSession();

  // Fetch CAP data
  const {
    data: cap,
    isLoading,
    error,
    refetch,
  } = trpc.cap.getById.useQuery(
    { id: capId },
    {
      retry: false,
    }
  );

  // Loading state
  if (isLoading) {
    return <CAPDetailSkeleton />;
  }

  // Error state
  if (error) {
    // Check if it's a not found error
    if (error.data?.code === "NOT_FOUND") {
      return (
        <div className="container mx-auto py-8 px-4">
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <FileX className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{t("errors.notFound")}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("errors.notFoundDescription") ||
                      "The corrective action plan you're looking for doesn't exist or you don't have permission to view it."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {tCommon("actions.back")}
                  </Button>
                  <Button onClick={() => router.push(`/${locale}/caps`)}>
                    {t("title")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Other errors
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive" className="max-w-lg mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tCommon("error") || "Error"}</AlertTitle>
          <AlertDescription>
            {error.message}
            <Button
              variant="link"
              className="p-0 h-auto ml-2"
              onClick={() => refetch()}
            >
              {tCommon("actions.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // No data (shouldn't happen if no error, but handle gracefully)
  if (!cap) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert className="max-w-lg mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("errors.notFound")}</AlertTitle>
          <AlertDescription>
            {t("errors.notFoundDescription") ||
              "The corrective action plan could not be loaded."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <CAPDetailView
      cap={cap}
      userRole={session?.user?.role || "PEER_REVIEWER"}
      onStatusChange={() => refetch()}
    />
  );
}

/**
 * Loading skeleton for CAP detail page
 */
function CAPDetailSkeleton() {
  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Workflow stepper skeleton */}
      <Card>
        <CardContent className="py-6">
          <div className="flex justify-between">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="w-12 h-12 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Root cause card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-5 w-40" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>

          {/* Corrective action card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>

          {/* Timeline card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-5 w-32" />
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Finding info card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-5 w-28" />
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-5 w-36" />
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
