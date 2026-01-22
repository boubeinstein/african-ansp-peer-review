import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NotificationsClient } from "./notifications-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notifications");
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

interface NotificationsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NotificationsPage({ params }: NotificationsPageProps) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  return <NotificationsClient locale={locale} />;
}
