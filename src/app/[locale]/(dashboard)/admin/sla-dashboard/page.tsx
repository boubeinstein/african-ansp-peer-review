import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SLADashboardClient } from "./client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("workflow.sla");
  return { title: t("dashboard") };
}

export default async function SLADashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const allowedRoles = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"];
  if (!allowedRoles.includes(session.user.role)) {
    redirect("/dashboard");
  }

  return <SLADashboardClient />;
}
