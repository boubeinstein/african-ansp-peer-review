"use client";

import type { ReviewData } from "../../_lib/fetch-review-data";

interface DocumentsTabProps {
  review: ReviewData;
}

export function DocumentsTab(_props: DocumentsTabProps) {
  return (
    <div className="p-6">
      <p className="text-muted-foreground">Documents tab - to be implemented</p>
    </div>
  );
}
