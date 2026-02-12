"use client";

import { Suspense } from "react";
import type { ReviewTab } from "../_types";
import {
  OverviewTabSkeleton,
  WorkspaceTabSkeleton,
  DocumentsTabSkeleton,
  FindingsTabSkeleton,
  FieldworkTabSkeleton,
  ReportTabSkeleton,
  RetrospectiveTabSkeleton,
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
  fieldwork: FieldworkTabSkeleton,
  report: ReportTabSkeleton,
  retrospective: RetrospectiveTabSkeleton,
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
