"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Clock,
  FileWarning,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface AttentionItem {
  id: string;
  type: "CRITICAL_FINDING" | "OVERDUE_TASK" | "MISSING_DOCUMENT" | "PENDING_CAP";
  titleEn: string;
  titleFr: string;
  severity: "high" | "medium" | "low";
  href: string;
}

interface AttentionNeededProps {
  items: AttentionItem[];
  reviewId: string;
}

const iconMap = {
  CRITICAL_FINDING: AlertTriangle,
  OVERDUE_TASK: Clock,
  MISSING_DOCUMENT: FileWarning,
  PENDING_CAP: AlertTriangle,
};

const severityColors = {
  high: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400",
  medium: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400",
  low: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400",
};

export function AttentionNeeded({ items, reviewId: _reviewId }: AttentionNeededProps) {
  const t = useTranslations("reviews.detail.overview.attention");
  const locale = useLocale();
  const router = useRouter();

  if (items.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 text-green-800 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{t("allClear")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          {t("title")}
          <Badge variant="secondary">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.slice(0, 4).map((item) => {
          const Icon = iconMap[item.type];
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex items-center justify-between w-full p-2.5 rounded-lg border text-left transition-colors hover:opacity-80",
                severityColors[item.severity]
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium truncate">
                  {locale === "fr" ? item.titleFr : item.titleEn}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
            </button>
          );
        })}

        {items.length > 4 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            {t("andMore", { count: items.length - 4 })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
