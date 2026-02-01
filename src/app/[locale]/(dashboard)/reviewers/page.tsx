import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { UserRole } from "@/types/prisma-enums";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserCheck,
  UserPlus,
  Calendar,
  Sparkles,
} from "lucide-react";
import { ReviewerDirectory } from "@/components/features/reviewer/reviewer-directory";

// Admin roles that can add reviewers
const ADMIN_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.PROGRAMME_COORDINATOR];

interface ReviewersPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ReviewersPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviewers" });
  return {
    title: t("title"),
  };
}

export default async function ReviewersPage({ params }: ReviewersPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "reviewers" });
  const session = await auth();

  // Redirect if not authenticated
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Build user context for client component
  const userContext = {
    id: session.user.id,
    role: session.user.role as UserRole,
    organizationId: session.user.organizationId,
  };

  // Check if current user is admin
  const isAdmin = ADMIN_ROLES.includes(userContext.role);

  // Stats - these would come from API in production
  const stats = {
    total: 99,
    selected: 45,
    active: 38,
    available: 32,
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/${locale}/reviewers/matching`}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t("actions.buildTeam") || "Build Review Team"}
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/${locale}/reviewers/new`}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t("actions.addReviewer")}
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("stats.total")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("stats.selected")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats.selected}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("stats.active")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats.active}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("stats.available")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">{stats.available}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviewer Directory */}
      <ReviewerDirectory userContext={userContext} />
    </div>
  );
}
