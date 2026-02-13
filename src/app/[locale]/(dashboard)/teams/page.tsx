import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface TeamsPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Redirect: /teams → /reviewers?tab=teams
 *
 * The teams list is now the "Regional Teams" tab in the unified
 * Reviewer Pool page. Sub-routes (/teams/[teamId]) continue to
 * work as before.
 *
 * Non-admin users are redirected to their own team's detail page
 * (preserving original access-control behaviour).
 */
const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "STEERING_COMMITTEE",
];

export default async function TeamsRedirect({ params }: TeamsPageProps) {
  const { locale } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Non-admin users: redirect to their team's detail page (unchanged)
  if (!ADMIN_ROLES.includes(session.user.role)) {
    if (session.user.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { regionalTeamId: true },
      });

      if (organization?.regionalTeamId) {
        redirect(`/${locale}/teams/${organization.regionalTeamId}`);
      }
    }

    redirect(`/${locale}/dashboard`);
  }

  // Admin users: redirect to Reviewer Pool teams tab
  redirect(`/${locale}/reviewers?tab=teams`);
}
