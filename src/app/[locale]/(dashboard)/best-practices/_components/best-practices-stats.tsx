"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, Users, Eye, Award } from "lucide-react";

interface StatsData {
  totalPublished: number;
  totalAdoptions: number;
  byCategory: { category: string; count: number }[];
  topPractices: {
    id: string;
    referenceNumber: string;
    titleEn: string;
    titleFr: string;
    category: string;
    viewCount: number;
    _count: { adoptions: number };
  }[];
}

interface BestPracticesStatsProps {
  stats?: StatsData;
  isLoading: boolean;
}

export function BestPracticesStats({
  stats,
  isLoading,
}: BestPracticesStatsProps) {
  const t = useTranslations("bestPractices.stats");

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: t("totalPractices"),
      value: stats?.totalPublished || 0,
      icon: Lightbulb,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: t("totalAdoptions"),
      value: stats?.totalAdoptions || 0,
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: t("categories"),
      value: stats?.byCategory?.length || 0,
      icon: Award,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      title: t("totalViews"),
      value:
        stats?.topPractices?.reduce((sum, p) => sum + (p.viewCount || 0), 0) ||
        0,
      icon: Eye,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat: { title: string; value: number; icon: React.ElementType; color: string; bgColor: string }) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stat.value.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
