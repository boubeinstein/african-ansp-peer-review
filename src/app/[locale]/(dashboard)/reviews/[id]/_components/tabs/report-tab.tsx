"use client";

import type { ReviewData } from "../../_lib/fetch-review-data";

interface ReportTabProps {
  review: ReviewData;
}

export function ReportTab(_props: ReportTabProps) {
  return (
    <div className="p-6">
      <p className="text-muted-foreground">Report tab - to be implemented</p>
    </div>
  );
}
