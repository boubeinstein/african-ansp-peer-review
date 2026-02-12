"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// Props
// =============================================================================

export interface SectionStatus {
  id: string;
  label: string;
  completed: boolean;
}

interface SectionProgressProps {
  sections: SectionStatus[];
  activeSection?: string;
}

// =============================================================================
// Component
// =============================================================================

export function SectionProgress({ sections, activeSection }: SectionProgressProps) {
  const scrollTo = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const completedCount = sections.filter((s) => s.completed).length;

  return (
    <nav className="hidden lg:block sticky top-24" aria-label="Form progress">
      <div className="space-y-1.5">
        {/* Progress summary */}
        <p className="text-xs font-medium text-muted-foreground mb-3">
          {completedCount}/{sections.length}
        </p>

        {sections.map((section, i) => {
          const isActive = section.id === activeSection;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollTo(section.id)}
              className={cn(
                "flex items-center gap-2.5 w-full text-left py-1 group transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              )}
            >
              {/* Dot */}
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full shrink-0 border-2 transition-colors",
                  section.completed
                    ? "bg-primary border-primary"
                    : isActive
                      ? "bg-transparent border-primary"
                      : "bg-transparent border-muted-foreground/30"
                )}
              />

              {/* Label */}
              <span
                className={cn(
                  "text-xs truncate transition-colors",
                  isActive
                    ? "text-foreground font-medium"
                    : section.completed
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60 group-hover:text-muted-foreground"
                )}
              >
                {section.label}
              </span>

              {/* Connector line (not after last) */}
              {i < sections.length - 1 && (
                <span className="sr-only">→</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
