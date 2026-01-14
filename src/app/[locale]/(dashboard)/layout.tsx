import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

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

  const user = {
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    email: session.user.email || "",
    role: session.user.role,
  };

  return (
    <AppShell locale={locale} user={user}>
      {children}
    </AppShell>
  );
}
