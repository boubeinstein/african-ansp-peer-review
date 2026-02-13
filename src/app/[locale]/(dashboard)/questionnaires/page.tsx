import { redirect } from "next/navigation";

interface QuestionnairesPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Redirect: /questionnaires → /assessments?tab=usoap
 *
 * Questionnaire browsers are now tabs within the unified
 * Questionnaires & Assessments page. Sub-routes
 * (/questionnaires/ans/*, /questionnaires/sms/*, /questionnaires/question/*)
 * continue to work as before.
 */
export default async function QuestionnairesRedirect({
  params,
}: QuestionnairesPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/assessments?tab=usoap`);
}
