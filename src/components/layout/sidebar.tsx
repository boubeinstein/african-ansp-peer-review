"use client";

import { useMemo, useState, useEffect } from "react";
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

interface SidebarProps {
  locale: string;
  userRole: UserRole;
}

export function Sidebar({ locale, userRole }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("navigation");
  
  // Hydration-safe state: always start expanded (false) on both server and client
  // This prevents mismatch between SSR and initial client render
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // After hydration completes, safely read from localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) {
      setCollapsed(stored === "true");
    }
  }, []);

  // Persist collapsed state to localStorage (only after initial mount)
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("sidebar-collapsed", String(collapsed));
    }
  }, [collapsed, mounted]);

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
        "relative flex flex-col border-r bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-center border-b px-4">
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
        <nav className="flex flex-col gap-1">
          {navItems
            .filter((item) => item.section !== "admin")
            .map((item) => {
              const isActive = pathname.startsWith(`/${locale}${item.href}`);
              const Icon = item.icon;

              if (collapsed) {
                return (
                  <Tooltip key={item.name} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/${locale}${item.href}`}
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

                  if (collapsed) {
                    return (
                      <Tooltip key={item.name} delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Link
                            href={`/${locale}${item.href}`}
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

      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn("w-full justify-center", collapsed ? "px-2" : "px-3")}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
