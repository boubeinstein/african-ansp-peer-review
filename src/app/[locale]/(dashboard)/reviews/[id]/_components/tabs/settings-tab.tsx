"use client";

import type { ReviewData } from "../../_lib/fetch-review-data";

interface SettingsTabProps {
  review: ReviewData;
}

export function SettingsTab(_props: SettingsTabProps) {
  return (
    <div className="p-6">
      <p className="text-muted-foreground">Settings tab - to be implemented</p>
    </div>
  );
}
