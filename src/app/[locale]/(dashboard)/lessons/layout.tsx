import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { LessonsTabNav } from "./_components/lessons-tab-nav";

interface LessonsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LessonsLayout({
  children,
  params,
}: LessonsLayoutProps) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/auth/login`);
  }

  const t = await getTranslations({ locale, namespace: "lessons" });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Shared header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("description")}
        </p>
      </div>

      {/* Tab navigation */}
      <LessonsTabNav locale={locale} userRole={session.user.role} />

      {/* Page content */}
      {children}
    </div>
  );
}
