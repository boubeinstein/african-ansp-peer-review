import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TeamsListClient } from "./teams-list-client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface TeamsPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Roles that can access the full Teams list page
 */
const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "STEERING_COMMITTEE",
];

export async function generateMetadata({
  params,
}: TeamsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "teams" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function TeamsPage({ params }: TeamsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Get user session
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const { user } = session;

  // ANSP users should be redirected to their own team's detail page
  // This provides proper access control, not just hidden navigation
  if (!ADMIN_ROLES.includes(user.role)) {
    // Find user's team through their organization
    if (user.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { regionalTeamId: true },
      });

      if (organization?.regionalTeamId) {
        // Redirect to their team's detail page
        redirect(`/${locale}/teams/${organization.regionalTeamId}`);
      }
    }

    // No team assigned - redirect to dashboard
    redirect(`/${locale}/dashboard`);
  }

  return <TeamsListClient />;
}
