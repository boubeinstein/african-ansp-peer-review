import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { ReviewRequestWizard } from "@/components/features/review/review-request-wizard";

interface ReviewRequestPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ReviewRequestPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "review.request" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function ReviewRequestPage({ params }: ReviewRequestPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const { id: userId, name: userName, email: userEmail, organizationId } = session.user;

  if (!organizationId) {
    redirect(`/${locale}/reviews`);
  }

  return (
    <div className="container max-w-4xl py-6">
      <ReviewRequestWizard
        userOrganizationId={organizationId}
        userId={userId}
        userName={userName ?? ""}
        userEmail={userEmail ?? ""}
        locale={locale}
      />
    </div>
  );
}
