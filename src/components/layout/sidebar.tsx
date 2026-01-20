"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import {
  LayoutDashboard,
  ClipboardList,
  FileCheck,
  Users,
  UserCheck,
  UserPlus,
  Building2,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  FileWarning,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
  requiresPreference?: string;
}

const baseNavItems: NavItem[] = [
  { titleKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { titleKey: "questionnaires", href: "/questionnaires", icon: ClipboardList },
  { titleKey: "assessments", href: "/assessments", icon: FileCheck },
  { titleKey: "reviews", href: "/reviews", icon: Users },
  { titleKey: "findings", href: "/findings", icon: FileWarning },
  { titleKey: "caps", href: "/caps", icon: ClipboardCheck },
  { titleKey: "reviewers", href: "/reviewers", icon: UserCheck },
  { titleKey: "organizations", href: "/organizations", icon: Building2 },
  { titleKey: "joinRequests", href: "/join-requests", icon: UserPlus },
  { titleKey: "training", href: "/training", icon: BookOpen, requiresPreference: "showTrainingModule" },
  { titleKey: "settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  locale: string;
}

export function Sidebar({ locale }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("navigation");
  const [collapsed, setCollapsed] = useState(false);

  // Fetch user preferences for conditional nav items
  const { data: preferences } = trpc.settings.getPreferences.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Filter nav items based on user preferences
  const navItems = useMemo(() => {
    return baseNavItems.filter((item) => {
      if (item.requiresPreference === "showTrainingModule") {
        // Default to true if preferences haven't loaded yet
        return preferences?.showTrainingModule ?? true;
      }
      return true;
    });
  }, [preferences?.showTrainingModule]);

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
        <TooltipProvider delayDuration={0}>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const fullHref = item.href === "/" ? `/${locale}` : `/${locale}${item.href}`;
              const isActive = !item.disabled && (item.href === "/"
                ? pathname === `/${locale}` || pathname === `/${locale}/`
                : pathname.startsWith(fullHref));

              const navLinkContent = (
                <>
                  <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                  {!collapsed && (
                    <span className="flex items-center gap-2">
                      {t(item.titleKey)}
                      {item.disabled && (
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          Soon
                        </span>
                      )}
                    </span>
                  )}
                </>
              );

              const linkClassName = cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                item.disabled
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : isActive
                    ? "bg-primary/10 text-primary font-medium border-l-2 border-primary ml-[-2px]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2"
              );

              const navLink = item.disabled ? (
                <span className={linkClassName}>
                  {navLinkContent}
                </span>
              ) : (
                <Link href={fullHref} className={linkClassName}>
                  {navLinkContent}
                </Link>
              );

              // Show tooltip only when collapsed
              if (collapsed) {
                return (
                  <Tooltip key={item.titleKey}>
                    <TooltipTrigger asChild>
                      {navLink}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="flex items-center gap-2">
                      <span>{t(item.titleKey)}</span>
                      {item.disabled && (
                        <span className="text-xs text-muted-foreground">(coming soon)</span>
                      )}
                      {isActive && (
                        <span className="text-xs text-muted-foreground">(current)</span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <div key={item.titleKey}>
                  {navLink}
                </div>
              );
            })}
          </nav>
        </TooltipProvider>
      </ScrollArea>

      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>
    </div>
  );
}
