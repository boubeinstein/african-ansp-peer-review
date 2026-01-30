"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReviewTab } from "../_types";

interface TabContentProps {
  tab: ReviewTab;
  children: React.ReactNode;
}

function TabSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function TabContent({ tab, children }: TabContentProps) {
  return (
    <Suspense fallback={<TabSkeleton />}>
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
