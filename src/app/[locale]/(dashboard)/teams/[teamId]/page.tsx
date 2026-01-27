import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TeamDetailClient } from "./team-detail-client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface TeamDetailPageProps {
  params: Promise<{ locale: string; teamId: string }>;
}

/**
 * Roles that can view any team
 */
const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "STEERING_COMMITTEE",
  "OBSERVER",
];

export async function generateMetadata({
  params,
}: TeamDetailPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "teams" });
  return {
    title: t("detail.title"),
    description: t("detail.description"),
  };
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { locale, teamId } = await params;
  setRequestLocale(locale);

  // Get user session
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const { user } = session;

  // ANSP users can only view their own team
  if (!ADMIN_ROLES.includes(user.role)) {
    if (user.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { regionalTeamId: true },
      });

      // If user's team doesn't match the requested team, redirect to their team
      if (organization?.regionalTeamId !== teamId) {
        if (organization?.regionalTeamId) {
          redirect(`/${locale}/teams/${organization.regionalTeamId}`);
        } else {
          redirect(`/${locale}/dashboard`);
        }
      }
    } else {
      // No organization - redirect to dashboard
      redirect(`/${locale}/dashboard`);
    }
  }

  // Check if user can navigate back to teams list
  const canAccessTeamsList = ADMIN_ROLES.includes(user.role);

  return <TeamDetailClient teamId={teamId} canAccessTeamsList={canAccessTeamsList} />;
}
