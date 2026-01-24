"use client";

/**
 * Availability Badge Component
 *
 * Displays reviewer availability status with color-coded indicators:
 * - GREEN: Currently available
 * - RED: Unavailable or expired availability
 * - YELLOW: Future availability (not yet started)
 */

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface AvailabilityBadgeProps {
  isAvailable: boolean;
  availableFrom: Date | null;
  availableTo: Date | null;
  showDetails?: boolean;
  size?: "sm" | "default";
}

export interface AvailabilityStatus {
  status: "available" | "unavailable" | "future";
  label: string;
  detailLabel: string;
  color: "green" | "red" | "yellow";
}

// =============================================================================
// HELPER FUNCTION
// =============================================================================

/**
 * Calculate availability status based on isAvailable flag and date range.
 * This is exported so other components can use the logic.
 */
export function getAvailabilityStatus(
  isAvailable: boolean,
  availableFrom: Date | null,
  availableTo: Date | null
): AvailabilityStatus {
  // Master toggle is off
  if (!isAvailable) {
    return {
      status: "unavailable",
      label: "Unavailable",
      detailLabel: "Not accepting assignments",
      color: "red",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const from = availableFrom ? new Date(availableFrom) : null;
  const to = availableTo ? new Date(availableTo) : null;

  if (from) from.setHours(0, 0, 0, 0);
  if (to) to.setHours(23, 59, 59, 999);

  // No date range = always available
  if (!from && !to) {
    return {
      status: "available",
      label: "Available",
      detailLabel: "Available anytime",
      color: "green",
    };
  }

  // Check if currently within range
  const afterStart = !from || today >= from;
  const beforeEnd = !to || today <= to;

  if (afterStart && beforeEnd) {
    const endDateStr = to ? format(to, "MMM d, yyyy") : "";
    return {
      status: "available",
      label: "Available",
      detailLabel: to ? `Available until ${endDateStr}` : "Available",
      color: "green",
    };
  }

  // Future availability
  if (from && today < from) {
    const startDateStr = format(from, "MMM d");
    return {
      status: "future",
      label: "Upcoming",
      detailLabel: `Available from ${startDateStr}`,
      color: "yellow",
    };
  }

  // Availability window has passed
  return {
    status: "unavailable",
    label: "Unavailable",
    detailLabel: "Availability window expired",
    color: "red",
  };
}

/**
 * Check if a reviewer is currently available (for filtering/disabling)
 */
export function isReviewerCurrentlyAvailable(reviewer: {
  isAvailable: boolean;
  availableFrom: Date | null;
  availableTo: Date | null;
}): boolean {
  const { status } = getAvailabilityStatus(
    reviewer.isAvailable,
    reviewer.availableFrom,
    reviewer.availableTo
  );
  return status === "available";
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AvailabilityBadge({
  isAvailable,
  availableFrom,
  availableTo,
  showDetails = false,
  size = "default",
}: AvailabilityBadgeProps) {
  const status = getAvailabilityStatus(isAvailable, availableFrom, availableTo);

  const sizeClasses =
    size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <Badge
      variant="outline"
      className={cn(
        sizeClasses,
        "font-medium gap-1.5",
        status.color === "green" &&
          "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
        status.color === "red" &&
          "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
        status.color === "yellow" &&
          "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800"
      )}
    >
      {status.color === "green" && <CheckCircle2 className={iconSize} />}
      {status.color === "red" && <XCircle className={iconSize} />}
      {status.color === "yellow" && <Clock className={iconSize} />}
      <span>{showDetails ? status.detailLabel : status.label}</span>
    </Badge>
  );
}

export default AvailabilityBadge;
