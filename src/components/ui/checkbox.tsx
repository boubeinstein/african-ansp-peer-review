"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Native Checkbox implementation (React 19 compatible)
 * Replaces Radix UI Checkbox to avoid infinite loop with useComposedRefs
 */
const Checkbox = React.forwardRef<
  HTMLButtonElement,
  {
    className?: string
    checked?: boolean
    defaultChecked?: boolean
    onCheckedChange?: (checked: boolean) => void
    disabled?: boolean
    id?: string
    name?: string
    value?: string
  } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'type'>
>(({ className, checked, defaultChecked, onCheckedChange, disabled, id, ...props }, ref) => {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false)
  const isChecked = checked !== undefined ? checked : internalChecked

  const handleClick = () => {
    if (disabled) return
    const newVal = !isChecked
    if (checked === undefined) {
      setInternalChecked(newVal)
    }
    onCheckedChange?.(newVal)
  }

  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={isChecked}
      data-slot="checkbox"
      data-state={isChecked ? "checked" : "unchecked"}
      disabled={disabled}
      id={id}
      onClick={handleClick}
      className={cn(
        "peer border-input dark:bg-input/30 size-4 shrink-0 rounded-[4px] border shadow-xs transition-all outline-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        "aria-invalid:ring-2 aria-invalid:ring-destructive aria-invalid:border-destructive",
        isChecked && "bg-primary text-primary-foreground border-primary dark:bg-primary",
        className
      )}
      {...props}
    >
      {isChecked && (
        <span
          data-slot="checkbox-indicator"
          className="flex items-center justify-center text-current"
        >
          <CheckIcon className="size-3.5" />
        </span>
      )}
    </button>
  )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }
