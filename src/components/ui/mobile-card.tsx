"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface MobileCardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  selected?: boolean;
}

export const MobileCard = forwardRef<HTMLDivElement, MobileCardProps>(
  (
    { className, interactive = false, selected = false, children, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-card rounded-lg border p-4",
          interactive &&
            "active:scale-[0.98] transition-transform cursor-pointer touch-manipulation",
          selected && "ring-2 ring-primary",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

MobileCard.displayName = "MobileCard";

export const MobileCardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-between mb-2", className)}
    {...props}
  />
));
MobileCardHeader.displayName = "MobileCardHeader";

export const MobileCardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold text-base truncate", className)}
    {...props}
  />
));
MobileCardTitle.displayName = "MobileCardTitle";

export const MobileCardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground line-clamp-2", className)}
    {...props}
  />
));
MobileCardDescription.displayName = "MobileCardDescription";

export const MobileCardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-between mt-3 pt-3 border-t text-sm",
      className
    )}
    {...props}
  />
));
MobileCardFooter.displayName = "MobileCardFooter";
