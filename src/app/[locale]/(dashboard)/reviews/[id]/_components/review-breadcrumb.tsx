"use client";

import { ChevronRight, Home } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";

interface ReviewBreadcrumbProps {
  reviewNumber: string;
  currentTab?: string;
}

export function ReviewBreadcrumb({ reviewNumber, currentTab }: ReviewBreadcrumbProps) {
  const t = useTranslations("reviews.detail");
  const locale = useLocale();

  return (
    <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1 text-sm text-muted-foreground mb-2">
      <Link
        href={`/${locale}/dashboard`}
        className="hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      <ChevronRight className="h-4 w-4" />
      <Link
        href={`/${locale}/reviews`}
        className="hover:text-foreground transition-colors"
      >
        {t("breadcrumb.reviews")}
      </Link>
      <ChevronRight className="h-4 w-4" />
      <span className="text-foreground font-medium">{reviewNumber}</span>
      {currentTab && currentTab !== "overview" && (
        <>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{t(`tabs.${currentTab}`)}</span>
        </>
      )}
    </nav>
  );
}
