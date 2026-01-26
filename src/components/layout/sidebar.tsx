"use client";

import { useMemo, useState } from "react";
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
  const [collapsed, setCollapsed] = useState(false);

  // Fetch user preferences for conditional nav items
  const { data: preferences } = trpc.settings.getPreferences.useQuery(
    undefined,
    {
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  // Get navigation items based on user role and preferences
  const navItems = useMemo(() => {
    const roleNavItems = getNavigationForRole(userRole);

    // Filter based on preferences (e.g., training module)
    return roleNavItems.filter((item) => {
      if (item.name === "training") {
        // Default to true if preferences haven't loaded yet
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
            {/* Main navigation items */}
            {navItems
              .filter((item) => item.section !== "admin")
              .map((item) => {
                const fullHref =
                  item.href === "/" ? `/${locale}` : `/${locale}${item.href}`;
                const isActive =
                  item.href === "/"
                    ? pathname === `/${locale}` || pathname === `/${locale}/`
                    : pathname.startsWith(fullHref);

                const Icon = item.icon;

                const navLinkContent = (
                  <>
                    <Icon
                      className={cn("h-4 w-4 shrink-0", isActive && "text-primary")}
                    />
                    {!collapsed && <span>{t(item.name)}</span>}
                  </>
                );

                const linkClassName = cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                  isActive
                    ? "bg-primary/10 text-primary font-medium border-l-2 border-primary ml-[-2px]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-2"
                );

                const navLink = (
                  <Link href={fullHref} className={linkClassName}>
                    {navLinkContent}
                  </Link>
                );

                // Show tooltip only when collapsed
                if (collapsed) {
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="flex items-center gap-2"
                      >
                        <span>{t(item.name)}</span>
                        {isActive && (
                          <span className="text-xs text-muted-foreground">
                            (current)
                          </span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return <div key={item.name}>{navLink}</div>;
              })}

            {/* Admin section - only for system administrators */}
            {navItems.some((item) => item.section === "admin") && (
              <>
                {/* Section divider */}
                <div className="my-3 border-t" />

                {/* Admin section header */}
                {!collapsed && (
                  <div className="px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("administration")}
                    </span>
                  </div>
                )}

                {/* Admin navigation items */}
                {navItems
                  .filter((item) => item.section === "admin")
                  .map((item) => {
                    const fullHref = `/${locale}${item.href}`;
                    const isActive = pathname.startsWith(fullHref);

                    const Icon = item.icon;

                    const navLinkContent = (
                      <>
                        <Icon
                          className={cn("h-4 w-4 shrink-0", isActive && "text-primary")}
                        />
                        {!collapsed && <span>{t(item.name)}</span>}
                      </>
                    );

                    const linkClassName = cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                      isActive
                        ? "bg-primary/10 text-primary font-medium border-l-2 border-primary ml-[-2px]"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      collapsed && "justify-center px-2"
                    );

                    const navLink = (
                      <Link href={fullHref} className={linkClassName}>
                        {navLinkContent}
                      </Link>
                    );

                    if (collapsed) {
                      return (
                        <Tooltip key={item.name}>
                          <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="flex items-center gap-2"
                          >
                            <span>{t(item.name)}</span>
                            {isActive && (
                              <span className="text-xs text-muted-foreground">
                                (current)
                              </span>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return <div key={item.name}>{navLink}</div>;
                  })}
              </>
            )}
          </nav>
      </ScrollArea>

      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}
