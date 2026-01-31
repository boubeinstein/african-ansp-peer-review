import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Code - Theme-aware inline code component
 *
 * Use for displaying code, IDs, or technical values inline.
 */
interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  /** Display as a code block instead of inline */
  block?: boolean;
}

export function Code({ className, block, children, ...props }: CodeProps) {
  if (block) {
    return (
      <pre
        className={cn(
          "rounded-lg bg-muted p-4 overflow-x-auto",
          className
        )}
        {...props}
      >
        <code className="text-sm text-foreground font-mono">{children}</code>
      </pre>
    );
  }

  return (
    <code
      className={cn(
        "rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </code>
  );
}
