"use client";

/**
 * Login Showcase Component
 *
 * Auto-rotating carousel for the login page left panel.
 * Features programme statistics, regional teams, and partner logos.
 */

import { useState, useEffect, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { SlideStats } from "./slides/slide-stats";
import { SlideTeams } from "./slides/slide-teams";
import { SlidePartners } from "./slides/slide-partners";

const SLIDE_INTERVAL = 6000; // 6 seconds
const TOTAL_SLIDES = 3;

export function LoginShowcase() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState(1);

  // Fetch login page stats
  const { data: stats } = trpc.public.getLoginPageStats.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const goToSlide = useCallback((index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  }, [currentSlide]);

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % TOTAL_SLIDES);
  }, []);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + TOTAL_SLIDES) % TOTAL_SLIDES);
  }, []);

  // Auto-advance slides
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      nextSlide();
    }, SLIDE_INTERVAL);

    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  const slides = [
    <SlideStats key="stats" stats={stats} locale={locale} />,
    <SlideTeams key="teams" stats={stats} locale={locale} />,
    <SlidePartners key="partners" locale={locale} />,
  ];

  return (
    <div
      className="w-full h-full flex flex-col p-8 lg:p-12 text-white relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Partner Logos Header */}
      <div className="flex items-center gap-4 lg:gap-6 mb-6 flex-wrap">
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

      <p className="text-base lg:text-lg text-white/80 mb-4">
        {t("hero.subtitle")}
      </p>

      <div className="h-1 w-24 bg-gradient-to-r from-amber-500 to-blue-500 rounded-full mb-6" />

      {/* Carousel Content Area */}
      <div className="flex-1 relative min-h-[280px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {slides[currentSlide]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-4 mt-auto">
        {/* Arrow Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevSlide}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label={locale === "fr" ? "Diapositive précédente" : "Previous slide"}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextSlide}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label={locale === "fr" ? "Diapositive suivante" : "Next slide"}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dot Navigation */}
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_SLIDES }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                currentSlide === index
                  ? "bg-amber-400 w-6"
                  : "bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`${locale === "fr" ? "Aller à la diapositive" : "Go to slide"} ${index + 1}`}
            />
          ))}
        </div>

        {/* Footer Info */}
        <div className="text-xs text-white/50">
          ICAO • CANSO • AFCAC
        </div>
      </div>
    </div>
  );
}
