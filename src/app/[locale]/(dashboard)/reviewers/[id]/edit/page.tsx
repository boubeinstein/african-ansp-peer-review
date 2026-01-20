/**
 * Reviewer Profile Edit Page
 *
 * Allows editing of reviewer profile information including
 * personal details, experience, and contact preferences.
 * Uses server-side auth for permission checking.
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { createCaller, createServerContext } from "@/server/trpc";
import { canEditReviewer } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { ReviewerEditClient } from "@/components/features/reviewer/reviewer-edit-client";

interface EditReviewerPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: EditReviewerPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "reviewer" });

  try {
    const ctx = await createServerContext();
    const caller = createCaller(ctx);
    const reviewer = await caller.reviewer.getById({ id });

    if (reviewer) {
      const fullName = `${reviewer.user.firstName} ${reviewer.user.lastName}`;
      return {
        title: `${t("profile.editTitle")} - ${fullName}`,
      };
    }
  } catch {
    // Reviewer not found
  }

  return {
    title: t("profile.editTitle"),
  };
}

export default async function EditReviewerPage({
  params,
}: EditReviewerPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "reviewer" });

  // Get session for permission checking
  const session = await auth();

  // Redirect if not authenticated
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

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

  // Check edit permission using server-side auth
  const userRole = session.user.role as UserRole;
  const userOrgId = session.user.organizationId;
  const reviewerOrgId = reviewer.organizationId;
  const isOwnProfile = reviewer.userId === session.user.id;

  const hasEditPermission = Boolean(
    isOwnProfile ||
      (reviewerOrgId &&
        canEditReviewer({
          userRole,
          userOrgId,
          reviewerOrgId,
        }))
  );

  // Redirect if no permission
  if (!hasEditPermission) {
    redirect(`/${locale}/reviewers/${id}`);
  }

  return <ReviewerEditClient reviewer={reviewer} locale={locale} />;
}
