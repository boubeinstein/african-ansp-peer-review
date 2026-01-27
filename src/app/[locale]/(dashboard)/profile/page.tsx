import { redirect } from "next/navigation";

interface ProfilePageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Profile redirect page
 *
 * Redirects to /settings where the Profile tab is the first/default tab.
 * This handles any bookmarked URLs to the old /profile route.
 *
 * UX Decision: Consolidated profile into settings following NN/G principles:
 * - Heuristic #4: Consistency and standards (single entry point)
 * - Heuristic #8: Aesthetic and minimalist design (remove redundancy)
 */
export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  redirect(`/${locale}/settings`);
}
