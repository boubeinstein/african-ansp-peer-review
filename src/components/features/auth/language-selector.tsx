"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  variant?: "light" | "dark";
  size?: "sm" | "default";
  showIcon?: boolean;
  className?: string;
}

export function LanguageSelector({
  variant = "dark",
  size = "default",
  showIcon = true,
  className,
}: LanguageSelectorProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    if (newLocale === locale) return;

    // Replace the locale segment in the pathname
    const segments = pathname.split("/");
    segments[1] = newLocale;
    const newPath = segments.join("/");

    router.push(newPath);
  };

  const isLight = variant === "light";
  const isSmall = size === "sm";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2",
        className
      )}
    >
      {showIcon && (
        <Globe
          className={cn(
            "flex-shrink-0",
            isSmall ? "h-4 w-4" : "h-5 w-5",
            isLight ? "text-slate-500" : "text-slate-400"
          )}
        />
      )}

      {/* Segmented Control */}
      <div
        className={cn(
          "inline-flex rounded-lg p-1",
          isLight
            ? "bg-slate-100 dark:bg-slate-800"
            : "bg-slate-800/50 border border-slate-700/50"
        )}
      >
        <button
          onClick={() => switchLocale("en")}
          className={cn(
            "font-medium rounded-md transition-all",
            isSmall ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
            locale === "en"
              ? isLight
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "bg-cyan-500 text-white"
              : isLight
                ? "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                : "text-slate-400 hover:text-white"
          )}
          aria-label="Switch to English"
          aria-pressed={locale === "en"}
        >
          EN
        </button>
        <button
          onClick={() => switchLocale("fr")}
          className={cn(
            "font-medium rounded-md transition-all",
            isSmall ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
            locale === "fr"
              ? isLight
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "bg-cyan-500 text-white"
              : isLight
                ? "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                : "text-slate-400 hover:text-white"
          )}
          aria-label="Passer en Français"
          aria-pressed={locale === "fr"}
        >
          FR
        </button>
      </div>
    </div>
  );
}
