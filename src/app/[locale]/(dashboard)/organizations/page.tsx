import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import Link from "next/link";
import { OrganizationDirectory } from "@/components/features/organization";
import { auth } from "@/lib/auth";

interface OrganizationsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: OrganizationsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "organizations" });
  return {
    title: t("title"),
  };
}

/**
 * Loading skeleton for the organization directory
 */
function DirectorySkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>

      {/* Controls skeleton */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-[100px]" />
        <Skeleton className="h-10 w-[80px]" />
      </div>

      {/* Results info skeleton */}
      <div className="flex justify-between">
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[250px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default async function OrganizationsPage({
  params,
}: OrganizationsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "organizations" });

  // Check if user is admin
  const session = await auth();
  const isAdmin = session?.user?.role && [
    "SUPER_ADMIN",
    "SYSTEM_ADMIN",
    "PROGRAMME_COORDINATOR",
  ].includes(session.user.role);

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href={`/${locale}/organizations/new`}>
              <Plus className="h-4 w-4 mr-2" />
              {t("actions.create")}
            </Link>
          </Button>
        )}
      </div>

      {/* Organization Directory */}
      <Suspense fallback={<DirectorySkeleton />}>
        <OrganizationDirectory />
      </Suspense>
    </div>
  );
}
