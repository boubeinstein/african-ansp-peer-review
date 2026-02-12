import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { fetchReviewWithCounts } from "./_lib/fetch-review-data";
import { ReviewLayout } from "./_components/review-layout";
import { TabContent } from "./_components/tab-content";
import {
  OverviewTab,
  WorkspaceTab,
  DocumentsTab,
  FindingsTab,
  FieldworkTab,
  ReportTab,
  RetrospectiveTab,
  SettingsTab,
} from "./_components/tabs";
import type { ReviewTab } from "./_types";

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviews.detail" });
  return {
    title: t("title"),
  };
}

export default async function ReviewDetailPage({ params, searchParams }: PageProps) {
  const { id, locale } = await params;
  const { tab: tabParam } = await searchParams;

  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const { review, counts } = await fetchReviewWithCounts(id);

  // Validate tab parameter
  const validTabs: ReviewTab[] = ["overview", "workspace", "documents", "findings", "fieldwork", "report", "retrospective", "settings"];
  const currentTab = validTabs.includes(tabParam as ReviewTab) ? (tabParam as ReviewTab) : "overview";

  const renderTabContent = () => {
    switch (currentTab) {
      case "overview":
        return <OverviewTab review={review} counts={counts} />;
      case "workspace":
        return <WorkspaceTab review={review} userId={session.user.id} userName={`${session.user.firstName} ${session.user.lastName}`} userRole={session.user.role} locale={locale} />;
      case "documents":
        return <DocumentsTab review={review} userId={session.user.id} userName={`${session.user.firstName} ${session.user.lastName}`} />;
      case "findings":
        return <FindingsTab review={review} userId={session.user.id} userName={`${session.user.firstName} ${session.user.lastName}`} />;
      case "fieldwork":
        return <FieldworkTab review={review} userId={session.user.id} />;
      case "report":
        return <ReportTab review={review} userRole={session.user.role} />;
      case "retrospective":
        return <RetrospectiveTab review={review} />;
      case "settings":
        return <SettingsTab review={review} />;
      default:
        return <OverviewTab review={review} counts={counts} />;
    }
  };

  return (
    <ReviewLayout
      review={{
        id: review.id,
        reviewNumber: review.referenceNumber,
        status: review.status,
        hostOrganization: review.hostOrganization,
        reviewType: review.reviewType,
        scheduledStartDate: review.plannedStartDate,
        scheduledEndDate: review.plannedEndDate,
      }}
      userId={session.user.id}
      counts={counts}
    >
      <TabContent tab={currentTab}>
        {renderTabContent()}
      </TabContent>
    </ReviewLayout>
  );
}
