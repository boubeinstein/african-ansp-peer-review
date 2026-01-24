"use client";

import { useTranslations } from "next-intl";
import { Building2, Users, Globe2, ClipboardCheck, Calendar, MapPin } from "lucide-react";
import { AnimatedCounter } from "./animated-counter";
import type { LoginPageStats } from "@/types/login";

interface Props {
  stats?: LoginPageStats;
}

export function SlideStats({ stats }: Props) {
  const t = useTranslations("auth.showcase.stats");

  const statItems = [
    { value: stats?.participatingANSPs ?? 0, label: t("ansps"), icon: Building2 },
    { value: stats?.expertReviewers ?? 0, label: t("reviewers"), icon: Users },
    { value: stats?.regionalTeams ?? 5, label: t("teams"), icon: Globe2 },
    { value: stats?.completedReviews ?? 0, label: t("reviews"), icon: ClipboardCheck },
  ];

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-semibold text-white mb-6">{t("title")}</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statItems.map((stat, index) => (
          <div
            key={index}
            className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 hover:border-cyan-500/30 transition-colors"
          >
            <stat.icon className="h-5 w-5 text-cyan-400 mb-3" />
            <div className="text-3xl font-bold text-white mb-1">
              <AnimatedCounter value={stat.value} />
            </div>
            <div className="text-sm text-slate-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Coverage Banner */}
      <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50 mb-6">
        <div className="flex items-center gap-2 text-slate-300">
          <MapPin className="h-4 w-4 text-cyan-400" />
          <span>{t("coverage")}</span>
        </div>
      </div>

      {/* Next Milestone */}
      {stats?.nextMilestone && (
        <div className="mt-auto bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg p-4 border border-cyan-500/20">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-cyan-400 mt-0.5" />
            <div>
              <p className="text-xs text-cyan-400 font-medium uppercase tracking-wide">
                {t("nextMilestone")}
              </p>
              <p className="text-white font-semibold mt-1">
                {stats.nextMilestone.titleEn}
              </p>
              <p className="text-slate-400 text-sm">
                {stats.nextMilestone.date} • {stats.nextMilestone.location}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
