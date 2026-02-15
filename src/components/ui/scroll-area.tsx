"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Native CSS ScrollArea (React 19 compatible)
 * Replaces Radix UI ScrollArea to avoid infinite loop with useComposedRefs
 */
function ScrollArea({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="scroll-area"
      className={cn(
        "relative overflow-auto",
        "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2",
        "[&::-webkit-scrollbar-track]:bg-transparent",
        "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/50",
        "[&::-webkit-scrollbar-thumb:hover]:bg-border",
        "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/50",
        "focus-visible:ring-ring/50 rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * ScrollBar component for API compatibility
 * Scrollbar styling is handled by CSS on the ScrollArea container
 */
function ScrollBar({
  className: _className,
  orientation: _orientation = "vertical",
  ..._props
}: React.HTMLAttributes<HTMLDivElement> & { orientation?: "vertical" | "horizontal" }) {
  // No-op: scrollbar styling is handled by CSS on the ScrollArea container.
  // This component exists only for API compatibility with existing code that renders <ScrollBar />.
  return null
}

export { ScrollArea, ScrollBar }
