"use client";

/**
 * Partners Slide Component
 *
 * Displays partner organization logos and partnership description.
 */

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Building2, Globe2, Plane } from "lucide-react";

interface SlidePartnersProps {
  locale: string;
}

const PARTNERS = [
  {
    id: "icao",
    name: "ICAO",
    fullName: "International Civil Aviation Organization",
    logo: "/images/logos/International_Civil_Aviation_Organization_logo.svg",
    description: {
      en: "UN specialized agency for international aviation standards",
      fr: "Agence spécialisée des Nations Unies pour les normes de l'aviation internationale",
    },
  },
  {
    id: "canso",
    name: "CANSO",
    fullName: "Civil Air Navigation Services Organisation",
    logo: "/images/logos/CANSO.svg",
    description: {
      en: "Global voice of air traffic management",
      fr: "Voix mondiale de la gestion du trafic aérien",
    },
  },
  {
    id: "afcac",
    name: "AFCAC",
    fullName: "African Civil Aviation Commission",
    logo: "/images/logos/AFCAC.png",
    description: {
      en: "Specialized agency of the African Union for civil aviation",
      fr: "Agence spécialisée de l'Union Africaine pour l'aviation civile",
    },
  },
];

export function SlidePartners({ locale }: SlidePartnersProps) {
  const t = useTranslations("auth.showcase");

  return (
    <div className="h-full flex flex-col">
      {/* Section Header */}
      <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-4">
        {t("partnerOrganizations")}
      </h3>

      {/* Partners Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {PARTNERS.map((partner) => (
          <div
            key={partner.id}
            className="bg-white/5 backdrop-blur-sm rounded-lg p-5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="bg-white rounded-lg p-3 inline-block mb-4">
              <Image
                src={partner.logo}
                alt={partner.fullName}
                width={120}
                height={48}
                className="h-10 w-auto"
              />
            </div>
            <h4 className="font-bold text-lg text-amber-400 mb-1">
              {partner.name}
            </h4>
            <p className="text-sm text-white/70 mb-2">{partner.fullName}</p>
            <p className="text-xs text-white/50">
              {locale === "fr" ? partner.description.fr : partner.description.en}
            </p>
          </div>
        ))}
      </div>

      {/* Partnership Benefits */}
      <div className="mt-auto">
        <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-3">
          {t("partnershipBenefits")}
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 text-center">
            <Building2 className="w-5 h-5 text-amber-400 mx-auto mb-2" />
            <span className="text-xs text-white/70">{t("benefits.standards")}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 text-center">
            <Globe2 className="w-5 h-5 text-amber-400 mx-auto mb-2" />
            <span className="text-xs text-white/70">{t("benefits.network")}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 text-center">
            <Plane className="w-5 h-5 text-amber-400 mx-auto mb-2" />
            <span className="text-xs text-white/70">{t("benefits.safety")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
