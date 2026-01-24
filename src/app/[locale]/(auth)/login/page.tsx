import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { LoginShowcase } from "@/components/features/auth/login-showcase";
import { LoginForm } from "@/components/features/auth/login-form";
import { LoginFormSkeleton } from "@/components/features/auth/login-form-skeleton";

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: LoginPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.login" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale);

  // Redirect if already authenticated
  const session = await auth();
  if (session?.user) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Showcase (2/3) */}
      <div className="hidden lg:flex lg:w-2/3 bg-[#0c1929] relative overflow-hidden">
        <Suspense fallback={<ShowcaseSkeleton />}>
          <LoginShowcase />
        </Suspense>
      </div>

      {/* Right Panel - Login Form (1/3) */}
      <div className="w-full lg:w-1/3 flex flex-col justify-center bg-white dark:bg-slate-950">
        {/* Mobile Header - Only visible on small screens */}
        <div className="lg:hidden px-6 pt-8 pb-4">
          <MobileHeader />
        </div>

        {/* Login Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 lg:px-10">
          <div className="w-full max-w-sm space-y-8">
            <Suspense fallback={<LoginFormSkeleton />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 text-center text-xs text-muted-foreground border-t">
          <p>© 2026 African ANSP Peer Review Programme</p>
          <p className="mt-1">ICAO • CANSO • AFCAC</p>
        </div>
      </div>
    </div>
  );
}

function ShowcaseSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-8 w-64 bg-slate-700 rounded" />
        <div className="h-4 w-48 bg-slate-700 rounded" />
        <div className="flex gap-4 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 w-24 bg-slate-700 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileHeader() {
  return (
    <div className="flex items-center justify-center gap-4">
      <Image
        src="/images/logos/International_Civil_Aviation_Organization_logo.svg"
        alt="ICAO"
        width={80}
        height={40}
        className="h-10 w-auto"
      />
      <Image
        src="/images/logos/CANSO.svg"
        alt="CANSO"
        width={80}
        height={40}
        className="h-10 w-auto"
      />
    </div>
  );
}
