import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ReviewDetailView } from "@/components/features/review/review-detail-view";

interface ReviewDetailPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata({ params }: ReviewDetailPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "review.detail" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function ReviewDetailPage({ params }: ReviewDetailPageProps) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="container max-w-6xl py-6">
      <ReviewDetailView
        reviewId={id}
        locale={locale}
      />
    </div>
  );
}
