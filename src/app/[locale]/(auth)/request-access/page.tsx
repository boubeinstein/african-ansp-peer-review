import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthLayout, RegisterForm } from "@/components/auth";
import { RequestAccessClient } from "./request-access-client";

interface RequestAccessPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: RequestAccessPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.register" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RequestAccessPage({ params }: RequestAccessPageProps) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale);

  // Redirect if already authenticated
  const session = await auth();
  if (session?.user) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <AuthLayout>
      <Suspense fallback={<RegisterForm />}>
        <RequestAccessClient />
      </Suspense>
    </AuthLayout>
  );
}
