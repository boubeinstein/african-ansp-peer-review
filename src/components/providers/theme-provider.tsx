"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { toast } from "sonner";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/**
 * Theme keyboard shortcut handler
 * Ctrl+Shift+L (Windows/Linux) or Cmd+Shift+L (Mac) cycles through themes
 */
function ThemeShortcutHandler() {
  const { theme, setTheme } = useTheme();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+L (Windows/Linux) or Cmd+Shift+L (Mac)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "l"
      ) {
        e.preventDefault();

        // Cycle through: light → dark → system → light
        let newTheme: string;
        if (theme === "light") {
          newTheme = "dark";
        } else if (theme === "dark") {
          newTheme = "system";
        } else {
          newTheme = "light";
        }

        setTheme(newTheme);

        // Show toast feedback
        const themeLabels: Record<string, string> = {
          light: "Light mode",
          dark: "Dark mode",
          system: "System preference",
        };

        toast.success(themeLabels[newTheme], {
          duration: 1500,
          position: "bottom-center",
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [theme, setTheme]);

  return null;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeShortcutHandler />
      {children}
    </NextThemesProvider>
  );
}
