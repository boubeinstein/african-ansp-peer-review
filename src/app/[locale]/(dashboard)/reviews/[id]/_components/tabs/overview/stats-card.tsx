"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  FileText,
  CheckSquare,
  MessageSquare
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";

interface StatsCardProps {
  reviewId: string;
  counts: {
    findings: number;
    criticalFindings: number;
    documents: number;
    openTasks: number;
    tasks: number;
    openDiscussions: number;
    discussions: number;
  };
}

export function StatsCard({ reviewId, counts }: StatsCardProps) {
  const t = useTranslations("reviews.detail.overview.stats");
  const locale = useLocale();
  const router = useRouter();

  const stats = [
    {
      icon: AlertTriangle,
      label: t("findings"),
      value: counts.findings,
      badge: counts.criticalFindings > 0 ? `${counts.criticalFindings} ${t("critical")}` : null,
      badgeVariant: "destructive" as const,
      href: `/${locale}/reviews/${reviewId}?tab=findings`,
    },
    {
      icon: FileText,
      label: t("documents"),
      value: counts.documents,
      badge: null,
      badgeVariant: "secondary" as const,
      href: `/${locale}/reviews/${reviewId}?tab=documents`,
    },
    {
      icon: CheckSquare,
      label: t("tasks"),
      value: `${counts.openTasks}/${counts.tasks}`,
      badge: counts.openTasks > 0 ? t("open") : null,
      badgeVariant: "secondary" as const,
      href: `/${locale}/reviews/${reviewId}?tab=workspace`,
    },
    {
      icon: MessageSquare,
      label: t("discussions"),
      value: `${counts.openDiscussions}/${counts.discussions}`,
      badge: counts.openDiscussions > 0 ? t("active") : null,
      badgeVariant: "default" as const,
      href: `/${locale}/reviews/${reviewId}?tab=workspace`,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stats.map((stat) => (
            <button
              key={stat.label}
              onClick={() => router.push(stat.href)}
              className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{stat.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{stat.value}</span>
                {stat.badge && (
                  <Badge variant={stat.badgeVariant} className="text-xs">
                    {stat.badge}
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
