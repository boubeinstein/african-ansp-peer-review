import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ReviewEditForm } from "@/components/features/review/review-edit-form";

interface ReviewEditPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata({ params }: ReviewEditPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "review.edit" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function ReviewEditPage({ params }: ReviewEditPageProps) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="container max-w-4xl py-6">
      <ReviewEditForm
        reviewId={id}
        locale={locale}
      />
    </div>
  );
}
