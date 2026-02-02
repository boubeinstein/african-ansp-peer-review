"use client";

/**
 * ICAO + CANSO Logos Component
 *
 * Simplified partner logos for the login form showing only ICAO and CANSO.
 * (AFCAC excluded per design requirements for login page)
 */

/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

interface ICAOCANSOLogosProps {
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  showDivider?: boolean;
  className?: string;
}

/**
 * Logo heights calibrated for visual balance:
 * - ICAO: Circular emblem (taller)
 * - CANSO: Wide text logo (shorter to balance)
 */
export function ICAOCANSOLogos({
  variant = "light",
  size = "md",
  showDivider = true,
  className,
}: ICAOCANSOLogosProps) {
  const isDark = variant === "dark";

  const sizeConfig = {
    sm: { icao: 32, canso: 18, gap: 12, divider: 24 },
    md: { icao: 44, canso: 24, gap: 16, divider: 32 },
    lg: { icao: 56, canso: 32, gap: 20, divider: 40 },
  };

  const config = sizeConfig[size];

  // Filter for dark variant (invert to white)
  const darkFilter = isDark ? "brightness(0) invert(1)" : "none";

  return (
    <div
      className={cn("flex items-center", className)}
      style={{ gap: config.gap }}
    >
      {/* ICAO Logo */}
      <div
        className="flex-shrink-0 flex items-center justify-center"
        style={{ height: config.icao }}
      >
        <img
          src="/images/logos/International_Civil_Aviation_Organization_logo.svg"
          alt="ICAO - International Civil Aviation Organization"
          className="h-full w-auto"
          style={{ filter: darkFilter }}
        />
      </div>

      {showDivider && (
        <div
          className={cn(
            "w-px flex-shrink-0",
            isDark ? "bg-slate-600" : "bg-slate-300"
          )}
          style={{ height: config.divider }}
        />
      )}

      {/* CANSO Logo */}
      <div
        className="flex-shrink-0 flex items-center justify-center"
        style={{ height: config.canso }}
      >
        <img
          src="/images/logos/CANSO.svg"
          alt="CANSO - Civil Air Navigation Services Organisation"
          className="h-full w-auto"
          style={{ filter: darkFilter }}
        />
      </div>
    </div>
  );
}
