"use client";

import type { ReviewData } from "../../_lib/fetch-review-data";

interface FindingsTabProps {
  review: ReviewData;
}

export function FindingsTab(_props: FindingsTabProps) {
  return (
    <div className="p-6">
      <p className="text-muted-foreground">Findings tab - to be implemented</p>
    </div>
  );
}
