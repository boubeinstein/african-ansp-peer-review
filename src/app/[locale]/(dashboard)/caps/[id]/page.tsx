/**
 * CAP Detail Page
 *
 * Server component that renders the CAP detail view.
 * The client component handles data fetching and interactivity.
 */

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { CAPDetailClient } from "./cap-detail-client";

interface CAPDetailPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: CAPDetailPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cap" });

  return {
    title: t("view"),
    description: t("pageDescription"),
  };
}

export default async function CAPDetailPage({ params }: CAPDetailPageProps) {
  const { id, locale } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  return <CAPDetailClient capId={id} userRole={session.user.role} />;
}
