"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ReviewHeader } from "./review-header";
import { ReviewTabs } from "./review-tabs";
import type { ReviewTab } from "../_types";

interface ReviewLayoutProps {
  review: {
    id: string;
    reviewNumber: string;
    status: string;
    hostOrganization: { nameEn: string; nameFr: string; code: string };
    reviewType: string;
    scheduledStartDate: Date | null;
    scheduledEndDate: Date | null;
  };
  children: React.ReactNode;
  counts: {
    discussions: number;
    openDiscussions: number;
    tasks: number;
    openTasks: number;
    documents: number;
    findings: number;
    criticalFindings: number;
  };
}

export function ReviewLayout({ review, children, counts }: ReviewLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentTab = (searchParams.get("tab") as ReviewTab) || "overview";

  const handleTabChange = useCallback((tab: ReviewTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <ReviewHeader review={review} />

      {/* Sticky Tab Bar */}
      <ReviewTabs
        currentTab={currentTab}
        onTabChange={handleTabChange}
        counts={counts}
      />

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
