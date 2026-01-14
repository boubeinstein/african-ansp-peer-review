"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export type ContentLanguage = "en" | "fr";

interface LanguageToggleProps {
  currentLanguage: ContentLanguage;
  onChange: (language: ContentLanguage) => void;
  className?: string;
  size?: "sm" | "default";
  showIcon?: boolean;
}

export function LanguageToggle({
  currentLanguage,
  onChange,
  className,
  size = "sm",
  showIcon = true,
}: LanguageToggleProps) {
  const handleToggle = useCallback(() => {
    onChange(currentLanguage === "en" ? "fr" : "en");
  }, [currentLanguage, onChange]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  return (
    <div
      className={cn("inline-flex items-center gap-1", className)}
      role="group"
      aria-label="Language toggle"
    >
      {showIcon && (
        <Languages
          className={cn(
            "text-muted-foreground",
            size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"
          )}
        />
      )}
      <div className="inline-flex rounded-md border bg-muted/50 p-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange("en")}
          onKeyDown={handleKeyDown}
          className={cn(
            "px-2 py-0.5 h-auto font-medium transition-colors",
            size === "sm" ? "text-xs" : "text-sm",
            currentLanguage === "en"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-transparent"
          )}
          aria-pressed={currentLanguage === "en"}
          aria-label="English"
        >
          EN
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange("fr")}
          onKeyDown={handleKeyDown}
          className={cn(
            "px-2 py-0.5 h-auto font-medium transition-colors",
            size === "sm" ? "text-xs" : "text-sm",
            currentLanguage === "fr"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-transparent"
          )}
          aria-pressed={currentLanguage === "fr"}
          aria-label="French"
        >
          FR
        </Button>
      </div>
    </div>
  );
}

// Hook for managing content language state with locale default
import { useState, useMemo } from "react";

interface UseContentLanguageOptions {
  defaultLocale?: string;
  storageKey?: string;
}

export function useContentLanguage(options: UseContentLanguageOptions = {}) {
  const { defaultLocale = "en" } = options;

  const initialLanguage = useMemo((): ContentLanguage => {
    return defaultLocale === "fr" ? "fr" : "en";
  }, [defaultLocale]);

  const [contentLanguage, setContentLanguage] =
    useState<ContentLanguage>(initialLanguage);

  const toggleLanguage = useCallback(() => {
    setContentLanguage((prev) => (prev === "en" ? "fr" : "en"));
  }, []);

  const getBilingualText = useCallback(
    (en: string | null | undefined, fr: string | null | undefined): string => {
      if (contentLanguage === "fr") {
        return fr || en || "";
      }
      return en || fr || "";
    },
    [contentLanguage]
  );

  return {
    contentLanguage,
    setContentLanguage,
    toggleLanguage,
    getBilingualText,
    isEnglish: contentLanguage === "en",
    isFrench: contentLanguage === "fr",
  };
}
