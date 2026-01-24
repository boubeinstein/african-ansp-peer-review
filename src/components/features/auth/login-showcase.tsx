"use client";

/**
 * Login Showcase Component
 *
 * Left panel of the login page showing programme statistics,
 * regional teams, and upcoming milestones.
 *
 * TODO: Implement full showcase with API data
 */

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { Shield, Users, Globe, Calendar } from "lucide-react";

export function LoginShowcase() {
  const t = useTranslations("auth");
  const locale = useLocale();

  return (
    <div className="w-full h-full flex flex-col p-8 lg:p-12 text-white">
      {/* Partner Logos */}
      <div className="flex items-center gap-4 lg:gap-6 mb-8 flex-wrap">
        <div className="bg-white shadow-md rounded-lg p-2 lg:p-3">
          <Image
            src="/images/logos/International_Civil_Aviation_Organization_logo.svg"
            alt="ICAO - International Civil Aviation Organization"
            width={120}
            height={48}
            className="h-8 lg:h-10 w-auto"
            priority
          />
        </div>
        <div className="h-8 w-px bg-white/30 hidden sm:block" />
        <div className="bg-white shadow-md rounded-lg p-2 lg:p-3">
          <Image
            src="/images/logos/CANSO.svg"
            alt="CANSO - Civil Air Navigation Services Organisation"
            width={120}
            height={48}
            className="h-8 lg:h-10 w-auto"
            priority
          />
        </div>
      </div>

      {/* Badge */}
      <div className="mb-3">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <Shield className="w-3 h-3 mr-1.5" />
          {t("hero.badge")}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 leading-tight">
        {t("hero.title")}
      </h1>

      <p className="text-base lg:text-lg text-white/80 mb-6">
        {t("hero.subtitle")}
      </p>

      <div className="h-1 w-24 bg-gradient-to-r from-amber-500 to-blue-500 rounded-full mb-8" />

      {/* Tagline */}
      <blockquote className="text-lg lg:text-xl italic text-white/90 border-l-4 border-amber-500 pl-4 mb-8">
        &ldquo;{t("hero.tagline")}&rdquo;
      </blockquote>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Users className="w-5 h-5" />} value="20" label={t("hero.stats.ansps")} />
        <StatCard icon={<Users className="w-5 h-5" />} value="99" label={t("hero.stats.experts")} />
        <StatCard icon={<Globe className="w-5 h-5" />} value="5" label={t("hero.stats.teams")} />
        <StatCard icon={<Calendar className="w-5 h-5" />} value="3" label={locale === "fr" ? "Revues" : "Reviews"} />
      </div>

      {/* Regional Teams */}
      <div className="flex-1 overflow-hidden">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-4">
          {locale === "fr" ? "Équipes Régionales" : "Regional Teams"}
        </h3>
        <div className="grid grid-cols-5 gap-3">
          {TEAMS.map((team) => (
            <div
              key={team.number}
              className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="text-amber-400 font-bold text-lg mb-1">
                {locale === "fr" ? "Équipe" : "Team"} {team.number}
              </div>
              <div className="text-xs text-white/60 mb-2">
                {locale === "fr" ? team.nameFr : team.nameEn}
              </div>
              <div className="text-[10px] text-white/40 font-mono">
                {team.members}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-white/20 mt-auto">
        <div className="text-xs text-white/50">
          {t("hero.partnership")}
        </div>
        <div className="text-xs text-white/50">
          ICAO • CANSO • AFCAC
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="text-center bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
      <div className="flex justify-center text-amber-400 mb-1">{icon}</div>
      <div className="text-2xl font-bold text-amber-400">{value}</div>
      <div className="text-xs text-white/70">{label}</div>
    </div>
  );
}

const TEAMS = [
  {
    number: 1,
    nameEn: "ASECNA & Southern Africa",
    nameFr: "ASECNA & Afrique Australe",
    members: "ASECNA, ATNS, CAAB, ESWACAA",
  },
  {
    number: 2,
    nameEn: "East African Community",
    nameFr: "Communauté d'Afrique de l'Est",
    members: "KCAA, TCAA, UCAA, RCAA, BCAA",
  },
  {
    number: 3,
    nameEn: "West African Anglophone",
    nameFr: "Afrique de l'Ouest Anglophone",
    members: "NAMA, GCAA, RFIR",
  },
  {
    number: 4,
    nameEn: "Southern & Eastern Africa",
    nameFr: "Afrique Australe et Orientale",
    members: "ADM, MCAA, ACM, CAAZ, ZACL",
  },
  {
    number: 5,
    nameEn: "Northern Africa",
    nameFr: "Afrique du Nord",
    members: "DGAC, OACA, ANAC",
  },
];
