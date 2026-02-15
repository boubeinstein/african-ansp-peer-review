"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Native Switch implementation (React 19 compatible)
 * Replaces Radix UI Switch to avoid infinite loop with useComposedRefs
 */
function Switch({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  ...props
}: {
  className?: string
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'checked' | 'defaultChecked' | 'type'>) {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false)
  const isChecked = checked !== undefined ? checked : internalChecked

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newChecked = e.target.checked
    if (checked === undefined) {
      setInternalChecked(newChecked)
    }
    onCheckedChange?.(newChecked)
  }

  return (
    <label
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none cursor-pointer",
        "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1 focus-within:ring-offset-background",
        isChecked
          ? "bg-primary"
          : "bg-input dark:bg-input/80",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={isChecked}
        onChange={handleChange}
        disabled={disabled}
        {...props}
      />
      <span
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full ring-0 transition-transform bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-background shadow-sm",
          isChecked ? "translate-x-[calc(100%-2px)]" : "translate-x-0",
        )}
        data-state={isChecked ? "checked" : "unchecked"}
      />
    </label>
  )
}

export { Switch }
