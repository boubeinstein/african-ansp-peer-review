"use client"

import * as React from "react"

/**
 * Native Tooltip implementation (React 19 compatible)
 * Replaces Radix UI Tooltip to avoid infinite loop with useComposedRefs
 *
 * Note: This is a minimal no-op implementation that prevents crashes.
 * Tooltips will not visually appear, but the component API is preserved
 * for compatibility. This is acceptable since tooltips are non-critical
 * progressive enhancement features.
 */

function TooltipProvider({
  children,
  ..._props
}: {
  children: React.ReactNode
  delayDuration?: number
  skipDelayDuration?: number
}) {
  return <>{children}</>
}

function Tooltip({
  children,
  ..._props
}: {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  delayDuration?: number
}) {
  return <>{children}</>
}

const TooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild, children, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return children
  }
  return (
    <button
      type="button"
      ref={ref}
      data-slot="tooltip-trigger"
      {...props}
    >
      {children}
    </button>
  )
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    side?: "top" | "bottom" | "left" | "right"
    sideOffset?: number
    align?: "start" | "center" | "end"
  }
>((_props, _ref) => {
  // Return null - tooltip content won't be shown
  // This prevents the crash while maintaining API compatibility
  return null
})
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
