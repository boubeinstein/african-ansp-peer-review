"use client";

/**
 * Login Carousel Component
 *
 * ICAO USOAP-inspired carousel with 3 slides:
 * 1. Programme Overview with key stats
 * 2. Dual Assessment Framework (USOAP CMA + CANSO SoE)
 * 3. Peer Review Workflow (4 phases)
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import {
  Globe,
  Shield,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Programme stats - verified data
const PROGRAMME_STATS = {
  ansps: 20,
  states: 54,
  teams: 5,
  reviewers: 99,
};

export function LoginCarousel() {
  const t = useTranslations("auth.login.carousel");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const totalSlides = 3;

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % totalSlides);
    }, 7000);

    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const goToSlide = useCallback((index: number) => {
    setActiveSlide(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 15 seconds of inactivity
    setTimeout(() => setIsAutoPlaying(true), 15000);
  }, []);

  const goToPrev = useCallback(() => {
    goToSlide((activeSlide - 1 + totalSlides) % totalSlides);
  }, [activeSlide, goToSlide]);

  const goToNext = useCallback(() => {
    goToSlide((activeSlide + 1) % totalSlides);
  }, [activeSlide, goToSlide]);

  // Language toggle
  const switchLocale = () => {
    const newLocale = locale === "en" ? "fr" : "en";
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-br from-[#1B3A5C] to-[#142D48]">
      {/* Header with logos and language toggle */}
      <div className="absolute top-0 left-0 right-0 z-10 px-8 py-6 flex items-center justify-between">
        {/* ICAO + CANSO Logos */}
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logos/International_Civil_Aviation_Organization_logo.svg"
            alt="ICAO"
            className="h-12 w-auto"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <div className="h-8 w-px bg-white/30" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logos/CANSO.svg"
            alt="CANSO"
            className="h-7 w-auto"
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </div>

        {/* Language Toggle */}
        <button
          onClick={switchLocale}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20 transition-colors"
          aria-label={locale === "en" ? "Switch to French" : "Passer en anglais"}
        >
          <Globe className="h-4 w-4 text-white" />
          <span className="text-sm font-medium text-white">
            {locale === "en" ? "EN" : "FR"}
          </span>
        </button>
      </div>

      {/* Slides Container */}
      <div className="flex-1 relative overflow-hidden">
        {/* Slide 1: Programme Overview */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center px-12 transition-all duration-700 ease-in-out",
            activeSlide === 0
              ? "opacity-100 translate-x-0"
              : activeSlide > 0
                ? "opacity-0 -translate-x-full"
                : "opacity-0 translate-x-full"
          )}
        >
          <div className="max-w-2xl w-full space-y-8">
            {/* Badge */}
            <div className="flex justify-center">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/15 text-white/90 text-sm font-medium">
                {t("slide1.badge")}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-white text-center leading-tight">
              {t("slide1.title")}
            </h1>

            {/* Accent line */}
            <div className="flex justify-center">
              <div className="w-20 h-1 bg-gradient-to-r from-[#2563EB] to-[#0891B2] rounded-full" />
            </div>

            {/* Subtitle */}
            <p className="text-lg text-white/80 text-center leading-relaxed">
              {t("slide1.subtitle")}
            </p>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4 pt-4">
              <StatBox value={PROGRAMME_STATS.ansps} label={t("slide1.stats.ansps")} />
              <StatBox value={PROGRAMME_STATS.states} label={t("slide1.stats.states")} />
              <StatBox value={PROGRAMME_STATS.teams} label={t("slide1.stats.teams")} />
              <StatBox value={PROGRAMME_STATS.reviewers} label={t("slide1.stats.reviewers")} />
            </div>
          </div>
        </div>

        {/* Slide 2: Dual Framework */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center px-12 transition-all duration-700 ease-in-out",
            activeSlide === 1
              ? "opacity-100 translate-x-0"
              : activeSlide > 1
                ? "opacity-0 -translate-x-full"
                : "opacity-0 translate-x-full"
          )}
        >
          <div className="max-w-3xl w-full space-y-8">
            {/* Badge */}
            <div className="flex justify-center">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/15 text-white/90 text-sm font-medium">
                {t("slide2.badge")}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-white text-center leading-tight">
              {t("slide2.title")}
            </h1>

            {/* Subtitle */}
            <p className="text-base text-white/80 text-center leading-relaxed max-w-xl mx-auto">
              {t("slide2.subtitle")}
            </p>

            {/* Framework Cards */}
            <div className="grid grid-cols-2 gap-6 pt-4">
              {/* USOAP Card */}
              <div className="bg-white/[0.08] backdrop-blur-sm border border-white/10 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-cyan-400" />
                  <h3 className="text-lg font-semibold text-white">
                    {t("slide2.usoap.title")}
                  </h3>
                </div>
                <p className="text-white/70 text-sm">{t("slide2.usoap.description")}</p>
                <ul className="space-y-2 text-white/80 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    {t("slide2.usoap.detail1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    {t("slide2.usoap.detail2")}
                  </li>
                </ul>
                <div className="flex flex-wrap gap-2 pt-2">
                  {t("slide2.usoap.tags")
                    .split(" · ")
                    .map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-md bg-white/10 text-white/70 text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                </div>
              </div>

              {/* CANSO Card */}
              <div className="bg-white/[0.08] backdrop-blur-sm border border-white/10 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-6 w-6 text-cyan-400" />
                  <h3 className="text-lg font-semibold text-white">
                    {t("slide2.canso.title")}
                  </h3>
                </div>
                <p className="text-white/70 text-sm">{t("slide2.canso.description")}</p>
                <ul className="space-y-2 text-white/80 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    {t("slide2.canso.detail1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    {t("slide2.canso.detail2")}
                  </li>
                </ul>
                <div className="flex flex-wrap gap-2 pt-2">
                  {t("slide2.canso.tags")
                    .split(" · ")
                    .map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-md bg-white/10 text-white/70 text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 3: Review Workflow */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center px-12 transition-all duration-700 ease-in-out",
            activeSlide === 2
              ? "opacity-100 translate-x-0"
              : activeSlide > 2
                ? "opacity-0 -translate-x-full"
                : "opacity-0 translate-x-full"
          )}
        >
          <div className="max-w-3xl w-full space-y-8">
            {/* Badge */}
            <div className="flex justify-center">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/15 text-white/90 text-sm font-medium">
                {t("slide3.badge")}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-white text-center leading-tight">
              {t("slide3.title")}
            </h1>

            {/* Subtitle */}
            <p className="text-base text-white/80 text-center leading-relaxed max-w-xl mx-auto">
              {t("slide3.subtitle")}
            </p>

            {/* Process Steps */}
            <div className="flex items-center justify-center gap-2 pt-4">
              <PhaseStep
                number={1}
                name={t("slide3.phases.planning.name")}
                description={t("slide3.phases.planning.description")}
              />
              <StepConnector />
              <PhaseStep
                number={2}
                name={t("slide3.phases.preparation.name")}
                description={t("slide3.phases.preparation.description")}
              />
              <StepConnector />
              <PhaseStep
                number={3}
                name={t("slide3.phases.onsite.name")}
                description={t("slide3.phases.onsite.description")}
              />
              <StepConnector />
              <PhaseStep
                number={4}
                name={t("slide3.phases.reporting.name")}
                description={t("slide3.phases.reporting.description")}
              />
            </div>

            {/* Milestone Banner */}
            <div className="bg-white/5 rounded-lg p-4 flex items-center justify-center gap-3 mt-6">
              <Calendar className="h-5 w-5 text-cyan-400 flex-shrink-0" />
              <p className="text-sm text-white/80">{t("slide3.milestone")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-8">
        {/* Previous Button */}
        <button
          onClick={goToPrev}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5 text-white" />
        </button>

        {/* Dot Indicators */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                activeSlide === index
                  ? "w-8 bg-white"
                  : "w-2 bg-white/40 hover:bg-white/60"
              )}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={activeSlide === index ? "true" : "false"}
            />
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={goToNext}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5 text-white" />
        </button>
      </div>
    </div>
  );
}

// Stat Box Component
function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/70 uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  );
}

// Phase Step Component
function PhaseStep({
  number,
  name,
  description,
}: {
  number: number;
  name: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 w-36">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 text-white font-bold">
        {number}
      </div>
      <div className="text-white font-medium text-sm text-center">{name}</div>
      <div className="text-white/60 text-xs text-center leading-tight">
        {description}
      </div>
    </div>
  );
}

// Step Connector
function StepConnector() {
  return (
    <div className="flex items-center h-10">
      <div className="w-8 border-t-2 border-dashed border-white/30" />
    </div>
  );
}
