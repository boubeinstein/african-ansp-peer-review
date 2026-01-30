import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardProviders } from "@/components/providers/dashboard-providers";
import { InstallPrompt } from "@/components/pwa/install-prompt";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Check if user must change password - redirect to (auth) route
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true },
  });

  if (dbUser?.mustChangePassword) {
    redirect(`/${locale}/change-password`);
  }

  const user = {
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    email: session.user.email || "",
    role: session.user.role,
  };

  return (
    <DashboardProviders>
      <AppShell locale={locale} user={user}>
        {children}
      </AppShell>
      <InstallPrompt />
    </DashboardProviders>
  );
}
