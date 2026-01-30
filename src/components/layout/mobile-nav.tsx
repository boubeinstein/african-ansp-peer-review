"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, ClipboardList, Search, Bell, User } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

interface NavItem {
  href: string;
  icon: React.ElementType;
  labelKey: string;
  badge?: number;
}

export function MobileNav() {
  const t = useTranslations("navigation");
  const locale = useLocale();
  const pathname = usePathname();

  const { data: unreadCount } = trpc.notification.getUnreadCount.useQuery(
    undefined,
    { staleTime: 30000 }
  );

  const items: NavItem[] = [
    { href: `/${locale}/dashboard`, icon: Home, labelKey: "dashboard" },
    { href: `/${locale}/reviews`, icon: ClipboardList, labelKey: "reviews" },
    { href: `/${locale}/findings`, icon: Search, labelKey: "findings" },
    {
      href: `/${locale}/notifications`,
      icon: Bell,
      labelKey: "notifications",
      badge: unreadCount?.count,
    },
    { href: `/${locale}/settings/profile`, icon: User, labelKey: "profile" },
  ];

  const isActive = (href: string) => {
    if (href.endsWith("/dashboard"))
      return pathname === href || pathname === `/${locale}`;
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full relative",
                "text-muted-foreground transition-colors touch-manipulation",
                active && "text-primary"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", active && "text-primary")} />
                {item.badge != null && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
