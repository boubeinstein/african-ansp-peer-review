import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { ReviewsPageClient } from "./reviews-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reviews");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function ReviewsPage() {
  const session = await auth();

  return (
    <ReviewsPageClient
      userOrganizationId={session?.user?.organizationId ?? undefined}
      userRole={session?.user?.role}
    />
  );
}
