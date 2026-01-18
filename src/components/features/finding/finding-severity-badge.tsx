"use client";

/**
 * Finding Severity Badge Component
 *
 * Displays a color-coded badge for finding severity levels.
 */

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Info, Eye } from "lucide-react";

type FindingSeverity = "CRITICAL" | "MAJOR" | "MINOR" | "OBSERVATION";

interface FindingSeverityBadgeProps {
  severity: FindingSeverity;
  showIcon?: boolean;
  className?: string;
}

const SEVERITY_CONFIG: Record<
  FindingSeverity,
  {
    icon: React.ElementType;
    className: string;
  }
> = {
  CRITICAL: {
    icon: AlertTriangle,
    className:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  },
  MAJOR: {
    icon: AlertCircle,
    className:
      "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  },
  MINOR: {
    icon: Info,
    className:
      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  },
  OBSERVATION: {
    icon: Eye,
    className:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  },
};

export function FindingSeverityBadge({
  severity,
  showIcon = true,
  className,
}: FindingSeverityBadgeProps) {
  const t = useTranslations("findings.severity");

  const config = SEVERITY_CONFIG[severity];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", config.className, className)}
    >
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {t(severity)}
    </Badge>
  );
}
