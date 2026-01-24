"use client";

/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

interface PartnerLogosProps {
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  showDividers?: boolean;
  className?: string;
}

/**
 * Partner logos with visual proportioning for balance
 *
 * Heights are calibrated so logos appear visually equal:
 * - ICAO: Circular emblem (taller)
 * - CANSO: Wide text logo (shorter to balance)
 * - AFCAC: Wide with emblem (medium)
 */
export function PartnerLogos({
  variant = "dark",
  size = "md",
  showDividers = true,
  className,
}: PartnerLogosProps) {
  const isDark = variant === "dark";

  // Calibrated heights for visual balance (not pixel equality)
  const sizeConfig = {
    sm: { icao: 36, canso: 20, afcac: 24, gap: 16, divider: 28 },
    md: { icao: 52, canso: 28, afcac: 32, gap: 20, divider: 40 },
    lg: { icao: 64, canso: 36, afcac: 40, gap: 24, divider: 48 },
  };

  const config = sizeConfig[size];

  // Filter style for dark variant (invert colors to white)
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

      {showDividers && (
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

      {showDividers && (
        <div
          className={cn(
            "w-px flex-shrink-0",
            isDark ? "bg-slate-600" : "bg-slate-300"
          )}
          style={{ height: config.divider }}
        />
      )}

      {/* AFCAC Logo */}
      <div
        className="flex-shrink-0 flex items-center justify-center"
        style={{ height: config.afcac }}
      >
        <img
          src="/images/logos/AFCAC.svg"
          alt="AFCAC - African Civil Aviation Commission"
          className="h-full w-auto"
          style={{ filter: darkFilter }}
        />
      </div>
    </div>
  );
}
