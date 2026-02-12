import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReviewPrepBriefing } from "@/components/features/lessons/review-prep-briefing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "lessons.prep" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ReviewPrepPage({ params }: PageProps) {
  const { locale, id: reviewId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/auth/login`);
  }

  // Fetch review with host org details
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      referenceNumber: true,
      status: true,
      reviewType: true,
      hostOrganization: {
        select: {
          id: true,
          nameEn: true,
          nameFr: true,
          region: true,
          country: true,
        },
      },
      teamMembers: {
        select: {
          userId: true,
        },
      },
      assessments: {
        where: { maturityLevel: { not: null } },
        select: { maturityLevel: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!review) {
    redirect(`/${locale}/reviews`);
  }

  // Verify user is a team member or admin
  const isTeamMember = review.teamMembers.some(
    (tm) => tm.userId === session.user.id
  );
  const isAdmin = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(
    session.user.role
  );

  if (!isTeamMember && !isAdmin) {
    redirect(`/${locale}/reviews/${reviewId}`);
  }

  return (
    <ReviewPrepBriefing
      reviewId={reviewId}
      locale={locale}
      review={{
        referenceNumber: review.referenceNumber,
        status: review.status,
        reviewType: review.reviewType,
        hostOrganization: review.hostOrganization,
        maturityLevel: review.assessments[0]?.maturityLevel ?? null,
      }}
    />
  );
}
