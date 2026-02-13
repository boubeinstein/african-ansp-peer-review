"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, Bookmark, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const ANALYTICS_ROLES = ["SUPER_ADMIN", "PROGRAMME_COORDINATOR"];

interface LessonsTabNavProps {
  locale: string;
  userRole: string;
}

export function LessonsTabNav({ locale, userRole }: LessonsTabNavProps) {
  const t = useTranslations("lessons");
  const pathname = usePathname();

  const basePath = `/${locale}/lessons`;
  const isSearch = pathname === basePath;
  const isBookmarks = pathname === `${basePath}/bookmarks`;
  const isAnalytics = pathname === `${basePath}/analytics`;
  const showTabs = isSearch || isBookmarks || isAnalytics;

  if (!showTabs) return null;

  return (
    <div className="flex items-center gap-1 border-b">
      <Link
        href={basePath}
        className={cn(
          "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
          isSearch
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <Search className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
        {t("tabs.knowledgeBase")}
      </Link>
      <Link
        href={`${basePath}/bookmarks`}
        className={cn(
          "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
          isBookmarks
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <Bookmark className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
        {t("tabs.bookmarks")}
      </Link>
      {ANALYTICS_ROLES.includes(userRole) && (
        <Link
          href={`${basePath}/analytics`}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
            isAnalytics
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <BarChart3 className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
          {t("tabs.analytics")}
        </Link>
      )}
    </div>
  );
}
