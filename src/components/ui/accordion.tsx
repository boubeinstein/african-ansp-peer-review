"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Native Accordion implementation (React 19 compatible)
 * Replaces Radix UI Accordion to avoid infinite loop with useComposedRefs
 */

type AccordionContextValue = {
  type: "single" | "multiple"
  value: string[]
  onValueChange: (value: string) => void
}

const AccordionContext = React.createContext<AccordionContextValue>({
  type: "single",
  value: [],
  onValueChange: () => {},
})

const AccordionItemContext = React.createContext<{
  value: string
  isOpen: boolean
}>({
  value: "",
  isOpen: false,
})

type AccordionSingleProps = {
  type?: "single"
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  collapsible?: boolean
  className?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>

type AccordionMultipleProps = {
  type: "multiple"
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  collapsible?: boolean
  className?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>

type AccordionProps = AccordionSingleProps | AccordionMultipleProps

function Accordion({
  type = "single",
  value,
  defaultValue,
  onValueChange,
  collapsible = false,
  className,
  children,
  ...props
}: AccordionProps) {
  const [internalValue, setInternalValue] = React.useState<string[]>(() => {
    if (defaultValue) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue]
    }
    return []
  })

  const currentValue = React.useMemo(() => {
    if (value !== undefined) {
      return Array.isArray(value) ? value : [value]
    }
    return internalValue
  }, [value, internalValue])

  const handleValueChange = React.useCallback(
    (itemValue: string) => {
      let newValue: string[]

      if (type === "multiple") {
        newValue = currentValue.includes(itemValue)
          ? currentValue.filter((v) => v !== itemValue)
          : [...currentValue, itemValue]
      } else {
        const isCurrentlyOpen = currentValue.includes(itemValue)
        // In single mode with collapsible=true, allow closing the current item
        // In single mode with collapsible=false, only allow switching to different item
        newValue = isCurrentlyOpen && collapsible ? [] : [itemValue]
      }

      if (value === undefined) {
        setInternalValue(newValue)
      }

      if (onValueChange) {
        if (type === "multiple") {
          (onValueChange as (value: string[]) => void)(newValue)
        } else {
          (onValueChange as (value: string) => void)(newValue[0] ?? "")
        }
      }
    },
    [type, currentValue, value, onValueChange, collapsible]
  )

  return (
    <AccordionContext.Provider
      value={{
        type,
        value: currentValue,
        onValueChange: handleValueChange,
      }}
    >
      <div data-slot="accordion" className={className} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

function AccordionItem({
  value,
  className,
  children,
  ...props
}: {
  value: string
  className?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  const { value: openValues } = React.useContext(AccordionContext)
  const isOpen = openValues.includes(value)

  return (
    <AccordionItemContext.Provider value={{ value, isOpen }}>
      <div
        data-slot="accordion-item"
        data-state={isOpen ? "open" : "closed"}
        className={cn("border-b last:border-b-0", className)}
        {...props}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: {
  className?: string
  children: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { onValueChange } = React.useContext(AccordionContext)
  const { value, isOpen } = React.useContext(AccordionItemContext)

  return (
    <div className="flex">
      <button
        type="button"
        data-slot="accordion-trigger"
        data-state={isOpen ? "open" : "closed"}
        onClick={() => onValueChange(value)}
        className={cn(
          "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon
          className={cn(
            "text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
    </div>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: {
  className?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  const { isOpen } = React.useContext(AccordionItemContext)

  if (!isOpen) return null

  return (
    <div
      data-slot="accordion-content"
      data-state="open"
      className="overflow-hidden text-sm"
      {...props}
    >
      <div className={cn("pt-0 pb-4", className)}>{children}</div>
    </div>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
