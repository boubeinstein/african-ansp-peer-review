import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AssessmentsList } from "@/components/features/assessments/assessments-list";
import { AssessmentsFilters } from "@/components/features/assessments/assessments-filters";
import { AssessmentsStats } from "@/components/features/assessments/assessments-stats";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function AssessmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ organizationId?: string; status?: string; type?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { locale } = await params;
  const filters = await searchParams;
  const t = await getTranslations("assessments");

  // Determine if user can see organization filter
  const globalRoles = ["SUPER_ADMIN", "PROGRAMME_COORDINATOR", "STEERING_COMMITTEE", "SYSTEM_ADMIN"];
  const canFilterByOrg = globalRoles.includes(session.user.role);

  // Determine if user can create assessments
  const createRoles = [...globalRoles, "ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"];
  const canCreate = createRoles.includes(session.user.role);

  // For org-level users, always filter by their organization
  const effectiveOrgFilter = canFilterByOrg ? filters.organizationId : session.user.organizationId ?? undefined;

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("description")}</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href={`/${locale}/assessments/new`}>
              <Plus className="h-4 w-4 mr-2" />
              {t("createAssessment")}
            </Link>
          </Button>
        )}
      </div>

      <Suspense fallback={<AssessmentsStatsSkeleton />}>
        <AssessmentsStats organizationId={effectiveOrgFilter} />
      </Suspense>

      <AssessmentsFilters
        showOrganizationFilter={canFilterByOrg}
        initialFilters={filters}
      />

      <Suspense fallback={<AssessmentsListSkeleton />}>
        <AssessmentsList
          organizationId={effectiveOrgFilter}
          status={filters.status}
          questionnaireType={filters.type}
        />
      </Suspense>
    </div>
  );
}

function AssessmentsStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
      ))}
    </div>
  );
}

function AssessmentsListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
      ))}
    </div>
  );
}
