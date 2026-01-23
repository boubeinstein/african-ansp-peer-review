import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface ProfilePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviewers" });
  return {
    title: t("myProfile"),
    description: t("myProfileDescription"),
  };
}

export default async function ReviewerProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Find the user's reviewer profile
  const reviewerProfile = await db.reviewerProfile.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (reviewerProfile) {
    // Redirect to the actual profile page with the real ID
    redirect(`/${locale}/reviewers/${reviewerProfile.id}`);
  }

  // User doesn't have a reviewer profile - show message
  const t = await getTranslations({ locale, namespace: "reviewers" });

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <svg
              className="w-8 h-8 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">{t("noProfileTitle")}</h1>
          <p className="text-muted-foreground mb-6">
            {t("noProfileDescription")}
          </p>
        </div>

        <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          <p>{t("noProfileHelp")}</p>
        </div>
      </div>
    </div>
  );
}
