import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/features/auth/change-password-form";

export const metadata: Metadata = {
  title: "Change Password",
};

interface ChangePasswordPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ChangePasswordPage({
  params,
}: ChangePasswordPageProps) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  return <ChangePasswordForm />;
}
