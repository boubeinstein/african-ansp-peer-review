import { redirect } from "next/navigation";

interface BestPracticesPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Redirect: /best-practices → /knowledge?tab=bestPractices
 *
 * Best practices browser is now the first tab in the unified
 * Knowledge Base page. Sub-routes (/best-practices/[id],
 * /best-practices/new) continue to work as before.
 */
export default async function BestPracticesRedirect({
  params,
}: BestPracticesPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/knowledge?tab=bestPractices`);
}
