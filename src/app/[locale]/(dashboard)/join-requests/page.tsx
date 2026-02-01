import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types/prisma-enums";
import { JoinRequestList } from "@/components/features/join-request/join-request-list";

interface JoinRequestsPageProps {
  params: Promise<{ locale: string }>;
}

const allowedRoles: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.SYSTEM_ADMIN,
  UserRole.PROGRAMME_COORDINATOR,
  UserRole.STEERING_COMMITTEE,
];

export async function generateMetadata({
  params,
}: JoinRequestsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "joinRequestAdmin" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function JoinRequestsPage({
  params,
}: JoinRequestsPageProps) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <JoinRequestList
      userRole={session.user.role}
      userId={session.user.id}
    />
  );
}
