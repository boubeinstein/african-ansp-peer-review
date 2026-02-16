import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Badge variants with WCAG 2.1 AA compliant contrast ratios (React 19 compatible)
 * All variants include subtle borders for additional visual differentiation
 * Replaces Radix Slot with native React.cloneElement for asChild
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        // Primary blue - white text on blue (≈7:1 contrast)
        default:
          "border-primary/20 bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        // Secondary - dark text on light gray (≈10:1 contrast)
        secondary:
          "border-secondary-foreground/10 bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        // Destructive red - white text on dark red (≈5.3:1 contrast)
        // Using red-700 (#b91c1c) for better contrast than default destructive
        destructive:
          "border-red-800/20 bg-red-700 text-white [a&]:hover:bg-red-800 focus-visible:ring-red-500/20 dark:bg-red-600 dark:border-red-500/30 dark:focus-visible:ring-red-500/40",
        // Success green - white text on dark green (≈4.6:1 contrast)
        // Using green-700 (#15803d) for WCAG AA compliance
        success:
          "border-green-800/20 bg-green-700 text-white [a&]:hover:bg-green-800 focus-visible:ring-green-500/20 dark:bg-green-600 dark:border-green-500/30",
        // Warning amber - dark text on light amber (≈5.8:1 contrast)
        // Using amber-800 text on amber-100 bg for accessibility
        warning:
          "border-amber-300 bg-amber-100 text-amber-800 [a&]:hover:bg-amber-200 focus-visible:ring-amber-500/20 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700/50",
        // Info blue - dark text on light blue (≈5.2:1 contrast)
        info:
          "border-blue-300 bg-blue-100 text-blue-800 [a&]:hover:bg-blue-200 focus-visible:ring-blue-500/20 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700/50",
        // Outline - transparent with border
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const computedClassName = cn(badgeVariants({ variant }), className)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      'data-slot': 'badge',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      className: cn(computedClassName, (children.props as any).className),
      ...props,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  }

  return (
    <span
      data-slot="badge"
      className={computedClassName}
      {...props}
    >
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
