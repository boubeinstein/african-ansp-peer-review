"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Home,
  ClipboardList,
  AlertTriangle,
  CheckSquare,
  FileText,
  Users,
  Building2,
  Settings,
  Plus,
  Keyboard,
  Moon,
  Sun,
  Languages,
} from "lucide-react";
import { useTheme } from "next-themes";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenShortcuts: () => void;
}

const isMac =
  typeof window !== "undefined" &&
  navigator.platform.toUpperCase().indexOf("MAC") >= 0;
const modKey = isMac ? "⌘" : "Ctrl";

export function CommandPalette({
  open,
  onOpenChange,
  onOpenShortcuts,
}: CommandPaletteProps) {
  const t = useTranslations("commandPalette");
  const router = useRouter();
  const locale = useLocale();
  const { setTheme, theme } = useTheme();

  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange]
  );

  const navigationCommands = useMemo(
    () => [
      {
        id: "dashboard",
        icon: Home,
        label: t("navigation.dashboard"),
        shortcut: "G H",
        path: "/dashboard",
      },
      {
        id: "reviews",
        icon: ClipboardList,
        label: t("navigation.reviews"),
        shortcut: "G R",
        path: "/reviews",
      },
      {
        id: "findings",
        icon: AlertTriangle,
        label: t("navigation.findings"),
        shortcut: "G F",
        path: "/findings",
      },
      {
        id: "caps",
        icon: CheckSquare,
        label: t("navigation.caps"),
        shortcut: "G C",
        path: "/caps",
      },
      {
        id: "assessments",
        icon: FileText,
        label: t("navigation.assessments"),
        shortcut: "G A",
        path: "/assessments",
      },
      {
        id: "reviewers",
        icon: Users,
        label: t("navigation.reviewers"),
        shortcut: "G V",
        path: "/reviewers",
      },
      {
        id: "organizations",
        icon: Building2,
        label: t("navigation.organizations"),
        shortcut: "G O",
        path: "/organizations",
      },
      {
        id: "settings",
        icon: Settings,
        label: t("navigation.settings"),
        shortcut: "G S",
        path: "/settings",
      },
    ],
    [t]
  );

  const actionCommands = useMemo(
    () => [
      {
        id: "new-review",
        icon: Plus,
        label: t("actions.newReview"),
        shortcut: "N R",
        path: "/reviews/new",
      },
      {
        id: "new-finding",
        icon: Plus,
        label: t("actions.newFinding"),
        shortcut: "N F",
        path: "/findings/new",
      },
      {
        id: "new-assessment",
        icon: Plus,
        label: t("actions.newAssessment"),
        shortcut: "N A",
        path: "/assessments/new",
      },
    ],
    [t]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("searchPlaceholder")} />
      <CommandList>
        <CommandEmpty>{t("noResults")}</CommandEmpty>

        <CommandGroup heading={t("groups.navigation")}>
          {navigationCommands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              onSelect={() =>
                runCommand(() => router.push(`/${locale}${cmd.path}`))
              }
            >
              <cmd.icon className="h-4 w-4 mr-3 text-muted-foreground" />
              <span>{cmd.label}</span>
              <CommandShortcut>{cmd.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("groups.actions")}>
          {actionCommands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              onSelect={() =>
                runCommand(() => router.push(`/${locale}${cmd.path}`))
              }
            >
              <cmd.icon className="h-4 w-4 mr-3 text-green-600" />
              <span>{cmd.label}</span>
              <CommandShortcut>{cmd.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("groups.utilities")}>
          <CommandItem onSelect={() => runCommand(onOpenShortcuts)}>
            <Keyboard className="h-4 w-4 mr-3 text-muted-foreground" />
            <span>{t("utilities.showShortcuts")}</span>
            <CommandShortcut>{modKey} /</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))
            }
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 mr-3" />
            ) : (
              <Moon className="h-4 w-4 mr-3" />
            )}
            <span>
              {theme === "dark"
                ? t("utilities.lightMode")
                : t("utilities.darkMode")}
            </span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                const newLocale = locale === "en" ? "fr" : "en";
                router.push(
                  window.location.pathname.replace(`/${locale}`, `/${newLocale}`)
                );
              })
            }
          >
            <Languages className="h-4 w-4 mr-3" />
            <span>
              {locale === "en" ? "Passer au français" : "Switch to English"}
            </span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;
