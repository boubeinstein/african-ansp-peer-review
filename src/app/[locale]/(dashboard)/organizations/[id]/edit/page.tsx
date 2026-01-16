import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { OrganizationEditForm } from "./edit-form";

interface EditOrganizationPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

// Admin roles that can edit organizations
const ADMIN_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"];

export async function generateMetadata({ params }: EditOrganizationPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "organizations" });

  return {
    title: t("form.editTitle"),
    description: t("form.editDescription"),
  };
}

export default async function EditOrganizationPage({
  params,
}: EditOrganizationPageProps) {
  const { locale, id } = await params;
  const session = await auth();

  // Check authentication
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Check authorization - only admins can edit organizations
  if (!ADMIN_ROLES.includes(session.user.role)) {
    redirect(`/${locale}/organizations/${id}`);
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <OrganizationEditForm locale={locale} organizationId={id} />
    </div>
  );
}
