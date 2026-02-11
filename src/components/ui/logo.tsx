import { cn } from "@/lib/utils";
import Image from "next/image";

interface LogoProps {
  /** sm=24px, md=32px, lg=48px, xl=64px */
  size?: "sm" | "md" | "lg" | "xl";
  /** Show "AAPRP" text alongside the mark */
  showText?: boolean;
  /** Override default text classes */
  textClassName?: string;
  className?: string;
}

const sizeMap = {
  sm: { px: 24, imgSize: 32 },
  md: { px: 32, imgSize: 32 },
  lg: { px: 48, imgSize: 48 },
  xl: { px: 64, imgSize: 64 },
} as const;

export function Logo({ size = "md", showText = false, textClassName, className }: LogoProps) {
  const { px, imgSize } = sizeMap[size];

  return (
    <div className={cn("inline-flex items-center gap-2.5 shrink-0", className)}>
      <Image
        src={`/images/logos/blue-on-white/aaprp-logo-${imgSize}.png`}
        alt="AAPRP"
        width={px}
        height={px}
        className="shrink-0 block dark:hidden"
        priority
      />
      <Image
        src={`/images/logos/lightblue-on-dark/aaprp-logo-${imgSize}.png`}
        alt=""
        width={px}
        height={px}
        className="shrink-0 hidden dark:block"
        priority
      />
      {showText && (
        <span className={cn(
          "font-semibold tracking-tight text-foreground leading-tight truncate",
          textClassName
        )}>
          AAPRP
        </span>
      )}
    </div>
  );
}
