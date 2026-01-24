"use client";

/**
 * Teams Slide Component
 *
 * Displays regional teams with member organizations.
 */

import { useTranslations } from "next-intl";
import type { LoginPageStats } from "@/types/login";

interface SlideTeamsProps {
  stats?: LoginPageStats;
  locale: string;
}

const DEFAULT_TEAMS = [
  {
    number: 1,
    nameEn: "ASECNA & Southern Africa",
    nameFr: "ASECNA & Afrique Australe",
    members: "ASECNA, ATNS, CAAB, ESWACAA",
    orgCount: 4,
    reviewerCount: 20,
  },
  {
    number: 2,
    nameEn: "East African Community",
    nameFr: "Communauté d'Afrique de l'Est",
    members: "KCAA, TCAA, UCAA, RCAA, BCAA",
    orgCount: 5,
    reviewerCount: 25,
  },
  {
    number: 3,
    nameEn: "West African Anglophone",
    nameFr: "Afrique de l'Ouest Anglophone",
    members: "NAMA, GCAA, RFIR",
    orgCount: 3,
    reviewerCount: 15,
  },
  {
    number: 4,
    nameEn: "Southern & Eastern Africa",
    nameFr: "Afrique Australe et Orientale",
    members: "ADM, MCAA, ACM, CAAZ, ZACL",
    orgCount: 5,
    reviewerCount: 22,
  },
  {
    number: 5,
    nameEn: "Northern Africa",
    nameFr: "Afrique du Nord",
    members: "DGAC, OACA, ANAC",
    orgCount: 3,
    reviewerCount: 17,
  },
];

export function SlideTeams({ stats, locale }: SlideTeamsProps) {
  const t = useTranslations("auth.showcase");
  const teams = stats?.teams ?? DEFAULT_TEAMS;

  return (
    <div className="h-full flex flex-col">
      {/* Section Header */}
      <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-4">
        {t("regionalTeams")}
      </h3>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {teams.map((team) => (
          <div
            key={team.number}
            className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="text-amber-400 font-bold text-lg mb-1">
              {locale === "fr" ? "Équipe" : "Team"} {team.number}
            </div>
            <div className="text-sm text-white/80 mb-2 line-clamp-1">
              {locale === "fr" ? team.nameFr : team.nameEn}
            </div>
            <div className="text-xs text-white/50 font-mono mb-2">
              {team.members}
            </div>
            <div className="flex items-center gap-3 text-xs text-white/60 pt-2 border-t border-white/10">
              <span>{team.orgCount} {t("orgs")}</span>
              <span>•</span>
              <span>{team.reviewerCount} {t("reviewers")}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Info */}
      <div className="mt-auto pt-6">
        <div className="bg-gradient-to-r from-amber-500/10 to-blue-500/10 rounded-lg p-4 border border-white/10">
          <p className="text-sm text-white/80">
            {t("teamsDescription")}
          </p>
        </div>
      </div>
    </div>
  );
}
