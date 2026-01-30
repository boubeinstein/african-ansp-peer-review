"use client";

import type { ReviewData } from "../../_lib/fetch-review-data";

interface WorkspaceTabProps {
  review: ReviewData;
}

export function WorkspaceTab(_props: WorkspaceTabProps) {
  return (
    <div className="p-6">
      <p className="text-muted-foreground">Workspace tab - to be implemented</p>
    </div>
  );
}
