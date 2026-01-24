"use client";

import * as React from "react";

/**
 * VisuallyHidden component for accessibility
 *
 * Hides content visually while keeping it accessible to screen readers.
 * Use this for required accessibility elements like DialogTitle when
 * you don't want to show a visible title.
 */
export const VisuallyHidden = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ children, ...props }, ref) => (
  <span
    ref={ref}
    style={{
      position: "absolute",
      border: 0,
      width: 1,
      height: 1,
      padding: 0,
      margin: -1,
      overflow: "hidden",
      clip: "rect(0, 0, 0, 0)",
      whiteSpace: "nowrap",
      wordWrap: "normal",
    }}
    {...props}
  >
    {children}
  </span>
));

VisuallyHidden.displayName = "VisuallyHidden";
