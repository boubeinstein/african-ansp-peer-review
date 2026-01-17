"use client";

/**
 * Info Tooltip Component
 *
 * A small info icon that displays helpful information on hover.
 * Used for providing contextual help throughout the application.
 */

import { Info, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface InfoTooltipProps {
  /** The content to display in the tooltip */
  content: React.ReactNode;
  /** Which side of the trigger to show the tooltip */
  side?: "top" | "right" | "bottom" | "left";
  /** Alignment relative to the trigger */
  align?: "start" | "center" | "end";
  /** Icon variant */
  variant?: "info" | "help";
  /** Size of the icon */
  size?: "sm" | "md" | "lg";
  /** Additional class names */
  className?: string;
  /** Screen reader label */
  srLabel?: string;
}

// =============================================================================
// SIZE CONFIG
// =============================================================================

const ICON_SIZES = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

// =============================================================================
// COMPONENT
// =============================================================================

export function InfoTooltip({
  content,
  side = "top",
  align = "center",
  variant = "info",
  size = "md",
  className,
  srLabel = "More information",
}: InfoTooltipProps) {
  const Icon = variant === "help" ? HelpCircle : Info;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full",
              "text-muted-foreground hover:text-foreground transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary",
              className
            )}
            aria-label={srLabel}
          >
            <Icon className={ICON_SIZES[size]} />
            <span className="sr-only">{srLabel}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className="max-w-xs text-sm"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// LABELED VARIANT
// =============================================================================

export interface LabeledInfoTooltipProps extends Omit<InfoTooltipProps, "srLabel"> {
  /** Label text displayed alongside the icon */
  label: string;
  /** Whether the label should be bold */
  labelBold?: boolean;
}

/**
 * Info tooltip with a visible label
 */
export function LabeledInfoTooltip({
  label,
  labelBold = false,
  ...props
}: LabeledInfoTooltipProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={labelBold ? "font-medium" : ""}>{label}</span>
      <InfoTooltip {...props} srLabel={`More information about ${label}`} />
    </span>
  );
}

export default InfoTooltip;
