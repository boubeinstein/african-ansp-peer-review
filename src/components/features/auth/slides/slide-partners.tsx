"use client";

import { useTranslations } from "next-intl";
import { FileCheck, BarChart3 } from "lucide-react";
import { PartnerLogos } from "../partner-logos";

export function SlidePartners() {
  const t = useTranslations("auth.showcase.partners");

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-semibold text-white mb-6">{t("title")}</h2>

      {/* Partner Logos - Centered */}
      <div className="flex justify-center py-6 mb-4">
        <PartnerLogos variant="dark" size="lg" />
      </div>

      {/* Partner Descriptions */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-center">
        <div>
          <p className="text-cyan-400 font-semibold text-sm">ICAO</p>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
            {t("icaoDesc")}
          </p>
        </div>
        <div>
          <p className="text-cyan-400 font-semibold text-sm">CANSO</p>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
            {t("cansoDesc")}
          </p>
        </div>
        <div>
          <p className="text-cyan-400 font-semibold text-sm">AFCAC</p>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
            {t("afcacDesc")}
          </p>
        </div>
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
