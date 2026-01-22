import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ApprovalsPageClient } from "./approvals-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reviews.approval");
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function ApprovalsPage() {
  const session = await auth();

  // Only SC and Coordinators can access this page
  const allowedRoles = [
    "SUPER_ADMIN",
    "SYSTEM_ADMIN",
    "STEERING_COMMITTEE",
    "PROGRAMME_COORDINATOR",
  ];

  if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
    redirect("/reviews");
  }

  return <ApprovalsPageClient userRole={session.user.role} />;
}
