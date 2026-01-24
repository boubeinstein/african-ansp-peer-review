"use client";

import { useTranslations } from "next-intl";
import { FileCheck, BarChart3 } from "lucide-react";
import Image from "next/image";

export function SlidePartners() {
  const t = useTranslations("auth.showcase.partners");

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-semibold text-white mb-6">{t("title")}</h2>

      {/* Partner Logos */}
      <div className="flex flex-wrap items-center justify-center gap-8 mb-8 py-6">
        <PartnerLogo
          src="/images/logos/International_Civil_Aviation_Organization_logo.svg"
          name="ICAO"
          desc={t("icaoDesc")}
        />
        <PartnerLogo
          src="/images/logos/CANSO.svg"
          name="CANSO"
          desc={t("cansoDesc")}
        />
        <PartnerLogo
          src="/images/logos/AFCAC.svg"
          name="AFCAC"
          desc={t("afcacDesc")}
        />
      </div>

      {/* Framework Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <FileCheck className="h-5 w-5 text-cyan-400" />
            <span className="text-white font-medium">{t("usoap")}</span>
          </div>
          <p className="text-slate-400 text-sm">{t("usoapDesc")}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            <span className="text-white font-medium">{t("cansoSoe")}</span>
          </div>
          <p className="text-slate-400 text-sm">{t("cansoSoeDesc")}</p>
        </div>
      </div>
    </div>
  );
}

function PartnerLogo({ src, name, desc }: { src: string; name: string; desc: string }) {
  return (
    <div className="flex flex-col items-center gap-2 group">
      <div className="bg-white rounded-xl p-4 border border-slate-700/50 group-hover:border-cyan-500/30 transition-colors">
        <Image
          src={src}
          alt={name}
          width={100}
          height={64}
          className="h-12 w-auto"
        />
      </div>
      <span className="text-slate-400 text-xs text-center max-w-[100px]">{desc}</span>
    </div>
  );
}
