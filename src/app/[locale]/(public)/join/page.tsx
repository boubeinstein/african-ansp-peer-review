import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JoinRequestForm } from "@/components/features/join-request/join-request-form";

interface JoinPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: JoinPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "joinRequest" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default function JoinPage() {
  return <JoinRequestForm />;
}
