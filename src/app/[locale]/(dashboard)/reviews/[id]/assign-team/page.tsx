import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TeamAssignmentWizard } from "@/components/features/review/team-assignment-wizard";

interface AssignTeamPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata({ params }: AssignTeamPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "review.teamWizard" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function AssignTeamPage({ params }: AssignTeamPageProps) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Check if user has admin role (required for team assignment)
  const adminRoles = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR", "STEERING_COMMITTEE"];
  if (!adminRoles.includes(session.user.role)) {
    redirect(`/${locale}/reviews/${id}`);
  }

  return (
    <div className="container max-w-6xl py-6">
      <TeamAssignmentWizard
        reviewId={id}
        locale={locale}
      />
    </div>
  );
}
