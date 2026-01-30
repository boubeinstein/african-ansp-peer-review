"use client";

import type { ReviewData, ReviewCounts } from "../../_lib/fetch-review-data";

interface OverviewTabProps {
  review: ReviewData;
  counts: ReviewCounts;
}

export function OverviewTab(_props: OverviewTabProps) {
  return (
    <div className="p-6">
      <p className="text-muted-foreground">Overview tab - to be implemented in Prompt 5.1-4</p>
    </div>
  );
}
