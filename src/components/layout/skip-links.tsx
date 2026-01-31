"use client";

/**
 * Skip Navigation Links
 *
 * Accessibility component that provides keyboard-accessible skip links.
 * Visually hidden by default, visible on focus for keyboard users.
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const skipLinkStyles = cn(
  // Visually hidden by default
  "sr-only",
  // Visible on focus
  "focus:not-sr-only focus:absolute focus:z-[100]",
  "focus:top-4 focus:left-4",
  "focus:px-4 focus:py-2",
  "focus:bg-primary focus:text-primary-foreground",
  "focus:rounded-md focus:shadow-lg",
  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  "focus:font-medium focus:text-sm"
);

export function SkipLinks() {
  const t = useTranslations("accessibility.skipLinks");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // This pattern is intentional to fix hydration mismatches
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Don't render on server to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div className="skip-links">
      <a href="#main-content" className={skipLinkStyles}>
        {t("mainContent")}
      </a>
      <a href="#navigation" className={skipLinkStyles}>
        {t("navigation")}
      </a>
      <a href="#search" className={skipLinkStyles}>
        {t("search")}
      </a>
    </div>
  );
}

export default SkipLinks;
