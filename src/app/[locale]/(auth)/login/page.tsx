import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/features/auth/login-form";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

function LoginFormSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </CardContent>
    </Card>
  );
}

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm locale={locale} />
      </Suspense>
    </div>
  );
}
