"use client";

import { Suspense } from "react";
import type { ReviewTab } from "../_types";
import {
  OverviewTabSkeleton,
  WorkspaceTabSkeleton,
  DocumentsTabSkeleton,
  FindingsTabSkeleton,
  ReportTabSkeleton,
  SettingsTabSkeleton,
} from "./skeletons";

interface TabContentProps {
  tab: ReviewTab;
  children: React.ReactNode;
}

const skeletonMap: Record<ReviewTab, React.ComponentType> = {
  overview: OverviewTabSkeleton,
  workspace: WorkspaceTabSkeleton,
  documents: DocumentsTabSkeleton,
  findings: FindingsTabSkeleton,
  report: ReportTabSkeleton,
  settings: SettingsTabSkeleton,
};

export function TabContent({ tab, children }: TabContentProps) {
  const Skeleton = skeletonMap[tab] || OverviewTabSkeleton;

  return (
    <Suspense fallback={<Skeleton />}>
      <div
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="animate-in fade-in-50 duration-200"
      >
        {children}
      </div>
    </Suspense>
  );
}
