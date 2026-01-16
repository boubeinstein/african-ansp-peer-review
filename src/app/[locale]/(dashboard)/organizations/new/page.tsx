import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { OrganizationCreateForm } from "./create-form";

interface CreateOrganizationPageProps {
  params: Promise<{
    locale: string;
  }>;
}

// Admin roles that can create organizations
const ADMIN_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"];

export async function generateMetadata({ params }: CreateOrganizationPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "organizations" });

  return {
    title: t("form.createTitle"),
    description: t("form.createDescription"),
  };
}

export default async function CreateOrganizationPage({
  params,
}: CreateOrganizationPageProps) {
  const { locale } = await params;
  const session = await auth();

  // Check authentication
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Check authorization - only admins can create organizations
  if (!ADMIN_ROLES.includes(session.user.role)) {
    redirect(`/${locale}/organizations`);
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <OrganizationCreateForm locale={locale} />
    </div>
  );
}
