"use client";

/**
 * Stats Slide Component
 *
 * Displays programme statistics with animated counters.
 */

import { useTranslations } from "next-intl";
import { Users, Globe, Calendar, Shield } from "lucide-react";
import type { LoginPageStats } from "@/types/login";

interface SlideStatsProps {
  stats?: LoginPageStats;
  locale: string;
}

export function SlideStats({ stats, locale }: SlideStatsProps) {
  const t = useTranslations("auth.showcase");

  const statItems = [
    {
      icon: <Users className="w-6 h-6" />,
      value: stats?.participatingANSPs ?? 20,
      label: t("stats.ansps"),
    },
    {
      icon: <Shield className="w-6 h-6" />,
      value: stats?.expertReviewers ?? 99,
      label: t("stats.experts"),
    },
    {
      icon: <Globe className="w-6 h-6" />,
      value: stats?.regionalTeams ?? 5,
      label: t("stats.teams"),
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      value: stats?.completedReviews ?? 3,
      label: t("stats.reviews"),
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Tagline */}
      <blockquote className="text-lg lg:text-xl italic text-white/90 border-l-4 border-amber-500 pl-4 mb-8">
        &ldquo;{t("tagline")}&rdquo;
      </blockquote>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((item, index) => (
          <div
            key={index}
            className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 text-center"
          >
            <div className="flex justify-center text-amber-400 mb-2">
              {item.icon}
            </div>
            <div className="text-3xl font-bold text-amber-400">{item.value}</div>
            <div className="text-sm text-white/70 mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Next Milestone */}
      {stats?.nextMilestone && (
        <div className="mt-auto pt-6">
          <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-2">
            {t("nextMilestone")}
          </h4>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <div className="font-semibold text-amber-300">
              {locale === "fr"
                ? stats.nextMilestone.titleFr
                : stats.nextMilestone.titleEn}
            </div>
            <div className="text-sm text-white/70 mt-1">
              {stats.nextMilestone.date} • {stats.nextMilestone.location}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
