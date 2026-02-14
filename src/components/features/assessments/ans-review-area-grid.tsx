"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Radio,
  Compass,
  BookOpen,
  Map,
  Cloud,
  Wifi,
  LifeBuoy,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

// =============================================================================
// AREA CONFIG
// =============================================================================

const AREA_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    iconBg: string;
    border: string;
    badge: string;
  }
> = {
  ATS: {
    icon: Radio,
    color: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-200 hover:border-blue-400 dark:border-blue-900 dark:hover:border-blue-700",
    badge: "bg-blue-600",
  },
  FPD: {
    icon: Compass,
    color: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
    border: "border-indigo-200 hover:border-indigo-400 dark:border-indigo-900 dark:hover:border-indigo-700",
    badge: "bg-indigo-600",
  },
  AIS: {
    icon: BookOpen,
    color: "text-teal-600 dark:text-teal-400",
    iconBg: "bg-teal-100 dark:bg-teal-900/30",
    border: "border-teal-200 hover:border-teal-400 dark:border-teal-900 dark:hover:border-teal-700",
    badge: "bg-teal-600",
  },
  MAP: {
    icon: Map,
    color: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    border: "border-emerald-200 hover:border-emerald-400 dark:border-emerald-900 dark:hover:border-emerald-700",
    badge: "bg-emerald-600",
  },
  MET: {
    icon: Cloud,
    color: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-100 dark:bg-sky-900/30",
    border: "border-sky-200 hover:border-sky-400 dark:border-sky-900 dark:hover:border-sky-700",
    badge: "bg-sky-600",
  },
  CNS: {
    icon: Wifi,
    color: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    border: "border-violet-200 hover:border-violet-400 dark:border-violet-900 dark:hover:border-violet-700",
    badge: "bg-violet-600",
  },
  SAR: {
    icon: LifeBuoy,
    color: "text-orange-600 dark:text-orange-400",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    border: "border-orange-200 hover:border-orange-400 dark:border-orange-900 dark:hover:border-orange-700",
    badge: "bg-orange-600",
  },
};

const ANS_AREAS = ["ATS", "FPD", "AIS", "MAP", "MET", "CNS", "SAR"] as const;

// Mock fallback counts (demo mode)
const MOCK_COUNTS: Record<string, number> = {
  ATS: 25,
  FPD: 16,
  AIS: 18,
  MAP: 12,
  MET: 20,
  CNS: 22,
  SAR: 19,
};

// =============================================================================
// COMPONENT
// =============================================================================

interface ANSReviewAreaGridProps {
  locale: string;
}

export function ANSReviewAreaGrid({ locale }: ANSReviewAreaGridProps) {
  const tQ = useTranslations("questionnaire");
  const tAreas = useTranslations("reviewAreas");

  const { data } = trpc.questionnaire.getANSStats.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const countsByArea = data?.countsByArea ?? MOCK_COUNTS;
  const totalCount = data?.totalCount ?? Object.values(MOCK_COUNTS).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">{tQ("ans.areaGrid.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {tQ("ans.areaGrid.subtitle")}
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {tQ("ans.areaGrid.summary", {
            total: totalCount,
            areas: ANS_AREAS.length,
          })}
        </span>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${locale}/questionnaires/ans`}>
            {tQ("ans.areaGrid.viewAll")}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {/* Area Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {ANS_AREAS.map((area) => {
          const config = AREA_CONFIG[area];
          const Icon = config.icon;
          const count = countsByArea[area] ?? 0;
          const name = tAreas(`${area}.name`);

          return (
            <Link
              key={area}
              href={`/${locale}/questionnaires/ans?area=${area}`}
              className="group"
            >
              <Card
                className={cn(
                  "relative overflow-hidden transition-all hover:shadow-md",
                  config.border
                )}
              >
                {/* Colored top bar */}
                <div className={cn("absolute top-0 left-0 right-0 h-1", config.badge)} />

                <CardContent className="p-4 pt-5">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        config.iconBg
                      )}
                    >
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>
                    <span
                      className={cn(
                        "font-mono text-xs font-bold px-2 py-0.5 rounded text-white",
                        config.badge
                      )}
                    >
                      {area}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-tight truncate">
                      {name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tQ("ans.areaGrid.pqs", { count })}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className={config.color}>
                      {tQ("ans.browse")}
                    </span>
                    <ArrowRight className={cn("ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5", config.color)} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
