import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { DashboardContent } from "./dashboard-content";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  return { title: t("title") };
}

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.firstName || "User";
  const organizationId = session?.user?.organizationId;

  return (
    <DashboardContent
      userName={firstName}
      organizationId={organizationId ?? undefined}
    />
  );
}
