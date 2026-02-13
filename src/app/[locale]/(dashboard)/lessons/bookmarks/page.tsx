import { redirect } from "next/navigation";

interface BookmarksPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Redirect: /lessons/bookmarks → /knowledge?tab=bookmarks
 *
 * Bookmarks are now a tab in the unified Knowledge Base page.
 */
export default async function BookmarksRedirect({
  params,
}: BookmarksPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/knowledge?tab=bookmarks`);
}
