"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Globe, LogOut, User, Settings, Search, Keyboard } from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "@/components/features/notifications/notification-bell";
import { CommandPalette } from "@/components/features/command-palette";
import { KeyboardShortcutsDialog, ShortcutIndicator } from "@/components/features/keyboard-shortcuts";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

interface HeaderProps {
  locale: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export function Header({ locale, user }: HeaderProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const otherLocale = locale === "en" ? "fr" : "en";
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useKeyboardShortcuts({
    onOpenSearch: () => setCommandOpen(true),
    onOpenShortcuts: () => setShortcutsOpen(true),
    onPendingKeyChange: setPendingKey,
  });

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push(`/${locale}/login`);
  };

  const switchLocale = () => {
    const currentPath = window.location.pathname;
    const newPath = currentPath.replace(`/${locale}`, `/${otherLocale}`);
    router.push(newPath);
  };

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b bg-background px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">{t("appName")}</h1>
        </div>

        <div className="flex items-center gap-1" suppressHydrationWarning>
          <TooltipProvider delayDuration={0}>
            {/* Command Palette */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCommandOpen(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="flex items-center gap-2">
                  <span>{t("commandPalette")}</span>
                  <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">⌘K</kbd>
                </div>
              </TooltipContent>
            </Tooltip>

            {/* Keyboard Shortcuts */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShortcutsOpen(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="flex items-center gap-2">
                  <span>{t("keyboardShortcuts")}</span>
                  <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">⌘/</kbd>
                </div>
              </TooltipContent>
            </Tooltip>

            {/* Language Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={switchLocale}>
                  <Globe className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{locale === "en" ? "Passer au français" : "Switch to English"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <NotificationBell locale={locale} />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden flex-col items-start text-sm md:flex">
                  <span className="font-medium">
                    {user.firstName} {user.lastName}
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    {user.role.replace("_", " ")}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/profile`}>
                  <User className="mr-2 h-4 w-4" />
                  {t("actions.profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t("actions.settings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t("actions.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onOpenShortcuts={() => {
          setCommandOpen(false);
          setShortcutsOpen(true);
        }}
      />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <ShortcutIndicator pendingKey={pendingKey} />
    </>
  );
}
