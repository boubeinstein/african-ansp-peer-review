"use client";

/**
 * AuthLayout Component
 *
 * Enterprise-grade authentication layout with split-screen design.
 * Features ICAO/CANSO branding, bilingual support, and aviation theme.
 */

import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { Globe, Shield } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const otherLocale = locale === "en" ? "fr" : "en";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Hero Panel - Left Side */}
      <div className="relative lg:w-1/2 lg:min-h-screen bg-aviation-gradient text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 bg-aviation-pattern" />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-8 lg:p-12 min-h-[400px] lg:min-h-screen">
          {/* Main Content - Vertically Centered */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
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
            <div className="mb-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-african-gold-light text-african-gold border border-african-gold/30">
                <Shield className="w-3 h-3 mr-1.5" />
                {t("hero.badge")}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-montserrat mb-4 leading-tight">
              {t("hero.title")}
            </h1>

            <p className="text-base lg:text-lg text-white/80 mb-6 font-source-sans">
              {t("hero.subtitle")}
            </p>

            <div className="h-1 w-24 bg-gradient-to-r from-african-gold to-icao rounded-full mb-6 lg:mb-8" />

            {/* Tagline */}
            <blockquote className="text-lg lg:text-xl italic text-white/90 border-l-4 border-african-gold pl-4 mb-6 lg:mb-8">
              &ldquo;{t("hero.tagline")}&rdquo;
            </blockquote>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-african-gold">
                  20
                </div>
                <div className="text-xs lg:text-sm text-white/70">
                  {t("hero.stats.ansps")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-african-gold">
                  99
                </div>
                <div className="text-xs lg:text-sm text-white/70">
                  {t("hero.stats.experts")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-african-gold">
                  5
                </div>
                <div className="text-xs lg:text-sm text-white/70">
                  {t("hero.stats.teams")}
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Always at bottom */}
          <div className="flex items-center justify-between pt-6 border-t border-white/20 flex-wrap gap-4 mt-auto">
            {/* Language Switcher */}
            <Link
              href={`/${otherLocale}/login`}
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              <Globe className="w-4 h-4" />
              {t("language.switch")}
            </Link>

            {/* Partner Text */}
            <div className="text-xs text-white/50">{t("hero.partnership")}</div>
          </div>
        </div>
      </div>

      {/* Form Panel - Right Side */}
      <div className="flex-1 flex flex-col bg-muted/50 lg:h-screen lg:overflow-y-auto">
        {/* Mobile Logo Bar */}
        <div className="lg:hidden flex items-center justify-center gap-4 p-4 bg-card border-b">
          <Image
            src="/images/logos/International_Civil_Aviation_Organization_logo.svg"
            alt="ICAO"
            width={80}
            height={32}
            className="h-7 w-auto"
          />
          <div className="h-5 w-px bg-border" />
          <Image
            src="/images/logos/CANSO.svg"
            alt="CANSO"
            width={80}
            height={32}
            className="h-7 w-auto"
          />
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-start justify-center p-6 lg:p-12 overflow-y-auto">
          <div className="w-full max-w-md py-8">{children}</div>
        </div>

        {/* Footer */}
        <div className="p-4 lg:p-6 text-center text-xs text-muted-foreground border-t bg-card flex-shrink-0">
          <p>&copy; 2026 {t("footer.copyright")}</p>
          <p className="mt-1 font-medium">ICAO &bull; CANSO &bull; AFCAC</p>
        </div>
      </div>
    </div>
  );
}
