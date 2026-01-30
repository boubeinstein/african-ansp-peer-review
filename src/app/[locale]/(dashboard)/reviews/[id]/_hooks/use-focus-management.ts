"use client";

import { useEffect, useRef } from "react";

export function useFocusManagement(tabChanged: boolean) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabChanged && contentRef.current) {
      // Find the first focusable element in the tab content
      const focusable = contentRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      // Focus the heading or first focusable element
      const heading = contentRef.current.querySelector<HTMLElement>("h2, h3");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus();
      } else if (focusable) {
        focusable.focus();
      }
    }
  }, [tabChanged]);

  return contentRef;
}
