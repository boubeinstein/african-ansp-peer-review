"use client";

/**
 * Reviewer Profile Edit Page
 *
 * Allows editing of reviewer profile information including
 * personal details, experience, and contact preferences.
 */

import { use } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { ReviewerProfileForm } from "@/components/features/reviewer/reviewer-profile-form";
import { toast } from "sonner";

interface EditReviewerPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default function EditReviewerPage({ params }: EditReviewerPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("reviewer");

  // Fetch reviewer profile
  const { data: reviewer, isLoading, error } = trpc.reviewer.getById.useQuery(
    { id },
    { retry: false }
  );

  // Update mutation
  const updateMutation = trpc.reviewer.update.useMutation({
    onSuccess: () => {
      toast.success(t("profile.updateSuccess"));
      router.push(`/${locale}/reviewers/${id}`);
    },
    onError: (error) => {
      toast.error(t("profile.updateError"), {
        description: error.message,
      });
    },
  });

  // Handle form submission
  const handleSubmit = async (data: {
    title?: string | null;
    currentPosition: string;
    yearsOfExperience: number;
    biography?: string | null;
    biographyFr?: string | null;
    preferredContactMethod: "EMAIL" | "PHONE" | "WHATSAPP" | "TEAMS";
    alternateEmail?: string | null;
    alternatePhone?: string | null;
  }) => {
    await updateMutation.mutateAsync({
      id,
      title: data.title,
      currentPosition: data.currentPosition,
      yearsOfExperience: data.yearsOfExperience,
      biography: data.biography,
      biographyFr: data.biographyFr,
      preferredContactMethod: data.preferredContactMethod,
      alternateEmail: data.alternateEmail || undefined,
      alternatePhone: data.alternatePhone || undefined,
    });
  };

  // Handle cancel
  const handleCancel = () => {
    router.push(`/${locale}/reviewers/${id}`);
  };

  // Handle back navigation
  const handleBack = () => {
    router.push(`/${locale}/reviewers`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="mb-6">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-1/2" />
          </CardContent>
        </Card>
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

  // Transform reviewer data to form format
  const initialData = {
    title: reviewer.user?.title ?? null,
    currentPosition: reviewer.currentPosition ?? "",
    yearsOfExperience: reviewer.yearsExperience ?? 0,
    biography: reviewer.biography ?? null,
    biographyFr: reviewer.biographyFr ?? null,
    preferredContactMethod: (reviewer.preferredContactMethod ?? "EMAIL") as "EMAIL" | "PHONE" | "WHATSAPP" | "TEAMS",
    alternateEmail: reviewer.alternativeEmail ?? null,
    alternatePhone: reviewer.alternativePhone ?? null,
  };

  const fullName = reviewer.user
    ? `${reviewer.user.firstName} ${reviewer.user.lastName}`
    : t("profile.unknownReviewer");

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={handleCancel} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("actions.backToProfile")}
      </Button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t("profile.editTitle")}</h1>
        <p className="text-muted-foreground">
          {t("profile.editDescription", { name: fullName })}
        </p>
      </div>

      {/* Edit Form */}
      <ReviewerProfileForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={updateMutation.isPending}
        isCreate={false}
      />
    </div>
  );
}
