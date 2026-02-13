import { redirect } from "next/navigation";

interface LessonsPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Redirect: /lessons → /knowledge?tab=lessons
 *
 * Lessons search is now a tab in the unified Knowledge Base page.
 * Sub-routes (/lessons/[id], /lessons/analytics) continue to work
 * as before.
 */
export default async function LessonsRedirect({
  params,
}: LessonsPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/knowledge?tab=lessons`);
}
