import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <SettingsClient
      userId={session.user.id}
      userRole={session.user.role}
      userEmail={session.user.email ?? ""}
      firstName={session.user.firstName ?? ""}
      lastName={session.user.lastName ?? ""}
      organizationId={session.user.organizationId}
    />
  );
}
