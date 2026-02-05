"use client";

/**
 * Login Showcase Component
 *
 * Clean ICAO USOAP-style statistics showcase with verified programme facts.
 * Displays only accurate, hardcoded data - no dynamic stats that may be incomplete.
 */

import { useTranslations, useLocale } from "next-intl";
import { PartnerLogos } from "./partner-logos";
import {
  CheckCircle2,
  Calendar,
  Users,
  Building2,
  UsersRound,
  Clock,
} from "lucide-react";

// Verified programme data - hardcoded for accuracy
const PROGRAMME_STATS = {
  organizations: 20,
  reviewers: 45,
  nominated: 99,
  teams: 5,
  yearsBuilding: 10,
};

const TEAMS = [
  {
    number: 1,
    nameEn: "ASECNA & Southern Africa Partnership",
    nameFr: "Partenariat ASECNA & Afrique Australe",
    members: ["ASECNA", "ATNS", "CAAB", "ESWACAA"],
  },
  {
    number: 2,
    nameEn: "East African Community",
    nameFr: "Communauté d'Afrique de l'Est",
    members: ["KCAA", "TCAA", "UCAA", "RCAA", "BCAA"],
  },
  {
    number: 3,
    nameEn: "West African Anglophone",
    nameFr: "Afrique de l'Ouest Anglophone",
    members: ["NAMA", "GCAA", "Roberts FIR"],
  },
  {
    number: 4,
    nameEn: "Southern & Eastern Africa",
    nameFr: "Afrique Australe et Orientale",
    members: ["ADM", "MCAA", "ACM", "CAAZ", "ZACL"],
  },
  {
    number: 5,
    nameEn: "Northern Africa",
    nameFr: "Afrique du Nord",
    members: ["DGAC", "OACA", "ANAC"],
  },
];

const NEXT_MILESTONE = {
  titleEn: "AFI Peer Reviewers Training",
  titleFr: "Formation des Évaluateurs Pairs AFI",
  date: "March 23-26, 2026",
  location: "Dar es Salaam, Tanzania",
};

export function LoginShowcase() {
  const t = useTranslations("auth.showcase");
  const locale = useLocale();

  return (
    <div className="w-full h-full flex flex-col bg-[#0f172a]">
      {/* Header Banner - ICAO Blue Gradient */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#0c4a6e] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-cyan-400 rounded-full" />
            <h1 className="text-white text-lg font-semibold">{t("header")}</h1>
          </div>
          <PartnerLogos variant="dark" size="sm" showDividers={false} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Key Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            value={PROGRAMME_STATS.organizations}
            label={t("stats.organizations")}
            icon={Building2}
          />
          <StatCard
            value={PROGRAMME_STATS.reviewers}
            label={t("stats.reviewers")}
            sublabel={t("stats.reviewersFrom", {
              count: PROGRAMME_STATS.nominated,
            })}
            icon={Users}
          />
          <StatCard
            value={PROGRAMME_STATS.teams}
            label={t("stats.teams")}
            icon={UsersRound}
          />
          <StatCard
            value={`${PROGRAMME_STATS.yearsBuilding}+`}
            label={t("stats.years")}
            icon={Clock}
          />
        </div>

        {/* Teams Section */}
        <div className="mb-6">
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-cyan-400" />
            {t("teams.title")}
          </h2>
          <div className="grid grid-cols-5 gap-3">
            {TEAMS.map((team) => (
              <TeamCard
                key={team.number}
                number={team.number}
                name={locale === "fr" ? team.nameFr : team.nameEn}
                members={team.members}
              />
            ))}
          </div>
        </div>

        {/* Bottom Row: Framework + Milestone */}
        <div className="grid grid-cols-2 gap-4">
          {/* Framework Alignment */}
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
            <h3 className="text-cyan-400 font-semibold text-sm mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {t("framework.title")}
            </h3>
            <div className="space-y-3">
              <FrameworkItem label="USOAP CMA 2024" />
              <FrameworkItem label="CANSO SoE 2024" />
              <FrameworkItem label="ICAO Annex 19" />
            </div>
          </div>

          {/* Next Milestone */}
          <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl p-5 border border-cyan-500/30">
            <h3 className="text-cyan-400 font-semibold text-sm mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t("milestone.title")}
            </h3>
            <p className="text-white font-semibold text-lg">
              {locale === "fr"
                ? NEXT_MILESTONE.titleFr
                : NEXT_MILESTONE.titleEn}
            </p>
            <p className="text-slate-300 text-sm mt-2">{NEXT_MILESTONE.date}</p>
            <p className="text-slate-400 text-sm">{NEXT_MILESTONE.location}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-800">
        <p className="text-slate-500 text-xs text-center">
          {t("footer.tagline")}
        </p>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  value,
  label,
  sublabel,
  icon: Icon,
}: {
  value: number | string;
  label: string;
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
      <Icon className="h-5 w-5 text-cyan-400 mb-3" />
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-slate-400 text-sm">{label}</div>
      {sublabel && (
        <div className="text-slate-500 text-xs mt-1">{sublabel}</div>
      )}
    </div>
  );
}

// Team Card Component
function TeamCard({
  number,
  name,
  members,
}: {
  number: number;
  name: string;
  members: string[];
}) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 hover:border-cyan-500/30 transition-colors">
      <div className="text-cyan-400 font-bold text-sm mb-1">Team {number}</div>
      <p className="text-white text-xs font-medium mb-2 line-clamp-2 leading-tight">
        {name}
      </p>
      <p className="text-slate-500 text-xs leading-relaxed">
        {members.join(", ")}
      </p>
    </div>
  );
}

// Framework Item Component
function FrameworkItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-2 rounded-full bg-green-400" />
      <span className="text-slate-300 text-sm">{label}</span>
    </div>
  );
}
