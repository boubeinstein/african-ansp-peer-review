/**
 * Report Page (Server Component)
 *
 * Server-side rendered page for displaying review reports.
 * Handles authentication and passes user info to client component.
 */

import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Loader2 } from "lucide-react";
import { ReportClient } from "./report-client";

// =============================================================================
// TYPES
// =============================================================================

interface ReportPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

// =============================================================================
// LOADING FALLBACK
// =============================================================================

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default async function ReportPage({ params }: ReportPageProps) {
  const { id: reviewId, locale } = await params;
  const t = await getTranslations("report");

  // Get authenticated session
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const userId = session.user.id;

  // Get user with role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      organizationId: true,
    },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  // Verify review exists
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      hostOrganizationId: true,
    },
  });

  if (!review) {
    notFound();
  }

  // Check access permissions
  const isAdmin = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(
    user.role
  );
  const isHostOrg = user.organizationId === review.hostOrganizationId;
  const isTeamMember = await prisma.reviewTeamMember.findFirst({
    where: {
      reviewId,
      userId,
    },
  });

  const canAccess = isAdmin || isHostOrg || !!isTeamMember;

  if (!canAccess) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href={`/${locale}/reviews`} className="hover:text-foreground transition-colors">
          {t("breadcrumb.reviews")}
        </Link>
        <span>/</span>
        <Link
          href={`/${locale}/reviews/${reviewId}`}
          className="hover:text-foreground transition-colors"
        >
          {t("breadcrumb.reviewDetails")}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{t("breadcrumb.report")}</span>
      </nav>

      {/* Report Content */}
      <Suspense fallback={<LoadingFallback />}>
        <ReportClient reviewId={reviewId} userRole={user.role} userId={userId} />
      </Suspense>
    </div>
  );
}

// =============================================================================
// METADATA
// =============================================================================

export async function generateMetadata({ params }: ReportPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "report" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}
