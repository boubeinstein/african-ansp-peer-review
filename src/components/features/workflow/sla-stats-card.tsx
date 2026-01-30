"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface SLAStatsCardProps {
  stats: {
    total: number;
    running: number;
    breached: number;
    completed: number;
    averageCompletionDays: number;
    breachRate: number;
  };
}

export function SLAStatsCard({ stats }: SLAStatsCardProps) {
  const t = useTranslations("workflow.sla");

  const items = [
    {
      label: t("running"),
      value: stats.running,
      icon: Clock,
      color: "text-blue-500",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: t("completed"),
      value: stats.completed,
      icon: CheckCircle,
      color: "text-green-500",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: t("breached"),
      value: stats.breached,
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-100 dark:bg-red-900/30",
    },
  ];

  // On-time rate is inverse of breach rate
  const onTimeRate = 100 - stats.breachRate;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t("overview")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.label} className="text-center">
              <div
                className={`inline-flex p-2 rounded-full ${item.bg} mb-2`}
              >
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div className="text-2xl font-bold">{item.value}</div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{t("breachRate")}</span>
            <span
              className={
                stats.breachRate > 20
                  ? "text-red-500 font-medium"
                  : "text-muted-foreground"
              }
            >
              {onTimeRate.toFixed(1)}%
            </span>
          </div>
          <Progress value={onTimeRate} className="h-2" />
        </div>

        <div className="flex justify-between text-sm pt-2 border-t">
          <span className="text-muted-foreground">{t("avgCompletion")}</span>
          <Badge variant="outline">
            {stats.averageCompletionDays} {t("days")}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
