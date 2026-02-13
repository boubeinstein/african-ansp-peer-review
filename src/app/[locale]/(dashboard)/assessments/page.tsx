import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AssessmentsCombinedClient } from "./assessments-combined-client";

interface AssessmentsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    organizationId?: string;
    status?: string;
    type?: string;
    tab?: string;
  }>;
}

export async function generateMetadata({ params }: AssessmentsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "assessments" });
  return { title: t("combinedTitle") };
}

export default async function AssessmentsPage({
  params,
  searchParams,
}: AssessmentsPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { locale } = await params;
  setRequestLocale(locale);
  const filters = await searchParams;

  // Determine if user can see organization filter
  const globalRoles = [
    "SUPER_ADMIN",
    "PROGRAMME_COORDINATOR",
    "STEERING_COMMITTEE",
    "SYSTEM_ADMIN",
  ];
  const canFilterByOrg = globalRoles.includes(session.user.role);

  // Determine if user can create assessments
  const createRoles = [
    ...globalRoles,
    "ANSP_ADMIN",
    "SAFETY_MANAGER",
    "QUALITY_MANAGER",
  ];
  const canCreate = createRoles.includes(session.user.role);

  // For org-level users, always filter by their organization
  const effectiveOrgFilter = canFilterByOrg
    ? filters.organizationId
    : session.user.organizationId ?? undefined;

  return (
    <Suspense>
      <AssessmentsCombinedClient
        locale={locale}
        canFilterByOrg={canFilterByOrg}
        canCreate={canCreate}
        effectiveOrgFilter={effectiveOrgFilter}
        initialFilters={filters}
      />
    </Suspense>
  );
}
