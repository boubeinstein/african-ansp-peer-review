"use client";

/**
 * Availability Legend Component
 *
 * Shows color coding explanation for the availability calendar.
 */

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { AvailabilityType } from "@/types/prisma-enums";
import { AVAILABILITY_TYPE_COLOR } from "@/lib/reviewer/labels";

// =============================================================================
// TYPES
// =============================================================================

export interface AvailabilityLegendProps {
  showHighlight?: boolean;
  compact?: boolean;
  className?: string;
}

interface LegendItem {
  type: AvailabilityType | "HIGHLIGHT";
  color: string;
  labelKey: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AvailabilityLegend({
  showHighlight = false,
  compact = false,
  className,
}: AvailabilityLegendProps) {
  const t = useTranslations("reviewer.availability");

  const legendItems: LegendItem[] = [
    {
      type: "AVAILABLE",
      color: AVAILABILITY_TYPE_COLOR.AVAILABLE,
      labelKey: "type.AVAILABLE",
    },
    {
      type: "TENTATIVE",
      color: AVAILABILITY_TYPE_COLOR.TENTATIVE,
      labelKey: "type.TENTATIVE",
    },
    {
      type: "UNAVAILABLE",
      color: AVAILABILITY_TYPE_COLOR.UNAVAILABLE,
      labelKey: "type.UNAVAILABLE",
    },
    {
      type: "ON_ASSIGNMENT",
      color: AVAILABILITY_TYPE_COLOR.ON_ASSIGNMENT,
      labelKey: "type.ON_ASSIGNMENT",
    },
  ];

  if (showHighlight) {
    legendItems.push({
      type: "HIGHLIGHT",
      color: "ring-2 ring-blue-400 bg-blue-50",
      labelKey: "legend.requestedPeriod",
    });
  }

  return (
    <div className={cn("", className)}>
      {!compact && (
        <p className="text-xs font-medium text-muted-foreground mb-2">{t("legend")}</p>
      )}
      <div
        className={cn(
          "flex flex-wrap gap-3",
          compact && "gap-2"
        )}
      >
        {legendItems.map((item) => (
          <div key={item.type} className="flex items-center gap-1.5">
            <span
              className={cn(
                "shrink-0 rounded",
                compact ? "h-2.5 w-2.5" : "h-3 w-3",
                item.type === "HIGHLIGHT" ? item.color : item.color
              )}
            />
            <span className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
              {t(item.labelKey)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AvailabilityLegend;
