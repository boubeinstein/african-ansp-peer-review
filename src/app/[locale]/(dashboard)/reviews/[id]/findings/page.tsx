/**
 * Review Findings Page
 *
 * Displays all findings for a specific peer review.
 * Accessible from the review detail page "View all findings" link.
 */

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { createCaller, createServerContext } from "@/server/trpc";
import { ReviewFindingsClient } from "./client";

interface ReviewFindingsPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata({
  params,
}: ReviewFindingsPageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "findings" });

  try {
    const ctx = await createServerContext();
    const caller = createCaller(ctx);
    const review = await caller.review.getById({ id });

    if (review) {
      return {
        title: `${t("title")} - ${review.referenceNumber}`,
        description: t("description"),
      };
    }
  } catch {
    // Review not found
  }

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function ReviewFindingsPage({
  params,
}: ReviewFindingsPageProps) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Fetch review data server-side for metadata
  let review;
  try {
    const ctx = await createServerContext();
    const caller = createCaller(ctx);
    review = await caller.review.getById({ id });
  } catch {
    notFound();
  }

  if (!review) {
    notFound();
  }

  // Get organization name based on locale
  const orgName =
    locale === "fr" && review.hostOrganization.nameFr
      ? review.hostOrganization.nameFr
      : review.hostOrganization.nameEn;

  return (
    <ReviewFindingsClient
      reviewId={id}
      locale={locale}
      referenceNumber={review.referenceNumber}
      organizationName={orgName}
      organizationCode={review.hostOrganization.organizationCode}
    />
  );
}
