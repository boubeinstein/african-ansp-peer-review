/**
 * Reviewer Profile View Page
 *
 * Displays a reviewer's full profile with expertise, languages,
 * certifications, and availability information.
 * Uses server-side auth for permission checking.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { createCaller, createServerContext } from "@/server/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { ReviewerProfileView } from "@/components/features/reviewer/reviewer-profile-view";

interface ReviewerProfilePageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: ReviewerProfilePageProps) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "reviewer" });

  try {
    const ctx = await createServerContext();
    const caller = createCaller(ctx);
    const reviewer = await caller.reviewer.getById({ id });

    if (reviewer) {
      const fullName = `${reviewer.user.firstName} ${reviewer.user.lastName}`;
      return {
        title: `${fullName} - ${t("title")}`,
      };
    }
  } catch {
    // Reviewer not found
  }

  return {
    title: t("title"),
  };
}

export default async function ReviewerProfilePage({
  params,
}: ReviewerProfilePageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "reviewer" });

  // Get session for permission checking
  const session = await auth();

  // Fetch reviewer profile using tRPC server-side caller
  let reviewer;
  let error: string | null = null;

  try {
    const ctx = await createServerContext();
    const caller = createCaller(ctx);
    reviewer = await caller.reviewer.getById({ id });
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load reviewer";
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
            <p className="text-muted-foreground max-w-sm mt-2">{error}</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href={`/${locale}/reviewers`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("actions.backToDirectory")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not found state
  if (!reviewer) {
    notFound();
  }

  // Use canEdit from API response (centralized permission logic)
  const isOwnProfile = reviewer.userId === session?.user?.id;
  const hasEditPermission = reviewer.canEdit ?? false;
  const editHref = hasEditPermission
    ? `/${locale}/reviewers/${id}/edit`
    : undefined;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" className="mb-2" asChild>
        <Link href={`/${locale}/reviewers`}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("actions.backToDirectory")}
        </Link>
      </Button>

      {/* Profile View */}
      <ReviewerProfileView
        profile={reviewer}
        isOwnProfile={isOwnProfile}
        canEdit={hasEditPermission}
        editHref={editHref}
      />
    </div>
  );
}
