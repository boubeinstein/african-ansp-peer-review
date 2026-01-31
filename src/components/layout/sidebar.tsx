"use client";

import { useMemo, useEffect, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { getNavigationForRole } from "@/lib/rbac";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

// Custom hook for localStorage-synced state using useSyncExternalStore
function useSidebarCollapsed(defaultValue: boolean) {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener("storage", callback);
    // Also listen for custom event for same-window updates
    window.addEventListener("sidebar-storage-update", callback);
    return () => {
      window.removeEventListener("storage", callback);
      window.removeEventListener("sidebar-storage-update", callback);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored !== null ? stored === "true" : defaultValue;
  }, [defaultValue]);

  const getServerSnapshot = useCallback(() => {
    return defaultValue; // Always return default on server (SSR-safe)
  }, [defaultValue]);

  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setCollapsed = useCallback((value: boolean) => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value));
    // Dispatch custom event to trigger re-render in same window
    window.dispatchEvent(new Event("sidebar-storage-update"));
  }, []);

  return [collapsed, setCollapsed] as const;
}

interface SidebarProps {
  locale: string;
  userRole: UserRole;
}

export function Sidebar({ locale, userRole }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("navigation");
  const tSidebar = useTranslations("navSidebar");

  // Use localStorage-synced state with SSR-safe defaults
  const [collapsed, setCollapsed] = useSidebarCollapsed(false);

  // Keyboard shortcuts: [ to collapse, ] to expand
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea or contenteditable
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "[" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setCollapsed(true);
      }
      if (e.key === "]" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setCollapsed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setCollapsed]);

  // Fetch user preferences for conditional nav items
  const { data: preferences } = trpc.settings.getPreferences.useQuery(
    undefined,
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  // Get navigation items based on user role and preferences
  const navItems = useMemo(() => {
    const roleNavItems = getNavigationForRole(userRole);
    return roleNavItems.filter((item) => {
      if (item.name === "training") {
        return preferences?.showTrainingModule ?? true;
      }
      return true;
    });
  }, [userRole, preferences?.showTrainingModule]);

  return (
    <div
      className={cn(
        "relative hidden md:flex flex-col h-full flex-shrink-0 border-r bg-background transition-all duration-300 overflow-hidden",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex-shrink-0 flex h-16 items-center justify-center border-b px-4">
        {!collapsed && (
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              A
            </div>
            <span className="font-semibold text-sm">ANSP Peer Review</span>
          </Link>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            A
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav id="navigation" data-tour="sidebar" className="flex flex-col gap-1" tabIndex={-1}>
          {navItems
            .filter((item) => item.section !== "admin")
            .map((item) => {
              const isActive = pathname.startsWith(`/${locale}${item.href}`);
              const Icon = item.icon;
              const dataTourAttr = `nav-${item.name}`;

              if (collapsed) {
                return (
                  <Tooltip key={item.name} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/${locale}${item.href}`}
                        data-tour={dataTourAttr}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{t(item.name)}</TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={`/${locale}${item.href}`}
                  data-tour={dataTourAttr}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{t(item.name)}</span>
                </Link>
              );
            })}

          {navItems.some((item) => item.section === "admin") && (
            <>
              <div className="my-2 border-t" />
              {!collapsed && (
                <span className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("admin")}
                </span>
              )}
              {navItems
                .filter((item) => item.section === "admin")
                .map((item) => {
                  const isActive = pathname.startsWith(`/${locale}${item.href}`);
                  const Icon = item.icon;

                  const adminDataTourAttr = `nav-${item.name}`;

                  if (collapsed) {
                    return (
                      <Tooltip key={item.name} delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Link
                            href={`/${locale}${item.href}`}
                            data-tour={adminDataTourAttr}
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{t(item.name)}</TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <Link
                      key={item.name}
                      href={`/${locale}${item.href}`}
                      data-tour={adminDataTourAttr}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{t(item.name)}</span>
                    </Link>
                  );
                })}
            </>
          )}
        </nav>
      </ScrollArea>

      {/* Footer - always stays at bottom */}
      <div className="flex-shrink-0 border-t p-2 bg-background" data-tour="keyboard-hint">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className={cn("w-full justify-center", collapsed ? "px-2" : "px-3")}
              aria-label={collapsed ? tSidebar("expandSidebar") : tSidebar("collapseSidebar")}
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span className="text-xs">{tSidebar("collapse")}</span>
                  <kbd className="ml-2 px-1 py-0.5 text-[10px] bg-muted rounded border text-muted-foreground">
                    [
                  </kbd>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <span className="flex items-center gap-2">
              {collapsed ? tSidebar("expand") : tSidebar("collapse")}
              <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">
                {collapsed ? "]" : "["}
              </kbd>
            </span>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
