"use client";

/**
 * Organization View Toggle Component
 *
 * Toggle button group for switching between card and table views.
 */

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export type ViewMode = "card" | "table";

interface OrganizationViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function OrganizationViewToggle({
  view,
  onChange,
  className,
}: OrganizationViewToggleProps) {
  const t = useTranslations("organizations");

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border bg-muted p-1",
        className
      )}
      role="group"
      aria-label={t("viewToggle.label")}
    >
      <Button
        variant={view === "card" ? "default" : "ghost"}
        size="sm"
        className={cn(
          "h-8 px-3",
          view === "card"
            ? "bg-background shadow-sm"
            : "hover:bg-background/50"
        )}
        onClick={() => onChange("card")}
        aria-pressed={view === "card"}
        title={t("viewToggle.card")}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="sr-only">{t("viewToggle.card")}</span>
      </Button>

      <Button
        variant={view === "table" ? "default" : "ghost"}
        size="sm"
        className={cn(
          "h-8 px-3",
          view === "table"
            ? "bg-background shadow-sm"
            : "hover:bg-background/50"
        )}
        onClick={() => onChange("table")}
        aria-pressed={view === "table"}
        title={t("viewToggle.table")}
      >
        <List className="h-4 w-4" />
        <span className="sr-only">{t("viewToggle.table")}</span>
      </Button>
    </div>
  );
}

export default OrganizationViewToggle;
