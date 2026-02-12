"use client";

import { useCallback } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// Props
// =============================================================================

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
  lg: "h-9 w-9",
} as const;

const gapMap = {
  sm: "gap-1",
  md: "gap-1.5",
  lg: "gap-2",
} as const;

// =============================================================================
// Component
// =============================================================================

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = "md",
}: StarRatingProps) {
  const handleClick = useCallback(
    (rating: number) => {
      if (readOnly || !onChange) return;
      onChange(rating);
    },
    [readOnly, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, rating: number) => {
      if (readOnly || !onChange) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onChange(rating);
      } else if (e.key === "ArrowRight" && value < 5) {
        e.preventDefault();
        onChange(value + 1);
      } else if (e.key === "ArrowLeft" && value > 1) {
        e.preventDefault();
        onChange(value - 1);
      }
    },
    [readOnly, onChange, value]
  );

  return (
    <div
      className={cn("flex items-center", gapMap[size])}
      role="radiogroup"
      aria-label="Rating"
    >
      {[1, 2, 3, 4, 5].map((rating) => {
        const filled = rating <= value;
        return (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${rating} star${rating !== 1 ? "s" : ""}`}
            tabIndex={readOnly ? -1 : rating === value ? 0 : -1}
            disabled={readOnly}
            onClick={() => handleClick(rating)}
            onKeyDown={(e) => handleKeyDown(e, rating)}
            className={cn(
              "transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !readOnly && "cursor-pointer hover:scale-110 active:scale-95",
              readOnly && "cursor-default"
            )}
          >
            <Star
              className={cn(
                sizeMap[size],
                "transition-colors",
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
