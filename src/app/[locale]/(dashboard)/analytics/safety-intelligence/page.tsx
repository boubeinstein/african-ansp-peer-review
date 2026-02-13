import { redirect } from "next/navigation";

interface SafetyIntelligencePageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Redirect: /analytics/safety-intelligence → /analytics?tab=benchmarking
 *
 * Safety Intelligence content is now the "Cross-ANSP Benchmarking" tab
 * within the Programme Intelligence page.
 */
export default async function SafetyIntelligenceRedirect({
  params,
}: SafetyIntelligencePageProps) {
  const { locale } = await params;
  redirect(`/${locale}/analytics?tab=benchmarking`);
}
