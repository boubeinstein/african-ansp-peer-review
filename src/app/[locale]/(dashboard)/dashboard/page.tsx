import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createCaller, createServerContext } from "@/server/trpc";
import { DashboardContent } from "./dashboard-content";

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: DashboardPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  return { title: t("title") };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const firstName = session.user.firstName || "User";
  const organizationId = session.user.organizationId;
  const userRole = session.user.role;

  // Fetch organization details if user has one
  let organization = null;
  if (organizationId) {
    try {
      const ctx = await createServerContext();
      const caller = createCaller(ctx);
      organization = await caller.organization.getById({ id: organizationId });
    } catch {
      // Organization not found - continue without it
    }
  }

  return (
    <DashboardContent
      userName={firstName}
      userRole={userRole}
      organizationId={organizationId ?? undefined}
      organization={organization}
      locale={locale}
    />
  );
}
