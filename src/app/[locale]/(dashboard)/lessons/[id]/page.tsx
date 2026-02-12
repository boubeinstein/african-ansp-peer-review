import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LessonDetailClient } from "./lesson-detail-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "lessons" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function LessonDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/auth/login`);
  }

  return <LessonDetailClient lessonId={id} locale={locale} />;
}
