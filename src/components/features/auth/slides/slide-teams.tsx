"use client";

import { useTranslations } from "next-intl";
import { Users, Building2 } from "lucide-react";
import type { TeamInfo } from "@/types/login";

interface Props {
  teams?: TeamInfo[];
  locale: string;
}

export function SlideTeams({ teams, locale }: Props) {
  const t = useTranslations("auth.showcase.teams");

  if (!teams) return null;

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-semibold text-white mb-6">{t("title")}</h2>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {teams.map((team) => (
          <div
            key={team.number}
            className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-cyan-500/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-cyan-400 font-bold">Team {team.number}</span>
            </div>
            <h3 className="text-white font-medium text-sm mb-2 line-clamp-1">
              {locale === "fr" ? team.nameFr : team.nameEn}
            </h3>
            <p className="text-slate-500 text-xs mb-3 line-clamp-1">{team.members}</p>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1 text-slate-400">
                <Building2 className="h-3 w-3" />
                <span>{team.orgCount} orgs</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <Users className="h-3 w-3" />
                <span>{team.reviewerCount} rev.</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-auto text-slate-500 text-sm text-center pt-4">
        {t("footer")}
      </p>
    </div>
  );
}
