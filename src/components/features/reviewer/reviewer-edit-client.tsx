"use client";

/**
 * Reviewer Edit Client Component
 *
 * Client-side wrapper for editing reviewer profiles.
 * Handles form state and mutations, receives data from server component.
 */

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ReviewerProfileForm } from "./reviewer-profile-form";
import type { ReviewerProfileFull } from "@/types/reviewer";

// =============================================================================
// TYPES
// =============================================================================

interface ReviewerEditClientProps {
  reviewer: ReviewerProfileFull;
  locale: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewerEditClient({ reviewer, locale }: ReviewerEditClientProps) {
  const router = useRouter();
  const t = useTranslations("reviewer");

  // Update mutation
  const updateMutation = trpc.reviewer.update.useMutation({
    onSuccess: () => {
      toast.success(t("profile.updateSuccess"));
      router.push(`/${locale}/reviewers/${reviewer.id}`);
      router.refresh();
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
      id: reviewer.id,
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
    router.push(`/${locale}/reviewers/${reviewer.id}`);
  };

  // Transform reviewer data to form format
  // Note: user.title is not included in ReviewerProfileFull type, so we use optional chaining
  const userWithTitle = reviewer.user as typeof reviewer.user & { title?: string | null };
  const initialData = {
    title: userWithTitle?.title ?? null,
    currentPosition: reviewer.currentPosition ?? "",
    yearsOfExperience: reviewer.yearsExperience ?? 0,
    biography: reviewer.biography ?? null,
    biographyFr: reviewer.biographyFr ?? null,
    preferredContactMethod: (reviewer.preferredContactMethod ?? "EMAIL") as
      | "EMAIL"
      | "PHONE"
      | "WHATSAPP"
      | "TEAMS",
    alternateEmail: reviewer.alternativeEmail ?? null,
    alternatePhone: reviewer.alternativePhone ?? null,
  };

  const fullName = reviewer.user
    ? `${reviewer.user.firstName} ${reviewer.user.lastName}`
    : t("profile.unknownReviewer");

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" className="mb-2" asChild>
        <Link href={`/${locale}/reviewers/${reviewer.id}`}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("actions.backToProfile")}
        </Link>
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

export default ReviewerEditClient;
