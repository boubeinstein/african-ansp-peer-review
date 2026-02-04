import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { LoginCarousel } from "@/components/features/auth/login-carousel";
import { LoginForm } from "@/components/features/auth/login-form";
import { LoginFormSkeleton } from "@/components/features/auth/login-form-skeleton";
import { Logo } from "@/components/ui/logo";

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
      {/* Left Panel - Carousel (60%) */}
      <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden">
        <Suspense fallback={<CarouselSkeleton />}>
          <LoginCarousel />
        </Suspense>
      </div>

      {/* Right Panel - Login Form (40%) */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center bg-[#F8FAFC]">
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
        <div className="px-6 py-4 text-center text-xs text-muted-foreground border-t border-slate-200">
          <p className="text-slate-500">© 2026 African ANSP Peer Review Programme</p>
          <p className="mt-1 text-slate-400">ICAO · CANSO</p>
        </div>
      </div>
    </div>
  );
}

function CarouselSkeleton() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-[#1B3A5C] to-[#142D48] flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-6">
        <div className="h-6 w-40 bg-white/10 rounded-full" />
        <div className="h-10 w-80 bg-white/10 rounded" />
        <div className="h-1 w-20 bg-white/10 rounded-full" />
        <div className="h-4 w-64 bg-white/10 rounded" />
        <div className="flex gap-4 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 w-24 bg-white/10 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileHeader() {
  return (
    <div className="flex flex-col items-center gap-3">
      <Logo size="xl" />
      <div className="flex items-center gap-3">
        <Image
          src="/images/logos/International_Civil_Aviation_Organization_logo.svg"
          alt="ICAO"
          width={80}
          height={40}
          className="h-10 w-auto"
        />
        <div className="h-6 w-px bg-slate-300" />
        <Image
          src="/images/logos/CANSO.svg"
          alt="CANSO"
          width={80}
          height={40}
          className="h-6 w-auto"
        />
      </div>
      <p className="text-xs text-slate-500">African ANSP Peer Review Programme</p>
    </div>
  );
}
