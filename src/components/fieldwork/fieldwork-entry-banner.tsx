"use client";

import { useTranslations } from "next-intl";
import { ClipboardCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// =============================================================================
// Props
// =============================================================================

interface FieldworkEntryBannerProps {
  onEnterFieldwork: () => void;
  reviewPhase?: string;
}

// =============================================================================
// Component
// =============================================================================

export function FieldworkEntryBanner({
  onEnterFieldwork,
  reviewPhase,
}: FieldworkEntryBannerProps) {
  const t = useTranslations("fieldwork.mode");

  // Only show for reviews in relevant phases
  const relevantPhases = ["PREPARATION", "ON_SITE", "REPORTING"];
  if (reviewPhase && !relevantPhases.includes(reviewPhase)) return null;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-blue-100 dark:bg-blue-900/50 p-2 shrink-0">
          <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            {t("bannerTitle")}
          </h3>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
            {t("bannerDescription")}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/50"
          onClick={onEnterFieldwork}
        >
          {t("bannerAction")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
